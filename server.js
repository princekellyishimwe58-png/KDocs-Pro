require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const intasendRoutes = require('./routes/intasend');
const darajaRoutes = require('./routes/daraja');
const scanRoutes = require('./routes/scan');
const pdfToolsRoutes = require('./routes/pdfTools');
const aiRoutes = require('./routes/ai');
const { generatePdf } = require('./utils/pdfGenerator');
const { STAGES, TEMPLATE_STYLES } = require('./utils/templates');
const { DOC_GUIDES } = require('./utils/docGuides');
const { topicRelatedKeys } = require('./utils/topicLinks');
const { LANGUAGES } = require('./utils/docTranslations');
const { computeReadyScore } = require('./utils/readyScore');
const { PRICES, PRICE_DEFAULT_KES } = require('./utils/pricing');
const { router: authRoutes, attachUser } = require('./routes/auth');
const { router: lockerRoutes, saveToLocker } = require('./routes/locker');
const { getPayment, storeStats } = require('./utils/paymentStore');
const { buildHealthPayload } = require('./utils/health');
const { connectDb } = require('./utils/db');
const { sanitizeFields } = require('./utils/validate');
const { issueToken, requireCsrfToken } = require('./middleware/csrf');
const sentry = require('./utils/sentry');
const { trackEvent, KNOWN_EVENTS } = require('./utils/metrics');
const { siteOrigin, redirectTarget, injectOrigin, hostOf } = require('./utils/site');
const { renderSitemap, renderRobots } = require('./utils/sitemap');

const { slidingLimiter, ipKeyGenerator } = require('./middleware/rateLimit');

const app = express();
app.set('trust proxy', 1); // Render runs behind a proxy; needed for rate limiting
app.disable('x-powered-by');

// Security headers. CSP is explicit below - these are ALL the external
// sources the app actually uses:
//   scripts:  'self' (app.js) + https://accounts.google.com (Google Sign-In)
//             + https://static.cloudflareinsights.com (Web Analytics beacon,
//             only injected when CLOUDFLARE_ANALYTICS_TOKEN is configured)
//   styles:   'self' (style.css); 'unsafe-inline' kept only because the
//             Google button injects inline styles into our DOM
//   frames:   blob: (PDF previews render into blob-URL iframes)
//             + https://accounts.google.com (Google Sign-In iframe)
//   connects: 'self' + https://accounts.google.com (GSI token calls)
//             + https://cloudflareinsights.com (analytics beacon payloads)
//   images:   'self' + data: (favicons/inline icons)
// Everything else (objects, plugins, embedding) is locked down.
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      "default-src": ["'self'"],
      "script-src": ["'self'", "https://accounts.google.com", "https://static.cloudflareinsights.com"],
      "style-src": ["'self'", "'unsafe-inline'"],
      "img-src": ["'self'", "data:"],
      "connect-src": ["'self'", "https://accounts.google.com", "https://cloudflareinsights.com"],
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

// The public origin, from SITE_URL. Everything absolute (canonical, og:url,
// sitemap, robots, schema.org @id) derives from it, so pointing the site at a
// custom domain is one environment variable - see utils/site.js.
const SITE_URL = siteOrigin();

// Canonical-host redirect. While SITE_URL is unset this is the same host the
// app is already served on, so it does nothing; the moment a real domain is
// configured, every page moved here from the Render host 301s to it and the
// old URL keeps its accumulated signals. API paths and internal/loopback
// hosts are exempt (see utils/site.js) so health checks cannot be redirected.
app.use((req, res, next) => {
  const target = redirectTarget({
    method: req.method,
    host: req.headers.host,
    originalUrl: req.originalUrl,
    origin: SITE_URL,
  });
  if (!target) return next();
  // 301 for GET/HEAD so crawlers consolidate on the new host; keep the path
  // and query intact so deep links and payment returns still land correctly.
  return res.redirect(301, target);
});

