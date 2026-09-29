const { test, describe } = require('node:test');
const assert = require('node:assert');
const { PRICE_DEFAULT_KES, PRICES, priceFor, isDefaultPrice, pricedSuites } = require('../utils/pricing');

describe('pricing', () => {
  test('defaults to KSh 20', () => {
    assert.strictEqual(PRICE_DEFAULT_KES, 20);
  });

  test('Looking-for-a-Job suite is KSh 50', () => {
    ['cv', 'cover_letter', 'job_application'].forEach((k) => {
      assert.strictEqual(priceFor(k), 50, `${k} should be 50`);
    });
  });

  test('After-a-Job suite (all six) is KSh 50', () => {
    ['resignation', 'reference_request', 'farewell', 'handover_report', 'experience_certificate', 'recommendation_letter'].forEach((k) => {
      assert.strictEqual(priceFor(k), 50, `${k} should be 50`);
    });
  });

  test('admission_application is KSh 50', () => {
    assert.strictEqual(priceFor('admission_application'), 50);
  });

  test('every other catalog document stays KSh 20', () => {
    const expectedAt20 = [
      'leave_request', 'salary_increment', 'offer_acceptance', 'self_appraisal',
      'leave_permission', 'fee_bursary_request',
      'freelance_invoice', 'meeting_minutes', 'business_card',
    ];
    expectedAt20.forEach((k) => {
      assert.strictEqual(priceFor(k), 20, `${k} should stay at 20`);
      assert.strictEqual(isDefaultPrice(k), true);
    });
  });

  test('price map covers exactly the 19 catalog documents, no unknown keys', () => {
    assert.strictEqual(Object.keys(PRICES).length, 19);
    assert.strictEqual(Object.values(PRICES).filter((p) => [20, 50].includes(p)).length, 19);
  });

  test('unknown docType falls back to the default price', () => {
    assert.strictEqual(priceFor('not_a_document'), 20);
  });

  test('pricedSuites describes the KSh 50 groups', () => {
    const suites = pricedSuites();
    assert.strictEqual(suites.length, 3);
    suites.forEach((s) => assert.strictEqual(s.price, 50));
  });
});
