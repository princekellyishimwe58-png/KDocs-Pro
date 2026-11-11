#!/usr/bin/env node
// Weekly index-coverage report.
//
// Answers one question, for the pages that are actually in the sitemap: how many
// are in Google's index, and for the rest, what is Google's stated reason?
//
// The Google credentials live in the Freebuff integration, not in this app, so
// the per-URL inspection results are collected through the Search Console API
// and written to reports/index-coverage-snapshot.json. This tool turns that
// snapshot into a self-contained HTML page plus a console summary, and keeps one
// history point per ISO week so movement can be read week over week.
//
// Refresh procedure (weekly):
//   1. Inspect every URL in /sitemap.xml with the Search Console URL Inspection
//      API and write the results to reports/index-coverage-snapshot.json
//      (shape documented in README.md; `pages[].coverageState` is the field that
//      matters, everything else is context).
//   2. node tools/index-coverage.js
//   3. Open reports/index-coverage.html
//
// Usage:
//   node tools/index-coverage.js [--snapshot path] [--out path] [--history path]
//                                [--sitemap url] [--strict] [--quiet]
//
// Exit codes: 0 report written · 1 snapshot missing/unreadable · 2 --strict and
// the snapshot does not cover every sitemap URL.

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DEFAULTS = {
  snapshot: path.join(ROOT, 'reports', 'index-coverage-snapshot.json'),
  out: path.join(ROOT, 'reports', 'index-coverage.html'),
  history: path.join(ROOT, 'reports', 'index-coverage-history.json'),
  sitemap: null, // null = use snapshot.sitemap, else fetch <site>/sitemap.xml
};

// Search Console's coverage states, grouped by what they mean for the reader.
// Order matters: the first matching bucket wins, so the specific phrases come
// before the generic ones.
const BUCKETS = [
  {
    key: 'indexed',
    label: 'Indexed',
    match: ['submitted and indexed', 'indexed, not submitted in sitemap'],
    advice: 'Nothing to do. Watch that it stays indexed after the next content change.',
  },
  {
    key: 'discovered',
    label: 'Discovered, not indexed',
    match: ['discovered - currently not indexed', 'discovered'],
    advice: 'Google knows the URL and has chosen not to spend a crawl on it yet. '
      + 'This is a site-level trust signal: more internal links and any external mention help; '
      + 're-submitting the sitemap does not.',
  },
  {
    key: 'unknown',
    label: 'Unknown to Google',
    match: ['url is unknown to google'],
    advice: 'Google has never seen this URL. Check it is in sitemap.xml, that robots.txt allows it, '
      + 'and that at least one page links to it.',
  },
  {
    key: 'excluded',
    label: 'Excluded',
    match: [
      'excluded by', 'noindex', 'alternate page with proper canonical tag',
      'duplicate, google chose different canonical', 'duplicate without user-selected canonical',
      'soft 404', 'not found (404)', 'blocked by robots.txt', 'redirect',
    ],
    advice: 'Google is deliberately not indexing this URL. If that is intended (a private screen), '
      + 'leave it; otherwise fix the noindex, canonical or redirect that caused it.',
  },
];

const OTHER = {
  key: 'other',
  label: 'Other / unrecognised',
  advice: 'Google returned a state this report does not recognise. Read the raw value in the table '
    + 'and update BUCKETS in tools/index-coverage.js if it is a new one.',
};

function classify(state) {
  const s = String(state || '').toLowerCase();
  for (const bucket of BUCKETS) {
    if (bucket.match.some((needle) => s.includes(needle))) return bucket;
  }
  return OTHER;
}

