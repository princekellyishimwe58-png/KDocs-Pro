require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const intasendRoutes = require('./routes/intasend');
const aiRoutes = require('./routes/ai');
const { generatePdf } = require('./utils/pdfGenerator');
const { STAGES, TEMPLATE_STYLES } = require('./utils/templates');
const { LANGUAGES } = require('./utils/docTranslations');
const { computeReadyScore } = require('./utils/readyScore');
const { PRICES, PRICE_DEFAULT_KES } = require('./utils/pricing');
const { router: authRoutes, attachUser } = require('./routes/auth');
const { router: lockerRoutes, saveToLocker } = require('./routes/locker');
const { getPayment, storeStats } = require('./utils/paymentStore');
const { connectDb } = require('./utils/db');
const { sanitizeFields } = require('./utils/validate');
const { issueToken, requireCsrfToken } = require('./middleware/csrf');
const sentry = require('./utils/sentry');

const { slidingLimiter, ipKeyGenerator } = require('./middleware/rateLimit');

const app = express();
app.set('trust proxy', 1); // Render runs behind a proxy; needed for rate limiting
app.disable('x-powered-by');

// Security headers. CSP is explicit below - these are ALL the external
// sources the app actually uses:
//   scripts:  'self' (app.js) + https://accounts.google.com (Google Sign-In)
//   styles:   'self' (style.css); 'unsafe-inline' kept only because the
//             Google button injects inline styles into our DOM
//   frames:   blob: (PDF previews render into blob-URL iframes)
//             + https://accounts.google.com (Google Sign-In iframe)
//   connects: 'self' + https://accounts.google.com (GSI token calls)
//   images:   'self' + data: (favicons/inline icons)
// Everything else (objects, plugins, embedding) is locked down.
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      "default-src": ["'self'"],
      "script-src": ["'self'", "https://accounts.google.com"],
      "style-src": ["'self'", "'unsafe-inline'"],
      "img-src": ["'self'", "data:"],
      "connect-src": ["'self'", "https://accounts.google.com"],
      "frame-src": ["'self'", "blob:", "https://accounts.google.com"],
      "object-src": ["'none'"],
      "base-uri": ["'self'"],
      "frame-ancestors": ["'self'"],
    },
  },
  crossOriginResourcePolicy: { policy: 'same-site' },
}));

// CORS: default-DENY. With CORS_ORIGINS unset, browsers on other origins get
// no CORS headers and cannot read responses (this kills cross-site use of a
// logged-in user's cookies). Same-origin requests always work - the app is
// served from the same origin it calls. To allow extra origins (e.g. a
// staging URL), set CORS_ORIGINS="https://a.onrender.com,https://b.com".
// Non-browser clients (curl, monitors) send no Origin header and are allowed.
const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(null, false); // no ACAO header -> browser blocks the response
  },
  credentials: true,
}));

app.use(compression());
app.use(express.json({ limit: '256kb' }));
app.use(cookieParser());
// Short cache so security/UX fixes in these files reach browsers fast;
// files are tiny and gzip'd, so the performance cost is negligible.
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '5m' }));

// Brute-force / abuse protection. Generous for real customers, tight enough
// to make scripted abuse of the paid endpoints uneconomical.
//
// Every limiter below is a TRUE sliding-window counter (see
// middleware/rateLimit.js): at most `limit` events are allowed inside any
// trailing `windowMs`, with no fixed window boundaries and no full reset
// while old events still linger. Each one responds to abuse with a clean
// JSON 429 + Retry-After and always sets X-RateLimit-* headers.

// Bucket 4 of the spec: 10 attempts per rolling 10 minutes on the
// credential-submitting auth endpoints (login / signup / google).
const authLimiter = slidingLimiter({
  windowMs: 10 * 60 * 1000, limit: 10,
  name: 'auth',
  // GETs (e.g. /me on every page load) stay under the general budget only;
  // this ceiling is for credential-submitting POST/DELETE/PATCH requests.
  skip: (req) => req.method === 'GET',
  message: { error: 'Too many sign-in attempts. Please wait 10 minutes and try again.' },
});

// Bucket 2 of the spec: 5 signups per rolling hour.
const signupLimiter = slidingLimiter({
  windowMs: 60 * 60 * 1000, limit: 5,
  name: 'signup',
  message: { error: 'Too many signups from this source. Please try again later.' },
});

// Bucket 1 of the spec: 5 payment initiations per rolling 15 minutes.
// Every initiate reaches IntaSend live, so abuse here is the expensive path.
const initiateLimiter = slidingLimiter({
  windowMs: 15 * 60 * 1000, limit: 5,
  name: 'initiate',
  message: { error: 'Too many payment attempts. Please wait 15 minutes and try again.' },
});

// Bucket 3 of the spec: 3 account deletions per rolling hour (destructive,
// low-frequency, credential-typed - so it gets its own tight ceiling on top
// of the general auth one).
const deletionLimiter = slidingLimiter({
  windowMs: 60 * 60 * 1000, limit: 3,
  name: 'deletion',
  message: { error: 'Too many attempts. Please try again later.' },
});

