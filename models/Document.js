const mongoose = require('mongoose');

// We store the FIELDS the person typed, not the PDF itself - regenerating
// on demand is far cheaper on storage, and always reflects the exact
// content/template/language they paid for.
const documentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  docType: { type: String, required: true },
  templateKey: { type: String, required: true },
  language: { type: String, default: 'en' },
  fields: { type: mongoose.Schema.Types.Mixed, default: {} },
  label: { type: String, required: true }, // e.g. "CV / Resume"
  downloadedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.models.Document || mongoose.model('Document', documentSchema);
