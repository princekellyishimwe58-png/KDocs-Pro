const { test, describe } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const {
  classify, problemsOf, summarize, compareSitemap,
  weekKey, upsertWeekly, changesSince, daysSince, renderReport,
} = require('../tools/index-coverage');

const SITE = 'https://x.test/';
const u = (p) => `${SITE}${p}`;

// The exact strings Search Console returns, taken from a real inspection run.
const STATE = {
  indexed: 'Submitted and indexed',
  discovered: 'Discovered - currently not indexed',
  unknown: 'URL is unknown to Google',
  noindex: 'Excluded by ‘noindex’ tag',
  canonical: 'Duplicate, Google chose different canonical than user',
};

const PAGES = [
  { url: u(''), coverageState: STATE.indexed, lastCrawl: '2026-11-09T11:10:14Z', verdict: 'PASS' },
  { url: u('doc/cv'), coverageState: STATE.unknown },
  { url: u('doc/cover_letter'), coverageState: STATE.discovered },
  { url: u('write'), coverageState: STATE.noindex },
  { url: u('doc/odd'), coverageState: 'Something new from Google' },
];

describe('classification', () => {
  test('every real coverage state maps to the right bucket', () => {
    assert.strictEqual(classify(STATE.indexed).key, 'indexed');
    assert.strictEqual(classify(STATE.discovered).key, 'discovered');
    assert.strictEqual(classify(STATE.unknown).key, 'unknown');
    assert.strictEqual(classify(STATE.noindex).key, 'excluded');
    assert.strictEqual(classify(STATE.canonical).key, 'excluded');
  });

  test('an unrecognised or missing state falls back to "other", never crashes', () => {
    assert.strictEqual(classify('Something new from Google').key, 'other');
    assert.strictEqual(classify(undefined).key, 'other');
    assert.strictEqual(classify(null).key, 'other');
    assert.strictEqual(classify('').key, 'other');
  });

  test('"indexed, not submitted in sitemap" counts as indexed', () => {
    assert.strictEqual(classify('Indexed, not submitted in sitemap').key, 'indexed');
  });

  test('every bucket explains what to do about it', () => {
    for (const state of Object.values(STATE).concat(['unknown-ish'])) {
      const bucket = classify(state);
      assert.ok(bucket.advice && bucket.advice.length > 40, `${bucket.key} has no usable advice`);
      assert.ok(bucket.label, `${bucket.key} has no label`);
    }
  });
});

describe('summarise', () => {
  test('counts add up and the not-indexed total is the remainder', () => {
    const s = summarize(PAGES);
    assert.deepStrictEqual(
      { indexed: s.indexed, discovered: s.discovered, unknown: s.unknown, excluded: s.excluded, other: s.other },
      { indexed: 1, discovered: 1, unknown: 1, excluded: 1, other: 1 },
    );
    assert.strictEqual(s.total, 5);
    assert.strictEqual(s.notIndexed, 4);
    assert.strictEqual(s.indexed + s.notIndexed, s.total, 'the two headline numbers must cover every page');
    assert.strictEqual(s.indexedShare, 20);
  });

  test('an empty snapshot does not divide by zero', () => {
    const s = summarize([]);
    assert.strictEqual(s.total, 0);
    assert.strictEqual(s.indexedShare, 0);
    assert.strictEqual(s.notIndexed, 0);
  });
});

describe('problems that hide behind an "indexed" label', () => {
  const base = { url: u('doc/cv'), pageFetchState: 'SUCCESSFUL', robotsTxtState: 'ALLOWED', indexingState: 'INDEXING_ALLOWED' };

  test('a clean page has no problems', () => {
    assert.deepStrictEqual(problemsOf(base), []);
  });

  test('a failed fetch is reported', () => {
    assert.match(problemsOf({ ...base, pageFetchState: 'SOFT_404' })[0], /soft 404/i);
  });

  test('robots and noindex are reported even when the state looks fine', () => {
    assert.ok(problemsOf({ ...base, robotsTxtState: 'DISALLOWED' }).includes('blocked by robots.txt'));
    assert.ok(problemsOf({ ...base, indexingState: 'INDEXING_NOT_ALLOWED' }).includes('noindex'));
  });

  test('Google choosing a different canonical is reported', () => {
    const p = problemsOf({ ...base, userCanonical: u('doc/cv'), googleCanonical: u('doc/cover_letter') });
    assert.match(p.join('; '), /different canonical/);
  });

  test('an unspecified state is not a problem', () => {
    assert.deepStrictEqual(problemsOf({ url: u('x'), pageFetchState: 'PAGE_FETCH_STATE_UNSPECIFIED' }), []);
  });
});

