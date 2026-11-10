# KDocs Pro — backlink kit

Everything needed to get KDocs Pro mentioned off its own domain: copy that fits
each form's character limits, a verified list of places that accept it, and a
tracker so nothing gets submitted twice.

Every URL below was requested on **2026-11-10** and its HTTP status recorded (see
[How the URLs were verified](#how-the-urls-were-verified)). A `403` means the
site blocks automated requests, not that the page is dead — those were opened in
a browser and confirmed.

---

## The honest brief

Three things to know before spending an evening on this.

**1. Most of these links are `nofollow`.** Product Hunt, Crunchbase, Indie
Hackers, GitHub and the directories qualify their outbound links. They will not
lift your rankings directly. What they do is corroborate that "KDocs Pro" is a
real thing that exists at a real URL — which is precisely what a brand search
(`kdocs pro`) needs, and what you currently have none of. Treat them as entity
signals and referral traffic, not as PageRank.

**2. A custom domain is a prerequisite for the best ones.** SaaSHub and BetaList
explicitly reject products on free hosting subdomains; G2 requires a registered
business with a unique domain. Until `kdocspro.co.ke` (or similar) is live, skip
those — see "Tier 2".

**3. Never buy links.** Paid links that pass ranking signals violate Google's
[link spam policy](https://developers.google.com/search/docs/essentials/spam-policies#link-spam)
and can earn a manual action. Paying a directory's listing fee is fine; paying
someone to place a keyword-rich link on a site that exists to sell links is not.
Nothing in this kit is a link scheme.

---

## What to paste

Use these verbatim so the brand is spelled the same way everywhere —
`KDocs Pro` in prose, `kdocs-pro.onrender.com` as the URL. A test
(`test/backlinkKit.test.js`) enforces each block against the platform limit, so
edit here and let it tell you if a field no longer fits.

**Name** — 9 characters, Product Hunt allows 40. Just the name, no tagline.

```
KDocs Pro
```

**Tagline** — 49 characters, Product Hunt allows 60.

```
CVs, cover letters and official letters for Kenya
```

**Short description** — 153 characters, fits a 160-char meta description.

```
KDocs Pro turns a short form into a finished CV, cover letter or official letter for Kenya. Free watermarked preview; a clean PDF from KSh 20 via M-Pesa.
```

**Medium description** — 223 characters, fits 300-char directory fields.

```
KDocs Pro is a Kenyan document generator: pick a document, choose a template, fill a short form, and get a free watermarked PDF preview with Ready Score coaching. A clean PDF costs KSh 20 or KSh 50 via M-Pesa, card or bank.
```

**Long description** — 543 characters, for "about your company" fields.

```
KDocs Pro generates professional documents for Kenya from a short form: CVs and resumes, cover letters, job application letters, resignation and leave letters, salary increment requests, admission applications, fee bursary requests, freelance invoices, meeting minutes and business cards. Every document gets a free watermarked preview plus Ready Score, a rule-based checklist of what is missing. A clean, watermark-free PDF costs KSh 20 or KSh 50, paid by M-Pesa, card or bank, with payments confirmed server-side before the file is produced.
```

**Show HN title** — 68 characters, Hacker News titles max 80.

```
Show HN: KDocs Pro – Kenyan CVs and official letters from your phone
```

**Category / tag suggestions** — pick whichever the form offers, don't invent new
ones: Productivity, Business, Education, Career, Human Resources, Document
Generation, Resume / CV Builder, Invoice Generator, Kenya, Africa.

**Assets** (already on the site, hot-link or upload):

| Field | Value |
|---|---|
| Website | `https://kdocs-pro.onrender.com` |
| Logo | `https://kdocs-pro.onrender.com/logo.svg` (512×512) |
| Social / OG image | `https://kdocs-pro.onrender.com/og-image.jpg` |
| Contact email | `kdocspro@gmail.com` |
| Market / locale | Kenya, `en-KE` |
| Pricing | Free preview; KSh 20 or KSh 50 per clean PDF |

---

## Where to post it

### Tier 1 — open now, no custom domain needed

Ordered by value for effort. Submit in this order.

| # | Target | Submit at | Cost | What it needs | Checked |
|---|---|---|---|---|---|
| 1 | **GitHub profile README** | [github.com/new](https://github.com/new) — repo named exactly your username, public, `README.md` at root | Free | GitHub account. Point it at the live site; you already have the repo, so add a one-line link. | 200 |
| 2 | **Indie Hackers** product | [indiehackers.com/products](https://www.indiehackers.com/products) → add product (sign-in) | Free | Account, product name, URL, description. Pair it with a real build note, not a bare promo. | 200 |
| 3 | **Product Hunt** | [producthunt.com](https://www.producthunt.com) → Submit → New Product | Free | Account **at least a week old** (per its help docs), direct product URL, name/tagline/description/topics/images, maker role. | page blocks bots; help docs 200 |
| 4 | **AfroPitch** (Africa) | [afropitch.com/directory](https://afropitch.com/directory/) → Submit a Free Listing | Free basic listing | Business name, sector, location, description, website, contact. Reviewed. | 200 |
| 5 | **BusinessFinder.co.ke** | [businessfinder.co.ke](https://businessfinder.co.ke/) → List Your Business | Free | Account, business info, location, contacts, services, social links. Reviewed. | 200 |
| 6 | **Bizregistry.co.ke** | [bizregistry.co.ke/list-your-business](https://www.bizregistry.co.ke/list-your-business) | Free | Wizard: business type, county, details, owner account. | 200 |
| 7 | **SideProjectors** | [sideprojectors.com/submit/type](https://www.sideprojectors.com/submit/type) → showcase (not "for sale") | Free | Account, project name, description, category, images. Moderated. | 200 |
| 8 | **Show HN** | [news.ycombinator.com/submit](https://news.ycombinator.com/submit) — title must start `Show HN`; [rules](https://news.ycombinator.com/showhn.html) | Free | Something you built that can be tried **immediately**, no signup wall, and you must be around to answer questions. One shot — post it when the site is fast and warm. | 200 |
| 9 | **Crunchbase** company profile | [crunchbase.com/add-new](https://www.crunchbase.com/add-new) | Free | Google/LinkedIn-authenticated account, company facts. Search for a duplicate first. | homepage 200 |
| 10 | **Trustpilot** business profile | [signup.business.trustpilot.com](https://signup.business.trustpilot.com/create-account) | Free tier | Active website; domain verification if the signup email isn't on that domain. | 200 |
| 11 | **Fimbo** (Kenya) | [fimbo.co.ke/list-your-business](https://www.fimbo.co.ke/list-your-business) | Free standard profile | Account, services, photos, rates, service area. Only if you can present it as a genuine service business. | 200 |
| 12 | **B2BMAP** (Kenya) | [b2bmap.com/kenya](https://b2bmap.com/kenya) | Free | Business profile. Built for suppliers/wholesalers, so it fits business documents better than CVs — low priority. | 200 |
| 13 | **East Africa Tenders** | [eastafricatenders.com/kenya-businesses](https://eastafricatenders.com/kenya-businesses/) | Free | Account (email or phone), business profile. | 200 |
| 14 | **Kenyan Directory** | [kenyandirectory.com](https://www.kenyandirectory.com/) → Add Listing | Free tier | Account + listing; confirm the free tier in the flow before filling it in. | 200 |
| 15 | **Capterra** | [capterra.com/vendors](https://www.capterra.com/vendors/) → Get Your Product Listed | Free profile | Genuine, actively marketed software whose details match your own site. Intake routes through G2's system; free profiles were observed **without** an outbound website link, so value is limited. | homepage 200 |

### Tier 2 — after the custom domain exists

Do these the week `SITE_URL` points at your own domain. Submitting before then
wastes the attempt — most of these are reviewed once.

| Target | Submit at | Why it waits |
|---|---|---|
| **SaaSHub** | [saashub.com/services/submit](https://www.saashub.com/services/submit) | Its product rules **explicitly reject products on free subdomains**. Free listing, reviewed, English only. |
| **BetaList** | [betalist.com/submissions/new](https://betalist.com/submissions/new) | Paid submissions only, and it **requires its own domain** (it names Vercel/Netlify/Heroku as rejections). |
| **G2** | [g2.com/products/new](https://www.g2.com/products/new) | B2B only, and the vendor must be a legally registered business with a **unique web domain**. |

### Deliberately not on the list

- **Google Business Profile** — [eligibility rules](https://support.google.com/business/answer/13763036)
  require in-person contact with customers. An online-only service does not
  qualify, and using a fake or virtual address risks suspension.
- **AlternativeTo** — its FAQ lists document generators and single-country
  services as rejection reasons. You match both.
- **Link directories, comment drops, forum signatures, "500 backlinks for $5"** —
  link schemes. Manual-action territory.
- **Anything requiring you to write a review of another product in exchange for
  a link** — that is a link scheme regardless of how it's framed.

---

## Anchor text

Brand first. The point is teaching Google that "KDocs Pro" names this site, so
the brand should dominate — a wall of `best cv maker kenya` anchors looks
manipulated and does nothing useful when most links are nofollow anyway.

| Anchor | Share | Where |
|---|---|---|
| `KDocs Pro` | ~60% | Most listings, profiles, directories |
| `kdocs-pro.onrender.com` (naked) | ~15% | Show HN body, GitHub, bios |
| `Kenyan document generator` / `CV and letter generator for Kenya` | ~20% | Descriptions where a sentence about the product reads better |
| Anything else | ~5% | Outreach replies, mentions written by other people |

Never repeat one exact-match commercial phrase across many submissions.

---

## The links that actually count

Directory links are corroboration. The links that move rankings are editorial:
someone with their own audience choosing to link to you. Two openers worth
sending, both true today with no invented numbers:

**A. Kenyan career/education blogs and job boards.** Angle: a free tool their
readers can use right now, plus free PDF tools with no upload.

> Hi — I run KDocs Pro (kdocs-pro.onrender.com), a free-to-try tool that turns a
> short form into a CV, cover letter or official letter for Kenya, with a free
> watermarked preview and a clean PDF from KSh 20 via M-Pesa.
>
> If it's useful for your [job-seeker / student] audience, you're welcome to link
> to it. Two things that might be genuinely handy as resources rather than
> promotion: Ready Score (a free checklist of what's missing from a CV) and the
> free PDF tools that merge/split files without uploading anything.
>
> Happy to answer anything about how it works.

**B. University and college career-services pages.** They maintain "resources"
link lists for students. Angle: free preview means no cost to a student who
abandons a document, and the free scan/PDF tools have no paywall at all. Send
from `kdocspro@gmail.com`, name the specific page you're suggesting a link on,
and don't send the same text to twenty institutions.

Rule for both: personal, specific, no follow-up more than once.

---

## Track it

[backlink-tracker.csv](backlink-tracker.csv) has the columns and the Tier 1 rows
pre-filled with `not started`. Update `status` as you go so you never submit the
same listing twice (duplicate submissions get rejected and burn goodwill).

```csv
target,url,type,status,submitted_on,live_url,notes
```

---

## How the URLs were verified

Requested with `curl -sL -m 20` on 2026-11-10, following redirects:

```
200  indiehackers.com/products         200  sideprojectors.com/submit/type
200  news.ycombinator.com/showhn.html  200  news.ycombinator.com/submit
200  betalist.com/criteria             200  saashub.com/services/submit
200  signup.business.trustpilot.com    200  business.google.com/add
200  github.com/new                    200  afropitch.com/directory/
200  businessfinder.co.ke/             200  bizregistry.co.ke/list-your-business
200  fimbo.co.ke/list-your-business    200  eastafricatenders.com/kenya-businesses/
200  b2bmap.com/kenya                  200  kenyandirectory.com/
200  crunchbase.com/                   200  capterra.com/  200 alternativeto.net/
403  producthunt.com  crunchbase.com/add-new  g2.com  capterra.com/vendors
```

The `403`s are Cloudflare bot protection, not dead links: Product Hunt's launch
guide resolved `301 → help.producthunt.com/(200)`, and Crunchbase/Capterra/
AlternativeTo homepages returned 200 with a browser user-agent. Re-run the check
before submitting if this file is more than a few months old.

**What this kit cannot do:** it cannot place the links, and it cannot promise
they get indexed. Ranking for `kdocs pro` needs these mentions to exist *and*
Google to recrawl — Search Console data lags 2–3 days, and a brand-new domain
typically takes weeks. The custom domain remains the bigger lever.
