require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const darajaRoutes = require('./routes/daraja');
const { generatePdf } = require('./utils/pdfGenerator');
const { STAGES, TEMPLATE_STYLES } = require('./utils/templates');
const { computeReadyScore } = require('./utils/readyScore');
const { router: authRoutes } = require('./routes/auth');

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// So the frontend can build its menus from one source of truth
app.get('/api/catalog', (req, res) => {
  res.json({ stages: STAGES, templates: TEMPLATE_STYLES, priceKes: process.env.PRICE_KES || 20 });
});

// Public (non-secret) config the frontend needs - lets the UI gracefully
// hide the Google button if Google sign-in hasn't been set up yet.
app.get('/api/config', (req, res) => {
  res.json({ googleClientId: process.env.GOOGLE_CLIENT_ID || null });
});

app.use('/api/auth', authRoutes);


// Free, watermarked preview - this is what the user sees before paying
app.post('/api/preview', async (req, res) => {
  try {
    const { docType, templateKey, fields } = req.body;
    const pdf = await generatePdf({ docType, templateKey, fields, watermark: true });
    res.setHeader('Content-Type', 'application/pdf');
    res.send(pdf);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not build preview' });
  }
});

// Free "Ready Score" - a rule-based best-practices checklist, recomputed
// live while the person edits. Never gated behind payment - it's part of
// helping them improve the document before they decide to pay.
app.post('/api/score', (req, res) => {
  try {
    const { docType, fields } = req.body;
    const result = computeReadyScore(docType, fields || {});
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not compute Ready Score' });
  }
});

// Clean download - ONLY reachable if the checkoutRequestId is marked "paid"
app.post('/api/download/:checkoutRequestId', async (req, res) => {
  try {
    const payments = global.__kdocsPayments || {};
    const record = payments[req.params.checkoutRequestId];
    if (!record || record.status !== 'paid') {
      return res.status(402).json({ error: 'Payment not confirmed yet.' });
    }
    const { docType, templateKey, fields } = req.body;
    const pdf = await generatePdf({ docType, templateKey, fields, watermark: false });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${docType}-${uuidv4().slice(0, 8)}.pdf"`);
    res.send(pdf);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not build the document' });
  }
});

app.use('/api/daraja', darajaRoutes);
app.use('/api/intasend', require('./routes/intasend'));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`KDocs-Pro running on port ${PORT}`));
