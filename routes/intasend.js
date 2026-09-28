const express = require('express');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

// IntaSend is the SOLE payment provider. It accepts individuals (no business
// registration needed) and its hosted checkout takes M-Pesa, cards, and bank
// transfers - one provider, one dashboard, real money without a Till.
const { putPayment, markPayment, getPayment } = require('../utils/paymentStore');
const { isNonEmptyString, normalizeKenyanPhone } = require('../utils/validate');

function baseUrl() {
  return process.env.INTASEND_ENV === 'production'
    ? 'https://payment.intasend.com'
    : 'https://sandbox.intasend.com';
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

    const payload = {
      public_key: process.env.INTASEND_PUBLIC_KEY,
      amount: Number(process.env.PRICE_KES || 20),
      currency: 'KES',
      email: isNonEmptyString(email, 200) ? email.trim() : undefined,
      phone_number: normalizedPhone || undefined,
      first_name: firstName || 'KDocs',
      last_name: rest.join(' ') || 'Pro',
      api_ref: ref,
      redirect_url: `${process.env.INTASEND_REDIRECT_URL}?ref=${ref}`,
    };

    const isRes = await axios.post(`${baseUrl()}/api/v1/checkout/`, payload, {
      timeout: 15000,
    });

    await putPayment(ref, {
      provider: 'intasend',
      docType,
      meta: { invoiceId: isRes.data.id },
    });
    res.json({ link: isRes.data.url, ref });
  } catch (err) {
    console.error('IntaSend initiate error:', err.response?.data || err.message);
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
      return res.json({ status: 'paid' });
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
    console.error('IntaSend verify error:', err.response?.data || err.message);
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

module.exports = router;