// IntaSend webhook: provider retries failed deliveries 5x with exponential
// delays, and the general-per-IP budget must not apply to it - all webhooks
// for every customer arrive from a small set of IntaSend IPs, so a shared
// 100/day IP ceiling here would drop real payment confirmations. It keeps
// its own generous (formerly 120/15min) sliding window instead.
const webhookLimiter = slidingLimiter({
  windowMs: 15 * 60 * 1000, limit: 120,
  name: 'webhook',
  keyGenerator: ipKeyGenerator(),
  message: { error: 'Webhook rate limit exceeded.' },
});

// Buckets 5 + 7 of the spec on paid downloads: 30 per rolling hour, with a
// 30-per-rolling-10-minutes burst ceiling stacked on top.
const paidLimiterHour = slidingLimiter({
  windowMs: 60 * 60 * 1000, limit: 30,
  name: 'paid',
  message: { error: 'Too many downloads. Please wait a few minutes and try again.' },
});
const paidLimiterBurst = slidingLimiter({
  windowMs: 10 * 60 * 1000, limit: 30,
  name: 'paid-burst',
  message: { error: 'Too many downloads. Please wait a few minutes and try again.' },
});

// Buckets 8 + 6 of the spec - the shared /api budget: 60 per rolling
// minute and 100 per rolling 24 hours, keyed per signed-in credential or
// per IP for anonymous traffic. The webhook path is excluded (it has its
// own IP-keyed window above) so one provider retry storm cannot eat the
// whole daily budget shared by real customers.
const notWebhook = (req) => !req.path.startsWith('/intasend/webhook');
const generalMinuteLimiter = slidingLimiter({
  windowMs: 60 * 1000, limit: 60,
  name: 'general-minute',
  skip: notWebhook,
  message: { error: 'Too many requests. Please slow down.' },
});
const generalDailyLimiter = slidingLimiter({
  windowMs: 24 * 60 * 60 * 1000, limit: 100,
  name: 'general-day',
  skip: notWebhook,
  message: { error: 'Daily request quota reached. Please try again tomorrow.' },
});

// Mounting order: specific limiters first (they stack - e.g. account
// deletion hits both the auth and the deletion windows), then the general
// per-minute + per-day budget on everything else under /api.
app.use('/api/intasend/webhook', webhookLimiter);
app.use('/api/auth', authLimiter);
app.use('/api/auth/signup', signupLimiter);
app.use('/api/auth/account', deletionLimiter);
app.use('/api/intasend/initiate', initiateLimiter);
app.use('/api/intasend/diagnose', initiateLimiter); // each call does live provider requests
app.use('/api', generalMinuteLimiter);
app.use('/api', generalDailyLimiter);

// CSRF: hand every browser visitor a double-submit token on any GET under
// /api, and require it back on every state-changing request. GETs are safe
// (read-only API), IntaSend's return-redirect is a top-level GET, so no
// webhook exemption is needed.
app.get('/api/*', issueToken);

// Mutating API routes require the CSRF token (see middleware/csrf.js).
// NOTE: this must sit ABOVE every mutating route mount (auth, locker,
// intasend, preview/score/download) - Express matches in order.
app.post('/api/*', requireCsrfToken);
app.delete('/api/*', requireCsrfToken);
app.put('/api/*', requireCsrfToken);
app.patch('/api/*', requireCsrfToken);

// So the frontend can build its menus and prices from one source of truth.
// `prices` is per-document; `priceKes` stays for backward compatibility.
app.get('/api/catalog', (req, res) => {
  res.json({
    stages: STAGES,
    templates: TEMPLATE_STYLES,
    languages: LANGUAGES,
    prices: PRICES,
    priceKes: PRICE_DEFAULT_KES,
    // Lets the frontend show a clear "test mode" notice until IntaSend is live.
    paymentMode: process.env.INTASEND_ENV === 'production' ? 'live' : 'test',
  });
});

