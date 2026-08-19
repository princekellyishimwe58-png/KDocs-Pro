const express = require('express');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

// Same in-memory payments store used by the Daraja routes, so /api/download
// works identically no matter which provider a customer paid through.
const payments = global.__kdocsPayments || (global.__kdocsPayments = {});

function baseUrl() {
  return process.env.INTASEND_ENV === 'production'
    ? 'https://payment.intasend.com'
    : 'https://sandbox.intasend.com';
}

// POST /api/intasend/initiate  { docType, email, phone, name }
// Creates an IntaSend hosted checkout link (M-Pesa, card, bank, etc.)
router.post('/initiate', async (req, res) => {
  try {
    const { docType, email, phone, name } = req.body;
    if (!docType) return res.status(400).json({ error: 'docType is required' });

    // We generate our own reference and bake it into the redirect URL
    // ourselves, so we don't have to guess what IntaSend appends on return.
    const ref = `kdocs_${uuidv4()}`;
    const [firstName, ...rest] = (name || 'KDocs Pro Customer').split(' ');

    const payload = {
      public_key: process.env.INTASEND_PUBLIC_KEY,
      amount: Number(process.env.PRICE_KES || 20),
      currency: 'KES',
      email: email || 'customer@example.com',
      phone_number: phone || undefined,
      first_name: firstName || 'KDocs',
      last_name: rest.join(' ') || 'Pro',
      api_ref: ref,
      redirect_url: `${process.env.INTASEND_REDIRECT_URL}?ref=${ref}`,
    };

    const isRes = await axios.post(`${baseUrl()}/api/v1/checkout/`, payload);

    payments[ref] = { status: 'pending', documentId: docType, invoiceId: isRes.data.id };
    res.json({ link: isRes.data.url, ref });
  } catch (err) {
    console.error('IntaSend initiate error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Could not start the IntaSend payment. Please try again.' });
  }
});

// Called by the frontend after IntaSend redirects the customer back,
// to confirm with IntaSend's servers (not just trust the URL) that it succeeded.
router.get('/verify/:ref', async (req, res) => {
  try {
    const { ref } = req.params;
    const record = payments[ref];
    if (!record || !record.invoiceId) return res.status(404).json({ error: 'Unknown payment reference' });

    const isRes = await axios.post(
      `${baseUrl()}/api/v1/payment/status/`,
      { public_key: process.env.INTASEND_PUBLIC_KEY, invoice_id: record.invoiceId },
      { headers: { Authorization: `Bearer ${process.env.INTASEND_SECRET_KEY}` } }
    );

    const state = isRes.data?.invoice?.state;
    const success = ['COMPLETE', 'COMPLETED', 'PAID'].includes(state);
    const failed = ['FAILED', 'FAILED_TIMEOUT'].includes(state);

    record.status = success ? 'paid' : failed ? 'failed' : 'pending';
    res.json({ status: record.status });
  } catch (err) {
    console.error('IntaSend verify error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Could not verify payment.' });
  }
});

// Same shape as the Daraja status endpoint, so the frontend can poll either the same way.
router.get('/status/:ref', (req, res) => {
  const record = payments[req.params.ref];
  if (!record) return res.json({ status: 'pending' });
  res.json({ status: record.status });
});

module.exports = router;
