'use strict';

/**
 * True sliding-window rate limiter.
 *
 * Exactly the window semantics requested: a request is allowed only while
 * FEWER than `limit` recorded events fall inside the trailing `windowMs`.
 * The window boundaries are the events themselves - there is no fixed
 * window that resets, and a burst that straddles a boundary is never
 * under-counted. (express-rate-limit's default MemoryStore is a fixed
 * window counter; this is not, which is why this middleware replaced it.)
 *
 * Storage is in-memory per service instance - the same trade-off
 * express-rate-limit's default MemoryStore makes, fine at current scale
 * (one Render service). Entries are swept periodically so keys cannot
 * accumulate without bound.
 *
 * Every limiter always sets X-RateLimit-* headers, and on a block returns
 * 429 + Retry-After + a JSON body, so existing frontend error handling
 * keeps working unchanged.
 */

const crypto = require('crypto');

function createSlidingWindow({ windowMs, limit, maxEntries = 20000 }) {
  if (!Number.isInteger(windowMs) || windowMs <= 0) throw new Error('windowMs must be a positive integer');
  if (!Number.isInteger(limit) || limit <= 0) throw new Error('limit must be a positive integer');

  // key -> { hits: ascending epoch-ms timestamps, last: last touch }
  const store = new Map();
  let timer = null;

  // Periodic sweep so exhausted/abandoned keys do not grow the Map forever.
  function sweep() {
    const now = Date.now();
    for (const [key, entry] of store) {
      entry.hits = pruneHits(entry.hits, now, windowMs);
      if (entry.hits.length === 0) store.delete(key);
    }
  }

  function record(now, key) {
    let entry = store.get(key);
    if (!entry) {
      if (store.size >= maxEntries) sweep(); // defensive bound on key count
      entry = { hits: [], last: now };
      store.set(key, entry);
    }
    const hits = pruneHits(entry.hits, now, windowMs);
    const allowed = hits.length < limit;
    if (allowed) hits.push(now);
    entry.hits = hits;
    entry.last = now;
    const oldest = entry.hits[0];
    return {
      allowed,
      total: limit,
      used: entry.hits.length,
      remaining: Math.max(0, limit - entry.hits.length),
      // Seconds until at least one slot frees (== oldest hit exits window).
      resetAfterSeconds: oldest == null
        ? 0
        : Math.max(0, Math.ceil((oldest + windowMs - now) / 1000)),
    };
  }

  function startSweeper() {
    if (timer) return;
    timer = setInterval(sweep, Math.min(5 * 60 * 1000, windowMs));
    if (timer.unref) timer.unref(); // never keep the process alive for this
  }

  return {
    record,
    sweep,
    size: () => store.size,
    startSweeper,
    _stopSweeper: () => { if (timer) clearInterval(timer); timer = null; },
  };
}

function pruneHits(hits, now, windowMs) {
  let i = 0;
  while (i < hits.length && hits[i] <= now - windowMs) i++;
  return i > 0 ? hits.slice(i) : hits;
}

/**
 * Build Express middleware backed by a true sliding-window counter.
 *
 * options:
 *   windowMs      - rolling window length in ms
 *   limit         - max events inside any trailing windowMs
 *   name          - human label used in logs
 *   message       - JSON body or string used for the 429 response
 *   keyGenerator  - (req) => string, defaults to per-user (hashed session
 *                   credential) with IP fallback for anonymous traffic
 *   skip          - (req) => boolean, requests this limiter ignores
 */
function slidingLimiter({
  windowMs,
  limit,
  name = 'request',
  message = { error: 'Too many requests. Please slow down.' },
  keyGenerator = userKeyGenerator(),
  skip = null,
}) {
  const window = createSlidingWindow({ windowMs, limit });
  window.startSweeper();
  const json = typeof message === 'string' ? { error: message } : message;

  return function slidingRateLimit(req, res, next) {
    if (skip && skip(req)) return next();
    const key = keyGenerator(req);
    const result = window.record(Date.now(), key);
    res.setHeader('X-RateLimit-Limit', String(result.total));
    res.setHeader('X-RateLimit-Remaining', String(result.remaining));
    res.setHeader('X-RateLimit-Reset', String(Math.ceil((Date.now() + result.resetAfterSeconds * 1000) / 1000)));

    if (result.allowed) return next();

    res.setHeader('Retry-After', String(Math.max(1, result.resetAfterSeconds)));
    if (process.env.NODE_ENV !== 'test') {
      console.warn(`[rate-limit] ${name} blocked key=${key.slice(0, 20)}... used=${result.used}/${result.total}`);
    }
    return res.status(429).json(json);
  };
}

/**
 * Key chooser shared by every limiter: whichever credential is present
 * wins, so an abuser cannot reset their budget by signing out, and a
 * shared NAT / CGNAT IP does not lock out signed-in individuals. Session
 * tokens are only ever hashed - never stored in plain text.
 */
function userKeyGenerator() {
  return function userKey(req) {
    const session = req.cookies ? req.cookies.kdocs_session : '';
    if (session) {
      const fp = crypto.createHash('sha256').update(session).digest('hex').slice(0, 24);
      return `u:${fp}`;
    }
    return `ip:${clientIp(req)}`;
  };
}

function ipKeyGenerator() {
  return (req) => `ip:${clientIp(req)}`;
}

/**
 * Real client IP. Traffic reaches Render through Cloudflare, whose edge
 * IPs rotate between requests - req.ip alone would fragment one client's
 * budget across many buckets. CF-Connecting-IP is set by Cloudflare to
 * the connecting client and cannot be spoofed through the edge, so prefer
 * it whenever present.
 */
function clientIp(req) {
  const cfIp = req.headers && req.headers['cf-connecting-ip'];
  return (cfIp && String(cfIp).split(',')[0].trim()) || req.ip || 'unknown';
}

module.exports = { slidingLimiter, createSlidingWindow, userKeyGenerator, ipKeyGenerator };
