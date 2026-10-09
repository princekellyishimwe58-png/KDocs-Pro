'use strict';

/**
 * True sliding-window rate limiter with a durable store.
 *
 * Exactly the window semantics requested: a request is allowed only while
 * FEWER than `limit` recorded events fall inside the trailing `windowMs`.
 * The window boundaries are the events themselves - there is no fixed
 * window that resets, and a burst that straddles a boundary is never
 * under-counted.
 *
 * Storage: MongoDB (models/RateHit.js) when the DB is reachable - durable
 * across restarts and shared across instances, so limits hold even though
 * Render may restart or scale the service. When the DB is unreachable or
 * slow (>1s), counting falls back to a per-instance in-memory counter -
 * the same trade-off utils/paymentStore.js makes for payments. One Mongo
 * document per hit; a TTL index sweeps hits older than 25h.
 *
 * Every limiter always sets X-RateLimit-* headers, and on a block returns
 * 429 + Retry-After + a JSON body, so existing frontend error handling
 * keeps working unchanged.
 */

const crypto = require('crypto');
const { connectDb } = require('../utils/db');

const RateHit = (() => {
  try { return require('../models/RateHit'); } catch { return null; }
})();

// Tiny timeout wrapper so a slow DB can never stall a request in the hot
// path (same philosophy as the /api/health 2.5s DB wait cap).
function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('rate limit store timeout')), ms)),
  ]);
}

// True sliding window in Mongo: insert this hit, then count all hits for
// the key inside the trailing windowMs. Returns the used count and the
// seconds until the oldest surviving hit (and thus a slot) leaves the window.
async function recordHitMongo(key, windowMs, now) {
  const since = new Date(now - windowMs);
  const [, hits] = await withTimeout(Promise.all([
    RateHit.create({ key, hitAt: new Date(now) }),
    RateHit.find({ key, hitAt: { $gt: since } }).sort('hitAt').select('hitAt').lean(),
  ]), 1000);
  const times = hits.map((h) => h.hitAt.getTime());
  const oldest = times[0];
  return {
    used: times.length,
    resetAfterSeconds: oldest == null
      ? 0
      : Math.max(0, Math.ceil((oldest + windowMs - now) / 1000)),
  };
}

function createSlidingWindow({ windowMs, limit, maxEntries = 20000 }) {
  if (!Number.isInteger(windowMs) || windowMs <= 0) throw new Error('windowMs must be a positive integer');
  if (!Number.isInteger(limit) || limit <= 0) throw new Error('limit must be a positive integer');

  // key -> { hits: ascending epoch-ms timestamps }
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
      entry = { hits: [] };
      store.set(key, entry);
    }
    const hits = pruneHits(entry.hits, now, windowMs);
    const allowed = hits.length < limit;
    if (allowed) hits.push(now);
    entry.hits = hits;
    const oldest = hits[0];
    return {
      allowed,
      total: limit,
      used: hits.length,
      remaining: Math.max(0, limit - hits.length),
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
 *   name          - human label used in logs (also the Mongo key prefix)
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
  const memory = createSlidingWindow({ windowMs, limit });
  memory.startSweeper();
  const json = typeof message === 'string' ? { error: message } : message;

  return async function slidingRateLimit(req, res, next) {
    if (skip && skip(req)) return next();
    const key = `${name}:${keyGenerator(req)}`;
    const now = Date.now();

    let used, resetAfterSeconds, store = 'mongo';
    try {
      if (!RateHit || !(await connectDb())) throw new Error('db unavailable');
      ({ used, resetAfterSeconds } = await recordHitMongo(key, windowMs, now));
    } catch (err) {
      // DB unreachable or too slow: count in memory for this instance so
      // the limiter still protects the endpoint (never fails open).
      store = 'memory';
      ({ used, resetAfterSeconds } = memory.record(now, key));
    }

    const allowed = used <= limit;
    res.setHeader('X-RateLimit-Limit', String(limit));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, limit - used)));
    res.setHeader('X-RateLimit-Reset', String(Math.ceil((now + resetAfterSeconds * 1000) / 1000)));

    if (allowed) return next();

    res.setHeader('Retry-After', String(Math.max(1, resetAfterSeconds)));
    if (process.env.NODE_ENV !== 'test') {
      console.warn(`[rate-limit] ${name} blocked key=${key.slice(0, 34)}... used=${used}/${limit} store=${store}`);
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
