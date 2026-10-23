const express = require('express');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

// Daraja M-Pesa (Lipa na M-Pesa Online / STK push) payment route - restored
// after the move to IntaSend-only payments. It is ACTIVE whenever
// DARAJA_CONSUMER_KEY is set (or PAYMENT_PROVIDER=daraja is pinned): with
// sandbox keys set, customers get a real STK prompt shape straight from
// Safaricom with no money moving at all.
//
// Differences from the pre-IntaSend version (deleted in 8f9203a):
// - Payments live in the DURABLE payment store (Mongo + memory mirror), not
//   an in-memory map, so records survive deploys/restarts and the existing
//   /api/download/:ref gate works unchanged.
// - References are `kdocs_<uuid>` like IntaSend's, so support tooling stays
//   uniform across providers.
// - The OAuth token is cached until shortly before expiry instead of
//   re-requested per payment.
// - A read-only /diagnose probe verifies the consumer key/secret against
//   Safaricom without ever pushing money or a prompt.

const { putPayment, markPayment, getPayment, getPaymentByCheckoutRequestId } = require('../utils/paymentStore');
const sentry = require('../utils/sentry');
const { isNonEmptyString, normalizeKenyanPhone } = require('../utils/validate');
const { priceFor } = require('../utils/pricing');
const { STAGES } = require('../utils/templates');

function baseUrl() {
  return process.env.DARAJA_ENV === 'production'
    ? 'https://api.safaricom.co.ke'
    : 'https://sandbox.safaricom.co.ke';
}

function docLabelFor(docType) {
  for (const stage of Object.values(STAGES)) {
    if (stage.documents[docType]) return stage.documents[docType].label;
  }
  return null;
}

function maskKey(value) {
  if (!value) return null;
  const s = String(value);
  return `${s.slice(0, 4)}...(len ${s.length})`;
}

// ---- OAuth token cache -----------------------------------------------------
// Daraja access tokens are valid for ~3600s; request them only when the
// cache is empty or within 5 minutes of expiry.
let tokenCache = { token: null, expiresAt: 0 };

async function getAccessToken() {
  const key = process.env.DARAJA_CONSUMER_KEY;
  const secret = process.env.DARAJA_CONSUMER_SECRET;
  if (!key || !secret) {
    throw new Error('Daraja credentials are not configured (DARAJA_CONSUMER_KEY / DARAJA_CONSUMER_SECRET).');
  }
  if (tokenCache.token && Date.now() < tokenCache.expiresAt) return tokenCache.token;

  const auth = Buffer.from(`${key}:${secret}`).toString('base64');
  const res = await axios.get(
    `${baseUrl()}/oauth/v1/generate?grant_type=client_credentials`,
    { headers: { Authorization: `Basic ${auth}` }, timeout: 15000 }
  );
  const token = res.data?.access_token;
  if (!token) throw new Error('Daraja OAuth response contained no access_token');
  tokenCache = {
    token,
    // expires_in is seconds; renew 5 minutes early for safety
    expiresAt: Date.now() + Math.max(60, (Number(res.data.expires_in) || 3600) - 300) * 1000,
  };
  return token;
}

function timestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return (
    d.getFullYear().toString() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds())
  );
}

// POST /api/daraja/initiate  { docType, phone }
// Sends an STK push to the customer's phone and creates the durable pending
// record. The amount ALWAYS comes from the server's pricing table - the
// browser never gets to suggest a price.
router.post('/initiate', async (req, res) => {
  try {
    const { docType, phone } = req.body || {};
    if (!isNonEmptyString(docType, 64)) {
      return res.status(400).json({ error: 'docType is required' });
    }
    if (
      !process.env.DARAJA_CONSUMER_KEY || !process.env.DARAJA_CONSUMER_SECRET ||
      !process.env.DARAJA_SHORTCODE || !process.env.DARAJA_PASSKEY
    ) {
      return res.status(503).json({
        error: 'M-Pesa direct payment is not configured yet. Please use the card/mobile-money checkout instead.',
      });
    }

    const normalizedPhone = normalizeKenyanPhone(phone);
    if (!normalizedPhone) {
      return res.status(400).json({ error: 'Enter a valid M-Pesa phone number (e.g. 07XXXXXXXX).' });
    }

    const ref = `kdocs_${uuidv4()}`;
    const amountKes = priceFor(docType);
    const ts = timestamp();
    const password = Buffer.from(
      `${process.env.DARAJA_SHORTCODE}${process.env.DARAJA_PASSKEY}${ts}`
    ).toString('base64');

    const payload = {
      BusinessShortCode: process.env.DARAJA_SHORTCODE,
      Password: password,
      Timestamp: ts,
      TransactionType: 'CustomerPayBillOnline',
      Amount: amountKes,
      PartyA: normalizedPhone,
      PartyB: process.env.DARAJA_SHORTCODE,
      PhoneNumber: normalizedPhone,
      CallBackURL: process.env.DARAJA_CALLBACK_URL || `${resolveOrigin(req)}/api/daraja/callback`,
      AccountReference: 'KDocsPro',
      TransactionDesc: 'KDocs-Pro document download',
    };

    const token = await getAccessToken();
    const stk = await axios.post(
      `${baseUrl()}/mpesa/stkpush/v1/processrequest`,
      payload,
      { headers: { Authorization: `Bearer ${token}` }, timeout: 15000 }
    );

    if (stk.data?.ResponseCode !== '0') {
      console.error('STK push rejected:', JSON.stringify(stk.data));
      return res.status(502).json({
        error: stk.data?.CustomerMessage || 'M-Pesa declined the payment prompt. Please try again.',
      });
    }

    const checkoutRequestId = stk.data.CheckoutRequestID;
    await putPayment(ref, {
      provider: 'daraja',
      docType,
      amountKes,
      meta: {
        checkoutRequestId,
        merchantRequestId: stk.data.MerchantRequestID || null,
        phone: normalizedPhone,
        docLabel: docLabelFor(docType),
      },
    });

    res.json({
      ref,
      checkoutRequestId,
      amountKes,
      message: 'Check your phone and enter your M-Pesa PIN.',
    });
  } catch (err) {
    console.error('Daraja initiate error:', err.response?.status, JSON.stringify(err.response?.data) || err.message);
    sentry.capture(err, req, { handler: 'daraja:initiate' });
    res.status(502).json({ error: 'Could not start the M-Pesa payment. Please try again.' });
  }
});

