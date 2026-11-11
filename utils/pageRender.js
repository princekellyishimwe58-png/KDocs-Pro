// Server-side rendering of the per-document landing page (/doc/<key>).
//
// Why this is its own module: these functions decide what a crawler reads
// before any JavaScript runs, so their behaviour has to be testable without
// booting Express. test/crawlableDocPages.test.js asserts on the output.

const { STAGES } = require('./templates');
const { PRICES, PRICE_DEFAULT_KES } = require('./pricing');

// Google truncates titles around 60 characters, so the brand suffix is only
// appended when it still fits. A title cut off mid-brand is worse than no
// brand at all: the truncated part is exactly what the title was teaching.
const BRAND_SUFFIX = ' | KDocs Pro';

function escAttr(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function pageTitle(base) {
  const full = `${base}${BRAND_SUFFIX}`;
  return full.length <= 60 ? full : base;
}

// Label, blurb, icon and price for one document type, with fallbacks so an
// unknown key can never render "undefined" into a page.
function docInfo(docKey) {
  let doc = { label: 'Document', description: '', icon: '\u{1F4C4}' };
  for (const stage of Object.values(STAGES)) if (stage.documents[docKey]) doc = stage.documents[docKey];
  return {
    label: doc.label,
    description: doc.description || '',
    icon: doc.icon || '\u{1F4C4}',
    price: PRICES[docKey] !== undefined ? PRICES[docKey] : PRICE_DEFAULT_KES,
  };
}

// Documents that get the "Popular in Kenya" badge, server-rendered so the
// badge is part of the page a crawler reads instead of something added later.
const POPULAR_DOCS = new Set(['cv', 'cover_letter', 'resignation']);

const PANEL_DOC_OPEN = '<section id="panel-doc" class="panel hidden"';
const PANEL_DOC_VISIBLE = '<section id="panel-doc" class="panel"';

// Turn the generic shell into this document's own page.
//
// What this fixes: every /doc/<key> URL used to serve the same hero <h1>
// ("Skip the cyber cafe..."), the document's panel arrived as
// class="panel hidden" (display:none), and the only document-facing heading in
// the HTML was the literal placeholder "Document". Twenty URLs with one
// identical visible page are twenty duplicates, so Google left them all at
// "Discovered - currently not indexed" and only crawled the few it happened to
// render. Filling the panel in the served bytes makes each page unique in the
// first thing Google reads, without needing JavaScript.
function renderDocShell(html, docKey) {
  const doc = docInfo(docKey);
  let out = String(html)
    // One <h1> per page: the document's, not the homepage's.
    .replace('<section class="intro">', '<section class="intro hidden">')
    // The catalog grid is empty on this route; a visible empty box is just noise.
    .replace('<section id="panel-catalog" class="panel reveal">', '<section id="panel-catalog" class="panel reveal hidden">')
    .replace(PANEL_DOC_OPEN, PANEL_DOC_VISIBLE)
    .replace('<h1 id="dlTitle">Document</h1>', `<h1 id="dlTitle">${escAttr(doc.label)}</h1>`)
    .replace('<p id="dlDesc" class="hint"></p>', `<p id="dlDesc" class="hint">${escAttr(doc.description)}</p>`)
    .replace('<span id="dlPrice" class="doc-card-price"></span>',
      `<span id="dlPrice" class="doc-card-price">KSh ${doc.price} \u2014 one clean PDF</span>`)
    .replace('<span id="dlTemplates" class="hint"></span>',
      '<span id="dlTemplates" class="hint">Pick your layout \u2014 every template, live-previewed with sample content:</span>');
  if (POPULAR_DOCS.has(docKey)) {
    out = out.replace('<span id="dlBadge" class="dl-badge hidden">', '<span id="dlBadge" class="dl-badge">');
  }
  return out;
}

// BreadcrumbList so a document reads as a child of the catalog, not a loose
// URL: Google shows "KDocs Pro › CV / Resume" instead of a bare address.
function breadcrumbJsonLd(docKey, label, origin) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', 'position': 1, name: 'Documents', item: `${origin}/` },
      { '@type': 'ListItem', 'position': 2, name: label, item: `${origin}/doc/${docKey}` },
    ],
  };
  return `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;
}

// The free tool screens have the same problem the document pages had: their
// panel ships with class="panel hidden", so the bytes Google reads first are
// the homepage hero and nothing else. Unhiding the route's own panel - and
// hiding the empty catalog - makes each tool URL a real page without JavaScript.
const ROUTE_PANELS = { '/scan': 'scan', '/tools': 'tools' };

// The shell ships one <meta name="robots"> that says index,follow. A screen that
// must not be indexed has to REPLACE it: appending a second tag leaves Google a
// contradiction to resolve, and it is the kind of thing that gets a real page
// dropped for the wrong reason.
const NOINDEX_TAG = '<meta name="robots" content="noindex">';

function applyNoindex(html) {
  const re = /<meta name="robots"[^>]*>/;
  const s = String(html);
  if (re.test(s)) return s.replace(re, NOINDEX_TAG);
  return s.replace('</head>', `${NOINDEX_TAG}\n</head>`);
}

function renderRouteShell(html, route) {
  const panel = ROUTE_PANELS[route];
  if (!panel) return html;
  return String(html)
    .replace('<section id="panel-catalog" class="panel reveal">', '<section id="panel-catalog" class="panel reveal hidden">')
    .replace(`<section id="panel-${panel}" class="panel hidden">`, `<section id="panel-${panel}" class="panel">`)
    .replace('<div class="stepper" id="stepper">', '<div class="stepper hidden" id="stepper">');
}

module.exports = {
  BRAND_SUFFIX,
  ROUTE_PANELS,
  NOINDEX_TAG,
  applyNoindex,
  renderRouteShell,
  escAttr,
  pageTitle,
  docInfo,
  POPULAR_DOCS,
  renderDocShell,
  breadcrumbJsonLd,
};
