const express = require('express');
const { analyzeDocument } = require('../utils/aiAnalyzer');
const { sanitizeFields, isNonEmptyString } = require('../utils/validate');

const router = express.Router();

// POST /api/ai/analyze  { docType, fields, jdText? }
// Ready Score v1: rule-based CV review + job-description keyword matching +
// per-document improvement suggestions. Runs only on what the user typed,
// never invents personal facts, and never calls any external AI service.
router.post('/analyze', async (req, res) => {
  try {
    const { docType, fields = {}, jdText = '' } = req.body || {};
    if (!isNonEmptyString(docType, 64)) {
      return res.status(400).json({ error: 'docType is required' });
    }
    const result = analyzeDocument(docType, sanitizeFields(fields), isNonEmptyString(jdText, 20000) ? jdText : '');
    res.json(result);
  } catch (err) {
    console.error('AI analyze error:', err.message);
    res.status(500).json({ error: 'Could not analyze the document' });
  }
});

module.exports = router;
