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
const { generatePdf } = require('./utils/pdfGenerator');
const { STAGES, TEMPLATE_STYLES } = require('./utils/templates');
const { LANGUAGES } = require('./utils/docTranslations');
const { computeReadyScore } = require('./utils/readyScore');
const { router: authRoutes, attachUser } = require('./routes/auth');
const { router: lockerRoutes, saveToLocker } = require('./routes/locker');
const { getPayment, storeStats } = require('./utils/paymentStore');
const { sanitizeFields } = require('./utils/validate');

const app = express();
app.set('trust proxy', 1); // Render runs behind a proxy; needed for rate limiting
app.disable('x-powered-by');

// Security headers (CSP is intentionally not set here because the preview
// renders PDFs into iframes from blob: URLs; API responses are JSON).
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'same-site' },
}));

// Paid endpoints are behind Safaricom's proxy too, so keep this permissive but
// explicit rather than "allow every origin with credentials" forever.
const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
app.use(cors({
  origin: allowedOrigins.length ? allowedOrigins : true,
  credentials: true,
}));

app.use(compression());
app.use(express.json({ limit: '256kb' }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '1h' }));

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
app.use('/api', generalLimiter);

// So the frontend can build its menus from one source of truth
app.get('/api/catalog', (req, res) => {
  res.json({
    stages: STAGES,
    templates: TEMPLATE_STYLES,
    languages: LANGUAGES,
    priceKes: process.env.PRICE_KES || 20,
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

// Free "Ready Score" - a rule-based best-practices checklist, recomputed
// live while the person edits. Never gated behind payment - it's part of
// helping them improve the document before they decide to pay.
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
