// Single place for site-wide settings. Edit here, then run `npm run build`.

export const SITE_URL = 'https://sportbuilds.co';   // canonical origin (no trailing slash)
export const SITE_NAME = 'Sport Builds';
export const TAGLINE = 'A different sports app, vibe-coded every week.';

// ──────────────────────────────────────────────────────────────────────────
// SUBSCRIBE FORM (Kit). Wired to the real Kit form on 26 Oct 2026. If KIT_FORM_ID is set
// back to 'REPLACE_ME' the form shows a clear "not connected yet" message and never pretends to succeed.
//
//   KIT_FORM_ID : the number in the Kit embed's  action="https://app.kit.com/forms/<ID>/subscriptions"
//   KIT_UID     : the value of data-uid in the same embed snippet (optional but
//                 Kit's own embed includes it; copy it across if present)
//   KIT_CONSENT_TEXT : paste Kit's own consent/GDPR line EXACTLY as Kit provides it.
//                 Leave as '' to show a clearly marked placeholder. Do not write
//                 your own legal wording here.
// ──────────────────────────────────────────────────────────────────────────
export const KIT_FORM_ID = '10098455';
export const KIT_UID = '7b44b294d8';
// Kit's hosted sign-up page: shown only as a fallback link if the in-page sign-up cannot be confirmed.
export const KIT_HOSTED_URL = 'https://sport-builds.kit.com/7b44b294d8';
export const KIT_CONSENT_TEXT = 'By subscribing you agree to receive the Sport Builds newsletter from Tim Norris. One confirmation email first; unsubscribe any time. See the privacy page.';  // the words "privacy page" become a link to /privacy/

// Public contact address (confirmed by the Editor; forwards via Namecheap Email Forwarding for now,
// to be recreated with Cloudflare Email Routing). Set to '' to show a marked placeholder instead.
export const CONTACT_EMAIL = 'hello@sportbuilds.co';

// Which issue the /welcome page calls "your first build".
export const WELCOME_ISSUE = 1;

// PROVISIONAL logo. 'a' (Stack), 'b' (Track) or 'c' (Brackets); see docs/logo-options/preview-sheet.png.
// Swapping the logo is this one line: the header lockup and favicon are both built from docs/logo-options/option-<x>*.svg.
// (Also re-run `node tools/make-images.mjs` to refresh the social image and touch icon.)
export const LOGO_OPTION = 'b';
