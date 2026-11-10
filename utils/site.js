// One place that knows the site's public origin.
//
// Everything that has to be absolute - canonical links, og:url, sitemap URLs,
// robots.txt's Sitemap line, the schema.org @id values - is derived from
// SITE_URL instead of being hard-coded. Moving to a custom domain is therefore
// one environment variable plus DNS, not an edit across every page.
//
// SITE_URL is expected as a bare origin: https://kdocspro.co.ke
// (no trailing slash, no path - a path would produce canonical URLs pointing
// into a directory that may not exist).

const DEFAULT_ORIGIN = 'https://kdocs-pro.onrender.com';

// Where an origin needs to be substituted into HTML that is edited by hand,
// the files carry this token rather than a literal host. The host token exists
// for copy that names the site in prose ("sign in at kdocspro.co.ke").
const ORIGIN_TOKEN = '__SITE_ORIGIN__';
const HOST_TOKEN = '__SITE_HOST__';

let warned = false;

// Returns a normalised origin, or null when the value cannot be used.
function normalizeOrigin(raw) {
  if (!raw) return null;
  let value = String(raw).trim();
  if (!value) return null;
  if (!/^https?:\/\//i.test(value)) value = `https://${value}`;
  let u;
  try {
    u = new URL(value);
  } catch {
    return null;
  }
  if (!u.hostname) return null;
  // A path, query or fragment means the value is a URL, not an origin; using
  // it verbatim would corrupt every canonical link on the site.
  if ((u.pathname && u.pathname !== '/') || u.search || u.hash) return null;
  return u.origin;
}

function siteOrigin(env = process.env) {
  const raw = env.SITE_URL;
  if (!raw) return DEFAULT_ORIGIN;
  const origin = normalizeOrigin(raw);
  if (!origin) {
    if (!warned) {
      warned = true;
      console.error(
        `SITE_URL is not a usable origin ("${raw}"); falling back to ${DEFAULT_ORIGIN}. ` +
        'Expected something like https://kdocspro.co.ke'
      );
    }
    return DEFAULT_ORIGIN;
  }
  return origin;
}

function hostOf(origin) {
  try {
    return new URL(origin).hostname.toLowerCase();
  } catch {
    return '';
  }
}

// Hostnames that must never be redirected away from: on a doctor's laptop, or
// behind a proxy health check, bouncing to the public domain is a self-inflicted
// outage and an infinite loop for anything that follows redirects blindly.
function isInternalHost(hostname) {
  const h = String(hostname || '').toLowerCase().replace(/^\[|\]$/g, '');
  if (!h) return true;
  if (h === 'localhost' || h === '::1' || h === '0.0.0.0') return true;
  if (h.endsWith('.localhost')) return true;
  if (/^127\./.test(h)) return true;
  if (/^10\./.test(h)) return true;
  if (/^192\.168\./.test(h)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return true;
  return false;
}

// The one decision behind the old-domain redirect: where should this request go
// instead, if anywhere? Returns an absolute URL, or null to serve it as-is.
//
// Kept pure so the rules can be tested without starting a server.
function redirectTarget({ method = 'GET', host = '', originalUrl = '/', origin = DEFAULT_ORIGIN } = {}) {
  const verb = String(method).toUpperCase();
  if (verb !== 'GET' && verb !== 'HEAD') return null;

  // API traffic keeps working on whatever host it arrived on: the old host may
  // be a live integration's base URL, and Render's own health check hits
  // /api/health. Redirecting it would look like an outage.
  const path = originalUrl || '/';
  if (path === '/api' || path.startsWith('/api/') || path.startsWith('/api?')) return null;

  const reqHost = String(host || '').toLowerCase().replace(/:\d+$/, '');
  if (isInternalHost(reqHost)) return null;

  const siteHost = hostOf(origin);
  if (!siteHost || reqHost === siteHost) return null;

  return `${origin}${path.startsWith('/') ? path : `/${path}`}`;
}

// Swap the tokens for the configured origin. Safe to call on any HTML string.
function injectOrigin(html, origin = siteOrigin()) {
  return String(html)
    .split(ORIGIN_TOKEN).join(origin)
    .split(HOST_TOKEN).join(hostOf(origin) || hostOf(DEFAULT_ORIGIN));
}

module.exports = {
  DEFAULT_ORIGIN,
  ORIGIN_TOKEN,
  HOST_TOKEN,
  normalizeOrigin,
  siteOrigin,
  hostOf,
  isInternalHost,
  redirectTarget,
  injectOrigin,
};
