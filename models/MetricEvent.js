// First-party funnel metrics: one small document per (day, event, docType)
// holding an incrementing counter. No personal data - no IPs, no IDs, no
// content. Read via Mongo for owner dashboards. Cloudflare Web Analytics
// (our pageview beacon) cannot record custom events, so the money steps
// live here instead. A TTL index sweeps entries after a year.
const mongoose = require('mongoose');

const metricEventSchema = new mongoose.Schema(
  {
    day: { type: String, required: true }, // 'YYYY-MM-DD' (UTC)
    event: { type: String, required: true },
    docType: { type: String, default: null },
    count: { type: Number, default: 0 },
  },
  { timestamps: true }
);

metricEventSchema.index({ day: 1, event: 1, docType: 1 }, { unique: true });
metricEventSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

const MetricEvent =
  mongoose.models.MetricEvent || mongoose.model('MetricEvent', metricEventSchema);

module.exports = { MetricEvent };
