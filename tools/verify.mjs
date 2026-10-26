// End-to-end checks in headless Chrome against a served ./dist.
// Usage: node tools/verify.mjs [baseUrl] [screenshotDir] [prefix]
// Checks every page at 390px and 1280px: status, console errors, external requests, horizontal overflow,
// heading/landmark basics, internal links + assets resolve, noindex on /welcome/ and 404, form behaviour.
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import assert from 'node:assert/strict';

const base = (process.argv[2] ?? 'http://localhost:5174').replace(/\/$/, '');
const out = process.argv[3] ?? 'docs/screenshots';
const tag = process.argv[4] ?? 'v1';
mkdirSync(out, { recursive: true });
const pages = [['home', '/'], ['archive', '/archive/'], ['welcome', '/welcome/'], ['about', '/about/'], ['privacy', '/privacy/'], ['404', '/does-not-exist/']];
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? '/usr/bin/google-chrome', args: ['--no-sandbox', '--host-resolver-rules=MAP app.kit.com 127.0.0.1'] });
const problems = []; const seenInternal = new Set(); const externalLinks = new Set();
const log = (...a) => console.log(...a);

for (const [vpName, vp, mobile] of [['390', { width: 390, height: 844 }, true], ['1280', { width: 1280, height: 800 }, false]]) {
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile });
  for (const [name, path] of pages) {
    const page = await ctx.newPage();
    const external = []; const errs = [];
    page.on('request', (r) => { if (!r.url().startsWith(base) && !r.url().startsWith('data:')) external.push(r.url()); });
    page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
    page.on('console', (m) => { if (['error', 'warning'].includes(m.type()) && !(name === '404' && /status of 404/.test(m.text()))) errs.push(`console ${m.type()}: ${m.text()}`); });
    page.on('response', (r) => { if (r.status() >= 400 && r.url().startsWith(base) && !(name === '404' && r.url().endsWith(path))) errs.push(`HTTP ${r.status()} ${r.url()}`); });
    const resp = await page.goto(base + path, { waitUntil: 'networkidle' });
    const expect = name === '404' ? 404 : 200;
    if (resp.status() !== expect) errs.push(`status ${resp.status()} (wanted ${expect})`);
    const info = await page.evaluate(() => ({
      lang: document.documentElement.lang, title: document.title, h1: document.querySelectorAll('h1').length,
      desc: document.querySelector('meta[name=description]')?.content ?? '', robots: document.querySelector('meta[name=robots]')?.content ?? '',
      canonical: document.querySelector('link[rel=canonical]')?.href ?? '', ogImage: document.querySelector('meta[property="og:image"]')?.content ?? '',
      main: !!document.querySelector('main#main'), overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      imgNoAlt: [...document.images].filter((i) => !i.hasAttribute('alt')).length,
      links: [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')),
      unlabelled: [...document.querySelectorAll('input:not([type=hidden])')].filter((i) => !i.labels?.length && !i.getAttribute('aria-label')).length,
      smallTargets: [...document.querySelectorAll('a.btn, button, nav a')].filter((e) => { const r = e.getBoundingClientRect(); return r.height > 0 && r.height < 44; }).length,
    }));
    if (info.lang !== 'en-GB') errs.push('lang is ' + info.lang);
    if (info.h1 !== 1) errs.push('h1 count ' + info.h1);
    if (!info.main) errs.push('no main landmark');
    if (info.overflow > 0) errs.push('horizontal overflow ' + info.overflow + 'px');
    if (info.imgNoAlt) errs.push('img without alt');
    if (info.unlabelled) errs.push('unlabelled inputs');
    if (info.smallTargets) errs.push(info.smallTargets + ' tap targets under 44px');
    if (info.desc.length < (name === '404' ? 20 : 40) || info.desc.length > 200) errs.push('description length ' + info.desc.length);
    if (['welcome', '404'].includes(name)) { if (!/noindex/.test(info.robots)) errs.push('missing noindex'); }
    else { if (!info.canonical.startsWith('https://')) errs.push('canonical missing'); if (/noindex/.test(info.robots)) errs.push('unexpected noindex'); }
    if (!info.ogImage.endsWith('/assets/og.png')) errs.push('og:image missing');
    if (external.length) errs.push('EXTERNAL REQUESTS: ' + external.join(', '));
    for (const h of info.links) { if (h.startsWith('/')) seenInternal.add(h.split('#')[0] || '/'); else if (/^https?:/.test(h)) externalLinks.add(h); }
    if (name !== '404') await page.screenshot({ path: `${out}/${name}-${vpName}-${tag}.png`, fullPage: true });
    else await page.screenshot({ path: `${out}/404-${vpName}-${tag}.png`, fullPage: true });
    log(`${errs.length ? 'FAIL' : 'ok  '} ${vpName}px ${path} "${info.title}"${errs.length ? ' :: ' + errs.join(' | ') : ''}`);
    problems.push(...errs.map((e) => `${vpName}px ${path}: ${e}`));
    await page.close();
  }
  await ctx.close();
}

