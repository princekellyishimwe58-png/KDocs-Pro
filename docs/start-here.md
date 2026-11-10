# Start here — how to make Google show "KDocs Pro"

This is the slow version. Every step tells you what to click, what you should
see, and what to do if it doesn't work. Do them in order. You can stop after any
step and come back later — nothing breaks if you take a week off.

**Time needed:** about 2 hours total, spread over a few days (some waiting is
unavoidable — that waiting is Google and the internet, not you).

---

## First, the words this guide uses

Read these once. They make the rest easy.

| Word | What it really means |
|---|---|
| **Domain** | Your own address, like `kdocspro.co.ke`. Right now your address is `kdocs-pro.onrender.com`, which belongs to the hosting company, not to you. |
| **Hosting** | The computer that runs your website and keeps it awake. Yours is called Render. You already have it — **do not buy hosting**. |
| **DNS** | The internet's phone book. It turns a name (`kdocspro.co.ke`) into the computer that answers it. You edit it in two places, and that's the fiddly bit. |
| **Property** | Google Search Console's word for "a website I'm tracking". |
| **Sitemap** | A list of all your pages that you hand to Google. Yours already has 28. |
| **Indexing** | Google saving a page in its library. A page that isn't indexed can never appear in a search. |
| **Canonical** | A hidden label on each page saying "this is my real address". It's how Google knows which address to show. |

---

# Part A — What I already did (you don't repeat this)

Tick these off as done. If you're unsure, they're all true right now:

- [x] Your website is built and live on the internet.
- [x] Google knows about your homepage. It is in Google's library ("indexed").
- [x] All 28 pages are listed in a sitemap and given to Google.
- [x] Every page tells Google its real name is **KDocs Pro** (with the space), plus the spellings `KDocs-Pro` and `kdocspro`.
- [x] There is an "About KDocs Pro" page explaining what the site is.
- [x] Your website can be moved to a new address by changing **one setting** instead of editing 40 places. I built that.
- [x] A tool exists to check whether the move worked: `npm run golive:check`.
- [x] A list of places that will mention your site exists: `docs/backlink-kit.md`.

What is **not** done, and only you can do, is below.

---

# Part B — Get your own address (the most important part)

## Step 1. Understand why this matters (30 seconds)

Right now your address is `kdocs-pro.onrender.com`. That address belongs to a
company that lets anyone put a free website on it. Google trusts those addresses
less, and people can't remember them.

When you have `kdocspro.co.ke`, Google treats you like a real business. Three
places that will list you **refuse free addresses** — they only accept real
domains. So this one step unlocks several others.

**Cost:** about KSh 1,200–1,500 for a year, and you renew it every year.

## Step 2. Pick your name (5 minutes)

Good news: **`kdocspro.co.ke` is the name this guide assumes.** It matches your
site's name, so people who hear "KDocs Pro" will guess it.

You do not need to change anything if you use a different name — just remember
to type *your* name wherever this guide says `kdocspro.co.ke`.

## Step 3. Buy the name (20 minutes)

`co.ke` names are sold by companies approved by KeNIC (the .ke name authority).
Pick one of these — all are approved:

| Shop | Where | Notes |
|---|---|---|
| Safaricom | <https://domains.safaricom.co.ke/> | KSh ~1,160 to buy **and** ~1,160 to renew each year. Clear prices. |
| HostAfrica | <https://www.hostafrica.ke/domains/> | Cheap first year, **renewal is higher (~KSh 2,350)**. Read the renewal price before paying. |
| Truehost | <https://truehost.co.ke/domains/> | Cheap first year (~KSh 299), renewal ~KSh 1,500. |

**Do this:**

1. Open one of the shops above.
2. In the search box, type `kdocspro` and choose `.co.ke`.
3. Press search.
4. **You should see:** either "available" or "taken".
   - Available → click **Add to cart**.
   - Taken → try `kdocspro.ke`, or `kdocspro.co.ke` with your town (`kdocspro-nairobi.co.ke`). Avoid long names.
5. Go to checkout. **Remove hosting if it was added** — you already have hosting.
6. Make an account. Use an email you check often.
7. Pay with M-Pesa.

