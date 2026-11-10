const { test, describe } = require('node:test');
const assert = require('node:assert');
const { STAGES } = require('../utils/templates');
const { DOC_GUIDES } = require('../utils/docGuides');

const DOC_KEYS = Object.values(STAGES).flatMap((s) => Object.keys(s.documents));

describe('document landing guides', () => {
  test('every catalog document has a guide, and no guide is orphaned', () => {
    for (const key of DOC_KEYS) {
      assert.ok(DOC_GUIDES[key], `missing guide for "${key}"`);
    }
    for (const key of Object.keys(DOC_GUIDES)) {
      assert.ok(DOC_KEYS.includes(key), `guide "${key}" is not a catalog document`);
    }
    assert.strictEqual(Object.keys(DOC_GUIDES).length, DOC_KEYS.length);
  });

  test('each guide carries enough substance to be worth indexing', () => {
    for (const [key, g] of Object.entries(DOC_GUIDES)) {
      assert.ok(g.intro.length >= 120, `${key}: intro too short (${g.intro.length})`);
      assert.ok(g.sections.length >= 3, `${key}: needs at least 3 sections`);
      for (const s of g.sections) {
        assert.ok(s.h && s.h.length > 8, `${key}: section heading too short`);
        assert.ok(s.items.length >= 3, `${key}: section "${s.h}" needs 3+ items`);
        for (const item of s.items) assert.ok(item.length >= 30, `${key}: bullet too thin`);
      }
      assert.ok(g.sample && g.sample.length >= 40, `${key}: missing sample line`);
      assert.ok(g.faqs.length >= 3, `${key}: needs at least 3 FAQs`);
      for (const f of g.faqs) {
        assert.ok(f.q.endsWith('?'), `${key}: FAQ should be a question`);
        assert.ok(f.a.length >= 60, `${key}: FAQ answer too short`);
      }
    }
  });

  test('guides are unique, not boilerplate reused across documents', () => {
    const intros = new Set();
    const samples = new Set();
    const questions = new Set();
    for (const [key, g] of Object.entries(DOC_GUIDES)) {
      assert.ok(!intros.has(g.intro), `${key}: intro duplicated from another guide`);
      intros.add(g.intro);
      assert.ok(!samples.has(g.sample), `${key}: sample line duplicated`);
      samples.add(g.sample);
      for (const f of g.faqs) {
        assert.ok(!questions.has(f.q), `${key}: FAQ "${f.q}" appears in two guides`);
        questions.add(f.q);
      }
    }
  });

  test('no unfilled placeholder text reaches the page', () => {
    // Check the text values themselves: JSON.stringify would include array
    // brackets and produce false positives.
    const strings = [];
    (function walk(node) {
      if (typeof node === 'string') strings.push(node);
      else if (Array.isArray(node)) node.forEach(walk);
      else if (node && typeof node === 'object') Object.values(node).forEach(walk);
    })(DOC_GUIDES);
    for (const s of strings) {
      assert.ok(!/\[[^\]]*\]|\bTBD\b|\bxxx+\b|lorem ipsum/i.test(s), `placeholder text found: ${s.slice(0, 80)}`);
    }
  });
});
