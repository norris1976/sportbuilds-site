# Sport Builds: master site

The website for **Sport Builds**, Tim Norris's weekly newsletter where a different sports app is vibe-coded each week.
Static, no runtime dependencies, no analytics, no cookies. Built to be hosted on **Cloudflare Pages**.

Pages: Home (`/`), Archive (`/archive/`), Welcome (`/welcome/`, noindex, shown after email confirmation), About, Privacy (placeholder), 404.
Each week's tool lives on its **own subdomain** (issue 1 is `5k.sportbuilds.co`); this site only links to them.

## How it works

`node build.mjs` reads `data/builds.json` and `site.config.mjs`, copies `public/` and writes the finished site to `dist/`. Node 18+ only, nothing to `npm install`.

```bash
npm run build     # writes dist/
npm test          # 8 tests: data validation, add-a-week, Kit wiring, noindex, forbidden-content guard
npm run serve     # http://localhost:5174 (mimics Cloudflare Pages: /about/ -> about/index.html, custom 404)
```

Browser checks (need `playwright-core` and Chrome): `node tools/verify.mjs http://localhost:5174 docs/screenshots v6`
loads every page at 390px and 1280px and checks status, console errors, external requests, overflow, headings, tap targets,
internal links, noindex and the form. `node tools/verify-configured.mjs` proves the configured form posts the right fields to Kit
without contacting Kit. `node tools/make-images.mjs` regenerates the social image and touch icon.

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

## Subscribe form (Kit): where the placeholder is

Everything is in **`site.config.mjs`**:

| Constant | Set to |
|---|---|
| `KIT_FORM_ID` | the number in Kit's embed `action="https://app.kit.com/forms/<ID>/subscriptions"` (currently `'REPLACE_ME'`) |
| `KIT_UID` | Kit's `data-uid` value (optional) |
| `KIT_CONSENT_TEXT` | Kit's own consent line, pasted exactly. Empty means a clearly marked placeholder is shown. Don't write your own legal wording |

While `KIT_FORM_ID` is `REPLACE_ME`, the form blocks submit and shows "Sign-up isn't connected yet, so nothing was sent", with no fake success and no network call.
Once it is a number, the form is a native `POST` to Kit with `fields[first_name]` and `email_address` (first name and email only). No JavaScript talks to Kit, so there is no CORS problem and the Content Security Policy only needs `form-action https://app.kit.com`, already in `dist/_headers`.

In Kit, set the form's after-subscribe behaviour and the double opt-in confirmation redirect to `https://sportbuilds.co/welcome/` so `/welcome/` appears after confirmation.
If you would rather use Kit's JavaScript embed, paste it in `build.mjs` (`signup()`) and relax `script-src`/`connect-src` in the `_headers` string accordingly. Say so in the privacy page if you do.

Other placeholders: `CONTACT_EMAIL` (empty, shows a marked placeholder on About and Privacy), About page bio and photo, full privacy policy. Search the repo for `PLACEHOLDER` and `TODO(`.

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

Site code: MIT (see `LICENSE`). Fonts: system fonts only. No third-party code or assets. Colours and feel follow the Saturday 5K Pace Planner.