// Best-effort public origin for the default callback URL (Render sets this
// behind a proxy; CF-Connecting-IP or x-forwarded-proto tell the truth).
function resolveOrigin(req) {
  const proto = req.get('x-forwarded-proto') || (req.secure ? 'https' : 'http');
  const host = req.get('x-forwarded-host') || req.get('host');
  if (!host) return null;
  return `${proto}://${host}`;
}

// POST /api/daraja/callback - Safaricom calls this when the customer
// completes (or cancels) the prompt. CSRF-exempt (server-to-server, see
// middleware/csrf.js). Authentication is inherent: the payment record was
// keyed by the CheckoutRequestID we created, which only Safaricom knows.
router.post('/callback', async (req, res) => {
  try {
    const body = req.body?.Body?.stkCallback;
    if (!body || !body.CheckoutRequestID) {
      return res.json({ ResultCode: 0, ResultDesc: 'ignored' });
    }

    const record = await getPaymentByCheckoutRequestId(body.CheckoutRequestID);
    if (record && record.status === 'pending') {
      const success = body.ResultCode === 0;
      const receipt = success
        ? body.CallbackMetadata?.Item?.find((i) => i.Name === 'MpesaReceiptNumber')?.Value || null
        : null;
      await markPayment(record._id, success ? 'paid' : 'failed', {
        provider: 'daraja',
        receipt,
      });
      console.log(`Daraja callback: ${record._id} -> ${success ? 'paid' : 'failed'}`);
    } else if (record) {
      console.log(`Daraja callback: ${record._id} already ${record.status}; ignoring.`);
    }
    res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  } catch (err) {
    console.error('Daraja callback error:', err.message);
    sentry.capture(err, req, { handler: 'daraja:callback' });
    // Always answer 200: Safaricom retries aggressively and the status
    // poller below lets the customer unlock the download once processing
    // completes.
    res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  }
});

// Frontend polls this while the customer is typing their PIN. Served from
// the payment store, so a paid status survives a redeploy mid-checkout.
router.get('/status/:ref', async (req, res) => {
  const record = await getPayment(req.params.ref);
  if (!record || record.provider !== 'daraja') return res.json({ status: 'pending' });
  res.json({ status: record.status, docLabel: record.meta?.docLabel || null });
});

// GET /api/daraja/diagnose - ops probe for the Daraja settings. Only makes a
// read-only OAuth call (no payments, no prompts, nothing chargable) and
// fingerprints the configured values so a sandbox/live mix-up is visible
// without leaking secrets.
router.get('/diagnose', async (req, res) => {
  const result = {
    env: process.env.DARAJA_ENV || '(unset - sandbox)',
    baseUrl: baseUrl(),
    consumerKey: maskKey(process.env.DARAJA_CONSUMER_KEY),
    consumerSecret: process.env.DARAJA_CONSUMER_SECRET ? '(set)' : null,
    shortcode: process.env.DARAJA_SHORTCODE || null,
    passkey: process.env.DARAJA_PASSKEY ? `${process.env.DARAJA_PASSKEY.slice(0, 6)}...${process.env.DARAJA_PASSKEY.slice(-4)}` : null,
    callbackUrl: process.env.DARAJA_CALLBACK_URL || 'unset (defaults to this origin + /api/daraja/callback)',
  };
  if (!process.env.DARAJA_CONSUMER_KEY || !process.env.DARAJA_CONSUMER_SECRET) {
    result.verdict = 'DARAJA_CONSUMER_KEY / DARAJA_CONSUMER_SECRET are not set on the server.';
    return res.json(result);
  }
  try {
    const token = await getAccessToken();
    result.verdict = token
      ? 'OAuth token minted - consumer key/secret are accepted by Safaricom Daraja.'
      : 'OAuth response contained no access_token.';
    result.oauthProbe = { verdict: 'OK' };
  } catch (err) {
    result.oauthProbe = {
      httpStatus: err.response?.status || null,
      detail: JSON.stringify(err.response?.data) || err.message,
      verdict: err.response?.status >= 400 ? 'REJECTED' : 'ERROR',
    };
    result.verdict = err.response?.status >= 400
      ? 'Safaricom rejected the OAuth credentials - check that the key/secret pair comes from the same Daraja app (sandbox vs production).'
      : 'Could not reach Safaricom - network or outage on either side.';
  }
  res.json(result);
});

module.exports = router;
