// Optional Sentry error tracking (free tier at sentry.io covers this volume).
//
// Everything here is a safe no-op unless SENTRY_DSN is set in the environment:
//   - No DSN  -> init() does nothing, capture() does nothing, isEnabled() false.
//   - DSN set -> unhandled errors and failed payment verifications are sent to
//                Sentry and can trigger email notifications.
// Monitoring must never break the app, so every call is wrapped and the
// dependency is required lazily only when a DSN is actually present.

let Sentry = null;

function init() {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return null;
  try {
    // Required lazily: runs only when the DSN exists (i.e. in production),
    // so dev/test runs stay dependency-light.
    Sentry = require('@sentry/node');
    Sentry.init({
      dsn,
      environment: process.env.SENTRY_ENV || (process.env.RENDER ? 'production' : 'development'),
      tracesSampleRate: 0, // errors only - keeps the free-plan quota for errors
      sendDefaultPii: false, // never ship customer emails/phones to Sentry
    });
    console.log('Sentry error tracking enabled.');
  } catch (err) {
    console.error('Sentry init failed (continuing without it):', err.message);
    Sentry = null;
  }
  return Sentry;
}

function isEnabled() {
  return !!Sentry;
}

// Report an error with optional request context. `extra` values become Sentry
// tags (strings) so alerts/filters can target e.g. payment:verify failures.
function capture(err, req, extra = {}) {
  if (!Sentry || !err) return null;
  try {
    const payload = { tags: {} };
    for (const [k, v] of Object.entries(extra)) {
      if (v != null) payload.tags[k] = String(v);
    }
    if (req) {
      payload.contexts = {
        request: {
          method: req.method,
          url: req.originalUrl || req.url,
          user_agent: req.headers ? req.headers['user-agent'] : undefined,
        },
      };
    }
    return Sentry.captureException(err, payload);
  } catch (_) {
    return null;
  }
}

// Flush queued events on shutdown so the last errors actually reach Sentry.
async function close(timeoutMs = 2000) {
  if (!Sentry) return;
  try {
    await Sentry.close(timeoutMs);
  } catch (_) {
    /* ignore */
  }
}

module.exports = { init, capture, isEnabled, close };
