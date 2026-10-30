const express = require('express');
const multer = require('multer');
const router = express.Router();

// POST /api/scan/convert - multipart upload of photographed pages, returns a
// single PDF. This powers the free "Scan & convert" tool: the customer takes
// photos of a paper document (or picks them from their gallery) and gets one
// clean PDF back - no account, no payment.
//
// Abuse posture: uploads are parsed into memory, so every input is capped -
// 15 pages x 6MB each per submission, JPEG/PNG only - and the endpoint sits
// behind its own rate-limit bucket in server.js. Photos are used solely to
// build the returned PDF; nothing is stored server-side.
const { buildScanPdf } = require('../utils/scanPdf');
const sentry = require('../utils/sentry');

const MAX_PAGES = 15;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { files: MAX_PAGES, fileSize: 6 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    if (['image/jpeg', 'image/png'].includes(file.mimetype)) return cb(null, true);
    cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname));
  },
});

router.post('/convert', upload.array('images', MAX_PAGES), async (req, res) => {
  try {
    const files = req.files || [];
    if (files.length === 0) {
      return res.status(400).json({ error: 'Add at least one page first - take or choose a photo.' });
    }
    const pdf = await buildScanPdf(files);
    const stamp = new Date().toISOString().slice(0, 16).replace(/[^0-9T]/g, '');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="kdocs-scan-${stamp}.pdf"`);
    res.setHeader('Cache-Control', 'no-store');
    res.send(pdf);
    console.log(`Scan convert: ${files.length} page(s) -> PDF (${Math.round(pdf.length / 1024)}KB)`);
  } catch (err) {
    console.error('Scan convert error:', err.message);
    sentry.capture(err, req, { handler: 'scan:convert' });
    res.status(500).json({ error: 'Could not build the PDF. Please try again.' });
  }
});

// Multer rejects malformed uploads with structured errors that would
// otherwise fall through to the generic 500 handler - turn them into clean,
// honest 400s.
// eslint-disable-next-line no-unused-vars
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    const msg = err.code === 'LIMIT_FILE_SIZE'
      ? 'One of the photos is larger than 6MB. Try scanning that page again.'
      : err.code === 'LIMIT_FILE_COUNT'
        ? `Maximum ${MAX_PAGES} pages per PDF. Split very long documents into two scans.`
        : 'That upload was rejected - JPEG or PNG photos only, e.g. pages taken with your camera.';
    return res.status(400).json({ error: msg });
  }
  console.error('Scan route error:', err.message);
  res.status(500).json({ error: 'Something went wrong with the upload. Please try again.' });
});

module.exports = router;
