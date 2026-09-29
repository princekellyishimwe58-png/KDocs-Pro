// ============================================================
// PRICING - the single source of truth for what each document
// costs. Every price shown anywhere in the product (cards,
// checkout, confirmation, receipts) must come from this file.
// The server is authoritative: the browser never gets to set
// or suggest an amount.
// ============================================================

const { STAGES } = require('./templates');

const PRICE_DEFAULT_KES = 20;

// Products priced at KSh 50 per the current pricing plan. Keys must be
// document keys exactly as defined in utils/templates.js.
const PRICING = {
  // "Looking for a Job" suite
  cv: 50,
  cover_letter: 50,
  job_application: 50,

  // "After a Job" suite (all six documents)
  resignation: 50,
  reference_request: 50,
  farewell: 50,
  handover_report: 50,
  experience_certificate: 50,
  recommendation_letter: 50,

  // School / university
  admission_application: 50,
};

// Walk the catalog once and price any document not listed above at the
// default. If a key in PRICING does not exist in STAGES it fails loudly
// (module load time) so prices can never silently drift from the catalog.
function buildPriceMap() {
  const map = {};
  for (const stage of Object.values(STAGES)) {
    for (const docKey of Object.keys(stage.documents)) {
      map[docKey] = PRICING[docKey] !== undefined ? PRICING[docKey] : PRICE_DEFAULT_KES;
    }
  }
  const unknown = Object.keys(PRICING).filter((k) => !(k in map));
  if (unknown.length) {
    throw new Error(`pricing.js: unknown document key(s): ${unknown.join(', ')}`);
  }
  return map;
}

const PRICES = buildPriceMap();

// Price for one document type, in whole KES. Unknown docTypes are priced at
// the default (and are rejected upstream before charging).
function priceFor(docType) {
  return PRICES[docType] !== undefined ? PRICES[docType] : PRICE_DEFAULT_KES;
}

// True when a price equals the base price; used by the UI to show plain
// "KSh 20" without listing exceptions everywhere.
function isDefaultPrice(docType) {
  return priceFor(docType) === PRICE_DEFAULT_KES;
}

// Friendly names for the priced suites (shown once, in the hero + pricing hint).
function pricedSuites() {
  return [
    { label: 'Looking for a Job suite', price: 50, docCount: 3 },
    { label: 'After a Job suite', price: 50, docCount: 6 },
    { label: 'Admission Letter', price: 50, docCount: 1 },
  ];
}

module.exports = { PRICE_DEFAULT_KES, PRICING, PRICES, priceFor, isDefaultPrice, pricedSuites };
