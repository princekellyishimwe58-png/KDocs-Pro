const { test, describe } = require('node:test');
const assert = require('node:assert');
const { STAGES } = require('../utils/templates');
const { DOC_GUIDES } = require('../utils/docGuides');

const DOC_KEYS = Object.values(STAGES).flatMap((s) => Object.keys(s.documents));

function flattenStrings(node, out = []) {
  if (typeof node === 'string') out.push(node);
  else if (Array.isArray(node)) node.forEach((n) => flattenStrings(n, out));
  else if (node && typeof node === 'object') Object.values(node).forEach((n) => flattenStrings(n, out));
  return out;
}

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

  test('every guide carries at least two in-text contextual links', () => {
    const LINK_RE = /\{\{([^{}]+)\|([a-z0-9_]+)\}\}/g;
    const BANNED = new Set(['here', 'click here', 'read more', 'this page', 'link', 'this']);
    for (const [key, g] of Object.entries(DOC_GUIDES)) {
      const text = flattenStrings(g).join(' \n ');
      const links = [...text.matchAll(LINK_RE)];
      assert.ok(links.length >= 2, `${key}: only ${links.length} in-text link(s)`);
      for (const [, label, target] of links) {
        assert.ok(DOC_KEYS.includes(target), `${key}: inline link to unknown document "${target}"`);
        assert.notStrictEqual(target, key, `${key}: inline link points at itself`);
        // A single concrete noun ("invoice", "minutes", "CV") is a valid
        // anchor; only vague labels are rejected.
        assert.ok(label.trim().length >= 2, `${key}: anchor text "${label}" is empty or too short`);
        assert.ok(!BANNED.has(label.trim().toLowerCase()), `${key}: generic anchor text "${label}"`);
      }
    }
  });

  test('inline link syntax is always closed and paired', () => {
    for (const [key, g] of Object.entries(DOC_GUIDES)) {
      for (const s of flattenStrings(g)) {
        const opens = (s.match(/\{\{/g) || []).length;
        const closes = (s.match(/\}\}/g) || []).length;
        assert.strictEqual(opens, closes, `${key}: unbalanced inline link brackets in "${s.slice(0, 60)}"`);
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
