// Shared input validation helpers. Form fields are stored/regenerated
// verbatim into PDFs, so we cap their size and shape here at the API edge.

const MAX_STRING = 20000; // ~ a very long textarea; anything more is abuse

function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function cleanString(v, max = MAX_STRING) {
  if (typeof v !== 'string') return '';
  return v.length > max ? v.slice(0, max) : v;
}

// Keeps only safe, string-valued form fields. Blocks prototype-pollution
// keys and silently drops anything that isn't a plain string field.
function sanitizeFields(fields) {
  if (!isPlainObject(fields)) return {};
  const out = {};
  for (const [key, value] of Object.entries(fields)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
    if (!/^[A-Za-z_][A-Za-z0-9_]{0,63}$/.test(key)) continue;
    if (typeof value !== 'string') continue;
    out[key] = cleanString(value);
  }
  return out;
}

function isNonEmptyString(v, max = MAX_STRING) {
  return typeof v === 'string' && v.trim().length > 0 && v.length <= max;
}

// Normalize 0712345678 / +254712345678 / 254712345678 to 254712345678.
// Returns null for anything that isn't a plausible Kenyan mobile number,
// so we never push a payment prompt to a malformed number.
function normalizeKenyanPhone(phone) {
  if (typeof phone !== 'string') return null;
  let p = phone.replace(/[\s-]+/g, '').replace(/^\+/, '');
  if (/^0[17]\d{8}$/.test(p)) return `254${p.slice(1)}`;
  if (/^[17]\d{8}$/.test(p)) return `254${p}`;
  if (/^254[17]\d{8}$/.test(p)) return p;
  return null;
}

module.exports = {
  sanitizeFields,
  cleanString,
  isPlainObject,
  isNonEmptyString,
  normalizeKenyanPhone,
  MAX_STRING,
};
