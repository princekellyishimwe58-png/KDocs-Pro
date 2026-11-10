const crypto = require('crypto');

// Guard for operator-only endpoints (payment provider probes, key
// fingerprints). These routes exist to diagnose a broken production key, but
// they are not for the public: /api/daraja/diagnose mints an OAuth token with
// the server's credentials, and /api/intasend/diagnose creates a real checkout
// with the live secret key.
//
// Access is allowed only when OPS_TOKEN is set on the server AND the caller
// presents it in `x-ops-token`. Anything else gets a plain 404 so the route's
// existence is not advertised. When OPS_TOKEN is unset the endpoints are
// simply off - a production deploy that forgets the variable fails closed.
function requireOpsToken(req, res, next) {
  const expected = process.env.OPS_TOKEN;
  if (!expected) return res.status(404).json({ error: 'Not found' });

  const given = req.get ? req.get('x-ops-token') : req.headers?.['x-ops-token'];
  if (typeof given !== 'string' || given.length === 0) {
    return res.status(404).json({ error: 'Not found' });
  }

  // Constant-time compare; lengths must match first because timingSafeEqual
  // throws on differing buffer sizes.
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return res.status(404).json({ error: 'Not found' });
  }
  return next();
}

module.exports = { requireOpsToken };
