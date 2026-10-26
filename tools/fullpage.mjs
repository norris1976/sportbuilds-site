// Full-page screenshots of the 5 main pages at 390 and 1280. Usage: node tools/fullpage.mjs <baseUrl> <outDir> [suffix]
import { chromium } from 'playwright-core';
const base = process.argv[2].replace(/\/$/, ''), out = process.argv[3], sfx = process.argv[4] ?? '';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--host-resolver-rules=MAP app.kit.com 127.0.0.1'] });
for (const [w, h] of [[1280, 800], [390, 844]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: w < 600 ? 2 : 1 }); const page = await ctx.newPage();
  for (const [name, path] of [['home', '/'], ['archive', '/archive/'], ['about', '/about/'], ['welcome', '/welcome/'], ['privacy', '/privacy/']]) {
    await page.goto(base + path, { waitUntil: 'networkidle' }); await page.evaluate(() => Promise.all([...document.images].map((i) => i.decode().catch(() => {})))); await page.waitForTimeout(800);
    await page.screenshot({ path: `${out}/${name}-${w}${sfx}.png`, fullPage: true });
  }
  await ctx.close();
}
await b.close();
