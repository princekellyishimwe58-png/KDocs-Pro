const express = require('express');
const multer = require('multer');
const router = express.Router();

// POST /api/pdftools/* - the free "PDF tools" set (merge pages back together
// after a split, tidy up pages, fix rotation). Same abuse posture as
// scan-to-PDF: uploads parsed into memory, size-capped, nothing stored, and
// the whole family sits behind its own rate-limit bucket in server.js.
const {
  mergePdfs,
  extractPages,
  removePages,
  rotatePages,
  toolName,
  MAX_FILE_BYTES,
  MAX_FILES,
} = require('../utils/pdfTools');
const { trackEvent } = require('../utils/metrics');
const sentry = require('../utils/sentry');

// Phones and email clients label PDFs inconsistently, so accept by mimetype
// OR filename - anything else is rejected before parsing memory.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { files: MAX_FILES, fileSize: MAX_FILE_BYTES },
  fileFilter(req, file, cb) {
    const looksPdf = (file.mimetype || '').includes('pdf')
      || /\.pdf$/i.test(file.originalname || '');
    if (looksPdf) return cb(null, true);
    cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname));
  },
});

// Total-bytes guard across the whole submission (multer only checks per file).
function checkTotalBytes(req) {
  const total = (req.files || []).reduce((sum, f) => sum + (f.size || 0), 0);
  if (total > 45 * 1024 * 1024) {
    return 'Those files are together larger than 45MB. Process them in smaller batches.';
  }
  return null;
}

function sendPdf(res, pdf, filename) {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Cache-Control', 'no-store');
  res.send(pdf);
}

async function handleTool(res, req, run) {
  const files = req.files || [];
  if (!files.length) {
    return res.status(400).json({ error: 'Choose a PDF first.' });
  }
  const tooBig = checkTotalBytes(req);
  if (tooBig) return res.status(413).json({ error: tooBig });
  try {
    const [pdf, op] = await run(files);
    sendPdf(res, pdf, `kdocs-${toolName(op) || 'pdf'}-${Date.now() % 100000}.pdf`);
    trackEvent('pdf_tool_use', op || null);
  } catch (err) {
    console.error('PDF tools error:', err.message);
    sentry.capture(err, req, { handler: 'pdftools' });
    // Friendly, customer-readable messages (page range mistakes etc.) get a
    // 400; anything else stays an honest 500.
    const friendly = /PDF|page|hundreds|45MB|password|degrees/i.test(err.message || '');
    res.status(friendly ? 400 : 500).json({ error: err.message || 'Could not process that PDF. Please try again.' });
  }
}

// POST /merge - multipart "files": N PDFs -> one PDF, in upload order.
router.post('/merge', upload.array('files', MAX_FILES), async (req, res) => {
  await handleTool(res, req, async (files) => [
    await mergePdfs(files.map((f) => f.buffer)),
    'merge',
  ]);
});

// POST /organize - one PDF + op=extract|remove|rotate + pages (1-based spec)
// + rotation angle for rotate. Empty/oversized specs throw customer-readable
// errors that become 400s in handleTool.
router.post('/organize', upload.single('file'), async (req, res) => {
  await handleTool(res, req, async (files) => {
    const { op, pages, angle } = req.body || {};
    const buf = files[0].buffer;
    if (op === 'extract') return [await extractPages(buf, pages), op];
    if (op === 'remove') return [await removePages(buf, pages), op];
    if (op === 'rotate') return [await rotatePages(buf, angle, pages), op];
    throw new Error('Unknown operation.');
  });
});

// Multer rejects malformed uploads with structured errors that would
// otherwise fall through to the generic 500 handler - turn them into clean,
// honest 400s.
// eslint-disable-next-line no-unused-vars
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    const msg = err.code === 'LIMIT_FILE_SIZE'
      ? 'One of the PDFs is larger than 15MB.'
      : err.code === 'LIMIT_FILE_COUNT'
        ? `Maximum ${MAX_FILES} PDFs at once.`
        : 'That upload was rejected - PDF files only.';
    return res.status(400).json({ error: msg });
  }
  console.error('PDF tools route error:', err.message);
  res.status(500).json({ error: 'Something went wrong with the upload. Please try again.' });
});

module.exports = router;
