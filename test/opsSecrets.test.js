const { test, describe, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { buildHealthPayload } = require('../utils/health');
const { requireOpsToken } = require('../middleware/opsAuth');

// `core` is the high-entropy part of each credential - the part that must never
// appear. Provider prefixes ("ISSecretKey_live_") are not secret and would
// otherwise collide with field names such as secretKeyConfigured.
const SECRETS = {
  INTASEND_SECRET_KEY: {
    value: 'ISSecretKey_live_9c1f4a7e-2b3d-4e5f-8a9b-0c1d2e3f4a5b',
    core: '9c1f4a7e-2b3d-4e5f-8a9b-0c1d2e3f4a5b',
  },
  INTASEND_PUBLIC_KEY: {
    value: 'ISPubKey_live_7d8e9f00-1122-3344-5566-778899aabbcc',
    core: '7d8e9f00-1122-3344-5566-778899aabbcc',
  },
  INTASEND_WEBHOOK_CHALLENGE: {
    value: 'whsec_5f4e3d2c1b0a99887766554433221100',
    core: '5f4e3d2c1b0a99887766554433221100',
  },
  DARAJA_CONSUMER_SECRET: {
    value: 'Zx9Qm2Lp7Rt4Vw8Yb3Nc6Kd1Hf5Jg0',
    core: 'Zx9Qm2Lp7Rt4Vw8Yb3Nc6Kd1Hf5Jg0',
  },
  DARAJA_PASSKEY: {
    value: 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919',
    core: 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919',
  },
  DARAJA_CONSUMER_KEY: {
    value: 'Kq7Wm3Tz9Lb2Xc8Vn5Rj1Hd4Gf6Sp0',
    core: 'Kq7Wm3Tz9Lb2Xc8Vn5Rj1Hd4Gf6Sp0',
  },
  DARAJA_SHORTCODE: { value: '174379', core: '174379' },
};

function fakeRes() {
  const res = {
    statusCode: null,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
  };
  return res;
}

describe('public health payload never leaks key material', () => {
  test('no secret value, prefix, suffix or length appears in the response', () => {
    const env = Object.fromEntries(Object.entries(SECRETS).map(([k, v]) => [k, v.value]));
    const payload = buildHealthPayload({ env: { ...env, INTASEND_ENV: 'production' } });
    const body = JSON.stringify(payload).toLowerCase();
    for (const [name, secret] of Object.entries(SECRETS)) {
      assert.ok(!body.includes(secret.value.toLowerCase()), `${name} value leaked`);
      // Any 8-character window of the high-entropy core must be absent.
      for (let i = 0; i + 8 <= secret.core.length; i += 1) {
        const window = secret.core.slice(i, i + 8).toLowerCase();
        assert.ok(!body.includes(window), `${name} fragment "${window}" leaked`);
      }
      assert.ok(!body.includes(`${secret.value.length} chars`), `${name} length leaked`);
      assert.ok(!body.includes('(set)'), 'legacy "(set)" marker leaked');
    }
  });

  test('configuration is still visible as booleans', () => {
    const env = Object.fromEntries(Object.entries(SECRETS).map(([k, v]) => [k, v.value]));
    const payload = buildHealthPayload({ env });
    assert.strictEqual(payload.intasend.publicKeyConfigured, true);
    assert.strictEqual(payload.intasend.secretKeyConfigured, true);
    assert.strictEqual(payload.intasend.webhookChallengeConfigured, true);
    assert.strictEqual(payload.daraja.passkeyConfigured, true);
    assert.strictEqual(payload.daraja.configured, true);
    assert.strictEqual(payload.intasend.keyVariant, 'live');
  });

  test('an empty environment reports nothing configured', () => {
    const payload = buildHealthPayload({ env: {} });
    assert.strictEqual(payload.intasend.secretKeyConfigured, false);
    assert.strictEqual(payload.intasend.keyVariant, null);
    assert.strictEqual(payload.daraja.configured, false);
  });
});

describe('operator endpoints are gated by OPS_TOKEN', () => {
  const original = process.env.OPS_TOKEN;
  afterEach(() => {
    if (original === undefined) delete process.env.OPS_TOKEN;
    else process.env.OPS_TOKEN = original;
  });

  test('missing OPS_TOKEN fails closed with 404', () => {
    delete process.env.OPS_TOKEN;
    const res = fakeRes();
    let called = false;
    requireOpsToken({ get: () => 'anything' }, res, () => { called = true; });
    assert.strictEqual(called, false);
    assert.strictEqual(res.statusCode, 404);
  });

  test('wrong or absent token gets 404, never a hint', () => {
    process.env.OPS_TOKEN = 'the-real-ops-token';
    for (const token of [undefined, '', 'the-real-ops-toke', 'the-real-ops-tokenn']) {
      const res = fakeRes();
      let called = false;
      requireOpsToken({ get: () => token }, res, () => { called = true; });
      assert.strictEqual(called, false, `token "${token}" was accepted`);
      assert.strictEqual(res.statusCode, 404);
      assert.deepStrictEqual(res.body, { error: 'Not found' });
    }
  });

  test('the matching token passes through', () => {
    process.env.OPS_TOKEN = 'the-real-ops-token';
    const res = fakeRes();
    let called = false;
    requireOpsToken({ get: () => 'the-real-ops-token' }, res, () => { called = true; });
    assert.strictEqual(called, true);
    assert.strictEqual(res.statusCode, null);
  });
});

describe('source never fingerprints secrets', () => {
  const files = ['server.js', 'routes/intasend.js', 'routes/daraja.js'];

  test('no slice-based masking of secret env vars', () => {
    for (const file of files) {
      const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
      const lines = source.split('\n');
      lines.forEach((line, i) => {
        const touchesSecret = /(_SECRET|PASSKEY|WEBHOOK_CHALLENGE)/.test(line);
        const slices = /\.slice\(/.test(line);
        const isComment = /^\s*(\/\/|\*|\/\*)/.test(line);
        assert.ok(!(touchesSecret && slices && !isComment),
          `${file}:${i + 1} slices a secret value: ${line.trim()}`);
      });
    }
  });

  test('diagnose routes require the ops token', () => {
    const intasend = fs.readFileSync(path.join(__dirname, '..', 'routes', 'intasend.js'), 'utf8');
    const daraja = fs.readFileSync(path.join(__dirname, '..', 'routes', 'daraja.js'), 'utf8');
    assert.ok(/router\.get\('\/diagnose',\s*requireOpsToken/.test(intasend), 'intasend /diagnose is unguarded');
    assert.ok(/router\.get\('\/diagnose',\s*requireOpsToken/.test(daraja), 'daraja /diagnose is unguarded');
  });
});
