// Public health payload.
//
// This endpoint is unauthenticated and gets polled by uptime monitors, so it
// must never carry key material. Earlier versions returned a fingerprint of the
// secret keys ("first 5 ... last 4 (NN chars)"), which is still a leak: it hands
// an attacker the shape and length of a live secret. Only booleans about
// configuration leave the server now - the variant (live/test) is already
// public through the app's own behaviour, so that one stays.

// Publishable keys are safe to show, but even they do not need to be echoed.
// Derive the variant from the prefix instead of returning the value.
function keyVariant(publicKey) {
  const value = String(publicKey || '');
  if (!value) return null;
  if (/_live_/i.test(value) || /_prod_/i.test(value)) return 'live';
  if (/_test_|_sandbox_/i.test(value)) return 'test';
  return 'unknown';
}

function configured(value) {
  return Boolean(value && String(value).trim());
}

// Build the JSON body for GET /api/health. `env` is injectable so tests can
// prove that no secret value or fragment can reach the response.
function buildHealthPayload({ env = process.env, activeProvider = null, payments = null, uptime = null } = {}) {
  const provider = env.INTASEND_ENV || 'sandbox';
  const darajaEnv = env.DARAJA_ENV || 'sandbox';
  return {
    ok: true,
    uptime,
    payments,
    activeProvider,
    intasend: {
      env: provider,
      host: provider === 'production' ? 'payment.intasend.com' : 'sandbox.intasend.com',
      keyVariant: keyVariant(env.INTASEND_PUBLIC_KEY),
      publicKeyConfigured: configured(env.INTASEND_PUBLIC_KEY),
      secretKeyConfigured: configured(env.INTASEND_SECRET_KEY),
      webhookChallengeConfigured: configured(env.INTASEND_WEBHOOK_CHALLENGE),
    },
    daraja: {
      env: darajaEnv,
      host: darajaEnv === 'production' ? 'api.safaricom.co.ke' : 'sandbox.safaricom.co.ke',
      consumerKeyConfigured: configured(env.DARAJA_CONSUMER_KEY),
      consumerSecretConfigured: configured(env.DARAJA_CONSUMER_SECRET),
      passkeyConfigured: configured(env.DARAJA_PASSKEY),
      shortcodeConfigured: configured(env.DARAJA_SHORTCODE),
      configured: Boolean(
        configured(env.DARAJA_CONSUMER_KEY) && configured(env.DARAJA_CONSUMER_SECRET)
        && configured(env.DARAJA_SHORTCODE) && configured(env.DARAJA_PASSKEY)
      ),
    },
  };
}

module.exports = { buildHealthPayload, keyVariant, configured };
