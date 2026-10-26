# Cloudflare Pages + DNS plan for sportbuilds.co

Nothing in this file has been done. The build agent had no Cloudflare access and was told not to change DNS or registrar settings.

## Verdict on the plan

The plan (move nameservers to Cloudflare, Cloudflare Email Routing for hello@, `5k` CNAME to Vercel set to DNS only) is sound, and Cloudflare requires the nameserver move for a Pages apex domain. The order matters, and there are a few extra things to check.

## Ordered steps (Tim)

**A. Before touching anything**
1. At Namecheap, open Domain List > sportbuilds.co > Advanced DNS. Write down or screenshot **every** record (host, type, value, TTL) and what "Email forwarding" currently says (which hello@ goes where). Note whether the nameservers are "Namecheap BasicDNS" and whether DNSSEC is switched on (if it is, turn it off before changing nameservers).
2. Note the Vercel record for `5k`: `CNAME`, host `5k`, value `cfa33e65f3fa4637.vercel-dns-017.com.` (Vercel project: saturday-5k-pace-planner).

**B. Get the site on Cloudflare Pages first (no domain yet)**

3. Create a free Cloudflare account (or use his existing one). Workers & Pages > Create > Pages > Connect to Git > authorise GitHub for `norris1976/sportbuilds-site`. Settings: Framework preset **None**, Build command **`npm run build`**, Output directory **`dist`**, production branch `main`. Deploy. Check `https://<project>.pages.dev` loads.
   (Alternative if Tim prefers not to connect GitHub: create an API token with *Account > Cloudflare Pages > Edit* for that one account, and give it to the build agent through the vault. A git-connected project cannot later be switched to direct upload.)

**C. Add the zone and recreate DNS BEFORE changing nameservers**

4. Cloudflare dashboard > Add a domain > `sportbuilds.co` > Free plan. Cloudflare scans and imports existing records.
5. Compare the imported list line by line with step 1 and fix gaps. It must contain:
   - `CNAME  5k  ->  cfa33e65f3fa4637.vercel-dns-017.com.`  with proxy status **DNS only (grey cloud)**. Vercel must see the real DNS target to issue and renew the TLS certificate for 5k.sportbuilds.co. A proxied (orange) record usually breaks Vercel's domain verification.
   - Any email records (see D) and any TXT records (e.g. SPF, DKIM, Kit sender verification, domain verification).
   - Remove Namecheap parking records for the apex and `www` (for example a URL-redirect or parking A/CNAME). They would clash with Pages.
6. Cloudflare shows two nameservers (names like `xxx.ns.cloudflare.com`). Keep that page open.

**D. Email (hello@): keep mail flowing during the switch**

