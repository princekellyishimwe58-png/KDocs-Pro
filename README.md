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

## Deploying: production vs. staging

Two Render services run the same repo from two branches — never test on
production:

| Branch | Purpose | Notes |
|---|---|---|
| `main` | Production | https://kdocs-pro.onrender.com — real customers, live keys |
| `staging` | Testing | Its own Render service, sandbox IntaSend keys, separate database |

**The workflow for every change:**

1. Edit locally and run `npm test`.
2. Push to the `staging` branch — Render auto-deploys the staging service
   (~60–90s).
3. Test on the staging URL, including a sandbox payment (IntaSend test cards
   / test M-Pesa flow).
4. Only when it works, bring it to production:
   `git checkout main && git merge staging && git push origin main`.

**One-time setup (Render dashboard, ~10 minutes):**

1. **New + → Web Service** → connect the same GitHub repo
   (`prince-bot-tech/KDocs-Pro`).
2. Name: `kdocs-pro-staging`. **Branch: `staging`** ← the important part.
   Runtime Node, Build `npm install`, Start `npm start`, instance Free.
3. **Environment** — copy production's variables, then change:
   - `INTASEND_ENV`: unset/`sandbox` with **sandbox** API keys. Never put
     live payment keys on staging.
   - `MONGODB_URI`: same Atlas cluster but a different database name
     (e.g. `…mongodb.net/kdocs_staging?retryWrites=true&w=majority`) so test
     data never touches real payments. Free tier allows many databases.
   - `INTASEND_REDIRECT_URL`: the staging URL.
   - `CORS_ORIGINS`: `https://kdocs-pro-staging.onrender.com` (plus anything
     else you test from).
   - `SENTRY_DSN`: leave unset (or a separate Sentry project) so test noise
     doesn't page you.
4. Production keeps running from `main` exactly as it is today.

## Project map

- `server.js` — the main app: security headers, rate limiting, API routes
- `routes/intasend.js` — payments (create checkout, verify on return)
- `routes/auth.js` — email + Google sign-in (guests always welcome)
- `routes/locker.js` — re-download documents you've already paid for
- `utils/paymentStore.js` — durable payment records (MongoDB + memory fallback)
- `utils/sentry.js` — optional Sentry error tracking (inactive unless SENTRY_DSN is set)
- `tools/backup.js` — scheduled MongoDB export for manual backups
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

- **Payments survive restarts.** Payment records live in MongoDB (90-day
  auto-expiry) instead of server memory, so a Render restart or deploy never
  wipes a customer's "paid" status. A memory mirror keeps downloads working
  through brief database hiccups.
- **IntaSend-first payments.** One provider, KES pricing, M-Pesa + cards +
  bank. Verification always happens server-to-server — the redirect URL is
  never trusted on its own. Individual accounts work; complete KYC in the
  IntaSend dashboard, then switch `INTASEND_ENV=production` with live keys.
- **Hardened endpoints.** Security headers (helmet + explicit CSP), response
  compression, rate limiting on sign-in, payment initiation, and downloads,
  CSRF tokens on every state-changing API call, 256 KB JSON body cap, strict
  CORS (same-origin by default, extra origins via `CORS_ORIGINS`), request
  timeouts on all outbound provider calls, JSON 404s for unknown API routes,
  and a branded 404 page for bad URLs.
- **Error monitoring (optional).** Set `SENTRY_DSN` (free tier at
  [sentry.io](https://sentry.io)) and unhandled errors plus failed payment
  verifications email you instead of hiding in server logs. Without the
  variable the app behaves exactly as before.
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
8. **Set up backups.** Atlas' free tier has none — see the Backups section
   below for a scheduled export script and the paid-tier upgrade path.

## Backups (Atlas free tier has no automatic backups)

MongoDB Atlas' **M0 (free)** cluster cannot run automatic backups — the
Backup tab only unlocks on **M10 (~US$60/month) or higher**. Until you
upgrade, close the gap with both of these:

### 1. Scheduled exports (script included, no new dependencies)

`tools/backup.js` dumps every collection to timestamped JSON using the
mongoose package the app already ships with:

```
export MONGODB_URI="mongodb+srv://user:pass@cluster0.xxxx.mongodb.net/kdocs?retryWrites=true&w=majority"
node tools/backup.js
# -> backups/<timestamp>/payments.json, users.json, documents.json, ...
```

- Run it from any machine with Node + internet (your laptop is fine); copy
  the URI from Render's Environment tab.
- **Schedule it** so it actually happens:
  - Linux/macOS cron: `0 4 * * * cd /path/to/kdocs-pro && MONGODB_URI=... node tools/backup.js >> backup.log 2>&1`
  - Windows Task Scheduler: action `node`, argument `tools/backup.js`,
    start-in the project folder, daily.
  - Or a free GitHub Actions `schedule:` workflow that runs the script and
    uploads the `backups/` folder as an artifact (private repo only).
- Copy each export somewhere **off the machine** (Google Drive, OneDrive,
  USB) — a backup stored next to the credentials it came from is not a
  backup.
- Restore a single collection later with the standard MongoDB tooling:
  `mongoimport --uri "<URI>" --collection payments --file payments.json --jsonArray --drop`

### 2. Atlas automatic backups (requires the M10 paid tier)

When revenue justifies ~$60/month:

1. Sign in at [cloud.mongodb.com](https://cloud.mongodb.com) → your project.
2. **Clusters → your cluster → Backup** — on M0 this shows that backups are
   unavailable for the tier.
3. **Clusters → your cluster → Edit configuration / "⋯" → M10 (or higher)**
   and apply. Continuous cloud backups turn on **by default**: daily
   snapshots, retained 1 week (adjustable).
4. Verify under **Backup → Snapshot schedule** (frequency/retention) and
   wait for the first entry in **Backup → Snapshots**.
5. Do one restore drill: **Snapshots → ⋯ → Restore** into a scratch cluster
   and confirm the data. Practise this once before you ever need it for real.
6. Keep running the manual export too — two independent backups beat one.

## Legal quick-list for Kenya

- Add your KRA PIN to your records; declare income from the app.
- Register a business name on eCitizen (~KSh 950) once it's earning.
- Register with the ODPC as a data controller once you hold real users'
  personal data at scale (see odpc.go.ke for current thresholds).
- Keep the Terms/Privacy/Refund pages updated as the product changes.
