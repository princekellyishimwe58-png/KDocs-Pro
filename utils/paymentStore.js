const mongoose = require('mongoose');
const { connectDb, isDbConnected, lastDbError } = require('./db');
const { Payment } = require('../models/Payment');

// Payment durability: every payment lives in MongoDB (via models/Payment.js).
// A small in-memory mirror is ALWAYS written alongside Mongo so a brief
// database hiccup never blocks a customer who already paid - but Mongo is
// the source of truth for download gating, and records survive restarts.
//
// TTL: 90 days, from models/Payment.js. Covers re-downloads long after the
// purchase; the document locker holds saved documents indefinitely.

const TTL_MS = 90 * 24 * 60 * 60 * 1000;

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
  return Payment;
}

// Create (or reset) a pending payment record.
async function putPayment(id, { provider, docType = null, amountKes = null, meta = {} }) {
  if (!id) return null;
  const record = {
    _id: id,
    provider,
    status: 'pending',
    docType: docType || null,
    amountKes: amountKes === null || amountKes === undefined ? null : Number(amountKes),
    meta: meta || {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  memory.set(id, record);
  pruneMemory();
  try {
    const M = await model();
    if (M) {
      await M.replaceOne({ _id: id }, record, { upsert: true });
    }
  } catch (err) {
    console.error('Payment store write failed (memory copy still holds it):', err.message);
  }
  return record;
}

// Flip a record to paid/failed. Safe to call for ids we have never seen
// (e.g. verification racing ahead of the store write).
async function markPayment(id, status, extra = {}) {
  const mem = memory.get(id) || {
    _id: id,
    provider: extra.provider || 'intasend',
    status: 'pending',
    docType: extra.docType || null,
    amountKes: null,
    meta: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  mem.status = status;
  mem.updatedAt = new Date();
  if (extra.receipt) mem.meta = { ...mem.meta, receipt: extra.receipt };
  if (extra.docType && !mem.docType) mem.docType = extra.docType;
  memory.set(id, mem);
  pruneMemory();
  try {
    const M = await model();
    if (M) {
      const setOps = { status, updatedAt: new Date() };
      if (extra.receipt) setOps['meta.receipt'] = extra.receipt;
      if (extra.amountKes !== undefined && extra.amountKes !== null) setOps.amountKes = Number(extra.amountKes);
      await M.updateOne(
        { _id: id },
        {
          $set: setOps,
          $setOnInsert: {
            provider: extra.provider || 'intasend',
            docType: extra.docType || null,
            meta: extra.receipt ? { receipt: extra.receipt } : {},
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
  return {
    backend: isDbConnected() ? 'mongo' : 'memory',
    memoryRecords: memory.size,
    // Surface the actual connection failure so /api/health is actionable
    // instead of silently reporting "memory" forever.
    dbError: isDbConnected() ? null : (lastDbError() || (process.env.MONGODB_URI ? 'connecting' : 'MONGODB_URI not set')),
  };
}

module.exports = { putPayment, markPayment, getPayment, isExpired, TTL_MS, storeStats };
