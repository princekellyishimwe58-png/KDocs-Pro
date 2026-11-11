// Regression tests for the fix that took the /doc/<key> pages from
// "Discovered - currently not indexed" to a page Google can actually evaluate.
//
// The bug these lock down: every document landing was served as the homepage
// with the document's panel marked `hidden`. In the bytes a crawler reads first
// that meant one identical visible <h1> across twenty URLs, a placeholder
// heading ("Document"), and no description or price at all - twenty duplicates.

const { test, describe } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const { STAGES } = require('../utils/templates');
const { PRICES, PRICE_DEFAULT_KES } = require('../utils/pricing');
const {
  BRAND_SUFFIX, escAttr, pageTitle, docInfo, POPULAR_DOCS, renderDocShell, breadcrumbJsonLd,
  ROUTE_PANELS, NOINDEX_TAG, applyNoindex, renderRouteShell,
} = require('../utils/pageRender');
const { sitemapEntries } = require('../utils/sitemap');

const ROOT = path.join(__dirname, '..');
const SHELL = fs.readFileSync(path.join(ROOT, 'public', 'index.html'), 'utf8');
const APP_JS = fs.readFileSync(path.join(ROOT, 'public', 'app.js'), 'utf8');
const ORIGIN = 'https://kdocs-pro.onrender.com';

function docKeys() {
  const keys = [];
  for (const stage of Object.values(STAGES)) keys.push(...Object.keys(stage.documents));
  return keys;
}

// Elements carrying the `hidden` class are display:none, so they are not page
// content. Approximates the browser by removing an element's subtree when its
// own class list says hidden (innermost first, repeated for nesting).
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