// A page can be "indexed" and still be broken: a failed fetch or a canonical
// pointing somewhere else means the indexed copy is not the page we wrote.
function problemsOf(page) {
  const out = [];
  const fetch = String(page.pageFetchState || '').toUpperCase();
  if (fetch && fetch !== 'SUCCESSFUL' && fetch !== 'PAGE_FETCH_STATE_UNSPECIFIED') {
    out.push(`fetch ${fetch.toLowerCase().replace(/_/g, ' ')}`);
  }
  if (page.robotsTxtState && String(page.robotsTxtState).toUpperCase() === 'DISALLOWED') {
    out.push('blocked by robots.txt');
  }
  if (page.indexingState && String(page.indexingState).toUpperCase() === 'INDEXING_NOT_ALLOWED') {
    out.push('noindex');
  }
  if (page.googleCanonical && page.userCanonical && page.googleCanonical !== page.userCanonical) {
    out.push('Google picked a different canonical');
  }
  return out;
}

function summarize(pages = []) {
  const counts = { indexed: 0, discovered: 0, unknown: 0, excluded: 0, other: 0 };
  for (const page of pages) counts[classify(page.coverageState).key] += 1;
  const total = pages.length;
  const notIndexed = total - counts.indexed;
  return {
    ...counts,
    total,
    notIndexed,
    indexedShare: total ? Math.round((counts.indexed / total) * 100) : 0,
  };
}

// The sitemap is the contract: every URL in it should appear in the snapshot.
// A URL that is in the sitemap but was never inspected is a hole in the report,
// not a page that is fine.
function compareSitemap(sitemap = [], pages = []) {
  const inspected = new Set(pages.map((p) => p.url));
  const listed = new Set(sitemap);
  return {
    missing: sitemap.filter((u) => !inspected.has(u)),
    extra: pages.map((p) => p.url).filter((u) => !listed.has(u)),
  };
}

