#!/usr/bin/env node
// Search Console dashboard.
//
// The Google credentials live in the Freebuff integration, not in this app, so
// the numbers are collected through the Search Console API and written to
// reports/seo-snapshot.json. This tool turns that snapshot into a single
// self-contained HTML page (no CDN, no build step) plus a console summary, and
// keeps a small history so index coverage can be tracked over time.
//
// Refresh procedure:
//   1. Query the API for the property and update reports/seo-snapshot.json
//      (analytics totals, sitemap status, one entry per URL in `pages`).
//   2. Run: node tools/seo-dashboard.js
//   3. Open reports/seo-dashboard.html
//
// Usage:
//   node tools/seo-dashboard.js [--snapshot path] [--out path] [--history path]

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DEFAULTS = {
  snapshot: path.join(ROOT, 'reports', 'seo-snapshot.json'),
  out: path.join(ROOT, 'reports', 'seo-dashboard.html'),
  history: path.join(ROOT, 'reports', 'seo-history.json'),
};

// Search Console reports a handful of coverage states; the dashboard only needs
// to know which bucket a URL falls into.
const BUCKETS = {
  indexed: ['submitted and indexed', 'indexed, not submitted in sitemap'],
  discovered: ['discovered - currently not indexed', 'discovered'],
  unknown: ['url is unknown to google'],
  excluded: ['excluded by', 'noindex', 'alternate page with proper canonical tag', 'duplicate'],
};

function bucketOf(state) {
  const s = String(state || '').toLowerCase();
  for (const [bucket, needles] of Object.entries(BUCKETS)) {
    if (needles.some((n) => s.includes(n))) return bucket;
  }
  return 'other';
}

function summarizePages(pages = []) {
  const counts = { indexed: 0, discovered: 0, unknown: 0, excluded: 0, other: 0 };
  for (const page of pages) counts[bucketOf(page.state)] += 1;
  const total = pages.length;
  return {
    ...counts,
    total,
    indexedShare: total ? Math.round((counts.indexed / total) * 100) : 0,
  };
}

function analyticsTotals(analytics = {}) {
  const rows = analytics.byDate || [];
  const sum = (key) => rows.reduce((acc, r) => acc + (Number(r[key]) || 0), 0);
  const clicks = analytics.totals?.clicks ?? sum('clicks');
  const impressions = analytics.totals?.impressions ?? sum('impressions');
  const position = analytics.totals?.position ?? 0;
  return {
    clicks,
    impressions,
    ctr: impressions ? (clicks / impressions) * 100 : 0,
    position,
  };
}

