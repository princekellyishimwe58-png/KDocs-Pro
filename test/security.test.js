const { test, describe } = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');
const { Payment } = require('../models/Payment');
const { TTL_MS } = require('../utils/paymentStore');
const { issueToken, requireCsrfToken, COOKIE_NAME } = require('../middleware/csrf');

describe('Payment model (MongoDB durability)', () => {
  test('has the fields a payment receipt needs', () => {
    const doc = new Payment({
      _id: 'kdocs_test_1',
      provider: 'intasend',
      status: 'paid',
      docType: 'cv',
      amountKes: 50,
      meta: { invoiceId: 'inv_1' },
    });
    const err = doc.validateSync();
    assert.strictEqual(err, undefined, `unexpected validation errors: ${err}`);
    assert.strictEqual(doc.amountKes, 50);
    assert.strictEqual(doc.status, 'paid');
    assert.ok(doc.createdAt === undefined || doc.createdAt instanceof Date);
  });

  test('rejects an unknown status and unknown provider', () => {
    const bad = new Payment({ _id: 'kdocs_x', provider: 'paypal', status: 'maybe' });
    const err = bad.validateSync();
    assert.ok(err && err.errors.provider && err.errors.status);
  });

  test('TTL is 90 days, not the old 24 hours', () => {
    assert.strictEqual(TTL_MS, 90 * 24 * 60 * 60 * 1000);
    const ttlIndex = Payment.schema.indexes().find(
      ([idx, opts]) => idx.createdAt && opts.expireAfterSeconds !== undefined
    );
    assert.ok(ttlIndex, 'createdAt TTL index exists');
    assert.strictEqual(ttlIndex[1].expireAfterSeconds, 90 * 24 * 60 * 60);
  });
});

function mockRes() {
  const res = {
    cookiesSet: [],
    headers: {},
    statusCode: null,
    body: null,
    cookie(name, value, opts) { this.cookiesSet.push({ name, value, opts }); return this; },
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
  };
  return res;
}

describe('CSRF double-submit middleware', () => {
  test('issues a cookie when none exists', () => {
    const req = { cookies: {} };
    const res = mockRes();
    let called = false;
    issueToken(req, res, () => { called = true; });
    assert.strictEqual(called, true);
    assert.strictEqual(res.cookiesSet.length, 1);
    assert.strictEqual(res.cookiesSet[0].name, COOKIE_NAME);
    assert.ok(res.cookiesSet[0].value.length >= 20);
    assert.strictEqual(req.csrfToken, res.cookiesSet[0].value);
  });

  test('keeps an existing valid cookie (stable token per session)', () => {
    const existing = 'a'.repeat(32);
    const req = { cookies: { [COOKIE_NAME]: existing } };
    const res = mockRes();
    issueToken(req, res, () => {});
    assert.strictEqual(res.cookiesSet.length, 0);
    assert.strictEqual(req.csrfToken, existing);
  });

  test('rejects a mutating request with no header', () => {
    const req = { cookies: { [COOKIE_NAME]: 'b'.repeat(32) }, get: () => undefined };
    const res = mockRes();
    let called = false;
    requireCsrfToken(req, res, () => { called = true; });
    assert.strictEqual(called, false);
    assert.strictEqual(res.statusCode, 403);
  });

  test('rejects a wrong or mismatched token', () => {
    const req = { cookies: { [COOKIE_NAME]: 'c'.repeat(32) }, get: (h) => (h === 'x-csrf-token' ? 'd'.repeat(32) : undefined) };
    const res = mockRes();
    requireCsrfToken(req, res, () => assert.fail('must not call next'));
    assert.strictEqual(res.statusCode, 403);
  });

  test('accepts header that exactly matches the cookie', () => {
    const token = 'e'.repeat(32);
    const req = { cookies: { [COOKIE_NAME]: token }, get: (h) => (h === 'x-csrf-token' ? token : undefined) };
    const res = mockRes();
    let called = false;
    requireCsrfToken(req, res, () => { called = true; });
    assert.strictEqual(called, true);
  });

  test('rejects when the cookie is missing entirely', () => {
    const token = 'f'.repeat(32);
    const req = { cookies: {}, get: (h) => (h === 'x-csrf-token' ? token : undefined) };
    const res = mockRes();
    requireCsrfToken(req, res, () => assert.fail('must not call next'));
    assert.strictEqual(res.statusCode, 403);
  });
});

describe('mongoose is only required, never connected, by tests', () => {
  test('models register cleanly without a connection', () => {
    assert.strictEqual(mongoose.connection.readyState, 0);
    assert.strictEqual(mongoose.models.Payment, Payment);
  });
});
