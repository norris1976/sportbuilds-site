// Static site generator. Zero dependencies: `node build.mjs` writes ./dist
// Pages: /, /archive/, /welcome/, /about/, /privacy/, /404.html, sitemap.xml, robots.txt, _headers
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, existsSync } from 'node:fs';
import { join } from 'node:path';
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
<meta name="theme-color" content="#0b3d2e">
${noindex ? '<meta name="robots" content="noindex, nofollow">' : `<link rel="canonical" href="${esc(canon)}">`}
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(C.SITE_NAME)}">
<meta property="og:title" content="${esc(full)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(canon)}">
<meta property="og:image" content="${esc(C.SITE_URL)}/assets/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Sport Builds: a different sports app, vibe-coded every week">
<meta property="og:locale" content="en_GB">
<meta name="twitter:card" content="summary_large_image">
<link rel="stylesheet" href="/assets/style.css">
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<header class="site-header">
  <div class="wrap">
    <a class="brand" href="/"><span class="mark" aria-hidden="true">SB</span><span>${esc(C.SITE_NAME)}</span></a>
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
  </div>
</footer>
${body.includes('id="subscribe-form"') ? '<script src="/assets/subscribe.js" defer></script>' : ''}
</body>
</html>
`;
}

const hero = (kicker, h1, lede, extra = '', slim = false) => `<section class="hero${slim ? ' slim' : ''}"><div class="wrap">
  <p class="kicker">${esc(kicker)}</p>
  <h1>${esc(h1)}</h1>
  ${lede ? `<p class="lede">${lede}</p>` : ''}
  ${extra}