// Generated, not static: sitemap URLs and the robots.txt Sitemap line follow
// SITE_URL, and the document list cannot drift from what the app can build.
function sendText(type) {
  return (req, res) => {
    res.type(type);
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(type === 'application/xml' ? renderSitemap(SITE_URL) : renderRobots(SITE_URL));
  };
}
app.get('/sitemap.xml', sendText('application/xml'));
app.get('/robots.txt', sendText('text/plain'));

// Hand-maintained HTML pages carry __SITE_ORIGIN__ / __SITE_HOST__ instead of a
// literal domain, so they follow SITE_URL too. Registered before the static
// handler below, which would otherwise serve the raw tokens.
const TOKEN_PAGES = ['/index.html', '/about.html', '/terms.html', '/privacy.html', '/refund.html', '/delete-account.html', '/404.html'];
const pageCache = new Map(); // absPath -> { mtimeMs, html }
function tokenPageHtml(absPath) {
  const mtimeMs = fs.statSync(absPath).mtimeMs;
  const hit = pageCache.get(absPath);
  if (!hit || hit.mtimeMs !== mtimeMs) {
    pageCache.set(absPath, { mtimeMs, html: fs.readFileSync(absPath, 'utf8') });
  }
  return injectOrigin(pageCache.get(absPath).html, SITE_URL);
}
for (const page of TOKEN_PAGES) {
  app.get(page, (req, res) => {
    res.type('html').send(tokenPageHtml(path.join(__dirname, 'public', page)));
  });
}
// Short cache so security/UX fixes in these files reach browsers fast;
// files are tiny and gzip'd, so the performance cost is negligible.
// index: false so "/" falls through to serveShell, which injects the crawlable
// document catalog into the homepage HTML (a static index.html would serve the
// un-rendered placeholder instead).
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '5m', index: false }));

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

// Scan-to-PDF: uploads are heavy (up to 15 x 6MB parsed into memory) and
// building the PDF costs CPU, so a generous-per-human cap (20 conversions
// per rolling 15 minutes) keeps scripted bulk-conversion abuse uneconomical
// without ever touching a person scanning a few pages.
const scanLimiter = slidingLimiter({
  windowMs: 15 * 60 * 1000, limit: 20,
  name: 'scan',
  message: { error: 'Too many scans right now. Please wait a few minutes.' },
});

// PDF tools (merge / extract / remove / rotate): same shape as scan -
// uploads parsed into memory and CPU spent per call, so a generous-per-human
// cap on a rolling window keeps bulk scripting uneconomical.
const pdfToolsLimiter = slidingLimiter({
  windowMs: 15 * 60 * 1000, limit: 20,
  name: 'pdftools',
  message: { error: 'Too many PDF operations right now. Please wait a few minutes.' },
});

// Bucket 1 of the spec: 5 payment initiations per rolling 15 minutes.
// Every initiate reaches the live provider (IntaSend or Daraja), so abuse
// here is the expensive path.
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

// Provider callbacks (IntaSend webhook + Safaricom Daraja callback):
// providers retry failed deliveries with exponential delays, and the
// general-per-IP budget must not apply to them - all callbacks for every
// customer arrive from a small set of provider IPs, so a shared 100/day IP
// ceiling here would drop real payment confirmations. They keep a generous
// sliding window instead.
const webhookLimiter = slidingLimiter({
  windowMs: 15 * 60 * 1000, limit: 120,
  name: 'webhook',
  keyGenerator: ipKeyGenerator(),
  message: { error: 'Webhook rate limit exceeded.' },
});

