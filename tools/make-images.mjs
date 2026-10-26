// Renders public/assets/og.png (1200x630) and public/apple-touch-icon.png (180x180) with headless Chrome,
// from the provisional logo (LOGO_OPTION in site.config.mjs) and the self-hosted fonts.
// Needs playwright-core and Chrome at CHROME_PATH (default /usr/bin/google-chrome). Run: node tools/make-images.mjs
import { chromium } from 'playwright-core';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { LOGO_OPTION } from '../site.config.mjs';
const fonts = resolve('public/assets/fonts');
const lockup = readFileSync(`docs/logo-options/option-${LOGO_OPTION}.svg`, 'utf8').replace('<svg ', '<svg height="64" ');
const mark = readFileSync(`docs/logo-options/option-${LOGO_OPTION}-mark.svg`, 'utf8').replace('rx="22"', 'rx="0"');
const face = `@font-face{font-family:BC;src:url(file://${fonts}/barlow-condensed-800.woff2);font-weight:800}@font-face{font-family:IN;src:url(file://${fonts}/inter-var.woff2);font-weight:400 700}`;
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? '/usr/bin/google-chrome', args: ['--no-sandbox', '--allow-file-access-from-files'] });
{
  writeFileSync('/tmp/og.html', `<!doctype html><meta charset=utf-8><style>${face}
body{margin:0;width:1200px;height:630px;background:#0c0c0b;color:#f4f1e8;font-family:IN,sans-serif;display:flex;flex-direction:column;justify-content:center;padding:0 84px;box-sizing:border-box;position:relative;overflow:hidden}
body::before{content:"";position:absolute;inset:0;background-image:linear-gradient(rgba(244,241,232,.06) 1px,transparent 1px);background-size:100% 42px}
.l{color:#f4f1e8;position:relative;margin-bottom:44px} h1{position:relative;margin:0;font:800 112px/1.02 BC,sans-serif;text-transform:uppercase;max-width:1000px}
.hl{white-space:nowrap;background:#f4c430;color:#131311;padding:0 14px} p{position:relative;margin:34px 0 0;font-size:30px;color:#b9b6ab}</style>
<div class=l>${lockup}</div><h1>A different sports app, <span class=hl>vibe-coded</span> every week.</h1><p>Honest build notes · sportbuilds.co</p>`);
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await page.goto('file:///tmp/og.html'); await page.evaluate(() => document.fonts.ready); await page.screenshot({ path: 'public/assets/og.png' }); await page.close();
}
{
  writeFileSync('/tmp/touch.html', `<!doctype html><style>body{margin:0}svg{display:block;width:180px;height:180px}</style>${mark}`);
  const page = await browser.newPage({ viewport: { width: 180, height: 180 } });
  await page.goto('file:///tmp/touch.html'); await page.screenshot({ path: 'public/apple-touch-icon.png' }); await page.close();
}
await browser.close();