describe('sitemap coverage gaps', () => {
  test('a sitemap URL that was never inspected is a gap, not a pass', () => {
    const gaps = compareSitemap([u(''), u('doc/cv'), u('doc/never')], [
      { url: u(''), coverageState: STATE.indexed },
      { url: u('doc/cv'), coverageState: STATE.unknown },
    ]);
    assert.deepStrictEqual(gaps.missing, [u('doc/never')]);
    assert.deepStrictEqual(gaps.extra, []);
  });

  test('an inspected URL that left the sitemap is reported separately', () => {
    const gaps = compareSitemap([u('')], [
      { url: u(''), coverageState: STATE.indexed },
      { url: u('write'), coverageState: STATE.noindex },
    ]);
    assert.deepStrictEqual(gaps.missing, []);
    assert.deepStrictEqual(gaps.extra, [u('write')]);
  });

  test('with no sitemap the report does not invent gaps', () => {
    assert.deepStrictEqual(compareSitemap([], PAGES), { missing: [], extra: PAGES.map((p) => p.url) });
  });
});

describe('weekly history', () => {
  test('ISO week keys are stable and correct', () => {
    assert.strictEqual(weekKey('2026-11-11T10:00:00Z'), '2026-W46');
    assert.strictEqual(weekKey('2026-11-09T10:00:00Z'), '2026-W46');
    assert.strictEqual(weekKey('2026-11-15T23:00:00Z'), '2026-W46');
    assert.strictEqual(weekKey('2026-11-16T00:00:00Z'), '2026-W47');
    assert.strictEqual(weekKey('2026-01-01T00:00:00Z'), '2026-W01');
    assert.strictEqual(weekKey('not a date'), 'unknown');
  });

  test('re-running inside the same week replaces that week instead of duplicating it', () => {
    let h = upsertWeekly([], { at: '2026-11-09T09:00:00Z', indexed: 3 });
    h = upsertWeekly(h, { at: '2026-11-11T09:00:00Z', indexed: 11 });
    assert.strictEqual(h.length, 1, 'one point per week');
    assert.strictEqual(h[0].indexed, 11, 'the later run wins');
    assert.strictEqual(h[0].week, '2026-W46');
  });

  test('history stays ordered and keeps a year of weeks at most', () => {
    let h = [];
    for (let i = 0; i < 60; i += 1) {
      const at = new Date(Date.UTC(2026, 0, 5 + i * 7)).toISOString();
      h = upsertWeekly(h, { at, indexed: i });
    }
    assert.ok(h.length <= 52, `kept ${h.length} points`);
    const ats = h.map((x) => x.at);
    assert.deepStrictEqual(ats, ats.slice().sort(), 'points are chronological');
    assert.strictEqual(h[h.length - 1].indexed, 59, 'the newest point survives the trim');
  });

  test('movement between snapshots is reported per URL', () => {
    const changes = changesSince(PAGES, [
      { url: u(''), coverageState: STATE.indexed },
      { url: u('doc/cv'), coverageState: STATE.discovered }, // unknown -> discovered
      { url: u('doc/brand_new'), coverageState: STATE.unknown }, // not in the old set
    ]);
    assert.deepStrictEqual(changes, [{ url: u('doc/cv'), from: 'unknown', to: 'discovered' }]);
  });

  test('snapshot age is measured in whole days', () => {
    const now = Date.parse('2026-11-11T12:00:00Z');
    assert.strictEqual(daysSince('2026-11-11T10:00:00Z', now), 0);
    assert.strictEqual(daysSince('2026-11-01T00:00:00Z', now), 10);
    assert.strictEqual(daysSince('not a date', now), null);
  });
});

