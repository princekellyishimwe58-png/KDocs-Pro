# KDocs Pro — Go-Live Runbook

Exact order of operations for the first real sale, once IntaSend approves the
account for live transactions. Work top to bottom; do not skip the restart
check — it is what proves payments survive a server reboot.

All commands run from any terminal with `curl` (Windows: use Git Bash).

---

## 0. Gate: is IntaSend actually open for business?

Everything below is pointless until IntaSend has approved the account. Check:

```bash
curl -s https://kdocs-pro.onrender.com/api/intasend/diagnose
```

**Ready when:** one of the `hosts[]` entries shows `"verdict":"OK"` (a
checkout URL was created) AND `collectionProbe.verdict` is `"ACCEPTED"`.
**Still blocked if:** `collectionProbe` says `"Transactions are currently not
allowed for this account."` → do Appendix B (support email) and stop here.

Also confirm the app basics once: `curl -s https://kdocs-pro.onrender.com/api/health`
should show `"ok":true` and `"backend":"mongo"`.

---

## 1. First real sale (the whole flow, as a customer)

1. Open https://kdocs-pro.onrender.com in a normal browser.
2. Pick the **cheapest document** (KSh 20) and a template, fill the fields.
3. Enter the payer details:
   - **Email:** an inbox you control (receipts land there).
   - **M-Pesa phone:** ideally a *different* phone from the one receiving your
     IntaSend settlements — that tests the real payer path. Your own number
     also works (you'd be paying yourself 20 bob).
4. Click **Pay**. Expect: "Opening secure checkout…" → IntaSend's hosted page.
5. On the IntaSend page choose **M-Pesa**, confirm the phone, submit.
6. **The STK push ("message to send money") must arrive** on that phone in
   seconds. Enter your M-Pesa PIN.
7. IntaSend redirects you back to KDocs Pro → the page should show the
   success panel with the download ready.

> If the STK push never arrives but the checkout page opened, the payer's
> phone may have a full SIM toolkit or the number was mistyped — retry once
> with a different number before investigating.

## 2. Verify the payment server-side

The success panel already ran verification, but confirm independently:

```bash
# Replace with the ref shown in the URL after redirect (?ref=kdocs_...)
curl -s https://kdocs-pro.onrender.com/api/intasend/status/kdocs_PASTE_REF
```

Expect `{"status":"paid"}`. Also check the money exists:
IntaSend dashboard → **Collections** → the transaction with matching amount,
state **COMPLETED**, `api_ref` = the same ref.

## 3. Download the clean PDF

From the success panel, download the document. Confirm it is **watermark-free**
and the fields match what was typed. (Signed-in users: it should also appear
in the Document Locker.)

## 4. Restart persistence check (proves payment durability)

The payment must survive a reboot — this is the durability guarantee:

1. Render dashboard → your KDocs service → **Manual Restart**.
2. Wait ~60–90s for it to come back.
3. Re-run the status command from step 2 with the same ref:

```bash
curl -s https://kdocs-pro.onrender.com/api/intasend/status/kdocs_PASTE_REF
```

**Must still say `{"status":"paid"}`** (now served from MongoDB). Then download
the PDF once more — it must still open, watermark-free.

## 5. Money: settlement and fees

- IntaSend dashboard → **Withdraw / Settlement** → move the balance to M-Pesa
  or bank. First withdrawal may require settlement details to be approved.
- Fees: the account tariff (dashboard → Settings → check **mobile_tarrif**)
  decides who pays the charge. `BUSINESS-PAYS` (default) means fees come out
  of your settlement; a KSh 20 sale nets slightly less than 20.
- Reconcile: Collections total minus charges should match your balance.

## 6. Ongoing ops (weekly-ish)

- **Backup:** run `node tools/backup.js` (needs Node + `MONGODB_URI`) →
  writes `backups/<timestamp>/*.json`. Keep a copy somewhere off-machine.
- **Errors:** if a Sentry project was configured, check it; otherwise Render
  Logs → search `error`.
- **Payment complaints:** one curl of `/api/intasend/diagnose` names the
  problem (keys, account, or IntaSend outage).

---

## Appendix A — Webhook setup (recommended, 5 minutes)

Webhooks make payments confirm even when the customer never returns to the
site (closed the tab before the redirect). The handler re-verifies everything
against IntaSend's API, so it is safe by construction.

1. Invent a long random string (the "challenge"), e.g. in Git Bash:
   `openssl rand -hex 32`
2. IntaSend dashboard → **Webhooks** → set URL
   `https://kdocs-pro.onrender.com/api/intasend/webhook` and paste the
   challenge as the challenge.
3. Render → Environment → add
   `INTASEND_WEBHOOK_CHALLENGE` = the same challenge → Save (redeploys).
4. Test: `curl -s -X POST https://kdocs-pro.onrender.com/api/intasend/webhook
   -H "Content-Type: application/json" -d '{"challenge":"wrong"}'`
   → `{"received":true,"matched":false}` is correct (wrong challenge ignored).
5. Staging (if used): repeat with the staging URL and a different challenge.

## Appendix B — Support email (use while account is still blocked)

> **To:** support@intasend.com
> **Subject:** Live transactions blocked — "Transactions are currently not
> allowed for this account"
>
> Hello IntaSend team,
>
> I have live API keys (public key ending …42a9) and my account shows as live,
> but:
>
> - `POST https://payment.intasend.com/api/v1/checkout/` returns **HTTP 500
>   server_error** (same on `api.intasend.com`),
> - `POST https://api.intasend.com/api/v1/payment/collection/` returns
>   **HTTP 400: "Transactions are currently not allowed for this account."**
> - `POST /api/v1/payment/status/` with my secret key authenticates fine
>   (HTTP 200), so my credentials work.
>
> Please confirm my KYC/compliance status and enable live collections for my
> account. Production site: https://kdocs-pro.onrender.com
>
> Thank you.

## Appendix C — Quick troubleshooting

| Symptom | Check | Likely fix |
| --- | --- | --- |
| "Could not start the payment" (502) | `curl /api/intasend/diagnose` | Read the per-host verdict; if 500 + collection 400 → Appendix B |
| `paymentMode:"test"` in `/api/catalog` | Render env `INTASEND_ENV` | Set to `production`, Save, Manual Deploy |
| Key fingerprint changed unexpectedly | `/api/health` intasend block | Keys were rotated on Render — make sure BOTH keys come from the same dashboard generation |
| Paid but download says "not confirmed yet" | `/api/intasend/status/<ref>` | If `pending`: retry the download after ~1 min; check Render Logs for `IntaSend verify error` |
| Webhook silently ignored | wrong challenge / not configured | Set `INTASEND_WEBHOOK_CHALLENGE` to the dashboard challenge (Appendix A) |
