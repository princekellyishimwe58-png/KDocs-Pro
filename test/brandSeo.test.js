const { test, describe } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { STAGES } = require('../utils/templates');

const PUB = path.join(__dirname, '..', 'public');
const read = (f) => fs.readFileSync(path.join(PUB, f), 'utf8');

const SITE = 'https://kdocs-pro.onrender.com';

function docKeys() {
  const keys = [];
  for (const stage of Object.values(STAGES)) keys.push(...Object.keys(stage.documents));
  return keys;
}

// Every <script type="application/ld+json"> block in the shell, parsed.
function jsonLdBlocks(html) {
  const re = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;
  const out = [];
  let m;
  while ((m = re.exec(html)) !== null) out.push(JSON.parse(m[1]));
  return out;
}

// Every node regardless of nesting: a node may sit at the top level or inside
// an @graph container, and both are equally valid schema.org.
function allNodes(html) {
  const out = [];
  for (const block of jsonLdBlocks(html)) {
    if (Array.isArray(block['@graph'])) out.push(...block['@graph']);
    else out.push(block);
  }
  return out;
}

// The shell minus script blocks: what a reader (and a crawler scoring visible
// text) actually sees as copy.
function visibleText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<[^>]+>/g, ' ');
}

describe('Brand entity: "KDocs Pro" is nameable to Google', () => {
  const html = read('index.html');

  test('every structured-data block is valid JSON', () => {
    const blocks = jsonLdBlocks(html);
    assert.ok(blocks.length >= 2, `expected at least 2 JSON-LD blocks, got ${blocks.length}`);
  });

  test('Organization declares the brand name, aliases and a usable logo', () => {
    const org = allNodes(html).find((b) => b['@type'] === 'Organization');
    assert.ok(org, 'an Organization node is present');

    assert.strictEqual(org.name, 'KDocs Pro');
    // The space-separated form is what people actually type into Google;
    // the site's logo wordmark is hyphenated, so both must be declared.
    assert.ok(Array.isArray(org.alternateName) && org.alternateName.includes('kdocs pro'),
      'alternateName includes the space-separated "kdocs pro"');
    assert.ok(org.alternateName.includes('KDocs-Pro'), 'alternateName keeps the hyphenated form');

    assert.ok(org.logo && org.logo['@type'] === 'ImageObject', 'logo is an ImageObject');
    assert.ok(org.logo.url.startsWith(SITE), 'logo url is absolute on the site origin');
    // Google will not use a logo smaller than 112x112.
    assert.ok(org.logo.width >= 112 && org.logo.height >= 112,
      `logo must be at least 112x112, got ${org.logo.width}x${org.logo.height}`);
  });

  test('the declared logo file exists and is square', () => {
    const svg = read('logo.svg');
    const vb = svg.match(/viewBox="0 0 (\d+) (\d+)"/);
    assert.ok(vb, 'logo.svg declares a viewBox');
    assert.strictEqual(vb[1], vb[2], 'logo is square (Google rejects stretched logos)');
    assert.ok(Number(vb[1]) >= 112, 'logo viewBox is large enough to rasterise');
  });

  test('WebSite node exists and is published by the Organization', () => {
    const blocks = jsonLdBlocks(html);
    const graph = blocks.find((b) => Array.isArray(b['@graph']));
    assert.ok(graph, 'an @graph node is present');
    const ws = graph['@graph'].find((n) => n['@type'] === 'WebSite');
    const org = graph['@graph'].find((n) => n['@type'] === 'Organization');
    assert.ok(ws && org, 'both WebSite and Organization are in the graph');
    assert.strictEqual(ws.publisher['@id'], org['@id'], 'WebSite points at the Organization @id');
    assert.ok(ws.alternateName.includes('kdocs pro'), 'WebSite carries the spoken brand form');
  });

  test('SoftwareApplication is attributed to the Organization, not an orphan', () => {
    const app = allNodes(html).find((b) => b['@type'] === 'SoftwareApplication');
    assert.ok(app, 'SoftwareApplication is present');
    assert.strictEqual(app.name, 'KDocs Pro');
    assert.strictEqual(app.publisher['@id'], `${SITE}/#organization`);
    assert.ok(app.offers && app.offers.priceCurrency === 'KES', 'price offer is declared');
  });

  test('the literal text "KDocs Pro" appears as visible copy, not only in JSON-LD', () => {
    const text = visibleText(html);
    assert.match(text, /KDocs Pro/, 'readers and crawlers see the exact brand phrase');
  });

  test('title and og:site_name lead with the exact brand phrase', () => {
    assert.match(html, /<title>KDocs Pro \|/);
    assert.match(html, /<meta property="og:site_name" content="KDocs Pro"/);
  });

  test('the homepage is indexable', () => {
    assert.match(html, /<meta name="robots" content="index, follow/);
    assert.doesNotMatch(html, /noindex/i);
  });
});

describe('Sitemap: complete, dated, and reachable', () => {
  const xml = read('sitemap.xml');

  test('every <url> carries a lastmod (the one field Google still uses)', () => {
    const urls = xml.match(/<url>[\s\S]*?<\/url>/g) || [];
    assert.ok(urls.length >= 20, `expected the full catalog, got ${urls.length} urls`);
    for (const u of urls) {
      const loc = u.match(/<loc>([^<]+)<\/loc>/)?.[1] || '(no loc)';
      assert.match(u, /<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/, `missing lastmod for ${loc}`);
    }
  });

  test('every document the app can build has a sitemap entry', () => {
    const listed = new Set(
      (xml.match(/<loc>([^<]+)<\/loc>/g) || []).map((l) => l.replace(/<\/?loc>/g, '').split('/doc/')[1]).filter(Boolean)
    );
    const missing = docKeys().filter((k) => !listed.has(k));
    assert.deepStrictEqual(missing, [], `documents missing from sitemap.xml: ${missing.join(', ')}`);
  });

  test('no sitemap URL is blocked by robots.txt', () => {
    const robots = read('robots.txt');
    const disallowed = (robots.match(/^Disallow:\s*(\S+)/gm) || [])
      .map((l) => l.replace(/^Disallow:\s*/, '').trim())
      .filter(Boolean);
    const locs = (xml.match(/<loc>([^<]+)<\/loc>/g) || []).map((l) => l.replace(/<\/?loc>/g, ''));
    for (const loc of locs) {
      const p = new URL(loc).pathname;
      for (const d of disallowed) {
        assert.ok(!p.startsWith(d), `${loc} is disallowed by robots.txt rule "${d}"`);
      }
    }
  });

  test('robots.txt advertises the sitemap', () => {
    assert.match(read('robots.txt'), new RegExp(`Sitemap:\\s*${SITE}/sitemap\\.xml`));
  });
});
