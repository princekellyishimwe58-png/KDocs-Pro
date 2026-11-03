'use strict';

// First-party funnel metrics. Zero personal data: a day bucket + event
// name + optional docType, aggregated with $inc into models/MetricEvent.js
// (see that file for why Cloudflare Web Analytics alone can't do this).
//
// Every write is fire-and-forget and swallow-all: a metrics problem must
// never delay or fail the customer-facing request around it.

const { connectDb } = require('./db');
const { MetricEvent } = require('../models/MetricEvent');

const KNOWN_EVENTS = new Set([
  'landing_view',       // serveShell renders a /doc/<key> landing
  'template_pick',      // client: a layout was chosen (picker or landing card)
  'payment_initiated',  // Daraja STK push / IntaSend checkout created
  'download_completed', // a clean PDF was delivered - the money event
  'scan_convert',       // free scan-to-PDF converted and downloaded
]);

function todayKey(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

// Validation inline (not at call sites) so every caller is safe by default.
function trackEvent(event, docType = null) {
  if (!KNOWN_EVENTS.has(event)) return;
  if (docType != null && !/^[a-z0-9_]{1,64}$/.test(docType)) return;
  (async () => {
    if (!(await connectDb())) return;
    await MetricEvent.updateOne(
      { day: todayKey(), event, docType: docType || null },
      { $inc: { count: 1 } },
      { upsert: true }
    );
  })().catch((err) => console.error('Metric write failed:', err.message));
}

module.exports = { trackEvent, KNOWN_EVENTS };
