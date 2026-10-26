// Full-page screenshots of the 5 main pages at 390 and 1280. Usage: node tools/fullpage.mjs <baseUrl> <outDir> [suffix] [--theme=dark|light] [--themes]
// Default scheme is dark (the design's primary look). --themes also writes home-{1280,390}-{dark,light}.png.
import { chromium } from 'playwright-core';
const args = process.argv.slice(2).filter((a) => !a.startsWith('--')); const flags = process.argv.slice(2).filter((a) => a.startsWith('--'));
const base = args[0].replace(/\/$/, ''), out = args[1], sfx = args[2] ?? '';
const scheme = (flags.find((f) => f.startsWith('--theme=')) ?? '--theme=dark').split('=')[1];
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--host-resolver-rules=MAP app.kit.com 127.0.0.1'] });
const pages = [['home', '/'], ['archive', '/archive/'], ['about', '/about/'], ['welcome', '/welcome/'], ['privacy', '/privacy/']];
async function shoot(page, path, file) {
  await page.goto(base + path, { waitUntil: 'networkidle' });
  await page.evaluate(() => Promise.all([...document.images].map((i) => i.decode().catch(() => {})))); await page.waitForTimeout(800);
  await page.screenshot({ path: file, fullPage: true });
}
for (const [w, h] of [[1280, 800], [390, 844]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: w < 600 ? 2 : 1, colorScheme: scheme }); const page = await ctx.newPage();
  for (const [name, path] of pages) await shoot(page, path, `${out}/${name}-${w}${sfx}.png`);
  await ctx.close();
  if (flags.includes('--themes')) for (const sch of ['dark', 'light']) {
    const c = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: w < 600 ? 2 : 1, colorScheme: sch }); const p = await c.newPage();
    await shoot(p, '/', `${out}/home-${w}-${sch}${sfx}.png`); await c.close();
  }
}
await b.close();
