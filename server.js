require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
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
const { sanitizeFields } = require('./utils/validate');
const { issueToken, requireCsrfToken } = require('./middleware/csrf');

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
const paidLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many payment attempts. Please wait a few minutes and try again.' },
});
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.' },
});
// Tighter, targeted limits: credential stuffing on auth, abuse of payment
// initiation. Each returns a clean JSON 429, never a crash.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many sign-in attempts. Please wait 15 minutes and try again.' },
});
const initiateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many payment attempts. Please wait 15 minutes and try again.' },
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/signup', authLimiter);
app.use('/api/auth/google', authLimiter);
app.use('/api/intasend/initiate', initiateLimiter);
app.use('/api', generalLimiter);

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

// Free KDocs AI analysis (structural checklist + suggestions) - a superset
// of the original Ready Score, kept at the same URL for compatibility.
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
app.post('/api/download/:checkoutRequestId', paidLimiter, attachUser, async (req, res) => {
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
app.get('/api/health', (req, res) => {
  res.json({ ok: true, uptime: process.uptime(), payments: storeStats() });
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
  if (res.headersSent) return;
  res.status(500).json({ error: 'Something went wrong. Please try again.' });
});

const PORT = process.env.PORT || 10000;
const server = app.listen(PORT, () => console.log(`KDocs-Pro running on port ${PORT}`));

// Graceful shutdown so in-flight PDF generations and payment writes finish.
function shutdown(signal) {
  console.log(`${signal} received - shutting down gracefully...`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 10000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
