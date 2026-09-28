const { test, describe } = require('node:test');
const assert = require('node:assert');
const { computeReadyScore } = require('../utils/readyScore');

const CV_FIELDS = {
  fullName: 'Jane Wanjiru',
  email: 'jane@example.com',
  phone: '0712 345 678',
  summary: 'Results-driven professional with 5 years of experience.',
  experience: 'managed a team of 6\nincreased sales by 20%\ndelivered 12 projects',
  education: 'BCom, University of Nairobi (2018)',
  skills: 'Excel, Communication',
};

describe('computeReadyScore', () => {
  test('a filled CV scores well', () => {
    const r = computeReadyScore('cv', CV_FIELDS);
    assert.ok(r.score >= 65, `expected decent score, got ${r.score}`);
    assert.strictEqual(Array.isArray(r.checklist), true);
    assert.ok(r.checklist.length >= 4);
  });

  test('an empty CV scores poorly and never crashes', () => {
    const r = computeReadyScore('cv', {});
    assert.ok(r.score < 65);
    assert.strictEqual(typeof r.readyLabel, 'string');
  });

  test('missing fields object is handled', () => {
    const r = computeReadyScore('cover_letter', undefined);
    assert.strictEqual(typeof r.score, 'number');
  });

  test('unknown doc type falls back to a base checklist', () => {
    const r = computeReadyScore('made_up_doc', { anything: 'x' });
    assert.strictEqual(typeof r.score, 'number');
    assert.ok(r.checklist.length >= 1);
  });

  test('placeholder text is flagged', () => {
    const r = computeReadyScore('leave_request', {
      reason: 'I will be away from [start date] to [end date]',
      startDate: '1 May',
      endDate: '10 May',
    });
    const placeholderItem = r.checklist.find((c) => c.key === 'placeholders');
    assert.strictEqual(placeholderItem.passed, false);
  });

  test('CV without numbers in achievements fails the action-verbs check', () => {
    const r = computeReadyScore('cv', {
      ...CV_FIELDS,
      experience: 'managed a team\ndelivered projects\nled meetings',
    });
    const verbs = r.checklist.find((c) => c.key === 'action_verbs');
    assert.strictEqual(verbs.passed, false, 'no numbers present, so should fail');
  });

  test('disclaimer is always present', () => {
    const r = computeReadyScore('cv', CV_FIELDS);
    assert.ok(r.disclaimer.length > 10);
  });
});
