const express = require('express');
const axios = require('axios');
const router = express.Router();

// Same in-memory payments store used by Daraja/IntaSend, so /api/download
// works identically no matter which provider a customer paid through.
const payments = global.__kdocsPayments || (global.__kdocsPayments = {});

function baseUrl() {
  return process.env.PAYPAL_ENV === 'production'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';
}

async function getAccessToken() {
  const auth = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString('base64');
  const res = await axios.post(
    `${baseUrl()}/v1/oauth2/token`,
    'grant_type=client_credentials',
    { headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' } }
  );
  return res.data.access_token;
}

// POST /api/paypal/create-order  { docType }
router.post('/create-order', async (req, res) => {
  try {
    const { docType } = req.body;
    if (!docType) return res.status(400).json({ error: 'docType is required' });

    const token = await getAccessToken();
    const amount = process.env.PRICE_USD || '0.50';
    const orderRes = await axios.post(
      `${baseUrl()}/v2/checkout/orders`,
      {
        intent: 'CAPTURE',
        purchase_units: [{ amount: { currency_code: 'USD', value: amount }, description: 'KDocs-Pro document download' }],
      },
      { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
    );

    payments[orderRes.data.id] = { status: 'pending', documentId: docType };
    res.json({ orderId: orderRes.data.id });
  } catch (err) {
    console.error('PayPal create-order error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Could not start the PayPal payment. Please try again.' });
  }
});

// POST /api/paypal/capture-order/:orderId - called right after the customer approves in the PayPal popup
router.post('/capture-order/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const token = await getAccessToken();
    const captureRes = await axios.post(
      `${baseUrl()}/v2/checkout/orders/${orderId}/capture`,
      {},
      { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
    );

    const success = captureRes.data.status === 'COMPLETED';
    if (!payments[orderId]) payments[orderId] = {};
    payments[orderId].status = success ? 'paid' : 'failed';
    res.json({ status: payments[orderId].status });
  } catch (err) {
    console.error('PayPal capture error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Could not confirm your PayPal payment.' });
  }
});

router.get('/status/:orderId', (req, res) => {
  const record = payments[req.params.orderId];
  if (!record) return res.json({ status: 'pending' });
  res.json({ status: record.status });
});

module.exports = router;