> **Watch the renewal price, not just the first-year price.** A KSh 199 first
> year that renews at KSh 2,350 is not cheap. Check both before paying.

**You should see:** a receipt and the domain in your account.

**If it doesn't work:** the payment SMS can take a minute. Refresh the page. If
you're still stuck, the shop's support chat is used to this question — say
"I paid but my domain is not in my account".

**When it's done:** the name becomes active in about 10–30 minutes.

## Step 4. Add the name to Render (5 minutes)

1. Go to <https://dashboard.render.com> and sign in.
2. Click the service that runs KDocs Pro.
3. Click **Settings**.
4. Scroll down to **Custom Domains**.
5. Click **+ Add Custom Domain**.
6. Type `kdocspro.co.ke` — **no `https://`, no `www`, no slash at the end**.
7. Click **Save**.

**You should see:** your domain in a list, with a warning saying DNS is not set
up yet. That warning is normal — it's what step 5 fixes.

**Write down** what Render shows you next to your domain. It will be either:

- a **CNAME** record pointing to something like `kdocs-pro.onrender.com`, or
- an **A** record with a number like `216.24.57.18`.

You'll type that into your domain shop in the next step.

## Step 5. Point the name at Render (15 minutes, the fiddly step)

You're telling the internet's phone book: "when someone types kdocspro.co.ke,
send them to Render".

1. Log in to the **same shop where you bought the domain**.
2. Find **DNS** or **DNS Management** or **Manage DNS** for your domain.
3. Add what Render told you to add:
   - If Render said **CNAME** → add a record of type `CNAME`, name/host `@` (or leave it blank), value = the address Render gave you.
   - If Render said **A** → add a record of type `A`, name/host `@`, value = the number Render gave you.
4. If there is already an `A` record or a "parked page" record there, **delete it first**. Two answers to the same question confuses everything.
5. Also delete any **AAAA** record. Render's own instructions say to. AAAA is the IPv6 version of the same answer, and it breaks things here.
6. Save.

**You should see:** your new record listed, with a type, a name and a value.

**If it doesn't work:** this is the step where people get stuck, and it is never
your fault — every shop's screen looks different. Three things to check:

- You edited DNS **at the shop where you bought the domain**, not at Render.
- The record name is `@`, not `www`, if you're adding the main address.
- You didn't leave an old `A` record in place. That's the most common mistake.

## Step 6. Wait, then verify in Render (5–30 minutes of waiting)

1. Go back to Render → your service → **Settings** → **Custom Domains**.
2. Click **Verify** next to your domain.
3. **If it fails, wait 10 minutes and click it again.** DNS takes time to travel.

**You should see:** "Verified", and a certificate. Render makes the padlock
(HTTPS) for you, free.

Then open <https://kdocspro.co.ke> in your browser. **You should see your
website.** If you see "502 Bad Gateway", wait 5 minutes and reload — Render is
still connecting things.

> ### ⚠️ One thing you must NOT do
>
> In that same Custom Domains box there is a switch called **Render Subdomain**
> with an option to disable it. **Leave it ON.**
>
> If you turn it off, the old `kdocs-pro.onrender.com` address stops answering
> for everyone, and it stops forwarding visitors to your new name. Google would
> lose the trail between the old address it already knows and your new one. The
> code I wrote forwards old visitors only if the old door still opens.

## Step 7. Tell your website its new name (3 minutes)

Your website still thinks it lives at the old address, so it's printing the old
address on every page. Fix it with one setting.

1. Render → your service → **Environment**.
2. Click **+ Add Environment Variable**.
3. Name: `SITE_URL`
4. Value: `https://kdocspro.co.ke` — **with `https://` and no slash at the end**.
5. Save. Render will redeploy by itself. Wait about a minute.

**What this does, in plain words:** every page now prints the new address as its
real address, the sitemap lists the new address, and anyone who visits the old
address is forwarded to the new one automatically.

## Step 8. Check it worked (2 minutes, one command)

In the project folder, run:

```
npm run golive:check -- kdocspro.co.ke
```

(Use your own domain if you picked a different name.)

**You should see** a list like this, all `PASS`:

