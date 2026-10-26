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
