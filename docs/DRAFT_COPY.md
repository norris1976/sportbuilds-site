# Draft copy for Tim to review (not live)

**Status: DRAFT. Not in the live pages yet.** The site's existing placeholders are unchanged.
Anything in `[TIM TO CONFIRM: ...]` is a fact I do not have and have not guessed. UK English throughout.
Nothing here is legal advice; the privacy text in particular needs Tim's review (and ideally a proper check) before it replaces the placeholder.

One thing to resolve first: the live About placeholder currently says "a former sports-tech developer who now builds with AI". The brief for this round says "a developer and architect who now builds with AI". The draft below uses the second. **[TIM TO CONFIRM: which description he wants, and whether to mention sports-tech at all.]**

---

## About page: draft bio

### Who's behind it

I'm Tim Norris, a developer and architect who now builds with AI.

Sport Builds is my weekly newsletter. Each week I vibe-code a different sports app with AI, put it online, publish the source code and tell you honestly how it went: the prompts I used, what broke and how I fixed it.

The first build is the [Saturday 5K Pace Planner](https://5k.sportbuilds.co): you enter a 5K time, your age and a target, and it gives you an age-graded percentage, per-km splits for your course and a card you can share.

[TIM TO CONFIRM: one or two sentences on why he is doing this, in his own words, e.g. what he enjoys about sport or building.]
[TIM TO CONFIRM: where he is based, if he wants to say. Leave out if not.]
[TIM TO CONFIRM: personal links to show (X, LinkedIn, GitHub `norris1976`, website), and a photo, if wanted.]

### How the builds work (can stay as it is on the live page)

- Each tool lives on its own address, so one week's build never gets in the way of another's.
- The code for every tool is open source, so you can see exactly how it works.
- Where a tool uses a published formula or table, the tool says where it comes from.

### Get in touch

Got an idea for a build, or spotted a bug? Reply to any newsletter email, or write to [hello@sportbuilds.co](mailto:hello@sportbuilds.co).

*(Note for the build: when Tim approves, set `CONTACT_EMAIL = 'hello@sportbuilds.co'` in `site.config.mjs`. Not done yet. The Editor says this address exists; it only works once Email Routing is set up on the new nameservers.)*

---

## Privacy page: draft

> **Draft, last updated [TIM TO CONFIRM: date when approved].** This is a plain-English summary of how Sport Builds handles personal data. It has not been checked by a lawyer.

### Who is responsible

The person responsible for your data (the "controller" under UK data protection law) is **[TIM TO CONFIRM: Tim Norris as an individual, or a company name, registered address and company number if one exists]**.
Contact: [hello@sportbuilds.co](mailto:hello@sportbuilds.co).
[TIM TO CONFIRM: whether he is registered with the ICO, and whether a registration is required for him.]

### This website

- The site sets no cookies and runs no analytics or tracking scripts of its own.
- It loads no third-party scripts, fonts or images.
- The site is hosted on Cloudflare Pages. Like any host, Cloudflare handles your request and may keep standard technical logs (for example your IP address and the page requested) to deliver and secure the service. These are handled under Cloudflare's own terms and privacy policy. [TIM TO CONFIRM: link to Cloudflare's privacy policy, and whether any Cloudflare analytics or security features that set cookies or collect extra data have been switched on. The site currently assumes Web Analytics is off.]

### Subscribing to the newsletter

- If you subscribe, you give your first name and email address. They are collected and processed by **Kit**, the email service used to send the newsletter, and are stored there.
- I use them to send you the Sport Builds newsletter and to reply if you write to me. [TIM TO CONFIRM: any other use, for example occasional announcements, sponsor messages, or surveys. Anything beyond the newsletter must be listed here.]
- The legal basis is your consent, which you give by subscribing and confirming your email address. [TIM TO CONFIRM: wording agreed with the final Kit form consent text.]
- You can unsubscribe at any time with the link at the bottom of every email.
- This site does not store your name or email address itself. The sign-up form sends them straight to Kit.
- Kit's own privacy policy: [TIM TO CONFIRM: link to Kit's current privacy policy page].
- [TIM TO CONFIRM: whether Kit stores data outside the UK, and what safeguards apply; take this from Kit's documentation.]
- [TIM TO CONFIRM: whether Kit email open or click tracking is switched on for the newsletter. If it is, say so here in one sentence. If it is switched off, say that instead.]

### The tools

Each weekly tool is a separate website with its own address. The Saturday 5K Pace Planner runs entirely in your browser: what you type in (times, age, category, course) is processed on your device and is not sent anywhere. It has no login and no analytics. [TIM TO CONFIRM: the same statement for future tools, to be checked each week; each tool should say what it does with your input.]

### Messages you send me

If you email hello@sportbuilds.co or reply to the newsletter, I will use your message and address to reply. [TIM TO CONFIRM: how long messages are kept, and where they are stored. Email Routing forwards hello@ to [TIM TO CONFIRM: destination mailbox provider].]

### How long data is kept

[TIM TO CONFIRM: retention for subscribers (for example "until you unsubscribe, then removed or anonymised within X"), and for emails you send me.]

### Your rights

Under UK data protection law you have rights over your personal data, including to ask for a copy, to correct it, to have it deleted, to object to or restrict how it is used, and to withdraw consent at any time. To use any of them, email [hello@sportbuilds.co](mailto:hello@sportbuilds.co). If you are unhappy with how your data is handled you can complain to the Information Commissioner's Office ([ico.org.uk](https://ico.org.uk)). [TIM TO CONFIRM: full list of rights and wording, ideally checked against ICO guidance.]

### Sponsors

[TIM TO CONFIRM: leave this heading out for now. If sponsorship or adverts are added later, this page must say what data sponsors receive (if any) and the site must be re-checked, because the "no third-party scripts" statements above would change.]

### Changes

I will update this page if the way the site works changes, and show the date at the top.
