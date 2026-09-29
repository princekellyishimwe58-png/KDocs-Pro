# KDocs-Pro

A document generator for the Kenyan market: CVs, cover letters, resignation
letters, and school/college/university letters (admission, leave permission,
bursary requests), plus freelance/business tools — 19 document types, 4
templates each. Free watermarked preview with the **KDocs AI** panel (quality
checklist, improvement suggestions, and CV-vs-job-advert keyword matching).

## Pricing (single source of truth: `utils/pricing.js`)

| Suite | Documents | Price |
|---|---|---|
| Looking for a Job | CV, Cover Letter, Job Application Letter | **KSh 50** |
| After a Job | Resignation, Reference Request, Farewell, Handover, Experience Certificate, Recommendation | **KSh 50** |
| School/University | Admission/Application Letter | **KSh 50** |
| Everything else | Leave requests, appraisals, invoices, minutes, business card, bursary, school leave | **KSh 20** |

All prices are computed server-side per document type — the browser never
sets or suggests an amount. Catalog, cards, checkout summary, verification
response, and receipts all read from the same table.

**Payments: IntaSend only (M-Pesa, card, bank transfer).** IntaSend accepts
individual accounts in Kenya — no business registration or Safaricom Till
required to take real money. Its hosted checkout handles M-Pesa STK push,
cards, and bank transfers in one secure page, and we confirm payment
server-side before the clean PDF is ever generated.

**Honest note on the "anti-screenshot" request:** no website can truly stop
someone from screenshotting their own screen — that control belongs to the
phone/computer, not the browser. What this app does instead (and what
actually works) is simple: it never sends the clean, finished PDF to the
browser until IntaSend confirms the KSh 20 was paid. Before that, the person
only ever sees a blurred, watermarked preview. On top of that, it adds small
speed bumps (right-click disabled, Ctrl+P/S blocked, preview blurs if they
switch tabs) — nice to have, not bulletproof, and we'd rather tell you that
than oversell it.

---

## Running it locally

```
npm install
cp .env.example .env      # then fill in your real values
npm start                 # or: npm run dev (auto-restart on changes)
```

Open http://localhost:10000 in your browser. Run the test suite with:

```
npm test
```

## Project map

- `server.js` — the main app: security headers, rate limiting, API routes
- `routes/intasend.js` — payments (create checkout, verify on return)
- `routes/auth.js` — email + Google sign-in (guests always welcome)
- `routes/locker.js` — re-download documents you've already paid for
- `utils/paymentStore.js` — durable payment records (MongoDB + memory fallback)
- `utils/pricing.js` — per-document price table (KSh 20/50) used everywhere
- `utils/validate.js` — input validation/sanitization shared by the API
- `utils/pdfGenerator.js` — builds the actual PDF (preview vs. clean copy)
- `utils/templates.js` — the catalog of document types, stages, templates
- `utils/readyScore.js` — the free document-quality checklist engine
- `utils/aiAnalyzer.js` — KDocs AI: rule-based CV review, job-advert keyword
  matching, and per-document coaching (never invents personal information)
- `test/` — automated tests (`npm test`, Node 18+)
- `public/` — the frontend: app, legal pages (terms/privacy/refund), 404,
  SEO files (robots.txt, sitemap.xml, llms.txt, favicon, OG image)

## Engineering notes (what makes this production-ready)

- **Payments survive restarts.** Payment records live in MongoDB (24-hour
  auto-expiry) instead of server memory, so a Render restart or deploy never
  wipes a customer's "paid" status. A memory mirror keeps downloads working
  through brief database hiccups.
- **IntaSend-first payments.** One provider, KES pricing, M-Pesa + cards +
  bank. Verification always happens server-to-server — the redirect URL is
  never trusted on its own. Individual accounts work; complete KYC in the
  IntaSend dashboard, then switch `INTASEND_ENV=production` with live keys.
- **Hardened endpoints.** Security headers (helmet), response compression,
  rate limiting on the download route, 256 KB JSON body cap, strict CORS
  (same-origin by default, extra origins via `CORS_ORIGINS`), request
  timeouts on all outbound provider calls, JSON 404s for unknown API routes,
  and a branded 404 page for bad URLs.
- **Clean input, clean PDFs.** Every form field passes through a
  sanitization layer (string-only, length-capped, prototype-pollution-safe)
  before it reaches the PDF engine.
- **Health check.** `GET /api/health` reports uptime and the active payment
  store backend — point UptimeRobot at it (or the homepage) to prevent
  free-tier cold starts.
- **SEO & trust.** Unique titles + meta descriptions, canonical tags,
  JSON-LD structured data, sitemap.xml, robots.txt, llms.txt, favicon,
  OG share image, and full legal pages (Terms, Privacy, Refund).

## Going live checklist

1. Sign up at [intasend.com](https://intasend.com) and complete KYC
   (National ID + selfie; individuals are accepted).
2. Copy your **live** API keys from Settings → API Keys.
3. In Render's Environment tab set: `INTASEND_PUBLIC_KEY`,
   `INTASEND_SECRET_KEY`, `INTASEND_ENV=production`, and
   `INTASEND_REDIRECT_URL=https://your-app-name.onrender.com/`.
4. Set `PRICE_KES=20` (or your chosen price) and `MONGODB_URI` +
   `JWT_SECRET` (required for payments and accounts to work reliably).
5. Deploy, then pay yourself once (one KSh 20 and one KSh 50 document) with
   a real M-Pesa number and confirm the clean downloads work end-to-end.
6. Add an uptime monitor (e.g. UptimeRobot free tier) against the site URL
   so free-tier cold starts never happen to a paying customer.
7. When you later register a business and get your own Safaricom
   Till/Paybill, you can add direct Daraja M-Pesa back for lower
   per-transaction fees — until then, IntaSend does everything.

## Legal quick-list for Kenya

- Add your KRA PIN to your records; declare income from the app.
- Register a business name on eCitizen (~KSh 950) once it's earning.
- Register with the ODPC as a data controller once you hold real users'
  personal data at scale (see odpc.go.ke for current thresholds).
- Keep the Terms/Privacy/Refund pages updated as the product changes.
