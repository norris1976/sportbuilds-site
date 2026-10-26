// Dependency-free tests: data validation, "add a week = one entry", Kit wiring is a one-line change,
// forbidden-content guard. Run: npm test
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, cpSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

let passed = 0;
const t = (name, fn) => { try { fn(); passed++; console.log('ok  ', name); } catch (e) { console.error('FAIL', name, '\n    ', e.message); process.exitCode = 1; } };
const builds = JSON.parse(readFileSync('data/builds.json', 'utf8'));

t('data: required fields, https URLs, ISO dates, unique issue numbers', () => {
  const seen = new Set();
  for (const b of builds) {
    for (const k of ['issue', 'title', 'description', 'date', 'url', 'repo', 'tags']) assert.ok(b[k] !== undefined && b[k] !== '', `issue ${b.issue} missing ${k}`);
    assert.ok(Number.isInteger(b.issue) && b.issue > 0); assert.ok(!seen.has(b.issue), 'duplicate issue ' + b.issue); seen.add(b.issue);
    assert.match(b.date, /^\d{4}-\d{2}-\d{2}$/); assert.ok(!Number.isNaN(Date.parse(b.date)));
    for (const k of ['url', 'repo', 'fallbackUrl']) if (b[k]) assert.match(b[k], /^https:\/\//, k);
    assert.match(b.repo, /^https:\/\/github\.com\/norris1976\//);
    assert.ok(Array.isArray(b.tags) && b.tags.length > 0);
  }
});

t('data: issue 1 is the Saturday 5K Pace Planner on its own subdomain', () => {
  const b = builds.find((x) => x.issue === 1);
  assert.equal(b.title, 'Saturday 5K Pace Planner'); assert.equal(b.url, 'https://5k.sportbuilds.co');
  assert.equal(b.repo, 'https://github.com/norris1976/saturday-5k-pace-planner');
});

function buildCopy(mutate) {
  const dir = mkdtempSync(join(tmpdir(), 'sbtest-'));
  for (const f of ['build.mjs', 'site.config.mjs', 'data', 'public', 'docs/logo-options']) cpSync(f, join(dir, f), { recursive: true, filter: (s) => !s.endsWith('.png') || !s.includes('logo-options') });
  mutate(dir);
  const out = execFileSync('node', ['build.mjs'], { cwd: dir }).toString();
  return { dir, out, read: (p) => readFileSync(join(dir, 'dist', p), 'utf8') };
}

t('adding one entry updates archive, home "latest" and sitemap unchanged otherwise', () => {
  const r = buildCopy((dir) => {
    const p = join(dir, 'data/builds.json'); const d = JSON.parse(readFileSync(p, 'utf8'));
    d.push({ issue: 2, title: 'Test Tool Two', description: 'Second tool.', date: '2026-11-02', url: 'https://two.sportbuilds.co', repo: 'https://github.com/norris1976/two', tags: ['test'] });
    writeFileSync(p, JSON.stringify(d));
  });
  const archive = r.read('archive/index.html'); const home = r.read('index.html');
  assert.match(archive, /Test Tool Two/); assert.match(archive, /Saturday 5K Pace Planner/);
  assert.ok(archive.indexOf('Test Tool Two') < archive.indexOf('Saturday 5K Pace Planner'), 'newest first');
  assert.match(home, /This week.s build<\/h2>[\s\S]*Test Tool Two/); assert.match(home, /Recent builds/);
  assert.match(r.read('welcome/index.html'), /Saturday 5K Pace Planner/, 'welcome still points at issue 1');
});

t('Kit wired: form action, field names, ids, button text, consent line, no checkbox', () => {
  const r = buildCopy(() => {}); const home = r.read('index.html');
  assert.match(r.out, /CONFIGURED/);
  const form = home.match(/<form id="subscribe-form"[\s\S]*?<\/form>/)[0];
  assert.match(form, /method="post"/); assert.match(form, /action="https:\/\/app\.kit\.com\/forms\/10098455\/subscriptions"/);
  assert.match(form, /data-configured="true"/); assert.match(form, /data-uid="7b44b294d8"/);
  const inputs = [...form.matchAll(/<input[^>]*>/g)].map((m) => m[0]);
  assert.equal(inputs.length, 2, 'exactly two inputs (first name + email)');
  assert.ok(inputs.some((i) => /name="fields\[first_name\]"/.test(i) && /type="text"/.test(i) && /autocomplete="given-name"/.test(i) && /required/.test(i)));
  assert.ok(inputs.some((i) => /name="email_address"/.test(i) && /type="email"/.test(i) && /autocomplete="email"/.test(i) && /required/.test(i)));
  assert.doesNotMatch(form, /type="checkbox"|checked|type="hidden"/, 'no checkbox, nothing pre-ticked, no hidden fields');
  assert.match(form, />Send me the weekly build<\/button>/);
  const consent = 'By subscribing you agree to receive the Sport Builds newsletter from Tim Norris. One confirmation email first; unsubscribe any time. See the <a href="/privacy/">privacy page</a>.';
  assert.ok(form.includes(consent), 'exact consent line with privacy link');
  assert.ok(form.indexOf('class="consent"') < form.indexOf('<button'), 'consent sits above the button');
  assert.doesNotMatch(form, /PLACEHOLDER/); assert.doesNotMatch(home, /powered|formkit|f\.convertkit|ck\.\d\.js/i, 'no Kit badge or embed JS');
});

t('footer on every page has the Nozza.co outbound link (rel=noopener) and nothing else external', () => {
  const r = buildCopy(() => {});
  for (const f of ['index.html', 'archive/index.html', 'welcome/index.html', 'about/index.html', 'privacy/index.html', '404.html']) {
    const foot = r.read(f).match(/<footer[\s\S]*?<\/footer>/)[0];
    assert.match(foot, /<a href="https:\/\/nozza\.co" rel="noopener">Built by Tim @ Nozza\.co<\/a>/, f);
    assert.equal((foot.match(/https?:\/\//g) ?? []).length, 1, f + ': only one external URL in the footer');
  }
});

t('contact address is set and the form/contact placeholders are gone; About bio and Privacy placeholders remain', () => {
  const r = buildCopy(() => {});
  assert.match(r.read('about/index.html'), /mailto:hello@sportbuilds\.co/); assert.match(r.read('privacy/index.html'), /mailto:hello@sportbuilds\.co/);
  assert.doesNotMatch(r.read('about/index.html') + r.read('privacy/index.html') + r.read('index.html'), /contact address to be confirmed|paste Kit|Kit form is not connected/);
  assert.match(r.read('about/index.html'), /PLACEHOLDER: Tim to add a short personal bio/); assert.match(r.read('privacy/index.html'), /PLACEHOLDER: this is a short summary/);
});

t('CSP allows exactly Kit for form posts and fetch, nothing broader', () => {
  const h = buildCopy(() => {}).read('_headers');
  assert.match(h, /connect-src https:\/\/app\.kit\.com;/); assert.match(h, /form-action 'self' https:\/\/app\.kit\.com;/);
  assert.match(h, /script-src 'self';/); assert.match(h, /style-src 'self';/); assert.doesNotMatch(h, /unsafe-|\*\./);
  assert.equal((h.match(/kit\.com/g) ?? []).length, 2, 'kit.com appears only in connect-src and form-action');
});

t('Kit not configured (REPLACE_ME): no form action, flagged unconfigured, placeholders visible', () => {
  const r = buildCopy((dir) => { const p = join(dir, 'site.config.mjs'); writeFileSync(p, readFileSync(p, 'utf8').replace("KIT_FORM_ID = '10098455'", "KIT_FORM_ID = 'REPLACE_ME'").replace(/KIT_CONSENT_TEXT = '.*?';/, "KIT_CONSENT_TEXT = '';")); });
  const home = r.read('index.html');
  assert.match(r.out, /NOT configured/); assert.match(home, /data-configured="false"/);
  assert.doesNotMatch(home, /<form[^>]*app\.kit\.com/); assert.match(home, /PLACEHOLDER: paste Kit/); assert.match(home, /PLACEHOLDER: the Kit form is not connected/);
});

t('design: fonts self-hosted with licence, preloaded, no external font/CSS requests', () => {
  const css = readFileSync('public/assets/style.css', 'utf8'); const r = buildCopy(() => {}); const home = r.read('index.html');
  const faces = [...css.matchAll(/url\((\/assets\/fonts\/[^)]+\.woff2)\)/g)].map((m) => m[1]);
  assert.ok(faces.length >= 3, 'three font files'); for (const f of faces) assert.ok(statSync('public' + f).size > 5000, f);
  assert.doesNotMatch(css, /url\(\s*['"]?https?:|@import/i); assert.match(readFileSync('public/assets/fonts/LICENSE.txt', 'utf8'), /SIL OPEN FONT LICENSE Version 1\.1/i);
  assert.match(home, /rel="preload"[^>]+inter-var\.woff2[^>]+crossorigin/);
  assert.match(css, /prefers-reduced-motion: no-preference/); assert.match(css, /font-display:swap/);
});

t('design: every <img> has alt text, width and height; WebP files are small', () => {
  const r = buildCopy(() => {});
  for (const f of ['index.html', 'archive/index.html']) for (const m of r.read(f).matchAll(/<img[^>]*>/g)) {
    assert.match(m[0], /alt="[^"]{20,}"/, 'alt text: ' + m[0].slice(0, 80)); assert.match(m[0], /width="\d+"/); assert.match(m[0], /height="\d+"/);
    const src = m[0].match(/src="([^"]+)"/)[1]; assert.ok(statSync('public' + src).size < 60000, src + ' under 60 KB');
  }
});

t('design: logo comes from LOGO_OPTION (header lockup + favicon), one-line swap', () => {
  const home = buildCopy(() => {}).read('index.html'); assert.match(home, /<a class="brand"[^>]*aria-label="Sport Builds, home"><svg[^>]*aria-hidden="true"/);
  for (const k of ['a', 'b', 'c', 'b-final']) {
    const r = buildCopy((dir) => { const p = join(dir, 'site.config.mjs'); writeFileSync(p, readFileSync(p, 'utf8').replace(/LOGO_OPTION = '[\w-]+'/, `LOGO_OPTION = '${k}'`)); });
    assert.equal(r.read('favicon.svg'), readFileSync(`docs/logo-options/option-${k}-mark.svg`, 'utf8')); assert.match(r.read('index.html'), new RegExp('<svg[^>]*class="logo"'));
  }
});

t('design: colour tokens meet WCAG AA (4.5:1 text, 3:1 for the accent focus/fill pairs) in light and dark', () => {
  const css = readFileSync('public/assets/style.css', 'utf8');
  const blocks = { light: css.match(/:root \{([^}]*)\}/)[1], dark: css.match(/prefers-color-scheme: dark\) \{\s*:root \{([^}]*)\}/)[1] };
  const vars = (b) => Object.fromEntries([...b.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})/g)].map((m) => [m[1], m[2]]));
  const L = (h) => { const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  const ratio = (a, b) => { const [x, y] = [L(a), L(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const light = vars(blocks.light), dark = { ...light, ...vars(blocks.dark) };
  const pairs = [['ink', 'paper'], ['muted', 'paper'], ['muted', 'card'], ['ink', 'card'], ['link', 'paper'], ['eyebrow', 'paper'], ['on-accent', 'accent'], ['on-band', 'band'], ['on-band-muted', 'band'], ['accent', 'band'], ['ok', 'band'], ['bad', 'band'], ['warn', 'paper']];
  for (const [name, th] of [['light', light], ['dark', dark]]) for (const [f, b] of pairs) assert.ok(ratio(th[f], th[b]) >= 4.5, `${name}: ${f} on ${b} = ${ratio(th[f], th[b]).toFixed(2)}`);
  for (const [name, th] of [['light', light], ['dark', dark]]) assert.ok(ratio(th.focus, th.paper) >= 3, name + ' focus ring contrast');
});

t('design: final palette has no green (css, svg logos used by the site, images config)', () => {
  const css = readFileSync('public/assets/style.css', 'utf8');
  const hexes = [...new Set([...css.matchAll(/#([0-9a-fA-F]{6})\b/g)].map((m) => m[1].toLowerCase()))];
  const hsl = (h) => { const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255); const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; if (!d) return [0, 0, mx]; let hh = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return [(hh * 60 + 360) % 360, d / (1 - Math.abs(mx + mn - 1)), (mx + mn) / 2]; };
  for (const h of hexes) { const [hue, sat, l] = hsl(h); assert.ok(!(hue > 70 && hue < 190 && sat > 0.08 && l > 0.03), `green-ish colour #${h} in style.css`); }
  for (const f of ['option-b-final', 'option-b-final-mark', 'option-b-final-dark', 'option-b-final-light', 'option-b-final-mark-light']) {
    const svg = readFileSync(`docs/logo-options/${f}.svg`, 'utf8'); assert.doesNotMatch(svg, /0b3d2e|14604a/i, f + ' must not use the old green');
  }
  assert.match(readFileSync('site.config.mjs', 'utf8'), /LOGO_OPTION = 'b-final'/);
});

t('welcome is noindex and not in the sitemap; others are indexable', () => {
  const r = buildCopy(() => {});
  assert.match(r.read('welcome/index.html'), /<meta name="robots" content="noindex, nofollow">/);
  assert.match(r.read('404.html'), /noindex/); assert.doesNotMatch(r.read('sitemap.xml'), /welcome/);
  for (const p of ['index.html', 'archive/index.html', 'about/index.html', 'privacy/index.html']) assert.doesNotMatch(r.read(p), /noindex/, p);
  assert.match(r.read('_headers'), /\/welcome[\s\S]*X-Robots-Tag: noindex/);
});

t('guard: no forbidden terms (brand/employer) anywhere in the repo', () => {
  const bad = new RegExp(['park\\s?run', 'stat' + 'sports', 'stats' + 'ports'].join('|'), 'i');
  const walk = (d) => readdirSync(d).flatMap((f) => { if (['.git', 'node_modules', 'dist'].includes(f)) return []; const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
  for (const f of walk('.')) { if (/\.(png|ico)$/.test(f) || f.endsWith('test/run.mjs')) continue; assert.doesNotMatch(readFileSync(f, 'utf8'), bad, f); }
});

t('built pages make no external references except outbound <a> links', () => {
  const r = buildCopy(() => {});
  for (const p of ['index.html', 'archive/index.html', 'welcome/index.html', 'about/index.html', 'privacy/index.html', '404.html']) {
    const html = r.read(p);
    assert.doesNotMatch(html, /<(script|link|img|iframe)[^>]+(src|href)="https?:\/\/(?!sportbuilds\.co)/, p + ' loads an external resource');
    assert.doesNotMatch(html, /\sstyle="/, p + ' has an inline style attribute (blocked by CSP)');
    assert.doesNotMatch(html, /<script(?![^>]*src=)/, p + ' has an inline script');
  }
});
console.log(`\n${passed} passed`);
