// Exercises the subscribe form WITHOUT ever contacting Kit.
// Kit's host is blocked three ways: Chrome maps app.kit.com to 127.0.0.1 (nothing can leave the box),
// Playwright intercepts and answers every request to it with canned responses, and every request is recorded.
// Usage: node tools/verify-kit-form.mjs [baseUrl] [screenshotDir] [suffix]
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import assert from 'node:assert/strict';

const base = (process.argv[2] ?? 'http://localhost:5174').replace(/\/$/, '');
const out = process.argv[3] ?? 'docs/screenshots'; const tag = process.argv[4] ?? 'kit';
mkdirSync(out, { recursive: true });
const ACTION = 'https://app.kit.com/forms/10098455/subscriptions';
const FAKE = { email: 'form-test@example.invalid', name: 'Testy' };   // never delivered anywhere
const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'POST, OPTIONS' };
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? '/usr/bin/google-chrome', args: ['--no-sandbox', '--host-resolver-rules=MAP app.kit.com 127.0.0.1'] });

async function scenario(name, { mode, js = true, viewport = { width: 390, height: 844 }, fill = true, shot }) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 2, isMobile: viewport.width < 600, hasTouch: viewport.width < 600, javaScriptEnabled: js });
  const kit = []; const external = []; const errs = [];
  await ctx.route('https://app.kit.com/**', async (route) => {
    const req = route.request();
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    kit.push({ method: req.method(), url: req.url(), headers: req.headers(), body: req.postData() });
    if (mode === 'abort') return route.abort('failed');
    if (mode === 'success') return route.fulfill({ status: 200, headers: { ...cors, 'content-type': 'application/json' }, body: JSON.stringify({ status: 'success' }) });
    if (mode === 'quarantined') return route.fulfill({ status: 200, headers: { ...cors, 'content-type': 'application/json' }, body: JSON.stringify({ consent: { enabled: false }, status: 'quarantined', url: 'https://app.kit.com/forms/guards/abc' }) });
    if (mode === 'error') return route.fulfill({ status: 200, headers: { ...cors, 'content-type': 'application/json' }, body: JSON.stringify({ status: 'error', errors: { fields: ['email_address'], messages: ['Email address is invalid'] } }) });
    if (mode === 'http500') return route.fulfill({ status: 500, headers: cors, body: 'nope' });
    return route.fulfill({ status: 200, headers: { 'content-type': 'text/html' }, body: '<p>stub</p>' });
  });
  const page = await ctx.newPage();
  page.on('request', (r) => { const u = r.url(); if (!u.startsWith(base) && !u.startsWith('data:') && !u.startsWith(ACTION.slice(0, 20))) external.push(u); });
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type()) && !/Failed to load resource/.test(m.text())) errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push(e.message));
  await page.goto(base + '/', { waitUntil: 'networkidle' });
  assert.equal(kit.length, 0, name + ': nothing sent on page load');
  if (fill) { await page.fill('[name="fields[first_name]"]', FAKE.name); await page.fill('[name="email_address"]', FAKE.email); }
  await page.click('button[type=submit]'); await page.waitForTimeout(700);
  assert.deepEqual(external, [], name + ': external requests'); assert.deepEqual(errs, [], name + ': console errors');
  return { page, ctx, kit };
}
const results = [];
const ok = (n, extra = '') => { results.push(n); console.log('ok  ', n, extra); };

// 1. success (fetch path)
{ const { page, ctx, kit } = await scenario('success', { mode: 'success' });
  assert.equal(kit.length, 1); const r = kit[0];
  assert.equal(r.method, 'POST'); assert.equal(r.url, ACTION); assert.match(r.headers['content-type'], /^multipart\/form-data/);
  assert.match(r.headers['accept'], /application\/json/); assert.equal(r.headers['x-ckjs-version'], '6');
  const names = [...r.body.matchAll(/name="([^"]+)"/g)].map((m) => m[1]).sort(); assert.deepEqual(names, ['ckjs_version', 'email_address', 'fields[first_name]', 'host'], 'first name + email + non-personal page metadata only');
  assert.match(r.body, /form-test@example\.invalid/);
  assert.equal(await page.textContent('#subscribe-msg'), 'Check your inbox to confirm your subscription.');
  assert.equal(await page.isVisible('[name="email_address"]'), false, 'fields hidden after success');
  await page.locator('#subscribe').screenshot({ path: `${out}/form-success-390-${tag}.png` });
  ok('fetch success: one POST, name+email+host+ckjs_version, inline thank-you', `(sent fields: ${names.join(', ')})`); await ctx.close(); }