// The live preview / Ready Score trio fires on every typing pause (~1s
// debounce), so a sustained writing session can consume hundreds of calls
// an hour. Counting those against a daily cap would lock out the app's
// most engaged real users, so they get their own generous window instead:
// 500 per rolling 10 minutes blocks runaway scripts while never touching a
// human (maximum realistic typing is ~60/minute). They still pass through
// the shared per-minute budget below as an automation backstop.
const previewLimiter = slidingLimiter({
  windowMs: 10 * 60 * 1000, limit: 500,
  name: 'preview',
  message: { error: 'Too many preview requests. Please pause for a moment.' },
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
// minute and 400 per rolling 24 hours, keyed per signed-in credential or
// per IP for anonymous traffic. The daily ceiling was raised from the
// original 100 after measuring real usage: the live preview fires on every
// typing pause, so a day of writing legitimately spends 200-300 calls.
// 400/day keeps scripted abuse uneconomical while never locking out a
// human writer. The preview/score trio is additionally exempt from the
// DAILY cap (it has its own 500/10min window above); the per-minute cap
// still applies to it as an automation backstop. The webhook path is
// excluded from both shared budgets (own IP-keyed window above) so a
// provider retry storm cannot starve customer traffic.
const isWebhook = (req) =>
  req.path.startsWith('/intasend/webhook') || req.path.startsWith('/daraja/callback');
const isPreviewTrio = (req) =>
  req.path.startsWith('/preview') || req.path.startsWith('/score') || req.path.startsWith('/ai/analyze');
// Catalog/config are two cheap, public GETs every screen boots on. Keeping
// them inside the shared minute budget meant a burst of preview renders
// could 429 the very first load and leave a visitor on a broken page -
// they are exempt from the two shared budgets (all payment/action caps
// still fully apply to them).
const isPublicBootGet = (req) =>
  req.method === 'GET' && (req.path === '/catalog' || req.path === '/config');
const generalMinuteLimiter = slidingLimiter({
  windowMs: 60 * 1000, limit: 60,
  name: 'general-minute',
  skip: (req) => isWebhook(req) || isPublicBootGet(req),
  message: { error: 'Too many requests. Please slow down.' },
});
const generalDailyLimiter = slidingLimiter({
  windowMs: 24 * 60 * 60 * 1000, limit: 400,
  name: 'general-day',
  skip: (req) => isWebhook(req) || isPreviewTrio(req) || isPublicBootGet(req),
  message: { error: "You've reached today's free usage limit. Please try again tomorrow." },
});

// Mounting order: specific limiters first (they stack - e.g. account
// deletion hits both the auth and the deletion windows), then the general
// per-minute + per-day budget on everything else under /api.
app.use('/api/intasend/webhook', webhookLimiter);
app.use('/api/daraja/callback', webhookLimiter);
app.use('/api/auth', authLimiter);
app.use('/api/auth/signup', signupLimiter);
app.use('/api/auth/account', deletionLimiter);
app.use('/api/intasend/initiate', initiateLimiter);
app.use('/api/intasend/diagnose', initiateLimiter); // each call does live provider requests
app.use('/api/daraja/initiate', initiateLimiter);
app.use('/api/daraja/diagnose', initiateLimiter); // each call does a live OAuth request
app.use('/api/scan', scanLimiter);
app.use('/api/pdftools', pdfToolsLimiter);
app.use('/api/preview', previewLimiter);
app.use('/api/score', previewLimiter);
app.use('/api/ai/analyze', previewLimiter);
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

// Which payment provider is active. Daraja (direct M-Pesa STK push) is
// active whenever its consumer key is configured - the sandbox/live switch
// comes from DARAJA_ENV - and IntaSend falls back otherwise. Setting
// PAYMENT_PROVIDER=intasend (or daraja) overrides the auto-detection, so a
// temporary switch never requires deleting key material.
function paymentProvider() {
  const explicit = (process.env.PAYMENT_PROVIDER || '').trim().toLowerCase();
  if (explicit === 'daraja' || explicit === 'intasend') return explicit;
  if (process.env.DARAJA_CONSUMER_KEY) return 'daraja';
  return 'intasend';
}

// So the frontend can build its menus and prices from one source of truth.
// `prices` is per-document; `priceKes` stays for backward compatibility.
app.get('/api/catalog', (req, res) => {
  const provider = paymentProvider();
  res.json({
    stages: STAGES,
    guides: DOC_GUIDES,
    related: relatedMap(),
    templates: TEMPLATE_STYLES,
    languages: LANGUAGES,
    prices: PRICES,
    priceKes: PRICE_DEFAULT_KES,
    paymentProvider: provider,
    // Lets the frontend show a clear "test mode" notice until the active
    // provider is live.
    paymentMode: provider === 'daraja'
      ? (process.env.DARAJA_ENV === 'production' ? 'live' : 'test')
      : (process.env.INTASEND_ENV === 'production' ? 'live' : 'test'),
  });
});

// Funnel pings from the browser, best-effort only (template picked, scan
// converted). The payment/download steps are counted server-side in their
// real routes - those can't be spoofed and don't need client code. CSRF +
// the shared per-IP API budgets apply; unknown event names are ignored.
app.post('/api/track', (req, res) => {
  trackEvent(req.body && req.body.event, req.body && req.body.docType);
  res.status(204).end();
});

// Public (non-secret) config the frontend needs - lets the UI gracefully
// hide the Google button if it hasn't been set up yet.
app.get('/api/config', (req, res) => {  res.json({
    googleClientId: process.env.GOOGLE_CLIENT_ID || null,
    // Cloudflare Web Analytics token (public, cookieless, privacy-friendly).
    // The frontend injects the beacon only when this is set, so turn
    // analytics on/off from the Render environment without code changes.
    analyticsToken: process.env.CLOUDFLARE_ANALYTICS_TOKEN || null,
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

    // Funnel metrics: a clean PDF was actually delivered (fire-and-forget).
    trackEvent('download_completed', docType);

    if (req.user) {
      saveToLocker({ userId: req.user._id, docType, templateKey, fields: sanitizeFields(fields), language });
    }
  } catch (err) {
    console.error('Download error:', err.message);
    res.status(500).json({ error: 'Could not build the document' });
  }
});

app.use('/api/intasend', intasendRoutes);
app.use('/api/daraja', darajaRoutes);
app.use('/api/scan', scanRoutes);
app.use('/api/pdftools', pdfToolsRoutes);
app.use('/api/ai', aiRoutes);

// Ops: liveness probe plus a peek at which payment store backend is active.
// This endpoint is PUBLIC and unauthenticated, so it reports only whether each
// secret is configured - never a fragment of it. See utils/health.js: an earlier
// version echoed "first 5 ... last 4 (NN chars)" of the IntaSend secret key and
// webhook challenge, which is a leak, not a fingerprint.
app.get('/api/health', async (req, res) => {
  // Kick the Mongo connection so a freshly booted instance reports its real
  // backend after a moment - but never let a slow DB stall this probe
  // (it doubles as a liveness check), so cap the wait at 2.5s.
  await Promise.race([
    connectDb().catch(() => {}),
    new Promise((resolve) => setTimeout(resolve, 2500)),
  ]);
  res.json(buildHealthPayload({
    activeProvider: paymentProvider(),
    payments: storeStats(),
    uptime: process.uptime(),
  }));
});

// Unknown API routes return JSON, not the SPA shell.
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Frontend routes: the shell is one page with client-side routing, so
// deep links to each screen (and refreshes on them) must return the app
// shell with HTTP 200, not the branded 404. Legal pages (terms.html etc.)
// are real static files and unaffected.
const SPA_ROUTES = new Set(['/', '/scan', '/tools', '/template', '/write']);
const DOC_KEYS = new Set(Object.values(STAGES).flatMap((s) => Object.keys(s.documents)));


// SEO: every route gets its own <title>, canonical URL and Open Graph tags,
// injected into the cached shell before it is served. Crawlers often skip
// JavaScript, so without this they see one generic homepage for every URL.
// /write is a private editing/payment screen, so it is marked noindex.
const SHELL_FILE = path.join(__dirname, 'public', 'index.html');
let shellCache = null; // { mtimeMs, html }
function shellHtml() {
  const mtimeMs = fs.statSync(SHELL_FILE).mtimeMs;
  if (!shellCache || shellCache.mtimeMs !== mtimeMs) {
    shellCache = { mtimeMs, html: fs.readFileSync(SHELL_FILE, 'utf8') };
  }
  return shellCache.html;
}

function escAttr(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function metaForRoute(pathname) {
  if (pathname === '/scan') {
    return {
      title: 'Free Scan to PDF — photograph any paper, get one clean PDF',
      description: 'Photograph each page of a paper document and turn them into one clean, multipage PDF - free, nothing is stored. From KDocs-Pro.',
    };
  }
  if (pathname === '/tools') {
    return {
      title: 'Free PDF tools — photos to PDF, merge, split and rotate',
      description: 'Turn JPG/PNG photos into a PDF, merge PDFs into one file, extract or delete pages, and fix sideways pages - free, nothing is stored, works on your phone. From KDocs-Pro.',
    };
  }
  if (pathname === '/template') {
    return {
      title: 'Choose your document template',
      description: 'Compare live, sample-filled previews of every KDocs-Pro template before you pay for a clean PDF download.',
    };
  }
  if (pathname === '/write') {
    return {
      title: 'Write, preview & pay - KDocs-Pro',
      description: 'Write your document, get a free watermarked preview with Ready Score coaching, then pay for the clean PDF.',
      noindex: true,
    };
  }
  const m = pathname.match(/^\/doc\/([a-z0-9_]+)$/);
  if (m && DOC_KEYS.has(m[1])) {
    const docKey = m[1];
    let doc = { label: 'Document', description: '' };
    for (const stage of Object.values(STAGES)) if (stage.documents[docKey]) doc = stage.documents[docKey];
    const price = PRICES[docKey] !== undefined ? PRICES[docKey] : PRICE_DEFAULT_KES;
    // Prefer the guide's own opening sentence: it describes this one document
    // (what it is, when it is used) instead of repeating the catalog blurb.
    const guide = DOC_GUIDES[docKey];
    const description = guide && guide.intro
      ? `${plainGuideText(guide.intro).slice(0, 152).replace(/\s+\S*$/, '')}…`
      : `${doc.description} Free watermarked preview with Ready Score coaching; KSh ${price} for the clean PDF via M-Pesa, card or bank.`;
    return {
      title: `${doc.label} - make yours online, PDF from KSh ${price}`,
      description,
    };
  }
  return null; // homepage keeps its hand-written defaults
}

// Cross-linked related documents on /doc/<key> landings, injected into the
// served HTML so crawlers (no JavaScript) can follow the internal links.
// The client rebuilds the same section when navigating between landings.
//
// Order matters: the curated subject-level links (utils/topicLinks.js) come
// first, because the reader's next document usually lives in another stage -
// a resignation letter leads to the handover report, not to a cover letter.
// Same-stage siblings and then a fallback list top the row up to six, so a
// landing never shows a stub row.
const RELATED_FALLBACK_ORDER = [
  'cv', 'cover_letter', 'resignation', 'job_application',
  'recommendation_letter', 'experience_certificate', 'handover_report',
];

function relatedDocKeys(docKey, limit = 6) {
  const out = [];
  const add = (k) => {
    if (k && k !== docKey && !out.includes(k) && out.length < limit) out.push(k);
  };
  topicRelatedKeys(docKey).forEach(add);
  for (const stage of Object.values(STAGES)) {
    if (stage.documents[docKey]) {
      Object.keys(stage.documents).forEach(add);
      break;
    }
  }
  RELATED_FALLBACK_ORDER.forEach(add);
  return out;
}

// One map for both renderers, so the server HTML and the SPA never disagree
// about which documents a landing links to.
function relatedMap() {
  const map = {};
  for (const stage of Object.values(STAGES)) {
    for (const key of Object.keys(stage.documents)) map[key] = relatedDocKeys(key);
  }
  return map;
}

function relatedDocsHtml(docKey) {
  const keys = relatedDocKeys(docKey);
  if (!keys.length) return '';
  const cards = keys.map((k) => {
    let doc = { label: 'Document', icon: '📄' };
    for (const s of Object.values(STAGES)) if (s.documents[k]) doc = s.documents[k];
    const price = PRICES[k] !== undefined ? PRICES[k] : PRICE_DEFAULT_KES;
    return `<a class="dl-related-card" href="/doc/${k}"><span class="dl-related-icon" aria-hidden="true">${escAttr(doc.icon || '📄')}</span><span class="dl-related-body"><b>${escAttr(doc.label)}</b><span class="dl-related-price">KSh ${price}</span></span></a>`;
  }).join('');
  return `<section class="dl-related"><h2>Related documents</h2><div class="dl-related-cards">${cards}</div></section>`;
}

// Crawlable catalog: the homepage cards are real <a href="/doc/..."> links in
// the served HTML, so Google can reach every document landing without running
// JavaScript. Without this the whole /doc/* set was orphaned - reachable only
// through the sitemap - and pages stayed "Discovered" or "unknown to Google".
// The client rebuilds the same markup after hydration, so nothing changes on
// screen.
function catalogHtml() {
  return Object.entries(STAGES).map(([, stage]) => {
    const cards = Object.entries(stage.documents).map(([docKey, doc]) => {
      const price = PRICES[docKey] !== undefined ? PRICES[docKey] : PRICE_DEFAULT_KES;
      return `<a class="doc-card" href="/doc/${escAttr(docKey)}">`
        + `<div class="doc-card-icon" aria-hidden="true">${escAttr(doc.icon || '\u{1F4C4}')}</div>`
        + `<h3>${escAttr(doc.label)}</h3>`
        + `<p>${escAttr(doc.description || '')}</p>`
        + '<div class="doc-card-meta">'
        + `<span class="doc-card-price">KSh ${price}</span>`
        + `<span class="doc-card-templates">${Object.keys(TEMPLATE_STYLES).length} templates</span>`
        + '</div></a>';
    }).join('');
    return `<div class="catalog-group"><div class="catalog-group-title">${escAttr(stage.label)}</div>`
      + `<div class="catalog-grid">${cards}</div></div>`;
  }).join('');
}

// Inline links inside guide prose. The text uses {{anchor text|doc_key}} so a
// sentence can point at the document a reader actually needs next; descriptive
// in-text anchors carry more weight than another card row. Unknown keys degrade
// to plain text rather than a broken link.

function plainGuideText(text) {
  return String(text).replace(/\{\{([^{}]+)\|([a-z0-9_]+)\}\}/g, '$1');
}

function richGuideHtml(text) {
  const re = /\{\{([^{}]+)\|([a-z0-9_]+)\}\}/g;
  const s = String(text);
  let out = '';
  let last = 0;
  let m;
  while ((m = re.exec(s)) !== null) {
    out += escAttr(s.slice(last, m.index));
    const label = m[1];
    const key = m[2];
    out += DOC_KEYS.has(key)
      ? `<a class="dl-inline-link" href="/doc/${escAttr(key)}">${escAttr(label)}</a>`
      : escAttr(label);
    last = m.index + m[0].length;
  }
  return out + escAttr(s.slice(last));
}

// Long-form landing content, server-rendered so a crawler sees the same guide a
// visitor sees (see utils/docGuides.js). The client rebuilds this block when it
// routes between landings inside the SPA.
function docGuideHtml(docKey) {
  const guide = DOC_GUIDES[docKey];
  if (!guide) return '';
  const blocks = (guide.sections || []).map((s) => `<section class="dl-guide-block"><h2>${escAttr(s.h)}</h2><ul>${s.items.map((i) => `<li>${richGuideHtml(i)}</li>`).join('')}</ul></section>`).join('');
  const sample = guide.sample
    ? `<section class="dl-guide-block dl-sample"><h2>Example line</h2><p>${richGuideHtml(guide.sample)}</p></section>`
    : '';
  const faqs = (guide.faqs || []).map((f) => `<div class="dl-faq-item"><h3>${richGuideHtml(f.q)}</h3><p>${richGuideHtml(f.a)}</p></div>`).join('');
  const faqBlock = faqs ? `<section class="dl-guide-block"><h2>Questions people ask</h2>${faqs}</section>` : '';
  return `<section class="dl-guide"><p class="dl-intro">${richGuideHtml(guide.intro)}</p><div class="dl-guide-grid">${blocks}</div>${sample}${faqBlock}</section>`;
}

// FAQPage structured data so the Q&A can surface as a rich result. Only the
// questions actually rendered on the page are included.
function faqJsonLd(docKey) {
  const guide = DOC_GUIDES[docKey];
  if (!guide || !guide.faqs || !guide.faqs.length) return '';
  const data = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: guide.faqs.map((f) => ({
      '@type': 'Question',
      name: plainGuideText(f.q),
      acceptedAnswer: { '@type': 'Answer', text: plainGuideText(f.a) },
    })),
  };
  return `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;
}

function serveShell(req, res, next) {
  if (req.method !== 'GET') return next();
  if (path.extname(req.path)) return next();
  const ok = SPA_ROUTES.has(req.path)
    || ([...DOC_KEYS].some((k) => req.path === `/doc/${k}`));
  if (!ok) return next();

  const docMatch = req.path.match(/^\/(doc)\/([a-z0-9_]+)$/);
  if (docMatch) trackEvent('landing_view', docMatch[2]);

  const meta = metaForRoute(req.path);
  let html = shellHtml();
  if (meta) {
    if (meta.title) {
      html = html
        .replace(/<title>[\s\S]*?<\/title>/, `<title>${escAttr(meta.title)} | KDocs Pro</title>`)
        .replace(/(<meta name="description" content=")[^"]*(")/, `$1${escAttr(meta.description)}$2`)
        .replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${SITE_URL}${escAttr(req.path)}$2`)
        .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${escAttr(meta.title)}$2`)
        .replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${escAttr(meta.description)}$2`)
        .replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${SITE_URL}${escAttr(req.path)}$2`);
    }
  }
  // Head-injected tags: noindex on the private screens, and Google Search
  // Console site verification when GOOGLE_SITE_VERIFICATION is configured.
  const headTags = [];
  if (meta && meta.noindex) headTags.push('<meta name="robots" content="noindex">');
  if (process.env.GOOGLE_SITE_VERIFICATION) {
    headTags.push(`<meta name="google-site-verification" content="${escAttr(process.env.GOOGLE_SITE_VERIFICATION)}">`);
  }
  if (docMatch) headTags.push(faqJsonLd(docMatch[2]));
  if (headTags.length) html = html.replace('</head>', `${headTags.join('\n')}\n</head>`);
  // Crawlable related-documents links (the client re-renders this live except on
  // first paint, so the placeholder only forms the server-rendered version).
  if (docMatch) html = html.replace('<!--DL_RELATED-->', relatedDocsHtml(docMatch[2]));
  if (docMatch) html = html.replace('<!--DL_GUIDE-->', docGuideHtml(docMatch[2]));
  // Same reasoning for the homepage catalog: it is the only crawlable path
  // from the front page to each /doc/<key> landing.
  if (req.path === '/') html = html.replace('<!--CATALOG_LIST-->', catalogHtml());
  res.type('html').send(injectOrigin(html, SITE_URL));
}

app.get('*', serveShell);

app.get('*', (req, res) => {
  // A branded 404 page for URLs that look like web pages.
  if (req.method === 'GET' && !path.extname(req.path)) {
    res.status(404).type('html').send(tokenPageHtml(path.join(__dirname, 'public', '404.html')));
    return;
  }
  res.type('html').send(tokenPageHtml(path.join(__dirname, 'public', 'index.html')));
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