</div></section>`;

const tagList = (b) => b.tags?.length ? `<ul class="tags" aria-label="Tags">${b.tags.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : '';

function buildCard(b, { featured = false, heading = 'h3', label = '' } = {}) {
  return `<article class="card build${featured ? ' featured' : ''}">
  <div class="meta">${label ? `<strong>${esc(label)}</strong>` : ''}<span class="badge">Issue ${b.issue}</span><time datetime="${esc(b.date)}">${fmtDate(b.date)}</time></div>
  <${heading}>${esc(b.title)}</${heading}>
  <p>${esc(b.description)}</p>
  ${tagList(b)}
  <div class="links">
    <a class="btn primary" href="${esc(b.url)}" rel="noopener">Open the tool <span aria-hidden="true">&rarr;</span><span class="sr-only"> (${esc(host(b.url))})</span></a>
    <a class="btn" href="${esc(b.repo)}" rel="noopener">Source code</a>
  </div>
  ${b.fallbackUrl ? `<p class="mirror">Also available at <a href="${esc(b.fallbackUrl)}" rel="noopener">${esc(host(b.fallbackUrl))}</a>.</p>` : ''}
</article>`;
}

function signup(idSuffix = '') {
  const consent = C.KIT_CONSENT_TEXT.trim()
    ? `<p class="consent">${esc(C.KIT_CONSENT_TEXT.trim())}</p>`
    : `<p class="placeholder" role="note">PLACEHOLDER: paste Kit's own consent text here (KIT_CONSENT_TEXT in site.config.mjs). Not written yet on purpose.</p>`;
  const action = kitConfigured ? ` action="https://app.kit.com/forms/${C.KIT_FORM_ID}/subscriptions"` : '';
  const uid = kitConfigured && C.KIT_UID && C.KIT_UID !== 'REPLACE_ME' ? ` data-uid="${esc(C.KIT_UID)}"` : '';
  return `<section class="card signup" id="subscribe" aria-labelledby="subscribe-h">
  <h2 id="subscribe-h">Get the weekly build</h2>
  <p>One email a week: the new tool, how it was built, and what went wrong along the way.</p>
  <!-- TODO(KIT): form wiring lives in site.config.mjs (KIT_FORM_ID / KIT_UID / KIT_CONSENT_TEXT). Not connected until KIT_FORM_ID is a real number. -->
  <form id="subscribe-form" method="post"${action} data-configured="${kitConfigured}"${uid}${kitConfigured ? ` data-sv-form="${C.KIT_FORM_ID}"` : ''}>
    <div class="row">
      <label>First name
        <input type="text" name="fields[first_name]" autocomplete="given-name" autocapitalize="words" enterkeyhint="next" required>
      </label>
      <label>Email address
        <input type="email" name="email_address" autocomplete="email" inputmode="email" autocapitalize="none" spellcheck="false" enterkeyhint="send" required>
      </label>
    </div>
    ${consent}
    <button class="btn primary" type="submit" data-element="submit">Subscribe</button>
    <p id="subscribe-msg" class="msg" role="status" aria-live="polite" hidden></p>
    ${kitConfigured ? '' : `<p class="placeholder" role="note">PLACEHOLDER: the Kit form is not connected yet, so this button sends nothing.</p>`}
  </form>
</section>`;
}

const pages = {};
const sitemap = [];

// ── Home ────────────────────────────────────────────────────────────────
pages['/'] = layout({
  path: '/', title: C.SITE_NAME,
  description: 'A different sports app, vibe-coded every week, with honest build notes. Free weekly newsletter by Tim Norris.',
  hero: hero('Weekly newsletter', 'A different sports app, vibe-coded every week.', 'I build one small, useful sports tool each week with AI, then tell you honestly how it went: the prompts, what broke and what I fixed.', `<div class="cta"><a class="btn primary" href="#subscribe">Get the weekly build</a><a class="btn ghost" href="/archive/">Browse all builds</a></div>`),
  body: `<div class="wrap stack">
<section aria-labelledby="this-week"><h2 id="this-week" class="sr-only">This week\u2019s build</h2>
${buildCard(latest, { featured: true, label: 'This week\u2019s build' })}
</section>
<section class="card" aria-labelledby="how"><h2 id="how">How Sport Builds works</h2>
<ol class="steps">
  <li><strong>One idea a week</strong>A small sports tool that does one job well, built from a clear brief.</li>
  <li><strong>Built with AI</strong>Vibe-coded in public: real prompts, real tests, a live demo and open source code.</li>
  <li><strong>Honest notes</strong>Every issue says what broke and how it was fixed, not just the shiny result.</li>
</ol></section>
${older.length ? `<section aria-labelledby="recent"><h2 id="recent">Recent builds</h2><ul class="archive">${older.slice(0, 3).map((b) => `<li>${buildCard(b)}</li>`).join('')}</ul><p class="more"><a href="/archive/">See the full archive</a></p></section>` : `<p class="muted small">More builds are on the way, one a week. <a href="/archive/">See the archive</a>.</p>`}
${signup()}
</div>`,
});
sitemap.push('/');

// ── Archive ─────────────────────────────────────────────────────────────
pages['/archive/'] = layout({
  path: '/archive/', title: 'Archive',
  description: 'Every Sport Builds tool so far, newest first, each with a live demo and open source code.',
  hero: hero('Archive', 'Every build so far', `${builds.length} ${builds.length === 1 ? 'tool' : 'tools'}, newest first. Each lives on its own address and has open source code.`, '', true),
  body: `<div class="wrap stack"><ul class="archive">${builds.map((b, i) => `<li>${buildCard(b, { featured: i === 0, heading: 'h2' })}</li>`).join('')}</ul>
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
  <p class="links centered"><a class="btn primary" href="${esc(first.url)}" rel="noopener">Open the ${esc(first.title)} <span aria-hidden="true">&rarr;</span></a></p>
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
  <p>Sport Builds is a weekly newsletter. Each week I vibe-code a different sports app or tool with AI, put it online, publish the source code and write up how it went, including the parts that went wrong.</p>
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
  <p>Idea for a build, or spotted a bug? Reply to any newsletter email.</p>
  <p>Other contact:</p>
  <p>${contact}</p>
  <p><a class="btn primary" href="/#subscribe">Get the weekly build</a></p>
</section></div>`,
});
sitemap.push('/about/');

// ── Privacy ─────────────────────────────────────────────────────────────
pages['/privacy/'] = layout({
  path: '/privacy/', title: 'Privacy',
  description: 'How Sport Builds handles your data. Placeholder: full policy to follow.',
  hero: hero('Privacy', 'Privacy', '', '', true),
  body: `<div class="wrap stack"><section class="card prose" aria-labelledby="p1">
  <p class="placeholder" role="note">PLACEHOLDER: this is a short summary, not a finished privacy policy. A full policy will be published before launch.</p>
  <h2 id="p1">This website</h2>
  <ul>
    <li>This site sets no cookies and runs no analytics or tracking scripts of its own.</li>
    <li>It loads no third-party scripts, fonts or images.</li>
    <li>Like any website, it is served by a hosting provider (planned: Cloudflare Pages), which handles your request and may keep standard technical logs under its own policies.</li>
  </ul>
  <h2>Subscribing</h2>
  <ul>
    <li>If you subscribe, your first name and email address are sent to Kit, the email service used to run the newsletter, and are handled there under Kit&rsquo;s own terms and privacy policy.</li>
    <li>This site does not store your name or email address itself.</li>
  </ul>
  <h2>The tools</h2>
  <p>Each weekly tool is a separate website with its own address. The tools are built to work on what you type into them; each one says what it does with your input.</p>
  <h2>Contact</h2>
  <p>${contact}</p>
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
for (const [path, html] of Object.entries(pages)) {
  const dir = join(OUT, path); mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.html'), html);
}
writeFileSync(join(OUT, '404.html'), p404);
const lastmod = latest.date;
writeFileSync(join(OUT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemap.map((p) => `  <url><loc>${C.SITE_URL}${p}</loc><lastmod>${lastmod}</lastmod></url>`).join('\n')}\n</urlset>\n`);
writeFileSync(join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${C.SITE_URL}/sitemap.xml\n`);
// Cloudflare Pages reads _headers. connect-src 'none' enforces "no background network calls";
// form-action only allows posting to Kit.
const csp = `default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'none'; form-action 'self' https://app.kit.com https://kit.com; base-uri 'none'; frame-ancestors 'none'; object-src 'none'`;
writeFileSync(join(OUT, '_headers'), `/*\n  Content-Security-Policy: ${csp}\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n\n/welcome\n  X-Robots-Tag: noindex, nofollow\n\n/welcome/*\n  X-Robots-Tag: noindex, nofollow\n\n/assets/*\n  Cache-Control: public, max-age=3600\n`);
console.log(`built ${Object.keys(pages).length + 1} pages, ${builds.length} build(s); Kit form ${kitConfigured ? 'CONFIGURED' : 'NOT configured (placeholder)'}`);