// Public (non-secret) config the frontend needs - lets the UI gracefully
// hide the Google button if it hasn't been set up yet.
app.get('/api/config', (req, res) => {
  res.json({
    googleClientId: process.env.GOOGLE_CLIENT_ID || null,
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/locker', lockerRoutes);

// Free, watermarked preview - this is what the user sees before paying
app.post('/api/preview', async (req, res) => {
  try {
    const { docType, templateKey, fields, language } = req.body || {};
    const pdf = await generatePdf({
      docType,
      templateKey,
      fields: sanitizeFields(fields),
      language,
      watermark: true,
    });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Cache-Control', 'no-store');
    res.send(pdf);
  } catch (err) {
    console.error('Preview error:', err.message);
    res.status(500).json({ error: 'Could not build preview' });
  }
});

// Free Ready Score analysis (structural checklist + suggestions), kept at
// this URL for compatibility with earlier clients.
app.post('/api/score', (req, res) => {
  try {
    const { docType, fields } = req.body || {};
    const result = computeReadyScore(docType, sanitizeFields(fields));
    res.json(result);
  } catch (err) {
    console.error('Score error:', err.message);
    res.status(500).json({ error: 'Could not compute Ready Score' });
  }
});

// Clean download - ONLY reachable if the payment reference is marked "paid".
// Works after restarts too, because payment records live in the durable store.
// If the person is signed in, we also quietly save it to their Document Locker.
app.post('/api/download/:checkoutRequestId', paidLimiterBurst, paidLimiterHour, attachUser, async (req, res) => {
  try {
    const record = await getPayment(req.params.checkoutRequestId);
    if (!record || record.status !== 'paid') {
      return res.status(402).json({ error: 'Payment not confirmed yet.' });
    }
    const { docType, templateKey, fields, language } = req.body || {};
    // The payment record names the docType that was paid for - never generate
    // a different (possibly pricier) document against the same reference.
    if (record.docType && docType !== record.docType) {
      return res.status(403).json({ error: 'This payment was for a different document. Please start a new payment.' });
    }
    const pdf = await generatePdf({
      docType,
      templateKey,
      fields: sanitizeFields(fields),
      language,
      watermark: false,
    });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition',
      `attachment; filename="${encodeURIComponent(String(docType || 'document').slice(0, 40))}-${uuidv4().slice(0, 8)}.pdf"`);
    res.setHeader('Cache-Control', 'no-store');
    res.send(pdf);

    if (req.user) {
      saveToLocker({ userId: req.user._id, docType, templateKey, fields: sanitizeFields(fields), language });
    }
  } catch (err) {
    console.error('Download error:', err.message);
    res.status(500).json({ error: 'Could not build the document' });
  }
});

app.use('/api/intasend', intasendRoutes);
app.use('/api/ai', aiRoutes);

// Ops: liveness probe plus a peek at which payment store backend is active.
// The IntaSend block fingerprints WHICH key variant is configured (first 5
// + last 4 chars only - never enough to leak the key), so a sandbox/live
// key mix-up is visible from the outside without touching the dashboard.
function maskKey(value) {
  if (!value) return null;
  const s = String(value);
  return `${s.slice(0, 5)}...${s.slice(-4)} (${s.length} chars)`;
}

app.get('/api/health', async (req, res) => {
  // Kick the Mongo connection so a freshly booted instance reports its real
  // backend after a moment - but never let a slow DB stall this probe
  // (it doubles as a liveness check), so cap the wait at 2.5s.
  await Promise.race([
    connectDb().catch(() => {}),
    new Promise((resolve) => setTimeout(resolve, 2500)),
  ]);
  const pub = process.env.INTASEND_PUBLIC_KEY || '';
  const production = process.env.INTASEND_ENV === 'production';
  const liveKey = pub.startsWith('ISPubKey_') && pub.includes('_live_');
  res.json({
    ok: true,
    uptime: process.uptime(),
    payments: storeStats(),
    intasend: {
      env: process.env.INTASEND_ENV || '(unset - sandbox)',
      host: production ? 'payment.intasend.com' : 'sandbox.intasend.com',
      publicKey: maskKey(pub),
      secretKey: maskKey(process.env.INTASEND_SECRET_KEY),
      redirectUrl: process.env.INTASEND_REDIRECT_URL || null,
      // Fingerprint of the webhook challenge (never the value) so a
      // dashboard-vs-Render mismatch is diagnosable from the outside.
      webhookChallenge: maskKey(process.env.INTASEND_WEBHOOK_CHALLENGE),
      keyMatchesEnv: Boolean(pub) && liveKey === production,
    },
  });
});

// Unknown API routes return JSON, not the SPA shell.
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.get('*', (req, res) => {
  // A branded 404 page for URLs that look like web pages.
  if (req.method === 'GET' && !path.extname(req.path)) {
    res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
    return;
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  sentry.capture(err, req, { handler: 'express' });
  if (res.headersSent) return;
  res.status(500).json({ error: 'Something went wrong. Please try again.' });
});

// Errors that bypass Express entirely (crashed async chains, bugs in
// non-request code) still reach Sentry before the process dies.
process.on('uncaughtException', (err) => {
  console.error('uncaughtException:', err.message);
  sentry.capture(err, null, { handler: 'uncaughtException' });
});
process.on('unhandledRejection', (reason) => {
  console.error('unhandledRejection:', reason && reason.message ? reason.message : reason);
  sentry.capture(reason instanceof Error ? reason : new Error(String(reason)), null, { handler: 'unhandledRejection' });
});

const PORT = process.env.PORT || 10000;
sentry.init(); // no-op unless SENTRY_DSN is set in the environment
const server = app.listen(PORT, () => console.log(`KDocs-Pro running on port ${PORT}`));

// Graceful shutdown so in-flight PDF generations and payment writes finish.
function shutdown(signal) {
  console.log(`${signal} received - shutting down gracefully...`);
  sentry.close(2000).catch(() => {}); // flush any queued error events
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 10000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
