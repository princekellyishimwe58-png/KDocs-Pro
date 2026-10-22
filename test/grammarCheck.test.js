'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert');
const { checkWriting } = require('../utils/grammarCheck');
const { computeReadyScore } = require('../utils/readyScore');

describe('checkWriting - spelling', () => {
  test('flags a known misspelling with its correction', () => {
    const r = checkWriting('I have three years of experiance in marketing.');
    assert.strictEqual(r.spelling.length, 1);
    assert.strictEqual(r.spelling[0].lower, 'experiance');
    assert.strictEqual(r.spelling[0].suggestion, 'experience');
    assert.strictEqual(r.spelling[0].count, 1);
  });

  test('case-insensitive, repeat-aware, capped counts', () => {
    const r = checkWriting('Recieve it, recieve it, RECIEVE it.');
    assert.strictEqual(r.spelling.length, 1);
    assert.strictEqual(r.spelling[0].count, 3);
    assert.strictEqual(r.spelling[0].suggestion, 'receive');
  });

  test('never flags correct words, including British spellings', () => {
    const clean = checkWriting(
      'Organisation of my experience: managed teams in Nairobi, improved customer satisfaction by 40%. Received a certificate for professionalism.'
    );
    assert.deepStrictEqual(clean.spelling, []);
  });

  test('empty text is clean without crashing', () => {
    const r = checkWriting('');
    assert.strictEqual(r.checked, true);
    assert.strictEqual(r.total, 0);
  });

  test('duplicates collapse into one entry with a count', () => {
    const r = checkWriting('the salery the salery list');
    const s = r.spelling.find((x) => x.lower === 'salery');
    assert.ok(s && s.count === 2);
  });
});

describe('checkWriting - grammar', () => {
  test('lowercase standalone i is flagged', () => {
    const r = checkWriting('i managed a team of six.');
    const f = r.grammar.find((g) => g.rule === 'capital_i');
    assert.ok(f, 'expected a capital_i finding');
  });

  test('i.e. is not flagged as lowercase i', () => {
    const r = checkWriting('Tools i.e. Excel and Sage. Report writing.');
    assert.ok(!r.grammar.some((g) => g.rule === 'capital_i'));
  });

  test('repeated word is flagged', () => {
    const r = checkWriting('I was the the team leader.');
    assert.ok(r.grammar.some((g) => g.rule === 'repeated_word'));
  });

  test('double space is flagged', () => {
    const r = checkWriting('Managed a team  of six people.');
    assert.ok(r.grammar.some((g) => g.rule === 'double_space'));
  });

  test('comma jammed against next word is flagged', () => {
    const r = checkWriting('Skilled in Excel,Sage, and QuickBooks.');
    assert.ok(r.grammar.some((g) => g.rule === 'space_after_comma'));
  });

  test('sentence starting in lowercase is flagged', () => {
    const r = checkWriting('managed a team of six. delivered twelve projects on time.');
    assert.ok(r.grammar.some((g) => g.rule === 'sentence_case'));
  });

  test("wrong a/an choice is flagged, correct one isn't", () => {
    const bad = checkWriting('I attended a interview and a university open day.');
    assert.ok(bad.grammar.some((g) => g.rule === 'a_an'));
    const good = checkWriting('I attended an interview and a university open day.');
    assert.ok(!good.grammar.some((g) => g.rule === 'a_an'));
  });

  test('informal shorthand is flagged in formal text', () => {
    const r = checkWriting('Please reply asap, thx.');
    assert.ok(r.grammar.some((g) => g.rule === 'informal'));
  });

  test('bulleted lines with lowercase starts are not nagged', () => {
    const r = checkWriting('- led a sales team\n- increased revenue by 20%\n- trained eight staff');
    assert.ok(!r.grammar.some((g) => g.rule === 'sentence_case'));
  });

  test('invoice alignment spacing is not an error when opted out', () => {
    const strict = checkWriting('Labour - 1500\nTransport - 400', { doubleSpaceIsError: false });
    assert.ok(!strict.grammar.some((g) => g.rule === 'double_space'));
    const prose = checkWriting('Managed a team  of six people.');
    assert.ok(prose.grammar.some((g) => g.rule === 'double_space'));
  });

  test('abbreviation periods never trip the sentence-case rule', () => {
    const r = checkWriting('Tools used e.g. Excel and i.e. legacy Sage. Report writing.');
    assert.ok(!r.grammar.some((g) => g.rule === 'sentence_case'), JSON.stringify(r.grammar));
  });

  test('clean prose reports nothing', () => {
    const clean = checkWriting('I managed a team of six. I increased sales by 20% in one year. I hope to bring the same energy to your company.');
    assert.strictEqual(clean.total, 0, `unexpected findings: ${JSON.stringify(clean.grammar)}`);
  });
});

describe('computeReadyScore integration', () => {
  const CLEAN_CV = {
    fullName: 'Jane Wanjiru',
    email: 'jane@example.com',
    phone: '0712 345 678',
    summary: 'Results-driven professional with 5 years of experience in accounting.',
    experience: 'managed a team of 6\nincreased sales by 20%\ndelivered 12 projects',
    education: 'BCom, University of Nairobi (2018)',
    skills: 'Excel, Communication',
  };

  test('writing check appears in the checklist and passes on clean text', () => {
    const r = computeReadyScore('cv', CLEAN_CV);
    const item = r.checklist.find((c) => c.key === 'writing');
    assert.ok(item, 'writing checklist item missing');
    assert.strictEqual(item.passed, true, `expected pass, got: ${item.detail}`);
    assert.deepStrictEqual(r.writing.spelling, []);
  });

  test('typos fail the writing item and produce detail examples', () => {
    const r = computeReadyScore('cv', { ...CLEAN_CV, summary: 'I have experiance with recieving payments. ' });
    const item = r.checklist.find((c) => c.key === 'writing');
    assert.strictEqual(item.passed, false);
    assert.ok(item.detail.includes('experiance'));
    assert.ok(r.writing.total > 0);
  });

  test('analyzeDocument surfaces writing guidance', () => {
    const { analyzeDocument } = require('../utils/aiAnalyzer');
    const result = analyzeDocument('cv', {
      ...CLEAN_CV,
      summary: 'i have experiance in sales.  my manager said i was the the best.',
    }, '');
    assert.ok(result.writing &&
      result.writing.total > 0, 'result.writing missing or empty');
    assert.ok(result.insights.some((i) => i.title.includes('spelling/grammar')));
    assert.ok(result.suggestions.some((s) => s.title.includes('Fix spelling and grammar')));
  });
});