function visibleText(html) {
  return dropHidden(String(html).replace(/<script[\s\S]*?<\/script>/g, ' '))
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function visibleH1s(html) {
  return (dropHidden(html).match(/<h1[^>]*>([\s\S]*?)<\/h1>/g) || [])
    .map((h) => h.replace(/<[^>]+>/g, '').trim());
}

function jsonLd(html) {
  const out = [];
  const re = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;
  let m;
  while ((m = re.exec(html)) !== null) out.push(JSON.parse(m[1]));
  return out;
}

const KEYS = docKeys();

describe('Every /doc page arrives as its own page, not the homepage', () => {
  test('there is at least one document to render', () => {
    assert.ok(KEYS.length >= 19, `expected the full catalog, got ${KEYS.length}`);
  });

  test('each document page has exactly one visible H1 - its own label', () => {
    for (const key of KEYS) {
      const html = renderDocShell(SHELL, key);
      const h1s = visibleH1s(html);
      assert.strictEqual(h1s.length, 1, `${key}: expected 1 visible h1, got ${h1s.length} (${h1s.join(' | ')})`);
      assert.strictEqual(h1s[0], docInfo(key).label, `${key}: the visible H1 is not the document label`);
    }
  });

  test('the homepage hero is hidden on a document page and visible on the homepage', () => {
    const doc = renderDocShell(SHELL, 'cv');
    assert.match(doc, /<section class="intro hidden">/, 'hero is hidden on /doc/cv');
    assert.doesNotMatch(visibleText(doc), /Skip the cyber caf/,
      'the shared homepage headline must not be visible page copy on a document page');
    assert.match(visibleText(SHELL), /Skip the cyber caf/, 'the hero still belongs to the homepage');
  });

  test('the document panel is visible and the empty catalog panel is not', () => {
    for (const key of KEYS) {
      const html = renderDocShell(SHELL, key);
      assert.match(html, /<section id="panel-doc" class="panel"/, `${key}: document panel must not be hidden`);
      assert.match(html, /<section id="panel-catalog" class="panel reveal hidden">/,
        `${key}: an empty catalog panel must not be visible`);
    }
  });

  test('the placeholder heading and empty description are gone', () => {
    for (const key of KEYS) {
      const html = renderDocShell(SHELL, key);
      assert.doesNotMatch(html, /<h1 id="dlTitle">Document<\/h1>/, `${key}: placeholder H1 survived`);
      assert.doesNotMatch(html, /<p id="dlDesc" class="hint"><\/p>/, `${key}: description is empty`);
      assert.doesNotMatch(html, /<span id="dlPrice" class="doc-card-price"><\/span>/, `${key}: price is empty`);
    }
  });

  test('description and price are the real values for that document', () => {
    for (const key of KEYS) {
      const html = renderDocShell(SHELL, key);
      const info = docInfo(key);
      const desc = html.match(/id="dlDesc" class="hint">([^<]*)</)[1];
      const price = html.match(/id="dlPrice" class="doc-card-price">([^<]*)</)[1];
      assert.strictEqual(desc, escAttr(info.description), `${key}: wrong description`);
      assert.ok(price.includes(`KSh ${info.price}`), `${key}: wrong price (${price})`);
    }
  });

  test('the "popular" badge is server-rendered only for popular documents', () => {
    for (const key of KEYS) {
      const html = renderDocShell(SHELL, key);
      const visibleBadge = html.includes('<span id="dlBadge" class="dl-badge">');
      assert.strictEqual(visibleBadge, POPULAR_DOCS.has(key), `${key}: badge state is wrong`);
    }
  });

  test('no two document pages share the same visible text', () => {
    const seen = new Map();
    for (const key of KEYS) {
      const text = visibleText(renderDocShell(SHELL, key));
      const dup = seen.get(text);
      assert.strictEqual(dup, undefined, `${key} renders the same page as ${dup}`);
      seen.set(text, key);
      // The long-form guide is injected by serveShell after this transform, so
      // this is the floor (head + panel + related links), not the whole page.
      assert.ok(text.length > 800, `${key}: only ${text.length} characters of visible copy`);
    }
  });

  test('a rendered document page still contains its guide and related links', () => {
    const html = renderDocShell(SHELL, 'cv');
    // The guide body is injected separately by serveShell; the placeholder that
    // receives it must survive this transform or the guide has nowhere to go.
    assert.match(html, /<!--DL_GUIDE-->/);
    assert.match(html, /<!--DL_RELATED-->/);
  });
});

describe('Titles fit Google and match what the client sets after hydration', () => {
  test('pageTitle never returns more than 60 characters', () => {
    for (const key of KEYS) {
      const info = docInfo(key);
      const t = pageTitle(`${info.label} — make yours online, KSh ${info.price}`);
      assert.ok(t.length <= 60, `${key}: title is ${t.length} chars`);
    }
  });

  test('the brand suffix is added when it fits and dropped when it does not', () => {
    assert.strictEqual(pageTitle('CV / Resume — make yours online, KSh 50'), `CV / Resume — make yours online, KSh 50${BRAND_SUFFIX}`);
    assert.strictEqual(pageTitle('x'.repeat(60)), 'x'.repeat(60));
    assert.ok(pageTitle('x'.repeat(51)).length <= 60);
  });

  test('the client builds the identical title string', () => {
    // A title that changes when JavaScript runs makes Google see one thing and
    // report another, so both sides must be built from the same pattern.
    assert.match(APP_JS, /make yours online, KSh \$\{priceForDoc\(docType\)\}/,
      'app.js must format doc titles the same way pageRender.pageTitle does');
    assert.match(APP_JS, /length <= 60/, 'app.js must apply the same 60-character rule');
  });

  test('the homepage title fits in a search result', () => {
    const t = SHELL.match(/<title>([\s\S]*?)<\/title>/)[1];
    assert.ok(t.length <= 60, `homepage title is ${t.length} chars`);
    assert.match(t, /^KDocs Pro \|/);
  });

  test('the homepage description is not truncated by Google', () => {
    const d = SHELL.match(/<meta name="description" content="([^"]*)"/)[1];
    assert.ok(d.length <= 165, `homepage description is ${d.length} chars`);
    assert.ok(d.length >= 80, `homepage description is only ${d.length} chars`);
  });
});

