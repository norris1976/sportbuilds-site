// Regenerates the two email images for issue 1 from the LIVE planner (example data only), into public/assets/issue-1/.
// Usage: node tools/make-issue-1-email-images.mjs [plannerUrl]   (needs google-chrome, playwright-core, python3 + Pillow)
import { chromium } from 'playwright-core';
import { execFileSync } from 'node:child_process';
const url = process.argv[2] ?? 'https://5k.sportbuilds.co/';
const tmp = process.env.TMP_DIR ?? '/tmp/issue-1-shots';
execFileSync('mkdir', ['-p', tmp, 'public/assets/issue-1']);
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const fill = async (p) => { await p.fill('#pb', '24:30'); await p.fill('#target', '23:45'); await p.fill('#age', '42');
  await p.selectOption('#category', 'M'); await p.selectOption('#profile', 'rolling'); await p.selectOption('#strategy', 'negative'); };
const calc = async (p) => { await p.click('button.primary[type=submit]'); await p.waitForSelector('#results:not([hidden])'); await p.waitForTimeout(400); };
const bottomOf = (p, sel, pad) => p.evaluate(([s, pd]) => { const r = document.querySelector(s).getBoundingClientRect(); return Math.ceil(r.bottom + scrollY + pd); }, [sel, pad]);
// (a) desktop: 1200 CSS px wide, dark theme (the planner default); page top down to the end of the per-km splits
{ const ctx = await browser.newContext({ viewport: { width: 1200, height: 1000 }, deviceScaleFactor: 1, colorScheme: 'dark' }); const p = await ctx.newPage();
  await p.goto(url, { waitUntil: 'networkidle' }); await fill(p); await calc(p); await p.evaluate(() => { document.activeElement?.blur(); window.scrollTo(0, 0); });
  const h = await bottomOf(p, '#splits-detail', 22);
  await p.screenshot({ path: `${tmp}/desktop.png`, fullPage: true, clip: { x: 0, y: 0, width: 1200, height: h } }); await ctx.close(); }
// (b) phone: 390 CSS px wide, at 2x (780 px), the age grade and the per-km splits table
{ const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, colorScheme: 'dark' }); const p = await ctx.newPage();
  await p.goto(url, { waitUntil: 'networkidle' }); await fill(p); await calc(p); await p.evaluate(() => document.activeElement?.blur());
  const top = await p.evaluate(() => Math.floor(document.querySelector('#results').getBoundingClientRect().top + scrollY) - 12);
  const h = (await bottomOf(p, '#splits-detail', 16)) - top;
  await p.screenshot({ path: `${tmp}/phone.png`, fullPage: true, clip: { x: 0, y: top, width: 390, height: h } }); await ctx.close(); }
await browser.close();
// encode: WebP + JPG (email fallback), zero-green check, size check (< 200 KB each)
execFileSync('python3', ['-c', `
from PIL import Image
import colorsys, os
for src, name in [('desktop', 'planner-desktop'), ('phone', 'planner-phone')]:
    im = Image.open('${tmp}/' + src + '.png').convert('RGB'); assert im.width <= 1200
    im.save('public/assets/issue-1/' + name + '.webp', quality=82, method=6)
    im.save('public/assets/issue-1/' + name + '.jpg', quality=92, optimize=True, progressive=False, subsampling=0)
    for ext in ['webp', 'jpg']:
        f = 'public/assets/issue-1/' + name + '.' + ext; sz = os.path.getsize(f); a = Image.open(f).convert('RGB')
        px = list(a.getdata())
        g = sum(1 for r, gg, b in px if max(r, gg, b) > 38 and (lambda h, s, v: 80 <= h * 360 <= 170 and s > .25)(*colorsys.rgb_to_hsv(r / 255, gg / 255, b / 255)))
        print(f, a.size, sz, 'bytes, green-ish pixels:', g); assert g == 0 and sz < 200 * 1024
`], { stdio: 'inherit' });
