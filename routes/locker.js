const express = require('express');
const { attachUser } = require('./auth');
const Document = require('../models/Document');
const { generatePdf } = require('../utils/pdfGenerator');
const { STAGES } = require('../utils/templates');

const router = express.Router();

function labelFor(docType) {
  for (const stage of Object.values(STAGES)) {
    if (stage.documents[docType]) return stage.documents[docType].label;
  }
  return docType;
}

// List everything the signed-in person has downloaded, newest first.
router.get('/', attachUser, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Sign in to see your document locker.' });
  try {
    const docs = await Document.find({ userId: req.user._id }).sort({ downloadedAt: -1 }).limit(200);
    res.json({ documents: docs });
  } catch (err) {
    console.error('Locker list error:', err.message);
    res.status(500).json({ error: 'Could not load your documents.' });
  }
});

// Re-download a past document, regenerated fresh (clean, no watermark) -
// only the person who originally saved it can pull it back.
router.get('/:id/download', attachUser, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Sign in to access your document locker.' });
  try {
    const doc = await Document.findOne({ _id: req.params.id, userId: req.user._id });
    if (!doc) return res.status(404).json({ error: 'Document not found.' });

    const pdf = await generatePdf({
      docType: doc.docType,
      templateKey: doc.templateKey,
      fields: doc.fields,
      language: doc.language,
      watermark: false,
    });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${doc.docType}.pdf"`);
    res.send(pdf);
  } catch (err) {
    console.error('Locker re-download error:', err.message);
    res.status(500).json({ error: 'Could not rebuild that document.' });
  }
});

router.delete('/:id', attachUser, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Sign in required.' });
  try {
    await Document.deleteOne({ _id: req.params.id, userId: req.user._id });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Could not remove that document.' });
  }
});

// Called internally (not a public route) right after a paid download succeeds.
async function saveToLocker({ userId, docType, templateKey, fields, language }) {
  try {
    await Document.create({ userId, docType, templateKey, fields, language, label: labelFor(docType) });
  } catch (err) {
    console.error('Could not save to locker:', err.message);
    // Never let a locker-save failure break the actual download the person paid for.
  }
}

module.exports = { router, saveToLocker };
