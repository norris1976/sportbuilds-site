# Build log: Sport Builds master site

Raw notes written as the build happened, failures included. Times are Europe/London (GMT, UTC+0) on Mon 26 Oct 2026.

## Stage 0: brief and environment check (11:39 to 11:40)
- **Start: 11:39.** Brief from the Editor (Tim chose a custom site on Cloudflare Pages instead of Kit's newsletter site, because he may add sponsorship and Vercel Hobby forbids commercial use). Instruction to the build agent, summarised: build home, archive (data-driven), `/welcome` (noindex), privacy placeholder, about, 404, favicon, OG tags, sitemap/robots; Kit form as a clearly marked placeholder, fail gracefully, no external calls; reuse the planner's look; no tracking; do not touch the live domain or any DNS; verify in headless Chrome; document Cloudflare and DNS steps.
- Checked the box for Cloudflare access: no `CLOUDFLARE_API_TOKEN`, no wrangler login or install, no `~/.wrangler`, no Cloudflare connector among the installed MCP tools. **Decision: build and verify locally; no preview deploy; list what Tim must grant.** Did not try to sign in through the browser, as instructed.
- GitHub: `gh` already logged in as `norris1976` (same as the planner). Node 20. Playwright-core and Chrome as used for the planner.
- Read the planner's `style.css` and `index.html`: palette `#0b3d2e / #14604a / #f4c430`, system font stack, green gradient hero, white cards with 16px radius, dark-mode variables. Reused all of it.

## Stage 1: architecture decision (11:40)
- Options: Astro, or plain HTML/CSS/JS. **Chose plain files plus a ~230-line zero-dependency Node generator (`build.mjs`).** Reasons: nothing to install (so Cloudflare builds can't break on a dependency), the data-driven archive needs only a loop, and it is easy for the Editor or Tim to read. Trade-off: no component system or Markdown; fine for six pages, and Astro would be the next step if the site grows a blog.
- Output is `dist/`; Cloudflare Pages settings are therefore Framework preset None, build command `npm run build`, output `dist`.
- `data/builds.json` is the single source for the archive, home "latest" and `/welcome`. `site.config.mjs` holds the Kit placeholder constants, contact placeholder and site URL.
- Strict CSP in `_headers`: `connect-src 'none'` so "no background network calls" is enforced by the browser, `form-action` allows only the site and Kit.

## Stage 2: Kit form research (11:41)
- Question: what should a placeholder wire into? Searched Kit's docs and examples. Kit's HTML embed is a plain form posting to `https://app.kit.com/forms/<ID>/subscriptions` with `email_address` and `fields[first_name]`. A native POST means no CORS or JavaScript dependency, so the form is a normal HTML form and the placeholder is the form ID in one constant.
- **I have not confirmed this endpoint against a real Kit account** (there isn't one yet, and I was told not to call Kit). It is what Kit's own embed snippets use, but the Editor should confirm against the real snippet when pasting the form ID, and check what the confirmation flow shows after submit.
- Unconfigured behaviour: the submit handler blocks the post and shows "Sign-up isn't connected yet, so nothing was sent". No success message exists anywhere in the code path. The form is also labelled with dashed "PLACEHOLDER" notes, so nobody mistakes it for live.

## Stage 3: first build (11:41 to 11:44)
- Wrote CSS (planner palette, mobile-first, 16px inputs so iOS doesn't zoom, 44px tap targets, skip link, `prefers-color-scheme` dark mode, reduced-motion), the generator, JS (~25 lines, no network), favicon SVG.
- Social image and touch icon are rendered with headless Chrome (`tools/make-images.mjs`) so they are reproducible, not hand-drawn.
- Copy: kept to what the brief gave. About says only "Tim Norris, former sports-tech developer who now builds with AI", with a marked placeholder for bio, photo and links. Nothing about any employer. Privacy only claims what is true of this codebase (no cookies, no analytics, no third-party loads, Kit handles emails).

## Stage 4: what broke and how it was fixed
1. **Social image came out as white text on white, serif font.** My inline `style="..."` contained `"Segoe UI"` with double quotes, which closed the attribute early and silently dropped the rest of the styling. Fixed by removing the quoted font name. I only caught it because I looked at the image (the generator reported success). Then also fixed a second slip: a `sed` replacement put single quotes inside a single-quoted JS string and the script failed to parse.
2. **Stale `dist/`.** First verify run reported `og.png` and `apple-touch-icon.png` as broken links (404). Cause: I regenerated the images after building, so `dist/` was out of date. The link check earned its keep; fixed by rebuilding. Lesson: build, then verify, always in that order.
3. **404 page failing my own checks.** A real 404 logs a console error ("Failed to load resource... 404") for the document itself, and the 404 page's description is shorter than my 40-character rule. Both were test-rule false positives; I special-cased the 404 page rather than weakening the checks for other pages.
4. **Layout:** inline "PLACEHOLDER" spans wrapped into ugly broken boxes in a paragraph on mobile. Made placeholders block elements and moved the contact line into its own paragraph.
5. **Lighthouse accessibility 95 to 96, not 100: footer link contrast.** Cause: my header nav rule was written as `nav a { opacity:.92 }` and also matched the footer's `nav`, which lowered the footer links' contrast to 4.4:1. Scoped the rule to `.site-header nav a`. That fixed contrast and took accessibility to 100 on every page.
6. **Footer tap targets** were about 36px high once the rule above stopped inflating them; my own 44px check failed. Set a 44px minimum.
7. **Welcome page:** cards sat left-aligned under a centred check mark; centred them.
8. Looked at screenshots under **new filenames each run** (v1 to v5), following the planner's lesson about the image viewer caching by path. The committed ones are `-v5`.

## Stage 5: verification (11:45 to 11:48)
- `npm test`: 8/8. Covers data validation, "add one entry updates archive and home (newest first) and welcome still shows issue 1", Kit unconfigured vs configured builds, noindex and sitemap rules, a guard that no forbidden brand or employer terms are in the repo, and no external resources or inline scripts in the built HTML.
- `tools/verify.mjs`: every page at 390px and 1280px, headless Chrome. Status codes, zero console errors or warnings, **zero external requests**, no horizontal overflow, one `h1`, `lang="en-GB"`, landmarks, labelled inputs, tap targets at least 44px, canonical and OG tags, noindex on `/welcome/` and `/404`, welcome absent from sitemap, all internal links and assets return 200. Passed.
- Form on a touch, mobile-emulated 390px viewport: first name `type=text autocomplete=given-name`, email `type=email autocomplete=email inputmode=email`, both required, 16px text. Typed by tap and keyboard events; submit while unconfigured shows the "not connected" message and sends **no POST**. Limitation: headless Chrome cannot show the real on-screen keyboard, so I verified the attributes that choose it, not the keyboard itself. Worth a 30-second check on a real phone after deploy.
- `tools/verify-configured.mjs`: builds a throwaway copy with a fake form ID `1234567`, fills the form and records the outgoing request while aborting it (Kit was **not** contacted): `POST https://app.kit.com/forms/1234567/subscriptions`, body `fields[first_name]=Tim&email_address=tim@example.com`.
- Lighthouse (local, headless Chrome): home, archive, about, privacy all **100 performance, 100 accessibility, 100 best practices, 100 SEO**. `/welcome/` scores 63 on SEO by design (noindex).
- Not verified: anything on Cloudflare itself (no access), the real Kit flow, real-phone keyboard, how the site behaves on `sportbuilds.co` (not deployed).

## Decisions and caveats
- **Canonical URLs point at `https://sportbuilds.co`**, which isn't live yet. Preview deploys will therefore carry canonical and OG URLs for the live domain; fine for a preview, and they become correct on launch.
- **Issue 1 links to `https://5k.sportbuilds.co`** as canonical, plus a small "Also available at saturday-5k-pace-planner.vercel.app" line because the DNS for `5k` may not be live yet. Remove `fallbackUrl` from the data entry once 5k works.
- Issue 1 date is 26 Oct 2026 (the day the planner was built). The Editor may want the date of publication instead; it is one field.
- "One email a week" on the form is the Editor's stated plan; change if cadence changes.
- Welcome says "reply to the newsletter email". That only works if Kit's reply-to address is set to a mailbox Tim reads. **Editor: check Kit's sender/reply-to setting.** No address is invented on the site.
- Free-plan Cloudflare vs monetisation terms: not checked in depth; Tim should read Cloudflare's terms for his specific plan.

## Timings
| Stage | Start | End |
|---|---|---|
| 0 Brief and environment check | 11:39 | 11:40 |
| 1 to 2 Architecture and Kit research | 11:40 | 11:41 |
| 3 First build | 11:41 | 11:44 |
| 4 to 5 Fixes and verification (incl. Lighthouse) | 11:44 | 11:48 |
| 6 Docs, commit, push | 11:48 | 11:52 (about 13 minutes in total, clock times approximate) |

## Round 2: Cloudflare Pages preview deploy (Mon 26 Oct, 12:09 to 12:13)
Instruction: create a Pages project `sportbuilds-site` (direct upload, production branch main), deploy to `*.pages.dev` only (no custom domain, no DNS), verify the live URL, add a deploy command to the docs, draft About and Privacy copy for Tim, commit and push. Token and account ID supplied via `CLOUDFLARE_API_TOKEN` and `/workspace/.cf_account_id`; neither is written to any file or log (wrangler output was also filtered for the account ID).

What I ran (12:09 to 12:11):
1. `npm run build`.
2. `npx wrangler@4.86.0 pages project create sportbuilds-site --production-branch main` (about 11 s, worked first time).
3. Added `npm run deploy` (build, tests, then `wrangler pages deploy dist --project-name sportbuilds-site --branch main`). First deploy took about 9 s: 13 files uploaded plus `_headers`.
4. Live URL: https://sportbuilds-site.pages.dev. Each deploy also gets a hash URL; only the production alias is meant to be shared.

What broke:
1. **I broke my own shared `node_modules` link.** The repo's `node_modules` was a symlink to the box's shared Playwright install. `npm i --no-save wrangler` replaced the symlink with a real directory containing wrangler and not Playwright. Noticed from `readlink` printing nothing; restored the symlink. Deploy now uses `npx --yes wrangler@4.86.0`, so wrangler is never installed into the repo. Lesson: don't run `npm install` in a folder whose `node_modules` is a symlink.
2. **Real bug caught only on the live URL: inline `style=""` attributes blocked by the Content Security Policy.** The `/welcome/` page's centred button used `style="justify-content:center"`, and the home page's "see the full archive" paragraph (only shown from issue 2) used another. The CSP (`style-src 'self'`) blocks inline styles, so Chrome logged a console error on the live welcome page. My local server did not send the `_headers` CSP, so the local run passed. Fixes: moved both to CSS classes; made `tools/serve.mjs` apply the `/*` block of `_headers` so local checks behave like Cloudflare; added an assertion to the test suite that built pages contain no inline `style=` attributes. After redeploy the live check was clean.
3. A caution on my own earlier statement: the first-round check "zero console errors" was true only for a server without the real headers. Verification now runs against the real Pages URL with `CHECK_HEADERS=1`, which also asserts CSP, nosniff, referrer-policy on five pages, and `X-Robots-Tag: noindex` only on `/welcome/`.

Verification on https://sportbuilds-site.pages.dev (second deploy, 12:11): all six pages at 390px and 1280px pass: HTTP 200 (404 page returns 404), no console errors or warnings, zero external requests, no overflow, security headers present, noindex header on `/welcome/` only, welcome noindex meta, form unconfigured behaviour (no POST). Asset cache header is `public, max-age=3600`; pages are `max-age=0, must-revalidate`. Screenshots: `docs/screenshots/*-pagesdev.png`.

Notes:
- Canonical and Open Graph URLs on the preview still point at `https://sportbuilds.co` (not live yet). Expected.
- No custom domain attached, no DNS touched; the token has no zone access anyway.
- `wrangler` printed "update available 4.152.0"; pinned at 4.86.0 for repeatability. Update the pin deliberately when wanted.
- Draft About and Privacy copy is in `docs/DRAFT_COPY.md` and is not used by the site.

| Step | Start | End |
|---|---|---|
| Rebuild, project create, first deploy | 12:09 | 12:10 |
| Live verification, CSP bug found, fix, redeploy | 12:10 | 12:12 |
| Docs, draft copy, commit, push | 12:12 | 12:13 |

## Round 3: Kit wiring, footer link, logo options, design pass (Mon 26 Oct)
Brief: wire the Kit form (read-only investigation, never POST any address of mine), add the "Built by Tim @ Nozza.co" footer link, make 3 logo options, then a full design pass; one redeploy to the pages.dev preview only.

### Kit findings (read-only: OPTIONS, GET, Kit's hosted page and JS)
- `OPTIONS https://app.kit.com/forms/10098455/subscriptions` with Origin = the preview: ACAO `*`; methods GET, POST, PUT, OPTIONS; requested headers (`accept`, `x-ckjs-version`) are reflected. So a cross-origin `fetch` from our page is allowed.
- `GET` on the action returns 302 to `/users/login` (expected; it is POST-only).
- Kit's own embed posts FormData by fetch with `Accept: application/json` and `X-CKJS-Version`, expecting JSON `{status:'success'|'quarantined'}` or `{errors:{fields,messages}}`.
- NOT verified (needs a real submission with an address from Tim): whether Kit returns JSON for our minimal FormData (just `email_address` and `fields[first_name]`; the embed also sends token, host, referrer, user, ckjs_version) and what the JS-off native POST shows afterwards (Kit may redirect to another Kit host, which `form-action` could block in some browsers).
- Chosen method: progressive enhancement. Native HTML POST works with JS off. With JS: fetch + inline "Check your inbox to confirm your subscription." Failure shows an honest "couldn't confirm" message with a link to Kit's hosted page; never a fake success; never auto-retries.
- CSP now `connect-src https://app.kit.com; form-action 'self' https://app.kit.com` (was `connect-src 'none'; form-action 'self'`).
- Tests intercept Kit with Playwright routes plus a host-resolver rule, so Kit is never contacted. 7 scenarios in `tools/verify-kit-form.mjs`.
- Kit-only deploy took about 11 s.

### Footer and logos
- Sitewide footer link "Built by Tim @ Nozza.co" (https://nozza.co, `rel="noopener"`), covered by tests and screenshots.
- `docs/logo-options/option-a/b/c.svg` (+ `-mark.svg` square marks) and `preview-sheet.png`. A Stack (Archivo Black), B Track (Barlow Condensed ExtraBold), C Brackets (Alata). All OFL fonts; text converted to paths so there is no font dependency. Generated by `tools/make-logos.py`.
- B is wired as a PROVISIONAL logo. Swap = one line, `LOGO_OPTION` in `site.config.mjs`.

### Design pass
Direction: sports-editorial plus maker's notebook. Paper background with faint ruled lines, condensed uppercase display type, mono labels, one gold accent, deep-green band for the signup.
- Fonts self-hosted as WOFF2 subsets (about 57 KB total): Barlow Condensed 800 (display), Inter variable 400-700 (body), IBM Plex Mono 500 (labels). All SIL OFL 1.1; licence note in `public/assets/fonts/LICENSE.txt`. No external font requests; `default-src 'self'` covers them.
- Accent `#f4c430` only as a fill behind dark text (or as text on dark), so it passes WCAG AA in light and dark; a test guards the token contrasts.
- Home: hero with headline, latest-build preview (desktop screenshot in a window frame plus phone overlay), featured latest-build card, three-step "how it works", signup band. Archive: cards with sport tag, date, one-line pitch, links (demo, repo, issue when an `issueUrl` exists; none exists yet so nothing is invented).
- Real screenshots of the live planner, phone and desktop width, as WebP in `public/assets/img/` with alt text in `data/builds.json`.
- Motion: subtle hover/lift and reveal, only under `prefers-reduced-motion: no-preference`.
- Before screenshots (old preview) `docs/screenshots/before/`; after (redeployed preview) `docs/screenshots/after/`.
- Alternatives (not deployed): `docs/design-alternatives/`.

### What broke
1. Test regex for "This week's build" broke after the redesign; updated.
2. Test build copy lacked `docs/logo-options`; copied in.
3. "No Kit badge" test matched the CSS class `badge`; regex narrowed.
4. Lazy-loaded images were blank in full-page screenshots; featured card images are eager, and `tools/fullpage.mjs` now waits for image decode (a first-image blank on the deployed home page in one screenshot was a decode race in the screenshot, not a site bug).
5. Band eyebrow rendered too large (`.band .band-intro p` selector hit it); narrowed with `:not(.eyebrow)`.
6. Mobile header wrapped nav under the logo; smaller logo and nav at 520px and below.
7. "VIBE-CODED" broke across lines; `white-space:nowrap`. OG image highlight overlapped lines; fixed.
8. Logo preview sheet clipped large lockups; grid columns `minmax(0,1fr)`.
9. `tools/verify.mjs` still expected the old CSP (`connect-src 'none'`), so the live header check reported "CSP header missing" after deploy; updated to the new policy.
10. Alt 2 mockup headline overflowed the frame; reduced size and no-wrap.

### Verification on https://sportbuilds-site.pages.dev (deploy 10 s)
- `CHECK_HEADERS=1 node tools/verify.mjs` at 390 and 1280: all pages 200 (404 page 404), no console errors, zero external requests on load, CSP present. `-kit` screenshots in `docs/screenshots/`.
- `tools/verify-kit-form.mjs` against the preview: 7 scenarios pass, Kit never contacted.
- Lighthouse: home mobile performance 97, desktop 100; archive mobile 100, desktop 100; accessibility 100 and best-practices 100 on all. SEO 92 on all: the only failed audit is "robots.txt is not valid", because Lighthouse fetches robots.txt from page context and our CSP `connect-src` does not include 'self'. robots.txt itself serves fine (200, text/plain). Left as is to keep the CSP exact. LCP 1.7 s mobile / 0.4 s desktop, CLS 0.

## Round 4: retheme with no green (Mon 26 Oct, about 12:40 to 13:20 Europe/London)
Feedback from Tim: likes the Track (option B) running-track logo and the dark panels of the logo sheet; does not like the green design at all.

What changed:
- **Final logo = Track, no green.** `docs/logo-options/option-b-final.svg` (currentColor lockup used by the header), `-dark.svg`, `-light.svg`, `-mark.svg` (near-black #0c0c0b tile, off-white track, gold baton: favicon and touch icon), `-mark-light.svg` (near-black track, gold baton, no tile) and `option-b-final-preview.png`. Generated by `tools/make-logos.py`, previewed by `tools/logo-final-sheet.mjs`. `LOGO_OPTION = 'b-final'` in `site.config.mjs` (one-line swap kept). The older a/b/c options (b with the green tile) stay in the folder as history.
- **Palette.** Dark: surfaces #0c0c0b / #151513, text #f4f1e8, hairlines #2b2a26, gold #f4c430 as text, outline and fill. Light: warm off-white #f5f2ea, near-black #131311 text, gold as fill only (links and eyebrows are near-black on light, since gold text fails AA there). The signup band and screenshot thumbs are near-black in both themes. I chose a neutral near-black (#0c0c0b) rather than #0b0f0d, because the latter still leans green. Selection colour, focus rings (gold on dark surfaces, near-black on light), buttons, cards, OG image and theme-color are all green-free. Scoreboard touches: big gold numerals for the three steps in dark, gold hairline on the featured card, gold issue badge, mono labels.
- **Planner screenshots keep the planner's own green UI**; only the frames changed (dark device frame, hairline). The planner repo is untouched.
- Tests: new check that no CSS colour is green-ish and that the final logo SVGs carry no green; logo swap test now includes `b-final`. 16 tests pass.
- `tools/fullpage.mjs` now defaults to dark and has `--themes` (home dark and light at both widths).
- Deploy 14 s. Verification on the preview: `verify.mjs` (CSP headers, no console errors, zero external requests) and `verify-kit-form.mjs` (7 intercepted scenarios) pass. Lighthouse: performance 100 (mobile and desktop, home and archive), accessibility 100, best-practices 100, SEO 92 (same robots.txt-under-CSP artefact as before). LCP 1.4 s mobile, CLS 0.
- Screenshots: `docs/screenshots/after-v2/`.

What broke / decisions:
1. The band's form inputs were cream on the dark band and looked harsh; switched to dark inputs with a hairline border.
2. Focus ring colour on the always-dark band would have been near-black on light theme (invisible); band uses a gold ring.
3. Playwright defaults to the light scheme, so earlier "after" shots would have shown the light theme; the set is now taken in dark with explicit light/dark home shots.

## Round 5: stale green CSS after the retheme (Mon 26 Oct, about 13:00 to 13:30 Europe/London)
What broke: Tim still saw the green design after the retheme deploy. The server was already serving the new CSS, but `/assets/style.css` (and fonts, images, logo, favicon, OG image) had unversioned names with `Cache-Control: public, max-age=3600`, so a browser that had loaded the old green CSS kept it for up to an hour. My own earlier verification used fresh browser profiles, so it could not catch this.

Fix:
- `build.mjs` fingerprints every file under `/assets` (name.<10-hex sha256>.ext), fonts first, then CSS (its hash covers the rewritten font URLs), then the rest, and rewrites all references in HTML and CSS (stylesheet, script, favicon, touch icon, og:image, preloads, images, font urls). The favicon and touch icon moved to `/assets/` so everything cache-immutable lives under one prefix. The build throws if any `/assets` file is not fingerprinted. Still zero dependencies (Node `crypto`), CSP unchanged.
- `_headers`: `/assets/*` is `public, max-age=31536000, immutable`; `/`, `/archive/*`, `/about/*`, `/privacy/*`, `/welcome/*`, `/404.html`, `/sitemap.xml`, `/robots.txt` are `public, max-age=0, must-revalidate`. The old 3600 s rule is gone.
- Tests (17 pass): new test that every referenced asset is fingerprinted and exists, the headers are as above, and the CSS hash changes when the CSS changes; the logo, font and image tests were adapted. `tools/verify.mjs` now discovers asset URLs from the page and checks the hash and the live cache headers.
- Verification, live (new deployment 72d5d7d5, 15 s): HTML 200 with must-revalidate; hashed assets 200 with immutable; fresh Chrome profile and a warm-cache second load, dark and light: near-black `rgb(12,12,11)` / warm off-white `rgb(245,242,234)`, 0 green elements outside images, 0 external requests, 0 console issues; `verify.mjs` and the 7 Kit-form scenarios pass.
- Stale-cache simulation (local server, one Chrome profile, same origin): visited the old green build (CSS cached for 3600 s, body `rgb(9,19,15)`), swapped to the new build at the same address, reloaded: the page requested the new hashed CSS and showed `rgb(12,12,11)`.
- Note for anyone testing: the first load after this deploy needs no hard refresh; later deploys will not need one either.

## Round 6: Kit live test and neutral planner screenshots (Mon 26 Oct, about 13:10 to 13:50 Europe/London)
### A) Kit end-to-end test (one real sign-up, address supplied by Tim)
- Submitted `norris1976+testingsportsbuild@gmail.com`, first name "Test", through the live preview form in headless Chrome. Kit answered HTTP 200 with `status: "quarantined"` and a `https://app.kit.com/forms/guards/<id>` URL, not `success`.
- Meaning: Kit's spam guard holds the sign-up until the person passes a reCAPTCHA on a Kit page. Kit's own embed script sends a reCAPTCHA token with the form; ours deliberately does not (no third-party scripts, strict CSP), so Kit quarantines it. No confirmation email is sent until the check is passed.
- **Bug found:** `public/assets/subscribe.js` treated `quarantined` like `success` and told the visitor "Check your inbox", which was untrue. Fixed: on `quarantined` the form now says "One more step: Kit needs a quick security check before it can send your confirmation email" with a link to Kit's guard URL (only if it starts with `https://app.kit.com/`). Added `host` and `ckjs_version` (the non-personal fields Kit's embed also sends) to the POST. New scenario in `tools/verify-kit-form.mjs`; 8 scenarios pass with Kit mocked.
- One retest with the same address after the fix (as approved): Kit still quarantined it, so the extra fields do not change the outcome. Open decision for Tim: accept the extra "security check" click for visitors, or allow Kit's own script and `frame-src`/`script-src` for `app.kit.com`/recaptcha in the CSP (more third-party code), or ask Kit support whether the guard can be relaxed for this form. I did not complete the reCAPTCHA myself.
- Gmail (read-only): no email to the test address arrived (consistent with the quarantine). The Kit connector needs a paid Kit plan, so the subscriber record could not be checked.
- Screenshots: `docs/screenshots/kit-live/`.

### B) Neutral planner
- Restyled the planner itself (colour tokens in `style.css`, share-card canvas, theme-color, favicon): near-black header with gold rule, warm off-white and near-black themes, gold accent, no green. Logic and 22 tests untouched. Redeployed to Vercel production; `tools/check-theme.mjs` in the planner repo checks AA contrast (worst 6.06 light, 7.26 dark) and zero green pixels.
- New `tools/make-planner-shots.mjs` re-takes the three site images from the live planner with example data (the build asserts zero green pixels) and rewrote their alt text to say "example". Copies in `docs/screenshots/planner-neutral/`.
- Broke: the first desktop shot caught a gold focus ring on the Age field; now blurred before the shot. The theme checker first flagged hero text because it ignored the gradient background; fixed in the checker.

## Round 7: planner subdomain is live, fallback link removed (Mon 26 Oct, afternoon Europe/London)
- `5k.sportbuilds.co` now serves the planner over HTTPS (CNAME added at Namecheap with Tim's approval). Removed `fallbackUrl` from issue 1 in `data/builds.json`, so the home and archive entries link only to `https://5k.sportbuilds.co` and the "Also available at" line is gone. The README keeps the `vercel.app` alias as an alternate; `tools/make-planner-shots.mjs` now defaults to the new address.
- Checked home, archive, welcome and sitemap: no `vercel.app` references remain in built pages. 17 tests pass; deployed with `npm run deploy`; live check on pages.dev with `tools/verify.mjs`: all pages 200 (404 page 404), strict CSP present, no console errors, no external requests.

## Planner screenshots refreshed for the white input card (Mon 26 Oct, about 14:40 Europe/London)
- The planner's input card is now white. Re-ran `tools/make-planner-shots.mjs` against https://5k.sportbuilds.co/ (now in dark mode so the white card stands out; 0 green-ish pixels), rebuilt, `npm run deploy`, and checked that the live preview serves the new hashed images (byte-identical to `dist/`). No code changes besides the colour scheme in the shot script.

## Domain live on Cloudflare (Mon 26 Oct, about 14:45 to 15:00 Europe/London)
- Zone active; apex CNAME (proxied) to `sportbuilds-site.pages.dev` created via API, domain went active in about 3 minutes; all five pages return 200 on `https://sportbuilds.co`.
- **Problem found:** Cloudflare injected its Web Analytics beacon into the HTML (blocked by the CSP, but a request attempt and a console error, and it contradicts the privacy page). **Fix:** `Cache-Control: no-transform` on `/*` in the generated `_headers`; redeployed; headless check shows only same-origin requests and 0 console errors.
- `www` A record added; the redirect rule could not be created (token lacks redirect-ruleset permission). See `docs/CLOUDFLARE_AND_DNS.md`.
