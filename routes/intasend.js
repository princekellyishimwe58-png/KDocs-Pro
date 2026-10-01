const express = require('express');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

// IntaSend is the SOLE payment provider. It accepts individuals (no business
// registration needed) and its hosted checkout takes M-Pesa, cards, and bank
// transfers - one provider, one dashboard, real money without a Till.
const { putPayment, markPayment, getPayment } = require('../utils/paymentStore');
const sentry = require('../utils/sentry');
const { isNonEmptyString, normalizeKenyanPhone } = require('../utils/validate');
const { priceFor } = require('../utils/pricing');
const { STAGES } = require('../utils/templates');

function baseUrl() {
  return process.env.INTASEND_ENV === 'production'
    ? 'https://payment.intasend.com'
    : 'https://sandbox.intasend.com';
}

function checkoutHosts() {
  return process.env.INTASEND_ENV === 'production'
    ? ['https://payment.intasend.com', 'https://api.intasend.com']
    : ['https://sandbox.intasend.com'];
}

// Tries checkout creation on each production host in order and returns
// { res, host } for the first success, or throws the last error so the
// caller can log/report exactly what IntaSend said.
async function attemptCheckout(payload) {
  let lastErr = null;
  for (const host of checkoutHosts()) {
    try {
      const res = await axios.post(`${host}/api/v1/checkout/`, payload, { timeout: 15000 });
      return { res, host };
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr;
}

// Short fingerprint for ops endpoints - prefix + length + last 4 chars,
// never enough to leak the key.
function maskKey(value) {
  if (!value) return null;
  const s = String(value);
  return `${s.slice(0, 5)}...${s.slice(-4)} (${s.length} chars)`;
}

function docLabelFor(docType) {
  for (const stage of Object.values(STAGES)) {
    if (stage.documents[docType]) return stage.documents[docType].label;
  }
  return null;
}

// POST /api/intasend/initiate  { docType, email, phone, name }
// Creates an IntaSend hosted checkout (KES, M-Pesa prefilled from the phone
// number the customer typed; cards/bank still available on the checkout page).
router.post('/initiate', async (req, res) => {
  try {
    const { docType, email, phone, name } = req.body || {};
    if (!isNonEmptyString(docType, 64)) {
      return res.status(400).json({ error: 'docType is required' });
    }

    // We generate our own reference and bake it into the redirect URL
    // ourselves, so we don't have to guess what IntaSend appends on return.
    const ref = `kdocs_${uuidv4()}`;
    const safeName = isNonEmptyString(name, 100) ? name.trim() : 'KDocs Pro Customer';
    const [firstName, ...rest] = safeName.split(' ');

    // Accept 07.. / +254.. / 254.. formats; IntaSend wants the 2547.. shape.
    const normalizedPhone = normalizeKenyanPhone(phone);

    // The amount comes from the server's pricing table (utils/pricing.js),
    // never from anything the browser sent.
    const amountKes = priceFor(docType);

    const payload = {
      public_key: process.env.INTASEND_PUBLIC_KEY,
      amount: amountKes,
      currency: 'KES',
      email: isNonEmptyString(email, 200) ? email.trim() : undefined,
      phone_number: normalizedPhone || undefined,
      first_name: firstName || 'KDocs',
      last_name: rest.join(' ') || 'Pro',
      api_ref: ref,
      redirect_url: `${process.env.INTASEND_REDIRECT_URL}?ref=${ref}`,
    };

    const { res: isRes } = await attemptCheckout(payload);

    await putPayment(ref, {
      provider: 'intasend',
      docType,
      amountKes,
      meta: { invoiceId: isRes.data.id, docLabel: docLabelFor(docType) },
    });
    res.json({ link: isRes.data.url, ref, amountKes });
  } catch (err) {
    console.error('IntaSend initiate error:', err.response?.status, JSON.stringify(err.response?.data) || err.message);
    sentry.capture(err, req, { handler: 'intasend:initiate' });
    res.status(502).json({ error: 'Could not start the payment. Please try again.' });
  }
});

// Called by the frontend after IntaSend redirects the customer back,
// to confirm with IntaSend's servers (not just trust the URL) that it succeeded.
router.get('/verify/:ref', async (req, res) => {
  try {
    const { ref } = req.params;
    const record = await getPayment(ref);
    if (!record || !record.meta?.invoiceId) {
      return res.status(404).json({ error: 'Unknown payment reference' });
    }
    if (record.status === 'paid') {
      return res.json({ status: 'paid', docLabel: record.meta?.docLabel || null, amountKes: record.meta?.amountKes || null });
    }

    const isRes = await axios.post(
      `${baseUrl()}/api/v1/payment/status/`,
      { invoice_id: record.meta.invoiceId },
      { headers: { Authorization: `Bearer ${process.env.INTASEND_SECRET_KEY}` }, timeout: 15000 }
    );

    const state = isRes.data?.invoice?.state;
    const success = ['COMPLETE', 'COMPLETED', 'PAID'].includes(state);
    const failed = ['FAILED', 'FAILED_TIMEOUT'].includes(state);

    if (success || failed) {
      await markPayment(ref, success ? 'paid' : 'failed', { provider: 'intasend' });
    }
    res.json({ status: success ? 'paid' : failed ? 'failed' : 'pending' });
  } catch (err) {
    console.error('IntaSend verify error:', err.response?.status, JSON.stringify(err.response?.data) || err.message);
    // A failed verification means a customer may have PAID but cannot get their
    // document - this must page the owner, not just sit in server logs.
    sentry.capture(err, req, { handler: 'intasend:verify' });
    res.status(502).json({ error: 'Could not verify payment.' });
  }
});

// Status endpoint (same shape the frontend previously polled on Daraja),
// so any poll-style UI keeps working against IntaSend references too.
router.get('/status/:ref', async (req, res) => {
  const record = await getPayment(req.params.ref);
  if (!record) return res.json({ status: 'pending' });
  res.json({ status: record.status });
});

// GET /api/intasend/diagnose - ops probe for live-payment troubleshooting.
// Makes a REAL checkout request with the server's configured key against
// each configured host and returns IntaSend's raw verdict (HTTP status +
// error detail) per host, plus the effective config fingerprint. Keys are
// never returned, nothing can be charged (no customer ever opens the
// created checkout URL), and the created URL is withheld on purpose.
// Rate-limited in server.js because each call does live API requests.
router.get('/diagnose', async (req, res) => {
  const result = {
    env: process.env.INTASEND_ENV || '(unset - sandbox)',
    publicKey: maskKey(process.env.INTASEND_PUBLIC_KEY),
    hasSecretKey: Boolean(process.env.INTASEND_SECRET_KEY),
    redirectUrl: process.env.INTASEND_REDIRECT_URL || null,
    hosts: [],
  };
  if (!process.env.INTASEND_PUBLIC_KEY) {
    result.verdict = 'INTASEND_PUBLIC_KEY is not set on the server.';
    return res.json(result);
  }
  const payload = {
    public_key: process.env.INTASEND_PUBLIC_KEY,
    amount: 1,
    currency: 'KES',
    email: 'ops-diagnostic@intasend-probe.invalid',
    phone_number: '254700000000',
    first_name: 'Ops',
    last_name: 'Diagnostic',
    api_ref: `diag_${uuidv4()}`,
    redirect_url: process.env.INTASEND_REDIRECT_URL || 'https://kdocs-pro.onrender.com/',
  };
  for (const host of checkoutHosts()) {
    try {
      const isRes = await axios.post(`${host}/api/v1/checkout/`, payload, { timeout: 15000 });
      result.hosts.push({
        host,
        httpStatus: isRes.status,
        invoiceId: isRes.data?.id || null,
        url: isRes.data?.url ? '(created - withheld)' : null,
        verdict: 'OK',
      });
    } catch (err) {
      result.hosts.push({
        host,
        httpStatus: err.response?.status || null,
        detail: JSON.stringify(err.response?.data) || err.message,
        verdict: 'FAILED',
      });
    }
  }
  result.verdict = result.hosts.some((h) => h.verdict === 'OK')
    ? 'Checkout creation works. If the M-Pesa prompt still never arrives for real customers, the problem is inside the IntaSend dashboard (account/KYC/M-Pesa activation) - contact IntaSend support.'
    : 'IntaSend rejects checkout creation with the configured keys. Check the per-host detail above against your IntaSend dashboard: test vs live keys, and whether the live account is fully activated (KYC/approval).';
  // Secret-key auth probe: unlike checkout (which 500s on everything), the
  // payment-status endpoint returns DISTINCT 401 codes for bad credentials,
  // so a read-only lookup of a nonexistent invoice tells us whether the
  // secret key is accepted by IntaSend at all. Nothing can be charged.
  try {
    const st = await axios.post(
      `${baseUrl()}/api/v1/payment/status/`,
      { invoice_id: 'diag-probe-000' },
      { headers: { Authorization: `Bearer ${process.env.INTASEND_SECRET_KEY}` }, timeout: 15000 }
    );
    result.secretProbe = { httpStatus: st.status, verdict: 'ACCEPTED', detail: JSON.stringify(st.data).slice(0, 300) };
  } catch (err) {
    const code = err.response?.data?.errors?.[0]?.code || null;
    result.secretProbe = {
      httpStatus: err.response?.status || null,
      code,
      detail: JSON.stringify(err.response?.data) || err.message,
      verdict: err.response?.status === 401 ? 'REJECTED' : 'ERROR',
    };
  }
  // Collection (STK) probe: the direct M-Pesa path, secret-key auth like
  // the status probe. Uses a deliberately unreachable number (254300000000
  // is not a valid Safaricom mobile) and 1 KES, so even full success cannot
  // reach a real phone or charge anyone - it only reveals whether the
  // account's collection/STK subsystem responds at all.
  try {
    const col = await axios.post(
      `${baseUrl()}/api/v1/payment/collection/`,
      {
        public_key: process.env.INTASEND_PUBLIC_KEY,
        currency: 'KES',
        method: 'M-PESA',
        amount: 1,
        phone_number: '254300000000',
        name: 'Ops Diagnostic',
        api_ref: `diag_${uuidv4()}`,
      },
      { headers: { Authorization: `Bearer ${process.env.INTASEND_SECRET_KEY}` }, timeout: 15000 }
    );
    result.collectionProbe = { httpStatus: col.status, verdict: 'ACCEPTED', detail: JSON.stringify(col.data).slice(0, 300) };
  } catch (err) {
    const code = err.response?.data?.errors?.[0]?.code || err.response?.data?.detail || null;
    result.collectionProbe = {
      httpStatus: err.response?.status || null,
      code,
      detail: JSON.stringify(err.response?.data) || err.message,
      verdict: err.response?.status >= 500 || !err.response?.status ? 'ERROR' : 'REJECTED',
    };
  }
  res.json(result);
});

module.exports = router;
