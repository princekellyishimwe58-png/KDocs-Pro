const { test, describe } = require('node:test');
const assert = require('node:assert');
const {
  sanitizeFields,
  cleanString,
  isPlainObject,
  isNonEmptyString,
  normalizeKenyanPhone,
  MAX_STRING,
} = require('../utils/validate');

describe('cleanString', () => {
  test('passes normal strings through', () => {
    assert.strictEqual(cleanString('hello world'), 'hello world');
  });

  test('truncates oversized strings', () => {
    const long = 'a'.repeat(MAX_STRING + 500);
    assert.strictEqual(cleanString(long).length, MAX_STRING);
  });

  test('coerces non-strings to empty', () => {
    assert.strictEqual(cleanString(42), '');
    assert.strictEqual(cleanString(null), '');
    assert.strictEqual(cleanString({ a: 1 }), '');
  });
});

describe('sanitizeFields', () => {
  test('keeps simple string fields', () => {
    const out = sanitizeFields({ fullName: 'Jane', phone: '0712345678' });
    assert.deepStrictEqual(out, { fullName: 'Jane', phone: '0712345678' });
  });

  test('drops non-string values', () => {
    const out = sanitizeFields({ fullName: 'Jane', sneaky: { nested: true }, arr: [1] });
    assert.deepStrictEqual(out, { fullName: 'Jane' });
  });

  test('blocks prototype pollution keys', () => {
    const out = sanitizeFields({ __proto__: { admin: true }, constructor: 'x', prototype: 'y', ok: 'kept' });
    assert.deepStrictEqual(out, { ok: 'kept' });
  });

  test('rejects weirdly-shaped keys', () => {
    const out = sanitizeFields({ 'bad key!': 'v', 'a-b': 'v', good_key: 'v' });
    assert.deepStrictEqual(out, { good_key: 'v' });
  });

  test('truncates oversized values', () => {
    const out = sanitizeFields({ summary: 'x'.repeat(MAX_STRING + 100) });
    assert.strictEqual(out.summary.length, MAX_STRING);
  });

  test('returns empty object for arrays/null', () => {
    assert.deepStrictEqual(sanitizeFields(null), {});
    assert.deepStrictEqual(sanitizeFields([1, 2]), {});
  });
});

describe('isPlainObject', () => {
  test('true for object literals, false for arrays/null', () => {
    assert.strictEqual(isPlainObject({}), true);
    assert.strictEqual(isPlainObject([]), false);
    assert.strictEqual(isPlainObject(null), false);
  });
});

describe('isNonEmptyString', () => {
  test('accepts non-empty strings within limit', () => {
    assert.strictEqual(isNonEmptyString('cv', 64), true);
  });

  test('rejects empty/whitespace/oversized/non-strings', () => {
    assert.strictEqual(isNonEmptyString('', 64), false);
    assert.strictEqual(isNonEmptyString('   ', 64), false);
    assert.strictEqual(isNonEmptyString('x'.repeat(65), 64), false);
    assert.strictEqual(isNonEmptyString(123, 64), false);
  });
});

describe('normalizeKenyanPhone', () => {
  test('07XX form', () => {
    assert.strictEqual(normalizeKenyanPhone('0712345678'), '254712345678');
  });

  test('+254 form', () => {
    assert.strictEqual(normalizeKenyanPhone('+254712345678'), '254712345678');
  });

  test('254 form passes through', () => {
    assert.strictEqual(normalizeKenyanPhone('254712345678'), '254712345678');
  });

  test('bare 7XX and 1XX forms', () => {
    assert.strictEqual(normalizeKenyanPhone('712345678'), '254712345678');
    assert.strictEqual(normalizeKenyanPhone('112345678'), '254112345678');
  });

  test('strips spaces and dashes', () => {
    assert.strictEqual(normalizeKenyanPhone('0712 345-678'), '254712345678');
  });

  test('rejects malformed numbers', () => {
    assert.strictEqual(normalizeKenyanPhone('12345'), null);
    assert.strictEqual(normalizeKenyanPhone('0812345678'), null); // 08xx not a mobile prefix
    assert.strictEqual(normalizeKenyanPhone('abc'), null);
    assert.strictEqual(normalizeKenyanPhone(''), null);
    assert.strictEqual(normalizeKenyanPhone(712345678), null); // not a string
  });
});