// One history point per day: re-running the tool on the same day replaces the
// earlier point instead of stacking duplicates.
function upsertHistory(history, entry) {
  const day = String(entry.at).slice(0, 10);
  const kept = (history || []).filter((h) => String(h.at).slice(0, 10) !== day);
  kept.push(entry);
  kept.sort((a, b) => String(a.at).localeCompare(String(b.at)));
  return kept.slice(-90);
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function sparkline(values, width = 260, height = 48) {
  if (!values.length) return '';
  const max = Math.max(...values, 1);
  const step = values.length > 1 ? width / (values.length - 1) : width;
  const points = values.map((v, i) => `${(i * step).toFixed(1)},${(height - (v / max) * (height - 6) - 3).toFixed(1)}`).join(' ');
  return `<svg class="spark" viewBox="0 0 ${width} ${height}" role="img" aria-label="Indexed pages over time">`
    + `<polyline points="${points}" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linejoin="round" />`
    + '</svg>';
}

function renderDashboard(snapshot, history = []) {
  const pages = snapshot.pages || [];
  const summary = summarizePages(pages);
  const totals = analyticsTotals(snapshot.analytics);
  const sitemap = snapshot.sitemap || {};
  const previous = history.length > 1 ? history[history.length - 2] : null;
  const delta = previous ? summary.indexed - previous.indexed : null;

  const rows = pages
    .slice()
    .sort((a, b) => bucketOf(a.state).localeCompare(bucketOf(b.state)) || a.url.localeCompare(b.url))
    .map((p) => {
      const bucket = bucketOf(p.state);
      return `<tr class="b-${bucket}"><td class="url">${esc(p.url.replace(snapshot.site || '', '') || '/')}</td>`
        + `<td><span class="pill ${bucket}">${esc(p.state || 'unknown')}</span></td>`
        + `<td>${esc(p.lastCrawl ? p.lastCrawl.slice(0, 10) : '—')}</td>`
        + `<td>${p.canonicalOk === false ? '✗' : '✓'}</td></tr>`;
    })
    .join('');

  const queryRows = (snapshot.analytics?.topQueries || [])
    .map((q) => `<tr><td>${esc(q.query)}</td><td>${q.clicks}</td><td>${q.impressions}</td><td>${(q.position || 0).toFixed(1)}</td></tr>`)
    .join('');

  const pageRows = (snapshot.analytics?.topPages || [])
    .map((p) => `<tr><td class="url">${esc(p.page.replace(snapshot.site || '', '') || '/')}</td><td>${p.clicks}</td><td>${p.impressions}</td></tr>`)
    .join('');

  const emptyNote = '<p class="empty">No rows yet — Search Console needs a few days of data before queries and pages appear.</p>';

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>KDocs-Pro · Search Console dashboard</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 28px; background: #0b1220; color: #e6edf7;
         font: 14px/1.55 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  h2 { font-size: 14px; text-transform: uppercase; letter-spacing: .08em; color: #8fa3bf; margin: 30px 0 10px; }
  .sub { color: #8fa3bf; margin: 0 0 22px; font-size: 13px; }
  .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; }
  .card { background: #131c2e; border: 1px solid #22304a; border-radius: 12px; padding: 14px 16px; }
  .card .n { font-size: 26px; font-weight: 700; line-height: 1.1; }
  .card .l { color: #8fa3bf; font-size: 12px; margin-top: 4px; }
  .card .d { font-size: 12px; margin-top: 6px; color: #4ade80; }
  .card .d.down { color: #f87171; }
  table { width: 100%; border-collapse: collapse; background: #131c2e; border: 1px solid #22304a; border-radius: 12px; overflow: hidden; }
  th, td { text-align: left; padding: 9px 12px; border-bottom: 1px solid #1c2740; font-size: 13px; }
  th { color: #8fa3bf; font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: .05em; }
  tr:last-child td { border-bottom: 0; }
  td.url { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12.5px; }
  .pill { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 11.5px; }
  .pill.indexed { background: #10331f; color: #6ee7a8; }
  .pill.discovered { background: #33290f; color: #fbbf24; }
  .pill.unknown { background: #331a1a; color: #fca5a5; }
  .pill.excluded, .pill.other { background: #1f2937; color: #cbd5e1; }
  .spark { width: 100%; max-width: 260px; height: 48px; display: block; margin-top: 8px; }
  .empty { color: #8fa3bf; font-style: italic; }
  .foot { color: #64748b; font-size: 12px; margin-top: 28px; }
</style>
</head>
<body>
  <h1>Search Console dashboard</h1>
  <p class="sub">${esc(snapshot.site || '')} · snapshot ${esc(snapshot.snapshotAt || '')}</p>

  <div class="cards">
    <div class="card"><div class="n">${summary.indexed}</div><div class="l">Indexed</div>${delta === null ? '' : `<div class="d ${delta < 0 ? 'down' : ''}">${delta >= 0 ? '+' : ''}${delta} since last run</div>`}</div>
    <div class="card"><div class="n">${summary.discovered}</div><div class="l">Discovered, not indexed</div></div>
    <div class="card"><div class="n">${summary.unknown}</div><div class="l">Unknown to Google</div></div>
    <div class="card"><div class="n">${summary.indexedShare}%</div><div class="l">Of ${summary.total} URLs indexed</div></div>
    <div class="card"><div class="n">${totals.clicks}</div><div class="l">Clicks (${esc(snapshot.analytics?.range?.start || '—')} → ${esc(snapshot.analytics?.range?.end || '—')})</div></div>
    <div class="card"><div class="n">${totals.impressions}</div><div class="l">Impressions</div></div>
    <div class="card"><div class="n">${totals.ctr.toFixed(1)}%</div><div class="l">CTR</div></div>
    <div class="card"><div class="n">${sitemap.submitted ?? '—'}</div><div class="l">Sitemap URLs · ${sitemap.errors ?? 0} errors</div></div>
  </div>

  <h2>Index coverage trend</h2>
  ${history.length ? sparkline(history.map((h) => h.indexed)) : '<p class="empty">First run — the trend appears after the next snapshot.</p>'}

  <h2>Queries</h2>
  ${queryRows ? `<table><thead><tr><th>Query</th><th>Clicks</th><th>Impressions</th><th>Avg position</th></tr></thead><tbody>${queryRows}</tbody></table>` : emptyNote}

  <h2>Pages by clicks</h2>
  ${pageRows ? `<table><thead><tr><th>Page</th><th>Clicks</th><th>Impressions</th></tr></thead><tbody>${pageRows}</tbody></table>` : emptyNote}

  <h2>Index status · ${summary.total} URLs</h2>
  <table>
    <thead><tr><th>URL</th><th>Coverage</th><th>Last crawl</th><th>Canonical</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>

  <p class="foot">Generated by tools/seo-dashboard.js from reports/seo-snapshot.json. Data comes from the Search Console API; analytics lag 2–3 days.</p>
</body>
</html>
`;
}

function parseArgs(argv) {
  const args = { ...DEFAULTS };
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    if (flag === '--snapshot') args.snapshot = path.resolve(argv[++i]);
    else if (flag === '--out') args.out = path.resolve(argv[++i]);
    else if (flag === '--history') args.history = path.resolve(argv[++i]);
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!fs.existsSync(args.snapshot)) {
    console.error(`No snapshot at ${args.snapshot}. Write one from the Search Console API first.`);
    process.exit(1);
  }
  const snapshot = JSON.parse(fs.readFileSync(args.snapshot, 'utf8'));
  const summary = summarizePages(snapshot.pages || []);
  const totals = analyticsTotals(snapshot.analytics);

  let history = [];
  if (fs.existsSync(args.history)) {
    try {
      history = JSON.parse(fs.readFileSync(args.history, 'utf8'));
    } catch {
      history = [];
    }
  }
  history = upsertHistory(history, {
    at: snapshot.snapshotAt || new Date().toISOString(),
    indexed: summary.indexed,
    discovered: summary.discovered,
    unknown: summary.unknown,
    clicks: totals.clicks,
    impressions: totals.impressions,
  });

  fs.mkdirSync(path.dirname(args.out), { recursive: true });
  fs.writeFileSync(args.out, renderDashboard(snapshot, history));
  fs.writeFileSync(args.history, `${JSON.stringify(history, null, 2)}\n`);

  console.log(`Indexed ${summary.indexed}/${summary.total} (${summary.indexedShare}%) · discovered ${summary.discovered} · unknown ${summary.unknown}`);
  console.log(`Clicks ${totals.clicks} · impressions ${totals.impressions} · CTR ${totals.ctr.toFixed(1)}%`);
  console.log(`Wrote ${path.relative(ROOT, args.out)}`);
}

module.exports = { bucketOf, summarizePages, analyticsTotals, upsertHistory, renderDashboard };

if (require.main === module) main();
