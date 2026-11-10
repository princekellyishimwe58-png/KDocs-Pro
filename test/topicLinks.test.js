const { test, describe } = require('node:test');
const assert = require('node:assert');
const { STAGES } = require('../utils/templates');
const { TOPIC_LINKS, topicRelatedKeys } = require('../utils/topicLinks');

const DOC_KEYS = Object.values(STAGES).flatMap((s) => Object.keys(s.documents));

describe('subject-level cross-links between landings', () => {
  test('every catalog document has its own topic list', () => {
    for (const key of DOC_KEYS) {
      assert.ok(Array.isArray(TOPIC_LINKS[key]) && TOPIC_LINKS[key].length >= 4,
        `"${key}" needs at least 4 topic links, has ${(TOPIC_LINKS[key] || []).length}`);
    }
    for (const key of Object.keys(TOPIC_LINKS)) {
      assert.ok(DOC_KEYS.includes(key), `topic list for unknown document "${key}"`);
    }
  });

  test('topic links are valid documents, never self, never repeated', () => {
    for (const [key, links] of Object.entries(TOPIC_LINKS)) {
      assert.strictEqual(new Set(links).size, links.length, `"${key}" repeats a link`);
      for (const link of links) {
        assert.ok(DOC_KEYS.includes(link), `"${key}" links to unknown document "${link}"`);
        assert.notStrictEqual(link, key, `"${key}" links to itself`);
      }
    }
  });

  test('every list reaches outside its own stage', () => {
    const stageOf = {};
    for (const [stageKey, stage] of Object.entries(STAGES)) {
      for (const docKey of Object.keys(stage.documents)) stageOf[docKey] = stageKey;
    }
    for (const [key, links] of Object.entries(TOPIC_LINKS)) {
      const offStage = links.filter((l) => stageOf[l] !== stageOf[key]).length;
      // Stage siblings can still be the right next document (resignation ->
      // farewell), but a row that never leaves its stage is the old behaviour.
      assert.ok(offStage >= 1,
        `"${key}" only links inside its own stage (${offStage} of ${links.length} cross-stage)`);
    }
  });

  test('no document is a link sink', () => {
    const inbound = new Map(DOC_KEYS.map((k) => [k, 0]));
    for (const links of Object.values(TOPIC_LINKS)) {
      for (const link of links) inbound.set(link, (inbound.get(link) || 0) + 1);
    }
    const sinks = [...inbound.entries()].filter(([, n]) => n === 0).map(([k]) => k);
    assert.deepStrictEqual(sinks, [], `documents nothing links to: ${sinks.join(', ')}`);
  });

  test('accessor returns an empty list for unknown documents', () => {
    assert.deepStrictEqual(topicRelatedKeys('not_a_document'), []);
  });
});