// internal links and assets resolve
const ctx = await browser.newContext(); const api = ctx.request;
const checkPaths = [...seenInternal, '/favicon.svg', '/apple-touch-icon.png', '/assets/og.png', '/assets/style.css', '/assets/subscribe.js', '/sitemap.xml', '/robots.txt'];
for (const p of checkPaths) { const r = await api.get(base + p); if (r.status() !== 200) problems.push(`broken link ${p} -> ${r.status()}`); }
const sm = await (await api.get(base + '/sitemap.xml')).text();
if (/welcome/.test(sm)) problems.push('welcome page must not be in sitemap');
if (process.env.CHECK_HEADERS === '1') {
  for (const p of ['/', '/archive/', '/about/', '/privacy/', '/welcome/']) {
    const h = (await api.get(base + p)).headers();
    if (!/connect-src https:\/\/app\.kit\.com; form-action 'self' https:\/\/app\.kit\.com;/.test(h['content-security-policy'] ?? '')) problems.push(`${p}: CSP header missing`);
    if (h['x-content-type-options'] !== 'nosniff') problems.push(`${p}: nosniff missing`);
    if (!h['referrer-policy']) problems.push(`${p}: referrer-policy missing`);
    if (p === '/welcome/' && !/noindex/.test(h['x-robots-tag'] ?? '')) problems.push('/welcome/: X-Robots-Tag noindex missing');
    if (p !== '/welcome/' && h['x-robots-tag']) problems.push(`${p}: unexpected X-Robots-Tag`);
  }
  const ah = (await api.get(base + '/assets/style.css')).headers(); log('assets cache-control:', ah['cache-control']);
  log('security headers checked on 5 pages');
}
log('internal paths checked:', checkPaths.length, '| external links (not fetched):', [...externalLinks].join(', '));
await ctx.close();

// form behaviour on a phone-sized viewport
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const kitRequests = []; await ctx.route('https://app.kit.com/**', (r) => { kitRequests.push(r.request().url()); r.abort(); });
  const page = await ctx.newPage();
  await page.goto(base + '/', { waitUntil: 'networkidle' });
  const attrs = await page.evaluate(() => Object.fromEntries(['fields[first_name]', 'email_address'].map((n) => { const e = document.querySelector(`[name="${n}"]`); return [n, { type: e.type, autocomplete: e.autocomplete, inputMode: e.inputMode, required: e.required, fontSize: getComputedStyle(e).fontSize }]; })));
  assert.equal(attrs.email_address.type, 'email'); assert.equal(attrs.email_address.autocomplete, 'email'); assert.equal(attrs.email_address.required, true);
  assert.equal(attrs['fields[first_name]'].autocomplete, 'given-name'); assert.ok(parseFloat(attrs.email_address.fontSize) >= 16, 'inputs >=16px so iOS does not zoom');
  log('form attrs', JSON.stringify(attrs));
  await page.tap('[name="fields[first_name]"]'); await page.keyboard.type('Tim');
  await page.tap('[name="email_address"]'); await page.keyboard.type('tim@example.com');
  assert.equal(await page.inputValue('[name="email_address"]'), 'tim@example.com');
  await page.locator('#subscribe').scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${out}/form-filled-390-${tag}.png` });
  assert.equal(await page.getAttribute('#subscribe-form', 'action'), 'https://app.kit.com/forms/10098455/subscriptions');
  assert.equal(await page.locator('#subscribe-form input[type=checkbox]').count(), 0, 'no checkbox');
  assert.equal(await page.textContent('#subscribe button[type=submit]'), 'Send me the weekly build');
  assert.equal(kitRequests.length, 0, 'nothing is sent to Kit on load or while typing');
  log('form renders and is filled (NOT submitted here; submit behaviour is covered by tools/verify-kit-form.mjs with Kit requests intercepted)');
  await ctx.close();
}
await browser.close();
if (problems.length) { console.error('\nPROBLEMS:\n' + problems.join('\n')); process.exit(1); }
console.log('\nALL CHECKS PASSED');
