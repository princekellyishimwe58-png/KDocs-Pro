const { test, describe } = require('node:test');
const assert = require('node:assert');
const { isExpired, TTL_MS } = require('../utils/paymentStore');

describe('paymentStore TTL logic', () => {
  test('fresh records are not expired', () => {
    const rec = { createdAt: new Date() };
    assert.strictEqual(isExpired(rec), false);
  });

  test('records older than the TTL are expired', () => {
    const rec = { createdAt: new Date(Date.now() - TTL_MS - 1000) };
    assert.strictEqual(isExpired(rec), true);
  });

  test('null/undefined records report not-expired (treated as unknown)', () => {
    assert.strictEqual(isExpired(null), false);
    assert.strictEqual(isExpired(undefined), false);
  });

  test('missing createdAt is treated as expired-ish (epoch)', () => {
    // A record without createdAt compares against epoch -> definitely older than TTL.
    assert.strictEqual(isExpired({}), true);
  });

  test('accepts string dates', () => {
    const rec = { createdAt: new Date().toISOString() };
    assert.strictEqual(isExpired(rec), false);
  });
});
