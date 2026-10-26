// Proves the configured form posts the right fields to Kit WITHOUT contacting Kit:
// builds a throwaway copy with a fake form ID, and aborts the outgoing request while recording it.
import { chromium } from 'playwright-core';
import { mkdtempSync, cpSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync, spawn } from 'node:child_process';
import { tmpdir } from 'node:os'; import { join } from 'node:path';
import assert from 'node:assert/strict';
const dir = mkdtempSync(join(tmpdir(), 'sbcfg-'));
for (const f of ['build.mjs', 'site.config.mjs', 'data', 'public', 'tools/serve.mjs']) cpSync(f, join(dir, f), { recursive: true });
const cfg = join(dir, 'site.config.mjs'); writeFileSync(cfg, readFileSync(cfg, 'utf8').replace("KIT_FORM_ID = 'REPLACE_ME'", "KIT_FORM_ID = '1234567'").replace("KIT_CONSENT_TEXT = ''", "KIT_CONSENT_TEXT = 'Consent line supplied by Kit.'"));
execFileSync('node', ['build.mjs'], { cwd: dir });
const srv = spawn('node', ['tools/serve.mjs', 'dist', '5175'], { cwd: dir }); await new Promise((r) => setTimeout(r, 600));
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? '/usr/bin/google-chrome', args: ['--no-sandbox'] });
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } }); const seen = [];
  await page.route('https://app.kit.com/**', (route) => { seen.push({ url: route.request().url(), method: route.request().method(), body: route.request().postData() }); route.abort(); });
  await page.goto('http://localhost:5175/', { waitUntil: 'networkidle' });
  await page.fill('[name="fields[first_name]"]', 'Tim'); await page.fill('[name="email_address"]', 'tim@example.com');
  await page.click('button[type=submit]').catch(() => {}); await page.waitForTimeout(800);
  assert.equal(seen.length, 1, 'one request to Kit attempted'); assert.equal(seen[0].method, 'POST'); assert.equal(seen[0].url, 'https://app.kit.com/forms/1234567/subscriptions');
  assert.match(decodeURIComponent(seen[0].body.replace(/\+/g, ' ')), /fields\[first_name\]=Tim/); assert.match(decodeURIComponent(seen[0].body), /email_address=tim@example\.com/);
  assert.doesNotMatch(seen[0].body, /website=/);
  console.log('configured form OK: POST', seen[0].url, 'body:', decodeURIComponent(seen[0].body.replace(/\+/g, ' ')), '(request aborted; Kit not contacted)');
} finally { await browser.close(); srv.kill(); }