7. If hello@ currently uses **Namecheap Email Forwarding**, its `MX` records (`eforward*.registrar-servers.com`) and SPF TXT record are DNS records. Make sure the imported copies exist in Cloudflare so forwarding keeps working through the nameserver change. If Namecheap Private Email or another mailbox provider is used instead, the records differ: copy them exactly and ask before replacing.
8. After the zone shows **Active**, switch to Cloudflare Email Routing: Email Routing > add destination address (Tim's real inbox) > click the verification email > create the custom address `hello` (and any others) > accept Cloudflare's offer to add its MX and SPF records and to **delete the old eforward MX records**. Email Routing cannot coexist with other MX records on the same domain.
9. If the domain already had an SPF record, merge rather than adding a second one (only one `v=spf1` TXT is allowed). If Kit will send from `@sportbuilds.co`, add Kit's own sender-authentication records exactly as Kit shows them, and merge any SPF `include:` Kit asks for.
10. Test: send a message to hello@ from a different account, confirm it arrives, and check spam.

**E. Switch the nameservers**

11. At Namecheap > Domain > Nameservers: change from "Namecheap BasicDNS" to **Custom DNS** and enter the two Cloudflare nameservers from step 6. Save. Namecheap's own Advanced DNS records stop being used from here on, which is why C and D come first.
12. In Cloudflare click "Check nameservers". Activation is usually minutes, sometimes hours. Do not delete anything at Namecheap until the zone is Active.

**F. Attach the domain to Pages**

13. Pages project > Custom domains > Set up a domain > `sportbuilds.co` (apex). Cloudflare creates the proxied CNAME for the apex itself. Wait for "Active".
14. www redirect: Pages cannot serve www and redirect it by itself. Add DNS record `A  www  192.0.2.1` (or `AAAA www 100::`), **Proxied (orange)**, then Rules > Redirect Rules > Single redirect: if hostname equals `www.sportbuilds.co` then redirect, dynamic or wildcard, to `https://sportbuilds.co/${1}` (wildcard pattern `https://www.sportbuilds.co/*` to `https://sportbuilds.co/${1}`), status 301, preserve query string. (Cloudflare's own docs describe the same with Bulk Redirects.) Do **not** add www as a second Pages custom domain if you only want the redirect.
15. SSL/TLS: leave on Full or Full (strict); turn on Always Use HTTPS. HSTS only once everything works.

**G. Verify**

16. `https://sportbuilds.co/`, `/archive/`, `/about/`, `/privacy/`, `/welcome/` load; `https://www.sportbuilds.co/about/` redirects 301 to `https://sportbuilds.co/about/`; `http://` redirects to https.
17. `https://5k.sportbuilds.co` loads the planner with a valid certificate (check Vercel's Domains page shows it valid). If Vercel shows "Invalid configuration", confirm the CNAME is grey cloud and the value matches exactly.
18. Email: send to hello@ again. Check DNS with `dig MX sportbuilds.co`, `dig TXT sportbuilds.co`.
19. In Kit set the confirmation redirect to `https://sportbuilds.co/welcome/` and put the Kit form ID in `site.config.mjs`.

## Risks and notes

- **Email gap.** The main risk. The window is between the nameserver switch and Email Routing taking over; step 7 keeps the old forwarders in DNS to avoid it, but if records are missed, hello@ mail can bounce or be dropped for hours. Do it at a quiet time and have a second way to receive mail for a day. Also remember to keep the previous destination mailbox live.
- **DNS propagation / TTL.** Lowering TTLs at Namecheap to 5 minutes a day beforehand makes the switch and any rollback quicker. Rollback = set Namecheap back to BasicDNS (records are still there until you delete them).
- **Vercel certificate on 5k.** Must stay DNS only. If it was ever orange, Vercel certificate renewal can fail silently months later. Check after the move and after any Cloudflare "proxy all records" prompt.
- **Missed records** (SPF, DKIM, Kit domain verification, site verification TXT) silently break email deliverability. Compare the final Cloudflare list with the step-1 screenshot.
- **DNSSEC** if enabled at Namecheap will make the domain fail to resolve after the move unless disabled first.
- **Pages vs Workers.** Cloudflare is steering new projects towards Workers with static assets; Pages still works and the site is plain static files, so the build output can move later with no code change.
- **Vercel Hobby and the planner.** `5k.sportbuilds.co` (the planner) is still on Vercel Hobby, which is for non-commercial use. If sponsorship, ads or any monetisation appears on or around the planner (including a "sponsored by" line or sponsor links), it may need to move to Vercel Pro or to Cloudflare Pages, too. The planner is static, so moving it is easy (same CNAME approach, then repoint `5k` to its Pages project). Decide before the first sponsored issue. Cloudflare's own terms should also be checked for Tim's exact monetisation plans.
- **Privacy page.** It says the site sets no cookies and has no analytics. Keep that true: leave Cloudflare Web Analytics off, add no tracking scripts, and update the page before changing either.
- **Welcome page** is noindex and not in the sitemap, but it is a public URL; anyone can open it. It contains nothing private.