describe('Structured data and sitemap reflect the new shape', () => {
  test('every document page carries a BreadcrumbList pointing at its own URL', () => {
    for (const key of KEYS) {
      const xml = breadcrumbJsonLd(key, docInfo(key).label, ORIGIN);
      const data = JSON.parse(xml.match(/>(\{[\s\S]*\})</)[1]);
      assert.strictEqual(data['@type'], 'BreadcrumbList');
      const last = data.itemListElement[data.itemListElement.length - 1];
      assert.strictEqual(last.item, `${ORIGIN}/doc/${key}`);
      assert.ok(data.itemListElement.every((i) => i.item.startsWith(ORIGIN)),
        `${key}: breadcrumb items must be absolute on the configured origin`);
    }
  });

  test('the duplicate /template screen is out of the sitemap', () => {
    assert.ok(!sitemapEntries().some((e) => e.path === '/template'),
      '/template renders the catalog, so it duplicates "/" and must not be listed');
  });

  test('every document is still listed once', () => {
    const paths = sitemapEntries().map((e) => e.path);
    for (const key of KEYS) assert.ok(paths.includes(`/doc/${key}`), `${key} missing from sitemap`);
    assert.strictEqual(new Set(paths).size, paths.length, 'duplicate sitemap entries');
  });

  test('document prices come from the pricing table, not a literal', () => {
    for (const key of KEYS) {
      const expected = PRICES[key] !== undefined ? PRICES[key] : PRICE_DEFAULT_KES;
      assert.strictEqual(docInfo(key).price, expected, `${key}: price drifted from utils/pricing.js`);
    }
  });
});

describe('The free tool screens are real pages too, not hidden panels', () => {
  test('each tool route ships its own panel visible', () => {
    for (const [route, panel] of Object.entries(ROUTE_PANELS)) {
      const html = renderRouteShell(SHELL, route);
      assert.match(html, new RegExp(`<section id="panel-${panel}" class="panel">`),
        `${route}: ${panel} panel must not be hidden`);
      assert.match(html, /<section id="panel-catalog" class="panel reveal hidden">/,
        `${route}: the catalogue panel must not be visible`);
      assert.match(html, /<div class="stepper hidden" id="stepper">/,
        `${route}: the document stepper is meaningless on a tool screen`);
    }
  });

  test('the tool screens keep enough visible copy to be worth indexing', () => {
    for (const route of Object.keys(ROUTE_PANELS)) {
      const text = visibleText(renderRouteShell(SHELL, route));
      assert.ok(text.split(' ').length > 250, `${route}: only ${text.split(' ').length} words of visible copy`);
    }
  });

  test('an unknown route is left alone', () => {
    assert.strictEqual(renderRouteShell(SHELL, '/nope'), SHELL);
  });
});

describe('A noindex screen carries exactly one robots tag', () => {
  test('the indexable shell has one robots tag before the change', () => {
    assert.strictEqual((SHELL.match(/<meta name="robots"/g) || []).length, 1);
  });

  test('applying noindex replaces it instead of appending a second one', () => {
    const html = applyNoindex(SHELL);
    const tags = html.match(/<meta name="robots" content="[^"]*"[^>]*>/g) || [];
    assert.strictEqual(tags.length, 1, `found ${tags.length} robots tags`);
    assert.strictEqual(tags[0], NOINDEX_TAG);
    assert.doesNotMatch(html, /content="index, follow/, 'the old permissive tag must be gone');
  });

  test('a page with no robots tag still gets one', () => {
    const html = applyNoindex('<html><head></head><body></body></html>');
    assert.match(html, /<meta name="robots" content="noindex">\n<\/head>/);
  });
});

describe('Html escaping keeps injected copy safe', () => {
  test('escAttr escapes the characters that end an attribute or a tag', () => {
    assert.strictEqual(escAttr('a"b<c>d&e'), 'a&quot;b&lt;c&gt;d&amp;e');
  });

  test('a document with quotes in its description cannot break out of the panel', () => {
    const html = renderDocShell(SHELL, 'cv');
    const desc = html.match(/id="dlDesc" class="hint">([^<]*)</)[1];
    assert.doesNotMatch(desc, /"/, 'a raw quote would end the attribute early');
  });
});
