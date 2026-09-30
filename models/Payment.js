// Canonical Payment record. This is the single definition of what a payment
// looks like in MongoDB - utils/paymentStore.js reads/writes through this
// model, and the download gate checks the `status` field here.
//
// Design notes:
// - `_id` is our own reference (e.g. `kdocs_<uuid>`), also sent to IntaSend
//   as api_ref, so lookups are direct by payment reference.
// - `amountKes` is stored at initiate time so receipts/support can always
//   answer "how much was this customer charged?" without trusting memory.
// - TTL: payments must outlive deploy restarts by a wide margin, so records
//   expire after 90 days (raised from 24h, which could strand a customer
//   who came back to re-download).

const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true }, // our payment reference
    provider: { type: String, enum: ['daraja', 'intasend'], required: true },
    status: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending', index: true },
    docType: { type: String, default: null },
    amountKes: { type: Number, default: null },
    // Provider-specific bits (invoiceId, docLabel, receipt) stay flexible.
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true, // createdAt + updatedAt, maintained by Mongo
  }
);

// Auto-expire paid/pending records after 90 days.
paymentSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 90 * 24 * 60 * 60 }
);

const Payment =
  mongoose.models.Payment || mongoose.model('Payment', paymentSchema);

module.exports = { Payment };