// 1b. quarantined: Kit wants its security check; must NOT claim the inbox will get an email
{ const { page, ctx, kit } = await scenario('quarantined', { mode: 'quarantined' });
  assert.equal(kit.length, 1); const m = await page.textContent('#subscribe-msg');
  assert.doesNotMatch(m, /Check your inbox/); assert.match(m, /One more step/);
  assert.equal(await page.getAttribute('#subscribe-msg a', 'href'), 'https://app.kit.com/forms/guards/abc');
  await page.locator('#subscribe').screenshot({ path: `${out}/form-quarantined-390-${tag}.png` }); ok('quarantined: honest "one more step" with link to Kit security check'); await ctx.close(); }

// 2. Kit validation error
{ const { page, ctx, kit } = await scenario('kit error', { mode: 'error' });
  assert.equal(kit.length, 1); assert.equal(await page.textContent('#subscribe-msg'), 'Email address is invalid');
  assert.equal(await page.isEnabled('button[type=submit]'), true); assert.equal(await page.isVisible('[name="email_address"]'), true, 'form stays usable');
  await page.locator('#subscribe').screenshot({ path: `${out}/form-kit-error-390-${tag}.png` }); ok('Kit error message shown, form usable again'); await ctx.close(); }

// 3. network failure (request aborted)
{ const { page, ctx, kit } = await scenario('network failure', { mode: 'abort' });
  const m = await page.textContent('#subscribe-msg'); assert.match(m, /couldn.t confirm your sign-up/); assert.doesNotMatch(m, /Check your inbox/);
  assert.equal(await page.getAttribute('#subscribe-msg a', 'href'), 'https://sport-builds.kit.com/7b44b294d8');
  assert.equal(await page.isEnabled('button[type=submit]'), true);
  await page.locator('#subscribe').screenshot({ path: `${out}/form-network-failure-390-${tag}.png` }); ok('network failure: honest message, fallback link, no fake success'); await ctx.close(); }

// 4. HTTP 500
{ const { page, ctx } = await scenario('http 500', { mode: 'http500' });
  assert.match(await page.textContent('#subscribe-msg'), /didn.t go through/); ok('HTTP 500: generic error, no success'); await ctx.close(); }

// 5. validation: empty and invalid email send nothing
{ const { page, ctx, kit } = await scenario('empty', { mode: 'success', fill: false }); assert.equal(kit.length, 0);
  const valid = await page.$eval('#subscribe-form', (f) => f.checkValidity()); assert.equal(valid, false);
  await page.fill('[name="fields[first_name]"]', 'Testy'); await page.fill('[name="email_address"]', 'not-an-email'); await page.click('button[type=submit]'); await page.waitForTimeout(400);
  assert.equal(kit.length, 0, 'invalid email: nothing sent');
  assert.equal(await page.$eval('[name="email_address"]', (e) => e.validity.typeMismatch), true);
  await page.locator('#subscribe').screenshot({ path: `${out}/form-validation-390-${tag}.png` }); ok('empty and invalid email: blocked by browser validation, nothing sent'); await ctx.close(); }

// 6. no JavaScript: native POST to Kit
{ const { page, ctx, kit } = await scenario('no js', { mode: 'html', js: false });
  assert.equal(kit.length, 1); assert.equal(kit[0].method, 'POST'); assert.equal(kit[0].url, ACTION);
  assert.match(kit[0].headers['content-type'], /application\/x-www-form-urlencoded/);
  assert.match(decodeURIComponent(kit[0].body.replace(/\+/g, ' ')), /^fields\[first_name\]=Testy&email_address=form-test@example\.invalid$/);
  ok('JavaScript off: native form POST to the Kit action URL, only 2 fields'); await ctx.close(); }

// 7. desktop render + a real-size screenshot of the idle form
{ const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } }); const page = await ctx.newPage(); const kit = [];
  await ctx.route('https://app.kit.com/**', (r) => { kit.push(1); r.abort(); });
  await page.goto(base + '/', { waitUntil: 'networkidle' });
  assert.equal(await page.textContent('#subscribe button[type=submit]'), 'Send me the weekly build');
  assert.equal(kit.length, 0); await page.locator('#subscribe').screenshot({ path: `${out}/form-idle-1280-${tag}.png` }); ok('desktop: form renders, nothing sent on load'); await ctx.close(); }
await browser.close();
console.log(`\n${results.length} form scenarios passed (Kit never contacted)`);
