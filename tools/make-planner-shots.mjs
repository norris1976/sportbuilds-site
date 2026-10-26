// Re-takes the planner screenshots used on the home and archive pages from the LIVE planner (example data only).
// Usage: node tools/make-planner-shots.mjs [plannerUrl]   -> public/assets/img/5k-*.webp (needs python3 + Pillow for the WebP step)
import { chromium } from 'playwright-core';
import { execFileSync } from 'node:child_process';
const url = process.argv[2] ?? 'https://5k.sportbuilds.co/';
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const out = 'public/assets/img'; const tmp = '/tmp/planner-shots';
execFileSync('mkdir', ['-p', tmp]);
const fill = async (page) => { await page.fill('#pb', '24:30'); await page.fill('#target', '23:45'); await page.fill('#age', '42');
  await page.selectOption('#category', 'M'); await page.selectOption('#profile', 'rolling'); await page.selectOption('#strategy', 'negative'); };
// desktop: 720 x 720 window onto the top of the form
{ const ctx = await browser.newContext({ viewport: { width: 720, height: 720 }, deviceScaleFactor: 1, colorScheme: 'light' }); const p = await ctx.newPage();
  await p.goto(url, { waitUntil: 'networkidle' }); await fill(p); await p.evaluate(() => document.activeElement?.blur()); await p.screenshot({ path: `${tmp}/5k-desktop.png` }); await ctx.close(); }
// phone: 390 x 750 CSS px at 1.2308x = 480 x 923
const phone = { viewport: { width: 390, height: 750 }, deviceScaleFactor: 480 / 390, isMobile: true, hasTouch: true, colorScheme: 'light' };
{ const ctx = await browser.newContext(phone); const p = await ctx.newPage(); await p.goto(url, { waitUntil: 'networkidle' }); await fill(p); await p.evaluate(() => document.activeElement?.blur());
  await p.screenshot({ path: `${tmp}/5k-phone-form.png` });
  await p.click('button.primary[type=submit]'); await p.waitForSelector('#results:not([hidden])');
  await p.evaluate(() => { const r = document.querySelector('#results'); window.scrollTo(0, r.getBoundingClientRect().top + scrollY - 8); }); await p.waitForTimeout(300);
  await p.screenshot({ path: `${tmp}/5k-phone-result.png` }); await ctx.close(); }
await browser.close();
execFileSync('python3', ['-c', `
from PIL import Image
for n in ['5k-desktop','5k-phone-form','5k-phone-result']:
    im = Image.open('${tmp}/'+n+'.png').convert('RGB'); print(n, im.size); im.save('${out}/'+n+'.webp', quality=84, method=6)
    import colorsys
    px=list(Image.open('${out}/'+n+'.webp').convert('RGB').getdata())[::7]
    g=sum(1 for r,gg,b in px if max(r,gg,b)>38 and (lambda h,s,v: 80<=h*360<=170 and s>.25)(*colorsys.rgb_to_hsv(r/255,gg/255,b/255)))
    print('  green-ish pixels:', g); assert g==0
`], { stdio: 'inherit' });