```
  PASS  DNS resolves
  PASS  Homepage loads over HTTPS
  PASS  Canonical matches this domain
  PASS  Sitemap loads                     HTTP 200, 28 URLs
  PASS  Every sitemap URL uses this domain 28/28
  PASS  robots.txt advertises this sitemap
  PASS  Document page renders
  PASS  API responds on this domain
  PASS  Old address redirects to the new domain   301 -> https://kdocspro.co.ke/doc/cv
```

**If you see `FAIL`**, the line tells you which step to redo — but the fastest
path is: `FAIL DNS` → redo step 5. `FAIL Old address redirects` → redo step 7
and check the subdomain switch from step 6 is still ON.

**Do not move on until this is all PASS.** The next part depends on it.

---

# Part C — Tell Google about the new address

## Step 9. Add your new address to Google (10 minutes)

1. Go to <https://search.google.com/search-console> and sign in with the same
   Google account you used before.
2. Click the property selector at the top left → **+ Add property**.
3. Choose **Domain** (the left-hand box — not "URL prefix"). It covers every
   version of your site at once, which is why it's the right one.
4. Type `kdocspro.co.ke` → **Continue**.
5. Google shows you a **TXT record** — a long line of letters and numbers.
6. Go back to your domain shop's DNS page (where you were in step 5).
7. Add a record: type `TXT`, name `@`, value = the long line from Google. Save.
8. Return to Google and click **Verify**.

**You should see:** "Ownership verified".

**If it fails:** wait 10 minutes and click Verify again. DNS is slow. This is
normal and does not mean you did it wrong.

> Keep the **old** property in the list too. Don't delete it. It will slowly show
> you the old address forwarding to the new one, which is useful.

## Step 10. Give Google your sitemap (2 minutes)

1. In Search Console, click your **new** property.
2. Left menu → **Indexing** → **Sitemaps**.
3. In "Add a new sitemap", type: `sitemap.xml`
4. Click **Submit**.

**You should see:** your sitemap in the list with the status "Success".

## Step 11. Ask Google to look at your homepage now (2 minutes)

This is the closest thing to a "do it now" button Google offers.

1. Still in Search Console, look at the search box at the very top
   (it says "Inspect any URL in kdocspro.co.ke").
2. Type `https://kdocspro.co.ke/` and press Enter.
3. Wait for the result.
4. Click **Request Indexing**.

**You should see:** "Indexing requested". It can take a few days.

You can repeat step 11 for your most important pages:
`https://kdocspro.co.ke/doc/cv`, `https://kdocspro.co.ke/doc/cover_letter`,
`https://kdocspro.co.ke/about.html`.

> Google limits how many requests you can make per day, so do a handful, not all
> 28.

---

# Part D — Get your name mentioned (free, and this is what actually wins)

Google decides you're a real thing partly by seeing your name on **other**
websites. Right now, zero websites mention you. Here are three easy ones.

## Step 12. GitHub (15 minutes)

If you already have a GitHub account, you're most of the way there.

1. Go to <https://github.com/new>.
2. Repository name: **exactly your GitHub username** (e.g. if your username is
   `prince-bot-tech`, the name is `prince-bot-tech`).
3. Choose **Public**. Tick "Add a README file". Click **Create repository**.
4. Click the pencil icon to edit the README.
5. Paste something like:

```
### KDocs Pro

Kenyan document generator — CVs, cover letters, resignation letters, school
letters and invoices from a short form. Free watermarked preview, clean PDF from
KSh 20 via M-Pesa.

https://kdocspro.co.ke
```

6. Scroll down, click **Commit changes**.

## Step 13. Product Hunt (20 minutes)

1. Go to <https://www.producthunt.com> and create an account.
2. **Wait a week.** Product Hunt wants accounts to be at least 7 days old before
   they let you submit. Make the account today, submit next week.
