#!/usr/bin/env node
// Live SEO audit: fetches every URL in the sitemap from the running site and
// reports the signals Google actually uses to decide whether a page is worth
// crawling and indexing.
//
// Read-only. Usage:
//   node tools/seo-audit.js                      # audit production
//   node tools/seo-audit.js http://localhost:8080 # audit a local server
//
// Exit code is 0 unless the audit itself fails (fetch error); the report is
// written to stdout so a human can read it and so tests can assert on it.

const ORIGIN = (process.argv[2] || 'https://kdocs-pro.onrender.com').replace(/\/+$/, '');

const ELIDED = new Set(['script', 'style', 'noscript', 'svg', 'template']);

// Drop elements carrying the app's `hidden` class. They are display:none, so
// Google does not count them as page content - counting them hides the real
// problem (a page whose only unique text is invisible).
function dropHidden(html) {
  let s = String(html);
  const re = /<([a-z][a-z0-9]*)\b[^>]*class="[^"]*(?:^|\s)hidden(?:\s|")[^"]*"[^>]*>((?:(?!<\/?\1\b)[\s\S])*?)<\/\1>/gi;
  for (let i = 0; i < 8; i++) {
    const next = s.replace(re, ' ');
    if (next === s) break;
    s = next;
  }
  return s;
}

function stripHtml(html) {
  // Remove non-content elements, then tags, then entities.
  let s = String(html);
  for (const tag of ELIDED) {
    s = s.replace(new RegExp(`<${tag}[\\s\\S]*?</${tag}>`, 'gi'), ' ');
  }
  s = dropHidden(s);
  s = s.replace(/<!--[\s\S]*?-->/g, ' ');
  s = s.replace(/<[^>]+>/g, ' ');
  s = s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  return s.replace(/\s+/g, ' ').trim();
}

function words(text) {
  if (!text) return 0;
  return text.split(/\s+/).filter((w) => /[a-z0-9]/i.test(w)).length;
}

function one(html, re) {
  const m = html.match(re);
  return m ? m[1] : null;
}

async function auditUrl(url) {
  const started = Date.now();
  let res;
  try {
    res = await fetch(url, {
      redirect: 'manual',
      headers: { 'user-agent': 'Googlebot/2.1 (+http://www.google.com/bot.html)' },
    });
  } catch (err) {
    return { url, error: err.message, ms: Date.now() - started };
  }
  const body = await res.text();
  const ms = Date.now() - started;
  const text = stripHtml(body);
  return {
    url,
    status: res.status,
    ms,
    bytes: body.length,
    title: one(body, /<title>([\s\S]*?)<\/title>/i),
    description: one(body, /<meta name="description" content="([^"]*)"/i),
    canonical: one(body, /<link rel="canonical" href="([^"]*)"/i),
    robots: one(body, /<meta name="robots" content="([^"]*)"/i),
    h1: one(body, /<h1[^>]*>([\s\S]*?)<\/h1>/i),
    visibleH1s: (dropHidden(body).match(/<h1[\s>]/gi) || []).length,
    title2: null,
    h2count: (body.match(/<h2[\s>]/gi) || []).length,
    internalLinks: new Set(
      (body.match(/<a\s[^>]*href="\/[^"#]*"/gi) || [])
        .map((a) => one(a, /href="([^"]*)"/))
        .filter(Boolean),
    ).size,
    jsonLd: (body.match(/application\/ld\+json/g) || []).length,
    words: words(text),
    text,
    html: body,
  };
}

async function main() {
  const sitemapRes = await fetch(`${ORIGIN}/sitemap.xml`);
  if (sitemapRes.status !== 200) {
    console.error(`sitemap.xml returned ${sitemapRes.status}`);
    process.exitCode = 1;
    return;
  }
  const sitemap = await sitemapRes.text();
  const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  console.log(`# SEO audit — ${ORIGIN}`);
  console.log(`sitemap.xml: ${sitemapRes.status}, ${locs.length} URLs\n`);

  const rows = [];
  for (const loc of locs) {
    rows.push(await auditUrl(loc));
  }

  const seenText = new Map();
  for (const r of rows) {
    const p = r.url.replace(ORIGIN, '') || '/';
    if (r.error) {
      console.log(`${p.padEnd(28)} FETCH FAILED  ${r.error}`);
      continue;
    }
    const flags = [];
    if (r.status !== 200) flags.push(`HTTP ${r.status}`);
    if (r.canonical && !r.canonical.endsWith(p === '/' ? '' : p)) flags.push(`canonical→${r.canonical}`);
    if (!r.canonical) flags.push('no canonical');
    if (r.robots && /noindex/.test(r.robots)) flags.push(`robots=${r.robots}`);
    if (!r.title) flags.push('no title');
    else if (r.title.length > 65) flags.push(`title ${r.title.length}c`);
    if (!r.description) flags.push('no description');
    else if (r.description.length < 70 || r.description.length > 165) flags.push(`desc ${r.description.length}c`);
    if (r.words < 350) flags.push(`thin ${r.words}w`);
    if (r.internalLinks < 5) flags.push(`${r.internalLinks} links`);
    if (r.h1 === null) flags.push('no h1');
    if (r.visibleH1s !== 1) flags.push(`${r.visibleH1s} visible h1`);
    if (r.h2count === 0) flags.push('no h2');
    if (r.ms > 1500) flags.push(`slow ${r.ms}ms`);
    const dup = seenText.get(r.text);
    if (dup && r.text.length > 0) flags.push(`duplicate of ${dup}`);
    else seenText.set(r.text, p);
    console.log(
      `${p.padEnd(28)} ${String(r.status).padEnd(4)} ${String(r.ms + 'ms').padEnd(8)}`
      + `${String(r.words).padEnd(6)}w ${String(r.internalLinks).padEnd(3)}links `
      + `${r.h2count}h2 ${r.jsonLd}ld ${flags.length ? '  ← ' + flags.join(', ') : ''}`,
    );
  }

  console.log('\n# Duplicate text blocks');
  const byLen = [...seenText.entries()].sort((a, b) => b[0].length - a[0].length);
  console.log(`unique text blocks: ${byLen.length} for ${rows.filter((r) => !r.error).length} pages`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
