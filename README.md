# KDocs-Pro

A document generator for the Kenyan market: CVs, cover letters, resignation
letters, and school/college/university letters (admission, leave permission,
bursary requests) — 3 templates each, covering before/during/after a job, plus
education documents. Free watermarked preview; KSh 20 via M-Pesa (Daraja) to
unlock the clean PDF.

**Honest note on the "anti-screenshot" request:** no website can truly stop
someone from screenshotting their own screen — that control belongs to the
phone/computer, not the browser. What this app does instead (and what
actually works) is simple: it never sends the clean, finished PDF to the
browser until your Daraja callback confirms the KSh 20 was paid. Before that,
the person only ever sees a blurred, watermarked preview. That's the real
protection. On top of that, it adds small speed bumps (right-click disabled,
Ctrl+P/S blocked, preview blurs if they switch tabs) — nice to have, not
bulletproof, and I want you to know that going in rather than oversell it.

---

## Explain-it-like-I'm-8 guide to going live

### Step 1: Put your project on GitHub (like a shelf everyone can see)
1. Go to github.com and make a free account if you don't have one.
2. Click the green "New" button to make a new repository. Call it `kdocs-pro`.
3. On your own computer, open a terminal inside this folder and type:
   ```
   git init
   git add .
   git commit -m "first version of KDocs-Pro"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/kdocs-pro.git
   git push -u origin main
   ```
4. Refresh the GitHub page — your files should now be there. That's it, your
   code now lives on GitHub's shelf.

### Step 2: Get your M-Pesa keys from Daraja (the payment "key")
1. Go to https://developer.safaricom.co.ke and make a free account.
2. Click "Create App" — this gives you a **Consumer Key** and **Consumer
   Secret**. Copy them somewhere safe.
3. For testing, Safaricom gives everyone a free practice till number
   (174379) and a practice passkey — you'll find both on the "Lipa na
   M-Pesa Sandbox" page in your Daraja account.
4. When you're ready for real payments, you apply for a real Till/Paybill
   number from Safaricom and swap the sandbox numbers for your real ones.

### Step 3: Put the app "online" using Render (like turning on a light switch)
1. Go to render.com and sign up (you can sign up using your GitHub account —
   easiest option).
2. Click "New" → "Web Service".
3. Pick the `kdocs-pro` repository you pushed in Step 1.
4. Render will ask a few questions — answer like this:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
5. Scroll to "Environment Variables" and add every line from the
   `.env.example` file in this project, filled in with your real Daraja
   details from Step 2. For `DARAJA_CALLBACK_URL`, use the web address
   Render gives your app (something like
   `https://kdocs-pro.onrender.com/api/daraja/callback`) — you may need to
   deploy once first to see that address, then paste it in and redeploy.
6. Click "Create Web Service". Render will build your app and after a
   minute or two, give you a live link like `https://kdocs-pro.onrender.com`.
7. Open that link in your browser — your app is now live for anyone in the
   world to use!

### Step 4: Test it before telling real customers
1. Open your live link.
2. Go through the flow: pick a stage → document → template → fill the form
   → preview → pay.
3. Use Safaricom's **sandbox test phone number** (found on the Daraja
   website) so you don't spend real money while testing.
4. Once it works end-to-end, swap in your real Till number and go live for
   real customers.

---

## Running it on your own computer first (recommended before Step 1)
```
npm install
cp .env.example .env      # then fill in your real values
npm start
```
Open http://localhost:10000 in your browser.

## Project map
- `server.js` — the main app, wires everything together
- `routes/daraja.js` — talks to M-Pesa (start payment, receive confirmation)
- `utils/pdfGenerator.js` — builds the actual PDF (preview vs. clean copy)
- `utils/templates.js` — the list of document types, stages, and 3 templates
- `public/` — everything the user sees (HTML/CSS/JS), white background,
  blue buttons, with a dark-mode toggle in the top-right corner

### Step 5 (optional): Also accept cards / bank transfer via IntaSend
Note: we use IntaSend instead of Flutterwave because Flutterwave currently
only approves live accounts for large businesses ($5M+/year) in Kenya -
IntaSend is built for small businesses and individuals.
1. Sign up at intasend.com (or sandbox.intasend.com to explore first).
2. Switch to Test mode in your dashboard, then go to Settings → API Keys and
   copy your Publishable Key and Secret Key (both start with `ISPubKey_test_`
   / `ISSecretKey_test_` in test mode).
3. In Render's Environment tab, add:
   - `INTASEND_PUBLIC_KEY` — your publishable key
   - `INTASEND_SECRET_KEY` — your secret key
   - `INTASEND_ENV` — `sandbox` for testing, `production` once live
   - `INTASEND_REDIRECT_URL` — your live app URL, e.g. `https://kdocs-pro.onrender.com/`
4. Test with IntaSend's sandbox test cards (find the current list under
   Documentation → Test Cards in your dashboard) before going live.
5. When ready for real payments, switch your dashboard to Live mode, add
   your Kenyan bank account under Settings → Payment Preferences /
   Settlements, generate Live API keys, and swap them into Render along with
   `INTASEND_ENV=production`.
6. Customers will now see a second "Pay with Card / Bank / Other" button next
   to the M-Pesa option.

### Step 6 (optional): Enable user accounts (Google + email + guest mode)
Guest mode works with zero setup — nobody is forced to log in. Accounts are
an optional extra layer on top.

**Database (required for accounts to work at all):**
1. Sign up free at https://cloud.mongodb.com (MongoDB Atlas).
2. Create a free "M0" cluster.
3. Under Database Access, create a database user with a password.
4. Under Network Access, add `0.0.0.0/0` (allow access from anywhere) so Render can reach it.
5. Click "Connect" → "Drivers" → copy the connection string, and replace
   `<password>` in it with your real database user's password.
6. In Render's Environment tab, add `MONGODB_URI` with that connection string.
7. Also add `JWT_SECRET` — any long random string (used to sign login sessions).

**Google sign-in (optional on top of the database):**
1. Go to https://console.cloud.google.com → create a project (any name).
2. APIs & Services → Credentials → "Create Credentials" → OAuth Client ID → type "Web application".
3. Under "Authorized JavaScript origins", add your live Render URL (e.g. `https://kdocs-pro.onrender.com`).
4. Copy the generated Client ID.
5. In Render's Environment tab, add `GOOGLE_CLIENT_ID` with that value.
6. If you skip this, email sign-up/sign-in still works fine — the Google
   button simply won't appear.
