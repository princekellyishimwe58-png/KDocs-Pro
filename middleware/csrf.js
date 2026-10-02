const crypto = require('crypto');

// CSRF protection for cookie-based sessions: the double-submit cookie
// pattern. Any GET under /api receives a random `kdocs_csrf` cookie (readable
// by our own JS). Every mutating request (POST/PUT/PATCH/DELETE) must echo
// that exact value back in the `x-csrf-token` header.
//
// Why this works: a malicious website can make the victim's browser SEND our
// cookie (cookies travel automatically), but it can never READ the cookie's
// value (same-origin policy) and can't set custom headers cross-origin
// without a CORS pass. Requiring header value === cookie value proves the
// request was made by our own first-party JavaScript.
//
// Exemptions: IntaSend's redirect back to the site is a browser top-level
// GET (not a state-changing call). The one POST exemption is IntaSend's
// webhook (/api/intasend/webhook): a server-to-server call with no browser
// and no cookie pair. It is authenticated separately - with the shared
// "challenge" secret configured in the IntaSend dashboard - and its
// payload is re-verified against IntaSend's own status API before anything
// is trusted, so the exemption cannot be abused to mark payments paid.

const COOKIE_NAME = 'kdocs_csrf';

// Paths that carry their own authentication and never see browser cookies.
const CSRF_EXEMPT_PATHS = new Set(['/api/intasend/webhook']);

function issueToken(req, res, next) {
  // Only mint a cookie when the visitor doesn't already have a valid one,
  // so tokens stay stable across a session and caches don't churn.
  const existing = req.cookies?.[COOKIE_NAME];
  if (!existing || typeof existing !== 'string' || existing.length < 20) {
    const token = crypto.randomBytes(24).toString('hex');
    res.cookie(COOKIE_NAME, token, {
      httpOnly: false, // must be readable by our own JS (that's the pattern)
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000,
      path: '/',
    });
    req.csrfToken = token;
  } else {
    req.csrfToken = existing;
  }
  next();
}

// Constant-time compare that tolerates length mismatches (timingSafeEqual
// throws when lengths differ, so gate on length first).
function tokensMatch(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length < 20 || a.length > 128 || b.length > 128 || a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

function requireCsrfToken(req, res, next) {
  if (CSRF_EXEMPT_PATHS.has(req.path)) return next();
  const ok = tokensMatch(req.cookies?.[COOKIE_NAME], req.get('x-csrf-token'));
  if (ok) return next();
  return res.status(403).json({ error: 'Security check failed. Refresh the page and try again.' });
}

module.exports = { issueToken, requireCsrfToken, COOKIE_NAME };
