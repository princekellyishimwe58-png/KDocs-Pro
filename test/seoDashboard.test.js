const { test, describe } = require('node:test');
const assert = require('node:assert');
const {
  bucketOf, summarizePages, analyticsTotals, upsertHistory, renderDashboard, readRecentCommits,
} = require('../tools/seo-dashboard');

const PAGES = [
  { url: 'https://x.test/', state: 'Submitted and indexed' },
  { url: 'https://x.test/doc/cv', state: 'Discovered - currently not indexed' },
  { url: 'https://x.test/doc/scan', state: 'URL is unknown to Google' },
  { url: 'https://x.test/write', state: 'Excluded by noindex tag' },
  { url: 'https://x.test/odd', state: 'Something new from Google' },
];

describe('seo dashboard', () => {
  test('coverage states map to the right bucket', () => {
    assert.strictEqual(bucketOf('Submitted and indexed'), 'indexed');
    assert.strictEqual(bucketOf('Discovered - currently not indexed'), 'discovered');
    assert.strictEqual(bucketOf('URL is unknown to Google'), 'unknown');
    assert.strictEqual(bucketOf('Excluded by noindex tag'), 'excluded');
    assert.strictEqual(bucketOf(undefined), 'other');
  });

  test('page counts and share add up', () => {
    const s = summarizePages(PAGES);
    assert.deepStrictEqual(
      { indexed: s.indexed, discovered: s.discovered, unknown: s.unknown, excluded: s.excluded, other: s.other },
      { indexed: 1, discovered: 1, unknown: 1, excluded: 1, other: 1 },
    );
    assert.strictEqual(s.total, 5);
    assert.strictEqual(s.indexedShare, 20);
    assert.strictEqual(summarizePages([]).indexedShare, 0, 'empty snapshot must not divide by zero');
  });

  test('analytics totals come from the daily rows when no totals are given', () => {
    const t = analyticsTotals({ byDate: [{ clicks: 2, impressions: 10 }, { clicks: 1, impressions: 30 }] });
    assert.strictEqual(t.clicks, 3);
    assert.strictEqual(t.impressions, 40);
    assert.ok(Math.abs(t.ctr - 7.5) < 1e-9);
    assert.strictEqual(analyticsTotals({}).clicks, 0);
  });

  test('history keeps one point per day and stays ordered', () => {
    let history = upsertHistory([], { at: '2026-11-08T09:00:00Z', indexed: 5 });
    history = upsertHistory(history, { at: '2026-11-10T09:00:00Z', indexed: 9 });
    history = upsertHistory(history, { at: '2026-11-10T15:00:00Z', indexed: 11 });
    assert.strictEqual(history.length, 2, 'same-day run replaces the earlier point');
    assert.deepStrictEqual(history.map((h) => h.indexed), [5, 11]);
    assert.strictEqual(history[1].at, '2026-11-10T15:00:00Z', 'latest run wins');
  });

  test('recent commits are parsed, and a missing git binary is survivable', () => {
    const fakeRun = (cmd, argv) => {
      assert.strictEqual(cmd, 'git');
      assert.ok(argv.includes('--format=%h|%ad|%s'));
      return '3cccdb7|2026-11-10|Add an SEO dashboard\naae52b9|2026-11-10|Deepen landing pages\n';
    };
    const commits = readRecentCommits('.', 6, fakeRun);
    assert.deepStrictEqual(commits.map((c) => c.sha), ['3cccdb7', 'aae52b9']);
    assert.strictEqual(commits[0].date, '2026-11-10');
    assert.strictEqual(commits[0].subject, 'Add an SEO dashboard');
    assert.deepStrictEqual(readRecentCommits('.', 6, () => { throw new Error('no git'); }), []);
  });

  test('commits and history heads are shown next to the numbers', () => {
    const html = renderDashboard({
      site: 'https://x.test/',
      snapshotAt: '2026-11-10T09:00:00Z',
      commits: [{ sha: 'abc1234', date: '2026-11-10', subject: 'Add crawlable catalog' }],
      pages: PAGES,
      analytics: { range: {}, byDate: [] },
    }, [
      { at: '2026-11-09T09:00:00Z', head: 'def5678', indexed: 3, clicks: 0 },
      { at: '2026-11-10T09:00:00Z', head: 'abc1234', indexed: 1, clicks: 0 },
    ]);
    assert.ok(html.includes('Add crawlable catalog'), 'commit subject rendered');
    assert.ok(html.includes('abc1234'), 'commit sha rendered');
    assert.ok(html.includes('head abc1234'), 'trend labelled with the live head');
    assert.ok(html.includes('def5678'), 'history keeps the previous head');
    assert.ok(html.includes('-2'), 'indexed delta between snapshots shown');
  });

  test('dashboard renders every URL and escapes hostile text', () => {
    const html = renderDashboard({
      site: 'https://x.test/',
      snapshotAt: '2026-11-10T09:00:00Z',
      sitemap: { submitted: 5, errors: 0 },
      analytics: { range: { start: '2026-11-01', end: '2026-11-09' }, byDate: [] },
      pages: [...PAGES, { url: 'https://x.test/<script>alert(1)</script>', state: 'URL is unknown to Google' }],
    }, [{ at: '2026-11-09T09:00:00Z', indexed: 1 }, { at: '2026-11-10T09:00:00Z', indexed: 1 }]);

    assert.ok(html.startsWith('<!doctype html>'));
    // The renderer shows paths relative to the property URL.
    for (const p of PAGES) assert.ok(html.includes(p.url.replace('https://x.test/', '')), `missing row for ${p.url}`);
    assert.ok(!html.includes('<script>alert(1)</script>'), 'unescaped markup must not survive');
    assert.ok(html.includes('&lt;script&gt;'), 'escaped form is expected');
    assert.ok(html.includes('of 6 URLs'.replace('of', 'Of')), 'total in the summary card');
    assert.ok(html.includes('+0 since last run'), 'delta shown against the previous history point');
  });
});