3. Next week: click **Submit** → **New Product**.
4. Paste your website address and copy the fields from
   `docs/backlink-kit.md` (they're already the right length — copy and paste,
   don't retype).

## Step 14. One Kenyan directory (15 minutes)

Pick one. Don't do all of them today.

- **AfroPitch** — <https://afropitch.com/directory/> → "Submit a Free Listing"
- **BusinessFinder.co.ke** — <https://businessfinder.co.ke/> → "List Your Business"
- **Bizregistry.co.ke** — <https://www.bizregistry.co.ke/list-your-business>

Fill in your name, what you do, your new address, and your email. Copy the
descriptions from `docs/backlink-kit.md`.

Then write a tick in `docs/backlink-tracker.csv` so you never submit the same
place twice.

---

# Part E — Wait, and check now and then

## Step 15. Check once a week (5 minutes)

Do this every Monday. It's the whole maintenance routine.

1. **Search Console → Performance.** This shows how many times you appeared in
   Google. It's empty right now. Empty is normal for the first few weeks.
2. **Search Console → Pages** (or "Indexing → Pages"). This shows how many pages
   Google has saved. You want this number going up.
3. **Google yourself.** Open a private/incognito window (so your own history
   doesn't skew it) and type `kdocs pro`. Then type `site:kdocspro.co.ke` — that
   second one shows every page Google has, and it should be non-zero.

---

## How long will this take?

Google is not instant. Here's what to honestly expect:

| When | What you should see |
|---|---|
| Same day | Your site loads at the new address. The checker says PASS. |
| 2–4 days | Google crawls the new address. Search Console starts showing it. |
| 1–3 weeks | Typing `site:kdocspro.co.ke` shows several pages. Impressions appear. |
| 2–8 weeks | Typing `kdocs pro` starts finding you — faster if other sites link to you. |

**Why so slow?** Because "kdocs" is already a famous name (Kingsoft's kdocs.cn is
huge). You're not competing for a word nobody uses — you're teaching Google that
a new, small site with that name exists. That takes a little time and at least a
few mentions elsewhere.

---

## The five things that will actually speed this up

In order of how much they help:

1. **The domain (Part B).** Biggest by far.
2. **Mentions on other websites (Part D).** Three or four is enough to start.
3. **One real link from a Kenyan site.** A career blog, a college careers page,
   a job board. Emails to ask are written for you in `docs/backlink-kit.md`.
4. **Not letting your site fall asleep.** The free hosting plan naps after about
   15 minutes of no visitors, and takes up to a minute to wake. Google doesn't
   like waiting. Upgrading Render to the paid plan (about $7/month) fixes this,
   or a free uptime-monitor service pinging your site every 10 minutes.
5. **Patience.** Truly.

---

## Things NOT to do (these can get you banned)

- **Don't buy backlinks.** "500 links for $5" is how websites get punished. Google's rules forbid it.
- **Don't pay someone to write a review of your site in exchange for a link.**
- **Don't post your link in comment sections** on blogs and forums. Google ignores those and may count it against you.
- **Don't create a Google Business Profile** with a fake address. Online-only services aren't eligible, and a fake location gets the profile suspended.
- **Don't disable the Render subdomain** (step 6 warning).
- **Don't change `SITE_URL` to a name you don't own yet.** The site would point Google at an address that isn't yours.

---

## If you get stuck

| What you see | What it means | What to do |
|---|---|---|
| Render says "DNS not configured" | The name doesn't point at Render yet | Redo step 5, then wait 10 min and click Verify |
| Browser shows "not secure" | The padlock isn't made yet | Wait 10 min after Render says Verified |
| `502 Bad Gateway` | Render is still connecting | Wait 5 minutes, reload |
| Old address gives **404** | The Render subdomain got disabled | Turn it back ON in Render → Settings → Custom Domains |
| Checker says `FAIL Old address redirects` | `SITE_URL` isn't set, or is wrong | Redo step 7. Value must be `https://yourdomain` — no slash at the end |
| Search Console won't verify | DNS hasn't travelled yet | Wait 10–30 minutes, click Verify again |
| Search Console shows 0 pages after 2 weeks | Google hasn't recrawled | Redo step 11 on a few pages, and get one real link |
| Everything looks fine but no Google results | Normal | Keep step 15 going weekly for a month before worrying |

If a step still fails after trying twice, stop and send me the exact words on
the screen. Guessing makes it worse.
