// Single place for site-wide settings. Edit here, then run `npm run build`.

export const SITE_URL = 'https://sportbuilds.co';   // canonical origin (no trailing slash)
export const SITE_NAME = 'Sport Builds';
export const TAGLINE = 'A different sports app, vibe-coded every week.';

// ──────────────────────────────────────────────────────────────────────────
// TODO(KIT): SUBSCRIBE FORM WIRING. This is the ONLY place that needs changing
// once the Editor has created the Kit form. Until KIT_FORM_ID is replaced, the
// form shows a clear "not connected yet" message and never pretends to succeed.
//
//   KIT_FORM_ID : the number in the Kit embed's  action="https://app.kit.com/forms/<ID>/subscriptions"
//   KIT_UID     : the value of data-uid in the same embed snippet (optional but
//                 Kit's own embed includes it; copy it across if present)
//   KIT_CONSENT_TEXT : paste Kit's own consent/GDPR line EXACTLY as Kit provides it.
//                 Leave as '' to show a clearly marked placeholder. Do not write
//                 your own legal wording here.
// ──────────────────────────────────────────────────────────────────────────
export const KIT_FORM_ID = 'REPLACE_ME';
export const KIT_UID = 'REPLACE_ME';
export const KIT_CONSENT_TEXT = '';

// TODO(CONTACT): public contact / reply address. Deliberately empty: do not invent one.
// Once Tim confirms the address (e.g. the Cloudflare Email Routing alias), put it here.
export const CONTACT_EMAIL = '';

// Which issue the /welcome page calls "your first build".
export const WELCOME_ISSUE = 1;