// ISO week key, e.g. 2026-W46. One history point per week: re-running the report
// on a Tuesday replaces Monday's point instead of stacking duplicates.
function weekKey(date) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return 'unknown';
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = t.getUTCDay() || 7; // Monday = 1 ... Sunday = 7
  t.setUTCDate(t.getUTCDate() + 4 - day); // nearest Thursday decides the year
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((t - yearStart) / 86400000 + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function upsertWeekly(history, entry) {
  const week = weekKey(entry.at);
  const kept = (history || []).filter((h) => weekKey(h.at) !== week);
  kept.push({ ...entry, week });
  kept.sort((a, b) => String(a.at).localeCompare(String(b.at)));
  return kept.slice(-52); // a year of weeks
}

// Which URLs changed bucket since the previous snapshot. This is the part worth
// reading: a page moving from "unknown" to "discovered" is progress even though
// the indexed count has not moved yet.
function changesSince(previousPages = [], pages = []) {
  const before = new Map(previousPages.map((p) => [p.url, classify(p.coverageState).key]));
  const out = [];
  for (const page of pages) {
    const was = before.get(page.url);
    if (!was) continue;
    const now = classify(page.coverageState).key;
    if (was !== now) out.push({ url: page.url, from: was, to: now });
  }
  return out;
}

function daysSince(iso, now = Date.now()) {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return Math.floor((now - t) / 86400000);
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function shortPath(url, site) {
  const s = String(url || '');
  const base = String(site || '').replace(/\/+$/, '');
  if (base && s.startsWith(base)) return s.slice(base.length) || '/';
  return s;
}

function sparkline(values, width = 260, height = 48) {
  if (!values.length) return '';
  const max = Math.max(...values, 1);
  const step = values.length > 1 ? width / (values.length - 1) : width;
  const points = values
    .map((v, i) => `${(i * step).toFixed(1)},${(height - (v / max) * (height - 6) - 3).toFixed(1)}`)
    .join(' ');
  return `<svg class="spark" viewBox="0 0 ${width} ${height}" role="img" aria-label="Indexed pages per week">`
    + `<polyline points="${points}" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linejoin="round" />`
    + '</svg>';
}

const SEVERITY = { unknown: 0, discovered: 1, excluded: 2, other: 3, indexed: 4 };

function renderReport(snapshot, history = [], options = {}) {
  const site = snapshot.site || '';
  const pages = snapshot.pages || [];
  const sitemap = options.sitemap || snapshot.sitemap || [];
  const summary = summarize(pages);
  const gaps = compareSitemap(sitemap, pages);
  const previous = history.length > 1 ? history[history.length - 2] : null;
  const delta = previous ? summary.indexed - previous.indexed : null;
  const changes = changesSince(options.previousPages || [], pages);
  const age = daysSince(snapshot.capturedAt, options.now);

  const rows = pages
    .slice()
    .sort((a, b) => (SEVERITY[classify(a.coverageState).key] - SEVERITY[classify(b.coverageState).key])
      || String(a.url).localeCompare(String(b.url)))
    .map((p) => {
      const bucket = classify(p.coverageState);
      const problems = problemsOf(p);
      return `<tr class="b-${bucket.key}">`
        + `<td class="url">${esc(shortPath(p.url, site))}</td>`
        + `<td><span class="pill ${bucket.key}">${esc(p.coverageState || 'unknown')}</span></td>`
        + `<td>${esc(p.lastCrawl ? String(p.lastCrawl).slice(0, 10) : 'never')}</td>`
        + `<td>${problems.length ? esc(problems.join('; ')) : '—'}</td></tr>`;
    })
    .join('');

  const gapRows = gaps.missing
    .map((u) => `<tr><td class="url">${esc(shortPath(u, site))}</td><td>in sitemap, never inspected</td></tr>`)
    .join('');

  const changeRows = changes
    .map((c) => `<tr><td class="url">${esc(shortPath(c.url, site))}</td>`
      + `<td><span class="pill ${c.from}">${esc(c.from)}</span> → <span class="pill ${c.to}">${esc(c.to)}</span></td></tr>`)
    .join('');

  const historyRows = history.slice(-8).reverse().map((h) => {
    const idx = history.indexOf(h);
    const prev = idx > 0 ? history[idx - 1] : null;
    const step = prev ? h.indexed - prev.indexed : null;
    return `<tr><td>${esc(h.week || weekKey(h.at))}</td><td>${esc(String(h.at).slice(0, 10))}</td>`
      + `<td>${h.indexed}</td><td>${h.notIndexed ?? '—'}</td>`
      + `<td>${step === null ? '—' : `${step >= 0 ? '+' : ''}${step}`}</td></tr>`;
  }).join('');

  const advice = BUCKETS.concat([OTHER])
    .filter((b) => summary[b.key] > 0)
    .map((b) => `<div class="advice"><h3><span class="pill ${b.key}">${esc(b.label)}</span> ${summary[b.key]} URL${summary[b.key] === 1 ? '' : 's'}</h3><p>${esc(b.advice)}</p></div>`)
    .join('');

  const stale = age !== null && age > 7
    ? `<p class="warn">This snapshot is ${age} days old. Re-run the Search Console inspection before reading the numbers.</p>`
    : '';

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>KDocs-Pro · Index coverage</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 28px; background: #0b1220; color: #e6edf7;
         font: 14px/1.55 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  h2 { font-size: 14px; text-transform: uppercase; letter-spacing: .08em; color: #8fa3bf; margin: 30px 0 10px; }
  h3 { font-size: 13px; margin: 0 0 6px; }
  .sub { color: #8fa3bf; margin: 0 0 22px; font-size: 13px; }
  .warn { background: #33290f; color: #fbbf24; border: 1px solid #5a4715; border-radius: 10px; padding: 10px 14px; }
  .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; }
  .card { background: #131c2e; border: 1px solid #22304a; border-radius: 12px; padding: 14px 16px; }
  .card .n { font-size: 26px; font-weight: 700; line-height: 1.1; }
  .card .l { color: #8fa3bf; font-size: 12px; margin-top: 4px; }
  .card .d { font-size: 12px; margin-top: 6px; color: #4ade80; }
  .card .d.down { color: #f87171; }
  table { width: 100%; border-collapse: collapse; background: #131c2e; border: 1px solid #22304a; border-radius: 12px; overflow: hidden; }
  th, td { text-align: left; padding: 9px 12px; border-bottom: 1px solid #1c2740; font-size: 13px; vertical-align: top; }
  th { color: #8fa3bf; font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: .05em; }
  tr:last-child td { border-bottom: 0; }
  td.url { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12.5px; }
  .pill { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 11.5px; }
  .pill.indexed { background: #10331f; color: #6ee7a8; }
  .pill.discovered { background: #33290f; color: #fbbf24; }
  .pill.unknown { background: #331a1a; color: #fca5a5; }
  .pill.excluded, .pill.other { background: #1f2937; color: #cbd5e1; }
  .advice { background: #131c2e; border: 1px solid #22304a; border-radius: 12px; padding: 12px 16px; margin-bottom: 10px; }
  .advice p { margin: 0; color: #b6c4d8; font-size: 13px; }
  .spark { width: 100%; max-width: 260px; height: 48px; display: block; margin-top: 8px; }
  .empty { color: #8fa3bf; font-style: italic; }
  .foot { color: #64748b; font-size: 12px; margin-top: 28px; }
</style>
</head>
<body>
  <h1>Index coverage</h1>
  <p class="sub">${esc(site)} · snapshot ${esc(snapshot.capturedAt || 'undated')} · ${summary.total} URLs inspected</p>
  ${stale}

  <div class="cards">
    <div class="card"><div class="n">${summary.indexed}</div><div class="l">Indexed</div>${delta === null ? '' : `<div class="d ${delta < 0 ? 'down' : ''}">${delta >= 0 ? '+' : ''}${delta} since last week</div>`}</div>
    <div class="card"><div class="n">${summary.notIndexed}</div><div class="l">Not indexed</div></div>
    <div class="card"><div class="n">${summary.discovered}</div><div class="l">Discovered, not indexed</div></div>
    <div class="card"><div class="n">${summary.unknown}</div><div class="l">Unknown to Google</div></div>
    <div class="card"><div class="n">${summary.excluded}</div><div class="l">Excluded</div></div>
    <div class="card"><div class="n">${summary.indexedShare}%</div><div class="l">Of ${summary.total} indexed</div></div>
    <div class="card"><div class="n">${gaps.missing.length}</div><div class="l">Sitemap URLs not inspected</div></div>
  </div>

  <h2>Weekly trend</h2>
  ${history.length ? sparkline(history.map((h) => h.indexed)) : '<p class="empty">First run — the trend appears next week.</p>'}

  <h2>Changed since last snapshot</h2>
  ${changeRows
    ? `<table><thead><tr><th>URL</th><th>Movement</th></tr></thead><tbody>${changeRows}</tbody></table>`
    : '<p class="empty">No URL changed bucket since the previous snapshot.</p>'}

  <h2>What each state means</h2>
  ${advice || '<p class="empty">No pages to explain.</p>'}

  <h2>Coverage by URL</h2>
  <table>
    <thead><tr><th>URL</th><th>Coverage</th><th>Last crawl</th><th>Problems</th></tr></thead>
    <tbody>${rows || '<tr><td colspan="4" class="empty">No pages in the snapshot.</td></tr>'}</tbody>
  </table>

  ${gaps.missing.length ? `<h2>Sitemap URLs missing from the snapshot</h2>
  <table><thead><tr><th>URL</th><th>Why it matters</th></tr></thead><tbody>${gapRows}</tbody></table>` : ''}

  <h2>Snapshot history</h2>
  ${historyRows
    ? `<table><thead><tr><th>Week</th><th>Captured</th><th>Indexed</th><th>Not indexed</th><th>Change</th></tr></thead><tbody>${historyRows}</tbody></table>`
    : '<p class="empty">No history yet.</p>'}

  <p class="foot">Generated by tools/index-coverage.js from reports/index-coverage-snapshot.json.
  Search Console's per-URL data lags several days, so a change made today may not appear for a week.</p>
</body>
</html>
`;
}

function parseArgs(argv) {
  const args = { ...DEFAULTS, strict: false, quiet: false };
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    if (flag === '--snapshot') args.snapshot = path.resolve(argv[++i]);
    else if (flag === '--out') args.out = path.resolve(argv[++i]);
    else if (flag === '--history') args.history = path.resolve(argv[++i]);
    else if (flag === '--sitemap') args.sitemap = argv[++i];
    else if (flag === '--strict') args.strict = true;
    else if (flag === '--quiet') args.quiet = true;
  }
  return args;
}

// The sitemap is the list of pages this report is about. Prefer the snapshot's
// own copy (so a report can be regenerated offline), then the live file.
async function resolveSitemap(snapshot, args) {
  if (Array.isArray(snapshot.sitemap) && snapshot.sitemap.length) return snapshot.sitemap;
  const url = args.sitemap || (snapshot.site ? `${String(snapshot.site).replace(/\/+$/, '')}/sitemap.xml` : null);
  if (!url) return [];
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const xml = await res.text();
    return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
  } catch {
    return [];
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!fs.existsSync(args.snapshot)) {
    console.error(`No snapshot at ${args.snapshot}. Write one from the Search Console URL Inspection API first.`);
    process.exitCode = 1;
    return;
  }
  let snapshot;
  try {
    snapshot = JSON.parse(fs.readFileSync(args.snapshot, 'utf8'));
  } catch (err) {
    console.error(`Snapshot is not valid JSON: ${err.message}`);
    process.exitCode = 1;
    return;
  }
  if (!Array.isArray(snapshot.pages)) {
    console.error('Snapshot has no "pages" array.');
    process.exitCode = 1;
    return;
  }

  const sitemap = await resolveSitemap(snapshot, args);
  const summary = summarize(snapshot.pages);
  const gaps = compareSitemap(sitemap, snapshot.pages);

  let history = [];
  if (fs.existsSync(args.history)) {
    try {
      history = JSON.parse(fs.readFileSync(args.history, 'utf8'));
    } catch {
      history = [];
    }
  }
  const previousPages = history.length ? (history[history.length - 1].pages || []) : [];
  history = upsertWeekly(history, {
    at: snapshot.capturedAt || new Date().toISOString(),
    indexed: summary.indexed,
    notIndexed: summary.notIndexed,
    discovered: summary.discovered,
    unknown: summary.unknown,
    excluded: summary.excluded,
    total: summary.total,
    // Kept so next week's run can say which URLs moved, not just how many.
    pages: snapshot.pages.map((p) => ({ url: p.url, coverageState: p.coverageState })),
  });

  fs.mkdirSync(path.dirname(args.out), { recursive: true });
  fs.writeFileSync(args.out, renderReport(snapshot, history, { sitemap, previousPages }));
  fs.writeFileSync(args.history, `${JSON.stringify(history, null, 2)}\n`);

  if (!args.quiet) {
    console.log(`Indexed ${summary.indexed}/${summary.total} (${summary.indexedShare}%) · not indexed ${summary.notIndexed}`);
    console.log(`  discovered ${summary.discovered} · unknown ${summary.unknown} · excluded ${summary.excluded} · other ${summary.other}`);
    if (gaps.missing.length) console.log(`  ${gaps.missing.length} sitemap URL(s) missing from the snapshot`);
    const age = daysSince(snapshot.capturedAt);
    if (age !== null && age > 7) console.log(`  warning: snapshot is ${age} days old`);
    console.log(`Wrote ${path.relative(ROOT, args.out)}`);
  }

  if (args.strict && gaps.missing.length) process.exitCode = 2;
}

module.exports = {
  BUCKETS, OTHER, classify, problemsOf, summarize, compareSitemap,
  weekKey, upsertWeekly, changesSince, daysSince, renderReport, resolveSitemap,
};

if (require.main === module) main();
