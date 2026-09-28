const mongoose = require('mongoose');
const { connectDb, isDbConnected } = require('./db');

// How long a payment record lives. Covers the polling window plus a generous
// re-download window; after that the customer would just pay again (KSh 20).
const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

const paymentRecordSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // Payment reference (IntaSend api_ref; 'daraja' kept for pre-existing records)
  provider: { type: String, enum: ['daraja', 'intasend'], required: true },
  status: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending', index: true },
  docType: { type: String, default: null },
  meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  createdAt: { type: Date, default: Date.now, index: { expires: '24h' } },
});

const PaymentRecord =
  mongoose.models.PaymentRecord || mongoose.model('PaymentRecord', paymentRecordSchema);

// In-memory mirror: ALWAYS written alongside Mongo, so a brief database
// hiccup never blocks a customer who already paid. Pruned lazily.
// NOTE: this fallback is per-process, so a multi-instance deployment needs
// the MongoDB URI set (then reads hit Mongo first anyway).
const memory = new Map();

function isExpired(record, now = Date.now()) {
  if (!record) return false;
  const created = record.createdAt instanceof Date
    ? record.createdAt.getTime()
    : new Date(record.createdAt || 0).getTime();
  return now - created > TTL_MS;
}

function pruneMemory(now = Date.now()) {
  for (const [id, rec] of memory) {
    if (isExpired(rec, now)) memory.delete(id);
  }
}

async function model() {
  if (!(await connectDb())) return null;
  return PaymentRecord;
}

// Create (or reset) a pending payment record.
async function putPayment(id, { provider, docType = null, meta = {} }) {
  if (!id) return null;
  const record = {
    _id: id,
    provider,
    status: 'pending',
    docType: docType || null,
    meta: meta || {},
    createdAt: new Date(),
  };
  memory.set(id, record);
  pruneMemory();
  try {
    const M = await model();
    if (M) await M.replaceOne({ _id: id }, record, { upsert: true });
  } catch (err) {
    console.error('Payment store write failed (memory copy still holds it):', err.message);
  }
  return record;
}

// Flip a record to paid/failed. Safe to call for ids we have never seen
// (e.g. the callback arriving before the store write replicated).
async function markPayment(id, status, extra = {}) {
  const mem = memory.get(id) || {
    _id: id,
    provider: extra.provider || 'intasend',
    status: 'pending',
    docType: extra.docType || null,
    meta: {},
    createdAt: new Date(),
  };
  mem.status = status;
  if (extra.receipt) mem.meta = { ...mem.meta, receipt: extra.receipt };
  if (extra.docType && !mem.docType) mem.docType = extra.docType;
  memory.set(id, mem);
  pruneMemory();
  try {
    const M = await model();
    if (M) {
      const setOps = { status };
      if (extra.receipt) setOps['meta.receipt'] = extra.receipt;
      await M.updateOne(
        { _id: id },
        {
          $set: setOps,
          $setOnInsert: {
            provider: extra.provider || 'intasend',
            docType: extra.docType || null,
            meta: extra.receipt ? { receipt: extra.receipt } : {},
            createdAt: new Date(),
          },
        },
        { upsert: true }
      );
    }
  } catch (err) {
    console.error('Payment store mark failed (memory copy still holds it):', err.message);
  }
  return mem;
}

// Reads prefer Mongo (durable), falling back to the in-memory mirror.
async function getPayment(id) {
  pruneMemory();
  try {
    const M = await model();
    if (M) {
      const rec = await M.findById(id).lean();
      if (rec) {
        memory.set(id, rec); // re-mirror so later reads survive a DB blip
        return isExpired(rec) ? null : rec;
      }
    }
  } catch (err) {
    console.error('Payment store read failed, using memory:', err.message);
  }
  const mem = memory.get(id);
  return isExpired(mem) ? null : mem || null;
}

function storeStats() {
  return { backend: isDbConnected() ? 'mongo' : 'memory', memoryRecords: memory.size };
}

module.exports = { putPayment, markPayment, getPayment, isExpired, TTL_MS, storeStats };
