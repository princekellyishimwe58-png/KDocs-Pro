const mongoose = require('mongoose');

// One document per counted request, per limiter window. Counting documents
// whose hitAt is inside the trailing windowMs IS a true sliding window -
// there are no fixed boundaries, matching the in-memory implementation.
// A TTL index (25h, just above the longest 24h window) sweeps old hits so
// the collection self-cleans; counting queries always filter by window too.
const rateHitSchema = new mongoose.Schema({
  // Namespaced per limiter: "<limiter name>:<user hash | ip>"
  key: { type: String, required: true },
  hitAt: { type: Date, required: true, default: Date.now },
});

// Count + oldest-hit lookups are always by key within a time range.
rateHitSchema.index({ key: 1, hitAt: 1 });
// TTL sweeper. Fixed at 25h because a TTL index can't be per-window; the
// shorter windows just get swept a little later than strictly needed.
rateHitSchema.index({ hitAt: 1 }, { expireAfterSeconds: 25 * 60 * 60 });

module.exports = mongoose.models.RateHit || mongoose.model('RateHit', rateHitSchema);
