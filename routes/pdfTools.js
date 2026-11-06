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
  imagesToPdf,
  toolName,
  MAX_FILE_BYTES,
  MAX_FILES,
  MAX_IMAGE_BYTES,
  MAX_IMAGES,
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

// Photo picker for the images->PDF converter. Mimetypes lie across Android,
// iOS and WhatsApp, so the filter is deliberately loose (extension or image
// mimetype) and the real format is sniffed from magic bytes in utils/pdfTools.
const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { files: MAX_IMAGES, fileSize: MAX_IMAGE_BYTES },
  fileFilter(req, file, cb) {
    const looksImage = (file.mimetype || '').startsWith('image/')
      || /\.(jpe?g|png|heic|heif|webp)$/i.test(file.originalname || '');
    if (looksImage) return cb(null, true);
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
  // upload.array() fills req.files; upload.single() fills req.file. Accept
  // both so one handler serves every tool on this router.
  const files = req.files || (req.file ? [req.file] : []);
  if (!files.length) {
    return res.status(400).json({ error: 'Choose a file first.' });
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
    const friendly = /PDF|page|hundreds|45MB|password|degrees|photo|image|JPG|PNG|HEIC|WebP/i.test(err.message || '');
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

// POST /images - multipart "images": N photos/screenshots -> one PDF, one
// page per image in picker order. pageSize=a4|a4-portrait|original.
router.post('/images', imageUpload.array('images', MAX_IMAGES), async (req, res) => {
  await handleTool(res, req, async (files) => [
    await imagesToPdf(files, (req.body || {}).pageSize),
    'images',
  ]);
});

// Multer rejects malformed uploads with structured errors that would
// otherwise fall through to the generic 500 handler - turn them into clean,
// honest 400s.
// eslint-disable-next-line no-unused-vars
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    const msg = err.code === 'LIMIT_FILE_SIZE'
      ? 'One of the files is larger than the limit (15MB for PDFs, 8MB for photos).'
      : err.code === 'LIMIT_FILE_COUNT'
        ? 'Too many files in one go. Try a smaller batch.'
        : 'That upload was rejected - PDFs (or JPG/PNG photos) only.';
    return res.status(400).json({ error: msg });
  }
  console.error('PDF tools route error:', err.message);
  res.status(500).json({ error: 'Something went wrong with the upload. Please try again.' });
});

module.exports = router;
