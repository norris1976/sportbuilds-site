# Sport Builds: master site

The website for **Sport Builds**, Tim Norris's weekly newsletter where a different sports app is vibe-coded each week.
Static, no runtime dependencies, no analytics, no cookies. Built to be hosted on **Cloudflare Pages**.

Pages: Home (`/`), Archive (`/archive/`), Welcome (`/welcome/`, noindex, shown after email confirmation), About, Privacy (placeholder), 404.
Each week's tool lives on its **own subdomain** (issue 1 is `5k.sportbuilds.co`); this site only links to them.

## How it works

`node build.mjs` reads `data/builds.json` and `site.config.mjs`, copies `public/` and writes the finished site to `dist/`. Node 18+ only, nothing to `npm install`.

```bash
npm run build     # writes dist/
npm test          # 15 tests: data validation, design tokens (WCAG AA), fonts/CSP, add-a-week, Kit wiring, noindex, forbidden-content guard
npm run serve     # http://localhost:5174 (mimics Cloudflare Pages: /about/ -> about/index.html, custom 404)
```

Browser checks (need `playwright-core` and Chrome): `node tools/verify.mjs http://localhost:5174 docs/screenshots v6`
loads every page at 390px and 1280px and checks status, console errors, external requests, overflow, headings, tap targets,
internal links, noindex and the form. `node tools/verify-kit-form.mjs <baseUrl> <dir> <tag>` exercises the real form (success, Kit error, network failure,
HTTP 500, validation, JavaScript off) with every request to Kit intercepted, so Kit is never contacted. `node tools/make-images.mjs` regenerates the social image and touch icon.

## Add a week (one entry)

Add one object to `data/builds.json` and push. The archive, the home page ("This week's build" and "Recent builds") and the sitemap update on the next build.

```json
{
  "issue": 2,
  "title": "Name of the tool",
  "description": "One line on what it does.",
  "date": "2026-11-02",
  "url": "https://two.sportbuilds.co",
  "repo": "https://github.com/norris1976/the-repo",
  "tags": ["cycling", "training"]
}
```

- `issue` is unique; the highest issue number is treated as the latest. Order in the file does not matter.
- `url` is the canonical link (the tool's own subdomain). Optional `fallbackUrl` shows an "Also available at" line, handy while DNS or a certificate is still settling. Remove it once not needed (issue 1 currently has the `vercel.app` alias).
- `/welcome/` always shows issue `WELCOME_ISSUE` (set in `site.config.mjs`, currently 1) as "your first build".

## Subscribe form (Kit)

Wired to Kit form `10098455` (hosted page https://sport-builds.kit.com/7b44b294d8). Everything is in **`site.config.mjs`**:

| Constant | Value |
|---|---|
| `KIT_FORM_ID` | `'10098455'` (posts to `https://app.kit.com/forms/10098455/subscriptions`). Set to `REPLACE_ME` to switch the form off with a clear "not connected" message |
| `KIT_UID` | `'7b44b294d8'` |
| `KIT_HOSTED_URL` | Kit's hosted page, shown only as a fallback link if an in-page sign-up cannot be confirmed |
| `KIT_CONSENT_TEXT` | the consent line above the button; the words "privacy page" become a link to `/privacy/` |
| `CONTACT_EMAIL` | `hello@sportbuilds.co` |

Our own styled form: first name and email only, no checkbox, no Kit badge, no Kit JavaScript. How it submits:
- **JavaScript on** (`public/assets/subscribe.js`): after browser validation, `fetch()` POSTs the form data to Kit with the same two headers Kit's own embed uses (`Accept: application/json`, `X-CKJS-Version: 6`). Kit's preflight allows any origin and these headers. On `status: success` (or `quarantined`) the form is replaced by "Check your inbox to confirm your subscription."; Kit's own error messages are shown if it rejects; if the request fails the page says it couldn't confirm the sign-up (never a fake success) and links to Kit's hosted page.
- **JavaScript off**: the plain HTML `POST` goes to Kit and the browser shows whatever Kit returns.
- CSP in `dist/_headers`: `connect-src https://app.kit.com` and `form-action 'self' https://app.kit.com`, nothing broader.

Kit settings (done by the Editor): double opt-in on, confirmation email from hello@sportbuilds.co, after-confirm redirect to `https://sportbuilds.co/welcome/` (that URL only resolves once the domain is attached).

Other placeholders still marked in the pages: About page bio and photo, full privacy policy (draft in `docs/DRAFT_COPY.md`, not live until Tim approves). Search the repo for `PLACEHOLDER` and `TODO(`.

## Design and logo
- Design system lives in `public/assets/style.css` (tokens at the top, light and dark; one gold accent used only as a fill behind dark text so it passes AA in both). Motion is wrapped in `prefers-reduced-motion: no-preference`.
- Provisional logo: option B from `docs/logo-options/`. To swap, change the single `LOGO_OPTION` line in `site.config.mjs` ('a', 'b' or 'c'), then run `node tools/make-images.mjs` to refresh the OG image and touch icon. Favicon and header lockup are generated at build time.
- `node tools/fullpage.mjs <baseUrl> <outDir>` takes full-page screenshots of the five pages at 1280 and 390. `node tools/logo-sheet.mjs` re-renders the logo preview sheet; `/workspace/fv/bin/python tools/make-logos.py` regenerates the logo SVGs (needs fontTools; text is converted to paths).
- Unused hero directions: `docs/design-alternatives/`.

## Deploy to Cloudflare Pages

Option A (in use): direct upload, see the next section. Option B (not in use): connect this GitHub repo in the Cloudflare dashboard (Workers & Pages > Create > Pages > Connect to Git) with:

| Setting | Value |
|---|---|
| Framework preset | None |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | (leave blank) |
| Production branch | `main` |
| Environment variable (optional) | `NODE_VERSION` = `20` (a `.node-version` file already says 20) |

That gives a `https://<project>.pages.dev` preview. Do the custom-domain steps in `docs/CLOUDFLARE_AND_DNS.md` separately.
Keep Cloudflare Web Analytics switched **off** unless the privacy page is updated first.

## Deploy (direct upload to Cloudflare Pages)

The site is a Cloudflare Pages project named `sportbuilds-site` created with **direct upload** (no Git auto-deploy). Adding a week is: edit `data/builds.json`, commit and push, then deploy.

```bash
export CLOUDFLARE_API_TOKEN=...      # scoped token, Cloudflare Pages: Edit. Never commit it or paste it in logs
export CLOUDFLARE_ACCOUNT_ID=...     # the Cloudflare account ID
npm run deploy
```

`npm run deploy` runs `npm run build`, then `npm test`, then
`npx --yes wrangler@4.86.0 pages deploy dist --project-name sportbuilds-site --branch main`. Branch `main` is the production branch, so this updates `https://sportbuilds-site.pages.dev` (and the custom domain once attached). Other branch names create preview URLs only. The first run downloads wrangler through `npx`, so it needs network access.

A direct-upload project **cannot be switched to Git integration later**. If Git auto-deploy is wanted, create a new Pages project connected to the repo instead and move the custom domain across.

## Licence and credits

Site code: MIT (see `LICENSE`). Fonts (self-hosted, SIL OFL 1.1, licences in `public/assets/fonts/LICENSE.txt`): Barlow Condensed, Inter, IBM Plex Mono. No third-party code. Colours and feel follow the Saturday 5K Pace Planner.
