const { test, describe } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { STAGES } = require('../utils/templates');
const { renderSitemap, renderRobots, sitemapEntries } = require('../utils/sitemap');
const {
  DEFAULT_ORIGIN, ORIGIN_TOKEN, HOST_TOKEN,
  normalizeOrigin, siteOrigin, redirectTarget, injectOrigin,
} = require('../utils/site');

const PUB = path.join(__dirname, '..', 'public');
const read = (f) => fs.readFileSync(path.join(PUB, f), 'utf8');
const readHtml = (f) => injectOrigin(read(f), DEFAULT_ORIGIN);

const SITE = DEFAULT_ORIGIN;

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
  const html = readHtml('index.html');

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
    const graph = jsonLdBlocks(html).find((b) => Array.isArray(b['@graph']));
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
    assert.match(visibleText(html), /KDocs Pro/, 'readers and crawlers see the exact brand phrase');
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

describe('About page: the entity has somewhere to be explained', () => {
  const about = readHtml('about.html');
  const home = readHtml('index.html');

  test('is indexable and self-canonical', () => {
    assert.match(about, /<title>About KDocs Pro/);
    assert.match(about, /<meta name="robots" content="index, follow/);
    assert.match(about, new RegExp(`<link rel="canonical" href="${SITE}/about\\.html"`));
    assert.doesNotMatch(about, /noindex/i);
  });

  test('describes the Organization with the same @id the homepage declares', () => {
    const page = allNodes(about).find((n) => n['@type'] === 'AboutPage');
    assert.ok(page, 'AboutPage node is present');
    assert.strictEqual(page.mainEntity['@id'], `${SITE}/#organization`);
    assert.strictEqual(page.mainEntity.name, 'KDocs Pro');
    assert.ok(page.mainEntity.alternateName.includes('kdocs pro'));
  });

  test('is linked from the homepage and listed in the sitemap (not orphaned)', () => {
    assert.match(home, /href="\/about\.html"/, 'homepage links to the about page');
    assert.ok(sitemapEntries().some((e) => e.path === '/about.html'), 'sitemap lists the about page');
  });

  test('links back into the document catalog', () => {
    const linked = new Set(about.match(/href="\/doc\/[a-z0-9_]+"/g) || []);
    assert.ok(linked.size >= 10, `about page links to at least 10 documents, got ${linked.size}`);
  });
});

describe('Sitemap: generated, dated, complete', () => {
  const xml = renderSitemap(SITE);

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
      (xml.match(/<loc>([^<]+)<\/loc>/g) || [])
        .map((l) => l.replace(/<\/?loc>/g, '').split('/doc/')[1])
        .filter(Boolean)
    );
    const missing = docKeys().filter((k) => !listed.has(k));
    assert.deepStrictEqual(missing, [], `documents missing from the sitemap: ${missing.join(', ')}`);
  });

  test('lists each URL once', () => {
    const locs = (xml.match(/<loc>([^<]+)<\/loc>/g) || []).map((l) => l.replace(/<\/?loc>/g, ''));
    assert.strictEqual(new Set(locs).size, locs.length, 'no duplicate <loc> entries');
  });

  test('no sitemap URL is blocked by robots.txt', () => {
    const robots = renderRobots(SITE);
    const disallowed = (robots.match(/^Disallow:\s*(\S+)/gm) || [])
      .map((l) => l.replace(/^Disallow:\s*/, '').trim())
      .filter(Boolean);
    for (const e of sitemapEntries()) {
      for (const d of disallowed) {
        assert.ok(!e.path.startsWith(d), `${e.path} is disallowed by robots.txt rule "${d}"`);
      }
    }
  });

  test('robots.txt advertises the sitemap on the configured origin', () => {
    assert.match(renderRobots(SITE), new RegExp(`Sitemap:\\s*${SITE}/sitemap\\.xml`));
  });
});

