#!/usr/bin/env node
// Checks that a custom domain is actually wired up to KDocs Pro, end to end.
//
// Run it after adding the domain in Render and setting SITE_URL:
//
//   npm run golive:check -- kdocspro.co.ke
//
// It answers "did it work?" with a pass/fail per step instead of making you
// guess from a browser. Nothing is written or changed - it only reads.

const dns = require('node:dns').promises;

const OLD_HOST = 'https://kdocs-pro.onrender.com';

function argDomain(argv) {
  const raw = (argv[2] || '').trim();
  if (!raw) return null;
  return raw.replace(/^https?:\/\//i, '').replace(/\/.*$/, '').toLowerCase();
}

async function get(url, opts = {}) {
  const res = await fetch(url, { redirect: 'manual', ...opts });
  const text = res.status >= 200 && res.status < 300 ? await res.text() : '';
  return { status: res.status, location: res.headers.get('location'), text };
}

const results = [];
function record(name, ok, detail) {
  results.push({ name, ok, detail });
}

async function main() {
  const domain = argDomain(process.argv);
  if (!domain) {
    console.error('Usage: npm run golive:check -- yourdomain.co.ke');
    process.exit(2);
  }
  const site = `https://${domain}`;

  process.stdout.write(`\nChecking ${site}\n${'='.repeat(56)}\n`);

  // 1. Does the name even resolve?
  let ips = [];
  try {
    ips = (await dns.lookup(domain, { all: true })).map((a) => a.address);
    record('DNS resolves', ips.length > 0, ips.join(', ') || 'no records');
  } catch (err) {
    record('DNS resolves', false, err.code || err.message);
  }

  if (!ips.length) {
    report();
    console.log('\nDNS is not set up yet, so the rest cannot be checked.');
    console.log('Do step 5 of docs/start-here.md, then run this again.\n');
    return;
  }

  // 2. Live over HTTPS.
  let home;
  try {
    home = await get(site + '/');
    record('Homepage loads over HTTPS', home.status === 200, `HTTP ${home.status}`);
  } catch (err) {
    record('Homepage loads over HTTPS', false, err.code || err.message);
  }

  // 3. The canonical tag points at the new domain (this is the one that
  //    decides which address Google credits).
  if (home && home.text) {
    const canonical = (home.text.match(/<link rel="canonical" href="([^"]+)"/) || [])[1] || '';    record('Canonical matches this domain',
      canonical.startsWith(site),
      canonical || 'no canonical tag found'
    );

    const ogUrl = (home.text.match(/<meta property="og:url" content="([^"]+)"/) || [])[1] || '';
    record('og:url matches this domain', ogUrl.startsWith(site), ogUrl || 'missing');

    record('No unresolved template tokens', !home.text.includes('__SITE_'), home.text.includes('__SITE_') ? 'found __SITE_*' : 'clean');
    record('Brand schema present', home.text.includes('"@type": "Organization"'), 'Organization node');
  }

  // 4. Sitemap served on the new domain, and every URL uses it.
  try {
    const sm = await get(site + '/sitemap.xml');
    const locs = sm.text.match(/<loc>([^<]+)<\/loc>/g) || [];
    const foreign = locs.filter((l) => !l.includes(domain));
    record('Sitemap loads', sm.status === 200, `HTTP ${sm.status}, ${locs.length} URLs`);
    record('Every sitemap URL uses this domain', locs.length > 0 && foreign.length === 0,
      foreign.length ? `${foreign.length} still on another host` : `${locs.length}/${locs.length}`);
  } catch (err) {
    record('Sitemap loads', false, err.code || err.message);
  }

  // 5. robots.txt advertises the sitemap on the new domain.
  try {
    const rb = await get(site + '/robots.txt');
    const line = (rb.text.match(/Sitemap:\s*(\S+)/) || [])[1] || '';
    record('robots.txt advertises this sitemap', line.startsWith(site), line || 'no Sitemap line');
  } catch (err) {
    record('robots.txt advertises this sitemap', false, err.code || err.message);
  }

  // 6. A document landing page works (proves the server-side rendering path).
  try {
    const cv = await get(site + '/doc/cv');
    const title = (cv.text.match(/<title>([^<]*)<\/title>/) || [])[1] || '';
    record('Document page renders', cv.status === 200 && title.length > 0, title.slice(0, 60));
  } catch (err) {
    record('Document page renders', false, err.code || err.message);
  }

  // 7. The API is reachable on the new origin (checkout posts here).
  try {
    const h = await get(site + '/api/health');
    record('API responds on this domain', h.status === 200, `HTTP ${h.status}`);
  } catch (err) {
    record('API responds on this domain', false, err.code || err.message);
  }

  // 8. The old Render address still reaches the app (not the 404 that Render
  //    returns when the subdomain has been disabled).
  try {
    const old = await get(OLD_HOST + '/doc/cv');
    if (old.status === 404) {
      record('Old Render address still reaches the app', false,
        'HTTP 404 - the Render subdomain looks disabled; re-enable it so the redirects keep working');
    } else if (old.status >= 301 && old.status <= 308) {
      const to = old.location || '';
      record('Old address redirects to this domain', to.startsWith(site), `${old.status} -> ${to || '(no location)'}`);
    } else {
      record('Old address redirects to this domain', false,
        `HTTP ${old.status} - SITE_URL may not be set in Render yet`);
    }
  } catch (err) {
    record('Old address redirects to the new domain', false, err.code || err.message);
  }

  report();
}

function report() {
  console.log('');
  for (const r of results) {
    console.log(`  ${r.ok ? 'PASS' : 'FAIL'}  ${r.name.padEnd(42)} ${r.detail}`);
  }
  const failed = results.filter((r) => !r.ok).length;
  console.log('');
  if (failed === 0) {
    console.log('Everything is connected. Next: docs/start-here.md step 9 (tell Google).\n');
    process.exitCode = 0;
  } else {
    console.log(`${failed} thing${failed === 1 ? ' still needs' : 's still need'} attention - see docs/start-here.md.\n`);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error('Check crashed:', err.message);
  process.exitCode = 1;
});
