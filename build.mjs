// Static site generator. Zero dependencies: `node build.mjs` writes ./dist
// Pages: /, /archive/, /welcome/, /about/, /privacy/, /404.html, sitemap.xml, robots.txt, _headers
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, existsSync, readdirSync, renameSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, sep } from 'node:path';
import * as C from './site.config.mjs';

const OUT = 'dist';
const builds = JSON.parse(readFileSync('data/builds.json', 'utf8')).sort((a, b) => b.issue - a.issue); // newest first
if (!builds.length) throw new Error('data/builds.json needs at least one entry');
const latest = builds[0];
const older = builds.slice(1);

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const fmtDate = (iso) => new Date(iso + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const host = (u) => new URL(u).host;
const kitConfigured = C.KIT_FORM_ID && C.KIT_FORM_ID !== 'REPLACE_ME' && /^\d+$/.test(C.KIT_FORM_ID);

// Logo: inline lockup in the header (currentColor), mark tile as the favicon. Both come from docs/logo-options/option-<LOGO_OPTION>*.svg.
const logoSvg = readFileSync(`docs/logo-options/option-${C.LOGO_OPTION}.svg`, 'utf8')
  .replace(/<title>.*?<\/title>/, '').replace(' role="img" aria-label="Sport Builds"', ' class="logo" aria-hidden="true" focusable="false"').trim();

const NAV = [['/', 'Home'], ['/archive/', 'Archive'], ['/about/', 'About']];
const FOOT = [['/', 'Home'], ['/archive/', 'Archive'], ['/about/', 'About'], ['/privacy/', 'Privacy']];

function layout({ path, title, description, body, noindex = false, hero }) {
  const full = title === C.SITE_NAME ? title : `${title} · ${C.SITE_NAME}`;
  const canon = C.SITE_URL + path;
  return `<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(full)}</title>
<meta name="description" content="${esc(description)}">
<meta name="theme-color" content="#f5f2ea" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0c0c0b" media="(prefers-color-scheme: dark)">
${noindex ? '<meta name="robots" content="noindex, nofollow">' : `<link rel="canonical" href="${esc(canon)}">`}
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(C.SITE_NAME)}">
<meta property="og:title" content="${esc(full)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(canon)}">
<meta property="og:image" content="${esc(C.SITE_URL)}/assets/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Sport Builds: a different sports app, built with AI every week">
<meta property="og:locale" content="en_GB">
<meta name="twitter:card" content="summary_large_image">
<link rel="preload" href="/assets/fonts/inter-var.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/barlow-condensed-800.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/assets/style.css">
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<header class="site-header">
  <div class="wrap">
    <a class="brand" href="/" aria-label="${esc(C.SITE_NAME)}, home">${logoSvg}</a>
    <nav aria-label="Main"><ul>
${NAV.map(([h, l]) => `      <li><a href="${h}"${h === path ? ' aria-current="page"' : ''}>${l}</a></li>`).join('\n')}
    </ul></nav>
  </div>
</header>
<main id="main">
${hero}
${body}
</main>
<footer class="site-footer">
  <div class="wrap">
    <p>&copy; ${new Date().getUTCFullYear()} Tim Norris. ${esc(C.SITE_NAME)}.</p>
    <nav aria-label="Footer"><ul>
${FOOT.map(([h, l]) => `      <li><a href="${h}">${l}</a></li>`).join('\n')}
    </ul></nav>
    <p class="built-by"><a href="https://nozza.co" rel="noopener">Built by Tim @ Nozza.co</a></p>
  </div>
</footer>
${body.includes('id="subscribe-form"') ? '<script src="/assets/subscribe.js" defer></script>' : ''}
</body>
</html>
`;
}

const hero = (kicker, h1, lede, extra = '', slim = false) => `<section class="hero${slim ? ' slim' : ''}"><div class="wrap">
  <p class="eyebrow">${esc(kicker)}</p>
  <h1>${esc(h1)}</h1>
  ${lede ? `<p class="lede">${lede}</p>` : ''}
  ${extra}
</div></section>`;

const tagList = (b) => { const t = (b.tags ?? []).filter((x) => x.toLowerCase() !== (b.sport ?? '').toLowerCase()); return t.length ? `<ul class="tags" aria-label="Tags">${t.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''; };

const pad2 = (n) => String(n).padStart(2, '0');
function buildCard(b, { featured = false, heading = 'h3', label = '' } = {}) {
  const im = b.images;
  return `<article class="card build${featured ? ' featured' : ''}">
  ${im?.phoneForm ? `<div class="thumb">${[im.phoneForm, im.phone].map((x) => `<img src="${esc(x.src)}" width="${x.width}" height="${x.height}" alt="${esc(x.alt)}"${featured ? '' : ' loading="lazy"'} decoding="async">`).join('')}</div>` : ''}
  <div class="build-body">
  <div class="meta">${label ? `<span class="label">${esc(label)}</span>` : ''}${b.sport ? `<span class="chip">${esc(b.sport)}</span>` : ''}<span class="badge">Issue ${b.issue}</span><time datetime="${esc(b.date)}">${fmtDate(b.date)}</time></div>
  <${heading}>${esc(b.title)}</${heading}>
  <p class="pitch">${esc(b.description)}</p>
  ${tagList(b)}
  <div class="links">
    <a class="btn primary" href="${esc(b.url)}" target="_blank" rel="noopener">Open the tool <span aria-hidden="true">&rarr;</span><span class="sr-only"> (${esc(host(b.url))}, opens in a new tab)</span></a>
    <a class="btn" href="${esc(b.repo)}" rel="noopener">Source code</a>${b.issueUrl ? `\n    <a class="btn" href="${esc(b.issueUrl)}" rel="noopener">Read the issue</a>` : ''}
  </div>
  ${b.fallbackUrl ? `<p class="mirror">Also available at <a href="${esc(b.fallbackUrl)}" rel="noopener">${esc(host(b.fallbackUrl))}</a>.</p>` : ''}
  </div>
</article>`;
}

function signup(idSuffix = '') {
  const consent = C.KIT_CONSENT_TEXT.trim()
    ? `<p class="consent" id="consent">${esc(C.KIT_CONSENT_TEXT.trim()).replace('privacy page', '<a href="/privacy/">privacy page</a>')}</p>`
    : `<p class="placeholder" role="note">PLACEHOLDER: paste Kit's own consent text here (KIT_CONSENT_TEXT in site.config.mjs). Not written yet on purpose.</p>`;
  const action = kitConfigured ? ` action="https://app.kit.com/forms/${C.KIT_FORM_ID}/subscriptions"` : '';
  const uid = kitConfigured && C.KIT_UID && C.KIT_UID !== 'REPLACE_ME' ? ` data-uid="${esc(C.KIT_UID)}"` : '';
  return `<section class="band signup" id="subscribe" aria-labelledby="subscribe-h"><div class="wrap band-grid">
  <div class="band-intro"><p class="eyebrow">Free, weekly</p><h2 id="subscribe-h">Get the weekly build</h2>
  <p>One email a week: the new tool, how it was built, and what went wrong along the way.</p></div>
  <div class="band-form">
  <!-- Kit wiring lives in site.config.mjs (KIT_FORM_ID / KIT_UID / KIT_CONSENT_TEXT). Plain HTML POST works without JavaScript; subscribe.js upgrades it to an in-page request. -->
  <form id="subscribe-form" method="post"${action} data-configured="${kitConfigured}"${uid} data-fallback-url="${esc(C.KIT_HOSTED_URL)}" aria-describedby="consent">
    <div class="row">
      <label>First name
        <input type="text" name="fields[first_name]" autocomplete="given-name" autocapitalize="words" enterkeyhint="next" required>
      </label>
      <label>Email address
        <input type="email" name="email_address" autocomplete="email" inputmode="email" autocapitalize="none" spellcheck="false" enterkeyhint="send" required>
      </label>
    </div>
    ${consent}
    <button class="btn primary" type="submit" data-element="submit">Send me the weekly build</button>
    <p id="subscribe-msg" class="msg" role="status" aria-live="polite" hidden></p>
    ${kitConfigured ? '' : `<p class="placeholder" role="note">PLACEHOLDER: the Kit form is not connected yet, so this button sends nothing.</p>`}
  </form>
  </div>
</div></section>`;
}

const pages = {};
const sitemap = [];

// ── Home ────────────────────────────────────────────────────────────────
const im = latest.images;
pages['/'] = layout({
  path: '/', title: C.SITE_NAME,
  description: 'A different sports app, built with AI every week, with honest build notes. Free weekly newsletter by Tim Norris.',
  hero: `<section class="hero"><div class="wrap hero-grid">
  <div class="hero-copy">
    <p class="eyebrow">Weekly newsletter</p>
    <h1>A different sports app, <span class="hl">built with AI</span> every week.</h1>
    <p class="lede">I build one small, useful sports tool each week with AI, then tell you honestly how it went: the prompts, what broke and what I fixed.</p>
    <div class="cta"><a class="btn primary" href="#subscribe">Get the weekly build</a><a class="btn ghost" href="/archive/">Browse all builds</a></div>
  </div>
${im ? `  <figure class="preview">
    <div class="shot-desktop"><div class="chrome" aria-hidden="true"><i></i><i></i><i></i><span>${esc(host(latest.url))}</span></div><img src="${esc(im.desktop.src)}" width="${im.desktop.width}" height="${im.desktop.height}" alt="${esc(im.desktop.alt)}" fetchpriority="high" decoding="async"></div>
    <img class="shot-phone" src="${esc(im.phone.src)}" width="${im.phone.width}" height="${im.phone.height}" alt="${esc(im.phone.alt)}" decoding="async">
    <figcaption>Latest build, issue ${latest.issue}: ${esc(latest.title)}. <a href="${esc(latest.url)}" target="_blank" rel="noopener">Open the tool <span aria-hidden="true">&rarr;</span><span class="sr-only"> (opens in a new tab)</span></a></figcaption>
  </figure>` : ''}
</div></section>`,
  body: `<section class="section" aria-labelledby="this-week"><div class="wrap">
<div class="section-head"><div><p class="eyebrow">Latest build</p><h2 id="this-week">This week\u2019s build</h2></div></div>
${buildCard(latest, { featured: true, heading: 'h3' })}
</div></section>
<section class="section" aria-labelledby="how"><div class="wrap">
<div class="section-head"><div><p class="eyebrow">The method</p><h2 id="how">How Sport Builds works</h2></div></div>
<ol class="steps">
  <li><strong>One idea a week</strong><span>A small sports tool that does one job well, built from a clear brief.</span></li>
  <li><strong>Built with AI</strong><span>Built in public: real prompts, real tests, a live demo and open source code.</span></li>
  <li><strong>Honest notes</strong><span>Every issue says what broke and how it was fixed, not just the shiny result.</span></li>
</ol>${older.length ? '' : `<p class="more muted">More builds are on the way, one a week. <a href="/archive/">See the archive</a>.</p>`}</div></section>
${older.length ? `<section class="section" aria-labelledby="recent"><div class="wrap"><div class="section-head"><div><p class="eyebrow">Archive</p><h2 id="recent">Recent builds</h2></div></div><ul class="archive">${older.slice(0, 3).map((b) => `<li>${buildCard(b)}</li>`).join('')}</ul><p class="more"><a href="/archive/">See the full archive &rarr;</a></p></div></section>` : ''}
${signup()}`,
});
sitemap.push('/');

// ── Archive ─────────────────────────────────────────────────────────────
pages['/archive/'] = layout({
  path: '/archive/', title: 'Archive',
  description: 'Every Sport Builds tool so far, newest first, each with a live demo and open source code.',
  hero: hero('Archive', 'Every build so far', `${builds.length} ${builds.length === 1 ? 'tool' : 'tools'}, newest first. Each lives on its own address and has open source code.`, '', true),
  body: `<div class="wrap stack"><ul class="archive${builds.length === 1 ? ' single' : ''}">${builds.map((b, i) => `<li>${buildCard(b, { featured: builds.length === 1 && i === 0, heading: 'h2' })}</li>`).join('')}</ul>
<p class="muted small">Want to see something built? Subscribe and reply to any issue with your idea.</p></div>`,
});
sitemap.push('/archive/');

// ── Welcome (noindex) ───────────────────────────────────────────────────
const first = builds.find((b) => b.issue === C.WELCOME_ISSUE) ?? builds[builds.length - 1];
pages['/welcome/'] = layout({
  path: '/welcome/', title: 'Welcome', noindex: true,
  description: 'You\u2019re confirmed. Welcome to Sport Builds.',
  hero: hero('Welcome', 'You\u2019re confirmed.', 'Welcome to Sport Builds.', '', true),
  body: `<div class="wrap stack"><section class="card prose center" aria-labelledby="w-h">
  <div class="big-check" aria-hidden="true">&#10003;</div>
  <h2 id="w-h">Your first build</h2>
  <h3>${esc(first.title)}</h3>
  <p>${esc(first.description)}</p>
  <p class="links centered"><a class="btn primary" href="${esc(first.url)}" target="_blank" rel="noopener">Open the ${esc(first.title)} <span aria-hidden="true">&rarr;</span><span class="sr-only"> (opens in a new tab)</span></a></p>
  ${first.fallbackUrl ? `<p class="mirror">Also at <a href="${esc(first.fallbackUrl)}" rel="noopener">${esc(host(first.fallbackUrl))}</a>.</p>` : ''}
</section>
<section class="card prose center" aria-labelledby="w2"><h2 id="w2">What should I build next?</h2>
  <p>Reply to the newsletter email and tell me what I should build next: the sports tool you wish existed.</p>
  <p class="muted small">Can&rsquo;t find the email? Check your spam or promotions folder.</p>
</section>
<p class="center"><a href="/archive/">Browse the archive</a></p></div>`,
});

// ── About ───────────────────────────────────────────────────────────────
const contact = C.CONTACT_EMAIL ? `<a href="mailto:${esc(C.CONTACT_EMAIL)}">${esc(C.CONTACT_EMAIL)}</a>` : `<span class="placeholder">PLACEHOLDER: contact address to be confirmed</span>`;
pages['/about/'] = layout({
  path: '/about/', title: 'About',
  description: 'Sport Builds is a weekly newsletter by Tim Norris, a former sports-tech developer who now builds with AI.',
  hero: hero('About', 'About Sport Builds', '', '', true),
  body: `<div class="wrap stack"><section class="card prose" aria-labelledby="a1">
  <h2 id="a1">What this is</h2>
  <p>Sport Builds is a weekly newsletter. Each week I build a different sports app or tool with AI, put it online, publish the source code and write up how it went, including the parts that went wrong.</p>
  <h2>Who&rsquo;s behind it</h2>
  <p>I&rsquo;m Tim Norris, a former sports-tech developer who now builds with AI. I build these tools using public data and my own work only.</p>
  <p class="placeholder" role="note">PLACEHOLDER: Tim to add a short personal bio, photo and any links he wants public. Nothing else is claimed here.</p>
  <h2>How the builds work</h2>
  <ul>
    <li>Each tool lives on its own address, so one week&rsquo;s build never gets in the way of another&rsquo;s.</li>
    <li>The code for every tool is open source, so you can see exactly how it works.</li>
    <li>Where a tool uses a published formula or table, the tool says where it comes from.</li>
  </ul>
  <h2>Get in touch</h2>
  <p>Idea for a build, or spotted a bug? Reply to any newsletter email${C.CONTACT_EMAIL ? `, or email ${contact}.` : '.'}</p>${C.CONTACT_EMAIL ? '' : `\n  <p>Other contact:</p>\n  <p>${contact}</p>`}
  <p><a class="btn primary" href="/#subscribe">Get the weekly build</a></p>
</section></div>`,
});
sitemap.push('/about/');

// ── Privacy ─────────────────────────────────────────────────────────────
// Real privacy page (first person, plain English). Facts checked on 26 Oct 2026: the built HTML has one same-origin script and no cookies;
// CSP script-src 'self'; the planner's code has no fetch/XHR/beacon/storage/cookies (connect-src 'none'); Kit's and Cloudflare's policy pages return 200.
const PRIVACY_UPDATED = '26 October 2026';
pages['/privacy/'] = layout({
  path: '/privacy/', title: 'Privacy',
  description: 'How Sport Builds handles your data: what the website, the newsletter signup and the tools collect, who processes it, and how to contact me.',
  hero: hero('Privacy', 'Privacy', '', '', true),
  body: `<div class="wrap stack"><section class="card prose" aria-labelledby="p0">
  <p id="p0">Sport Builds is a free weekly newsletter that I, Tim Norris, run as an individual. I decide how your data is used, so I am the &ldquo;controller&rdquo; under UK data protection law. This page says what happens to your data, in plain English.</p>
  <p class="muted small">Last updated: ${PRIVACY_UPDATED}</p>
  <h2>The short version</h2>
  <ul>
    <li>I collect your first name and email address only if you subscribe.</li>
    <li>This website sets no cookies and runs no analytics or tracking scripts of its own.</li>
    <li>I don&rsquo;t sell your data and I don&rsquo;t give it to sponsors.</li>
    <li>You can unsubscribe at any time, and ask me to delete your details.</li>
  </ul>
  <h2>This website</h2>
  <ul>
    <li>It sets no cookies and runs no analytics or tracking scripts of its own. Its scripts, fonts and images all come from sportbuilds.co itself.</li>
    <li>It is hosted on Cloudflare Pages. Cloudflare handles each request and keeps standard technical logs, and may collect aggregate traffic and security data (such as your IP address, browser type and the page requested). That is covered by <a href="https://www.cloudflare.com/privacypolicy/" rel="noopener">Cloudflare&rsquo;s privacy policy</a>. I may use Cloudflare&rsquo;s aggregate figures to see how many people visit.</li>
  </ul>
  <h2>Subscribing to the newsletter</h2>
  <ul>
    <li>I ask for your first name and email address. When you press subscribe, your browser sends them straight to Kit, the email service I use to run the newsletter. This website does not store them.</li>
    <li>Kit handles your details on my behalf, under <a href="https://kit.com/privacy" rel="noopener">Kit&rsquo;s privacy policy</a> and its terms. Kit may record whether you open my emails and click links in them.</li>
    <li>Signing up is double opt-in: Kit sends you one email asking you to confirm, and you only join the list once you do. Subscribing and confirming is how you give your consent. After that you get the weekly newsletter.</li>
    <li>Every email has an unsubscribe link. Withdrawing consent is as easy as that.</li>
    <li>Kit is based in the United States, so your details are processed there. Kit says it relies on the EU-U.S. Data Privacy Framework and its UK Extension and, where needed, standard contractual clauses with the UK addendum.</li>
    <li>I keep your subscriber details until you unsubscribe. If you want them deleted, email me and I will delete them.</li>
  </ul>
  <h2>The tools</h2>
  <p>Each weekly tool is a separate website with its own address, and each one should say what it does with your input.</p>
  <ul>
    <li><strong>Saturday 5K Pace Planner</strong> (5k.sportbuilds.co) works entirely in your browser. What you type is not sent to me or to anyone else. It has no analytics, sets no cookies, saves nothing on your device between visits, and loads nothing from other websites.</li>
    <li>If you press &ldquo;Copy as text&rdquo; the result goes to your clipboard, and &ldquo;Download PNG card&rdquo; saves an image to your device. Both happen only when you press them.</li>
  </ul>
  <h2>Emailing me</h2>
  <p>Messages to hello@sportbuilds.co are forwarded by Cloudflare Email Routing to my personal mailbox. I use them only to reply to you.</p>
  <h2>Sponsors</h2>
  <p>I don&rsquo;t sell your data, and I don&rsquo;t share it with sponsors.</p>
  <h2>Your rights</h2>
  <p>Under UK data protection law you can ask me for a copy of your data, ask me to correct it or delete it, object to how I use it, ask me to restrict it, and withdraw your consent at any time. To do any of these, email me at ${contact}.</p>
  <p>If you are unhappy with how I have handled your data, I would like the chance to put it right first. You can also complain to the Information Commissioner&rsquo;s Office (ICO) at <a href="https://ico.org.uk/make-a-complaint/" rel="noopener">ico.org.uk/make-a-complaint</a>.</p>
  <h2>Changes</h2>
  <p>If I change this page, I will update the date at the top.</p>
  <h2>Contact</h2>
  <p>Tim Norris, ${contact}</p>
</section></div>`,
});
sitemap.push('/privacy/');

// ── 404 ─────────────────────────────────────────────────────────────────
const p404 = layout({
  path: '/404.html', title: 'Page not found', noindex: true, description: 'That page could not be found.',
  hero: hero('Off the course', 'Page not found', 'That page doesn\u2019t exist or has moved.', `<div class="cta"><a class="btn primary" href="/">Back to home</a><a class="btn ghost" href="/archive/">Browse the archive</a></div>`, true),
  body: `<div class="wrap stack flush"></div>`,
});

// ── Write ───────────────────────────────────────────────────────────────
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
cpSync('public', OUT, { recursive: true });
renameSync(join(OUT, 'apple-touch-icon.png'), join(OUT, 'assets/apple-touch-icon.png'));
writeFileSync(join(OUT, 'assets/favicon.svg'), readFileSync(`docs/logo-options/option-${C.LOGO_OPTION}-mark.svg`, 'utf8'));
for (const [path, html] of Object.entries(pages)) {
  const dir = join(OUT, path); mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.html'), html);
}
writeFileSync(join(OUT, '404.html'), p404);
const lastmod = latest.date;
writeFileSync(join(OUT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemap.map((p) => `  <url><loc>${C.SITE_URL}${p}</loc><lastmod>${lastmod}</lastmod></url>`).join('\n')}\n</urlset>\n`);
writeFileSync(join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${C.SITE_URL}/sitemap.xml\n`);
// ── Fingerprint every file under /assets (fonts, images, logo/favicon, CSS, JS) ─────────────────────
// Each file is renamed name.<10-hex content hash>.ext and every reference in the HTML and CSS is rewritten, so a redeploy
// always gets new URLs and browsers never keep stale styling. Order matters: fonts first (CSS refers to them), then CSS
// (its hash covers the rewritten font URLs), then everything else. Hashed files are served immutable (see _headers).
{
  const walk = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
  const map = new Map(); // '/assets/old.ext' -> '/assets/old.<hash>.ext'
  const web = (p) => '/' + p.slice(OUT.length + 1).split('\\').join('/');
  const textFiles = () => [...walk(OUT).filter((f) => f.endsWith('.html')), ...walk(join(OUT, 'assets')).filter((f) => f.endsWith('.css'))];
  const rewrite = (files) => { for (const f of files) { let t = readFileSync(f, 'utf8'); const o = t; for (const [from, to] of [...map].sort((a, b) => b[0].length - a[0].length)) t = t.split(from).join(to); if (t !== o) writeFileSync(f, t); } };
  const hashOne = (f) => { const h = createHash('sha256').update(readFileSync(f)).digest('hex').slice(0, 10); const np = f.replace(/\.([^./\\]+)$/, `.${h}.$1`); renameSync(f, np); map.set(web(f), web(np)); };
  const STABLE = join(OUT, 'assets', 'issue-1') + sep; // email images: stable file names on purpose (referenced from sent emails), NOT fingerprinted, served with a short cache (see _headers)
  const assets = walk(join(OUT, 'assets')).filter((f) => !f.startsWith(STABLE));
  for (const f of assets.filter((f) => /\.(woff2|webp|png|svg|txt)$/.test(f))) hashOne(f);
  rewrite(walk(join(OUT, 'assets')).filter((f) => f.endsWith('.css')));
  hashOne(join(OUT, 'assets/style.css')); hashOne(join(OUT, 'assets/subscribe.js'));
  rewrite(textFiles());
  const unhashed = walk(join(OUT, 'assets')).filter((f) => !f.startsWith(STABLE)).filter((f) => !/\.[0-9a-f]{10}\.[a-z0-9]+$/.test(f));
  if (unhashed.length) throw new Error('unfingerprinted assets: ' + unhashed.join(', '));
}
// Cloudflare Pages reads _headers. `Cache-Control: no-transform` on /* stops Cloudflare injecting its Web Analytics beacon (the privacy page promises no analytics); Pages merges it with the per-path Cache-Control values. connect-src allows ONLY Kit's form endpoint (used when the visitor presses
// the subscribe button); nothing else can be fetched. form-action allows only Kit for the no-JavaScript POST.
const csp = `default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src https://app.kit.com; form-action 'self' https://app.kit.com; base-uri 'none'; frame-ancestors 'none'; object-src 'none'`;
// Cloudflare Pages JOINS Cache-Control values from every matching rule (it cannot override), so the immutable rule must not match /assets/issue-1/*.
// Hashed assets live at /assets/<file> and /assets/<dir>/*, so those are listed explicitly (single-segment placeholder + one rule per subfolder), and the stable-named email images get a short cache.
const IMMUTABLE = 'Cache-Control: public, max-age=31536000, immutable';
const assetDirs = readdirSync(join(OUT, 'assets')).filter((d) => statSync(join(OUT, 'assets', d)).isDirectory() && d !== 'issue-1');
const assetRules = [['/assets/:file', IMMUTABLE], ...assetDirs.map((d) => [`/assets/${d}/*`, IMMUTABLE]), ['/assets/issue-1/*', 'Cache-Control: public, max-age=3600']].map(([p, h]) => `${p}\n  ${h}\n\n`).join('');
writeFileSync(join(OUT, '_headers'), `/*\n  Content-Security-Policy: ${csp}\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n  Cache-Control: no-transform\n\n/welcome\n  X-Robots-Tag: noindex, nofollow\n\n/welcome/*\n  X-Robots-Tag: noindex, nofollow\n  Cache-Control: public, max-age=0, must-revalidate\n\n${assetRules}/\n  Cache-Control: public, max-age=0, must-revalidate\n\n/archive/*\n  Cache-Control: public, max-age=0, must-revalidate\n\n/about/*\n  Cache-Control: public, max-age=0, must-revalidate\n\n/privacy/*\n  Cache-Control: public, max-age=0, must-revalidate\n\n/404.html\n  Cache-Control: public, max-age=0, must-revalidate\n\n/sitemap.xml\n  Cache-Control: public, max-age=0, must-revalidate\n\n/robots.txt\n  Cache-Control: public, max-age=0, must-revalidate\n`);
console.log(`built ${Object.keys(pages).length + 1} pages, ${builds.length} build(s); Kit form ${kitConfigured ? 'CONFIGURED' : 'NOT configured (placeholder)'}`);