describe('Custom domain: the switch is configuration, not an edit', () => {
  const NEW = 'https://kdocspro.co.ke';

  test('no hand-maintained page hard-codes the host any more', () => {
    for (const f of ['index.html', 'about.html', 'terms.html', 'privacy.html', 'refund.html', 'delete-account.html', '404.html']) {
      const raw = read(f);
      assert.ok(!raw.includes('kdocs-pro.onrender.com'),
        `${f} still hard-codes the old host - use ${ORIGIN_TOKEN}/${HOST_TOKEN} instead`);
    }
  });

  test('a new SITE_URL rewrites every absolute URL on the page', () => {
    const html = injectOrigin(read('index.html'), NEW);
    assert.ok(!html.includes('kdocs-pro.onrender.com'), 'no stale host survives injection');
    assert.ok(!html.includes(ORIGIN_TOKEN) && !html.includes(HOST_TOKEN), 'no unresolved tokens');
    const org = allNodes(html).find((n) => n['@type'] === 'Organization');
    assert.strictEqual(org['@id'], `${NEW}/#organization`);
    assert.strictEqual(org.logo.url, `${NEW}/logo.svg`);
    assert.match(html, new RegExp(`<link rel="canonical" href="${NEW}/"`));
    assert.match(html, new RegExp(`<meta property="og:url" content="${NEW}/"`));
    // Prose that names the site in plain text follows too.
    assert.ok(visibleText(html).includes('kdocspro.co.ke'), 'footer names the new host');
  });

  test('sitemap and robots follow SITE_URL', () => {
    for (const loc of renderSitemap(NEW).match(/<loc>[^<]+<\/loc>/g)) {
      assert.ok(loc.includes(NEW), `sitemap loc is not on the new origin: ${loc}`);
    }
    assert.match(renderRobots(NEW), new RegExp(`Sitemap:\\s*${NEW}/sitemap\\.xml`));
  });

  test('old host 301s to the new one, path and query intact', () => {
    assert.strictEqual(
      redirectTarget({ host: 'kdocs-pro.onrender.com', originalUrl: '/doc/cv?src=x', origin: NEW }),
      `${NEW}/doc/cv?src=x`
    );
    assert.strictEqual(
      redirectTarget({ host: 'kdocs-pro.onrender.com', originalUrl: '/', origin: NEW }),
      `${NEW}/`
    );
  });
});

describe('Origin normalisation and redirect safety', () => {
  test('accepts bare origins, with or without a scheme or trailing slash', () => {
    assert.strictEqual(normalizeOrigin('https://kdocspro.co.ke'), 'https://kdocspro.co.ke');
    assert.strictEqual(normalizeOrigin('https://kdocspro.co.ke/'), 'https://kdocspro.co.ke');
    assert.strictEqual(normalizeOrigin('kdocspro.co.ke'), 'https://kdocspro.co.ke');
    assert.strictEqual(normalizeOrigin('  https://KDocsPro.co.ke  '), 'https://kdocspro.co.ke');
  });

  test('rejects values that would corrupt canonical URLs', () => {
    for (const bad of ['', '   ', 'https://kdocspro.co.ke/app', 'https://kdocspro.co.ke/?a=1', 'http://', 'not a url']) {
      assert.strictEqual(normalizeOrigin(bad), null, `expected null for ${JSON.stringify(bad)}`);
    }
  });

  test('siteOrigin defaults to the current host and honours SITE_URL', () => {
    const saved = process.env.SITE_URL;
    try {
      delete process.env.SITE_URL;
      assert.strictEqual(siteOrigin(), DEFAULT_ORIGIN);

      process.env.SITE_URL = 'https://kdocspro.co.ke';
      assert.strictEqual(siteOrigin(), 'https://kdocspro.co.ke');

      // A bad value must not take the site down or invent a broken origin.
      process.env.SITE_URL = 'https://kdocspro.co.ke/some/path';
      assert.strictEqual(siteOrigin(), DEFAULT_ORIGIN);
    } finally {
      if (saved === undefined) delete process.env.SITE_URL;
      else process.env.SITE_URL = saved;
    }
  });

  test('never redirects API traffic, non-GET, or internal hosts', () => {
    const origin = 'https://kdocspro.co.ke';
    assert.strictEqual(redirectTarget({ host: 'kdocs-pro.onrender.com', originalUrl: '/api/health', origin }), null);
    assert.strictEqual(redirectTarget({ host: 'kdocs-pro.onrender.com', originalUrl: '/api', origin }), null);
    assert.strictEqual(redirectTarget({ method: 'POST', host: 'kdocs-pro.onrender.com', originalUrl: '/doc/cv', origin }), null);
    for (const host of ['localhost:4789', '127.0.0.1:3000', '0.0.0.0', '[::1]:8080', '10.0.0.4', '192.168.1.5']) {
      assert.strictEqual(redirectTarget({ host, originalUrl: '/', origin }), null, `redirected ${host}`);
    }
  });

  test('does nothing when the request is already on the target host', () => {
    assert.strictEqual(
      redirectTarget({ host: 'kdocspro.co.ke', originalUrl: '/doc/cv', origin: 'https://kdocspro.co.ke' }),
      null
    );
    // Host header may carry a port; the hostname comparison ignores it.
    assert.strictEqual(
      redirectTarget({ host: 'kdocspro.co.ke:443', originalUrl: '/', origin: 'https://kdocspro.co.ke' }),
      null
    );
  });

  test('is inert while SITE_URL is unset (default host == served host)', () => {
    assert.strictEqual(
      redirectTarget({ host: 'kdocs-pro.onrender.com', originalUrl: '/doc/cv', origin: DEFAULT_ORIGIN }),
      null
    );
  });
});