describe('the rendered report', () => {
  // Two weeks of history for the same five pages: 0 indexed last week, 1 now.
  const history = [
    { at: '2026-11-04T09:00:00Z', week: '2026-W45', indexed: 0, notIndexed: 5 },
    { at: '2026-11-11T09:00:00Z', week: '2026-W46', indexed: 1, notIndexed: 4 },
  ];

  test('renders a complete page with every URL and the headline counts', () => {
    const html = renderReport({
      site: SITE,
      capturedAt: '2026-11-11T09:00:00Z',
      pages: PAGES,
      sitemap: PAGES.map((p) => p.url),
    }, history);

    assert.ok(html.startsWith('<!doctype html>'));
    for (const p of PAGES) assert.ok(html.includes(p.url.replace(SITE, '')), `missing row for ${p.url}`);
    assert.ok(html.includes('>1</div><div class="l">Indexed'), 'indexed card');
    assert.ok(html.includes('>4</div><div class="l">Not indexed'), 'not-indexed card');
    assert.ok(html.includes('+1 since last week'), 'weekly delta');
    assert.ok(html.includes('Unknown to Google'), 'the bucket that actually blocks indexing is named');
  });

  test('escapes hostile values instead of injecting them', () => {
    const html = renderReport({
      site: SITE,
      capturedAt: '2026-11-11T09:00:00Z',
      pages: [{ url: `${SITE}<script>alert(1)</script>`, coverageState: '<img src=x onerror=alert(1)>' }],
      sitemap: [],
    }, []);
    assert.ok(!html.includes('<script>alert(1)</script>'), 'raw script tag must not survive');
    assert.ok(!html.includes('<img src=x'), 'raw markup must not survive');
    assert.ok(html.includes('&lt;script&gt;'), 'escaped form is expected');
  });

  test('names the sitemap URLs that were never inspected', () => {
    const html = renderReport({
      site: SITE,
      capturedAt: '2026-11-11T09:00:00Z',
      pages: [{ url: u(''), coverageState: STATE.indexed }],
      sitemap: [u(''), u('doc/never_inspected')],
    }, []);
    assert.ok(html.includes('doc/never_inspected'));
    assert.ok(html.includes('Sitemap URLs missing from the snapshot'));
  });

  test('warns when the snapshot is stale, and stays quiet when it is fresh', () => {
    const stale = renderReport({
      site: SITE, capturedAt: '2026-10-01T09:00:00Z', pages: PAGES, sitemap: [],
    }, [], { now: Date.parse('2026-11-11T00:00:00Z') });
    assert.ok(stale.includes('days old'), 'stale snapshot must be flagged');

    const fresh = renderReport({
      site: SITE, capturedAt: '2026-11-10T09:00:00Z', pages: PAGES, sitemap: [],
    }, [], { now: Date.parse('2026-11-11T00:00:00Z') });
    assert.ok(!fresh.includes('days old'));
  });

  test('says so plainly on the first run instead of drawing an empty trend', () => {
    const html = renderReport({ site: SITE, capturedAt: '2026-11-11T09:00:00Z', pages: PAGES, sitemap: [] }, []);
    assert.ok(html.includes('First run'));
    assert.ok(html.includes('No history yet'));
  });

  test('explains the states that are present, and only those', () => {
    const html = renderReport({
      site: SITE, capturedAt: '2026-11-11T09:00:00Z',
      pages: [{ url: u(''), coverageState: STATE.indexed }], sitemap: [],
    }, []);
    assert.ok(html.includes('Submitting the sitemap does not') === false, 'advice for absent buckets is omitted');
    assert.ok(html.includes('Nothing to do'), 'advice for the present bucket is shown');
  });
});

describe('the committed snapshot is usable', () => {
  const file = path.join(__dirname, '..', 'reports', 'index-coverage-snapshot.json');
  const snapshot = JSON.parse(fs.readFileSync(file, 'utf8'));

  test('it has a site, a capture date and pages', () => {
    assert.match(snapshot.site, /^https:\/\//);
    assert.match(snapshot.capturedAt, /^\d{4}-\d{2}-\d{2}T/);
    assert.ok(Array.isArray(snapshot.pages) && snapshot.pages.length > 0);
  });

  test('every inspected page is in the sitemap, and the sitemap list is complete', () => {
    const gaps = compareSitemap(snapshot.sitemap, snapshot.pages);
    assert.deepStrictEqual(gaps.missing, [], 'sitemap URLs missing from the snapshot');
    assert.deepStrictEqual(gaps.extra, [], 'inspected URLs that are not in the sitemap');
  });

  test('every page points at the property origin so paths stay readable', () => {
    const origin = snapshot.site.replace(/\/+$/, '');
    for (const p of snapshot.pages) {
      assert.ok(p.url.startsWith(origin), `${p.url} is not under ${origin}`);
      assert.ok(typeof p.coverageState === 'string' && p.coverageState.length > 0, `${p.url} has no state`);
    }
  });
});
