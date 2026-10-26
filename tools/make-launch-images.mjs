// Brand-level launch/share images for Sport Builds (not tied to any one issue), rendered with headless Chrome from HTML/CSS.
// Outputs (PNG) into /workspace/sport-builds/launch-images (override with OUT_DIR):
//   sport-builds-x-post-1600x900.png, sport-builds-linkedin-post-1200x627.png,
//   sport-builds-x-banner-1500x500.png, sport-builds-linkedin-banner-1584x396.png
// Look: near-black, off-white, gold; Running Track lockup (LOGO_OPTION); Barlow Condensed 800 + Inter (self-hosted fonts).
// The right-hand collage is clearly made-up, generic UI fragments (a table, a stat card, a bar chart). No green, no real data.
// Needs playwright-core, Chrome (CHROME_PATH, default /usr/bin/google-chrome) and python3 + Pillow (zero-green check).
import { chromium } from 'playwright-core';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { LOGO_OPTION } from '../site.config.mjs';
const OUT = process.env.OUT_DIR ?? '/workspace/sport-builds/launch-images'; const TMP = process.env.TMP_DIR ?? '/tmp/launch-images';
mkdirSync(OUT, { recursive: true }); mkdirSync(TMP, { recursive: true });
const fonts = resolve('public/assets/fonts');
const lockupSvg = readFileSync(`docs/logo-options/option-${LOGO_OPTION}.svg`, 'utf8');
const lockup = (h) => lockupSvg.replace('<svg ', `<svg height="${h}" style="display:block;color:#f4f1e8" `);

// Collage design space 640 x 560 px; scaled with CSS transform per size.
const collage = `<div class="col">
  <div class="card dark tbl"><div class="lab">Splits</div>
    <table>${[['1', '4:52', '4:52'], ['2', '4:44', '9:36'], ['3', '4:47', '14:23'], ['4', '4:41', '19:04'], ['5', '4:36', '23:40']].map(([k, s, t], i) => `<tr${i === 4 ? ' class="last"' : ''}><td>${k}</td><td>${s}</td><td>${t}</td></tr>`).join('')}</table></div>
  <div class="card light stat"><div class="lab">Age grade</div><div class="big">71.4%</div><div class="sub">Example data</div></div>
  <div class="card dark bars"><div class="lab">Pace</div><div class="chart">${[46, 62, 54, 70, 88].map((h, i) => `<i style="height:${h}%"${i === 4 ? ' class="hi"' : ''}></i>`).join('')}</div></div>
</div>`;

const css = `@font-face{font-family:BC;src:url(file://${fonts}/barlow-condensed-800.woff2);font-weight:800}
@font-face{font-family:IN;src:url(file://${fonts}/inter-var.woff2);font-weight:100 900}
*{box-sizing:border-box;margin:0}
body{background:#0c0c0b;color:#f4f1e8;font-family:IN,sans-serif;position:relative;overflow:hidden}
body::before{content:"";position:absolute;inset:0;background-image:linear-gradient(rgba(244,241,232,.055) 1px,transparent 1px);background-size:100% var(--grid)}
body::after{content:"";position:absolute;left:0;right:0;top:0;height:var(--bar);background:#f4c430}
.txt{position:absolute;z-index:2}
h1{font:800 var(--tag)/1.0 BC,sans-serif;text-transform:uppercase;margin-top:var(--gap)}
.hl{white-space:nowrap;background:#f4c430;color:#131311;padding:0 .16em;box-decoration-break:clone;-webkit-box-decoration-break:clone}
.url{margin-top:var(--gap);font-weight:700;font-size:var(--url);letter-spacing:.02em;color:#f4c430}
.col{position:absolute;width:640px;height:560px;transform-origin:0 0;z-index:1}
.card{position:absolute;border-radius:22px;box-shadow:0 26px 60px rgba(0,0,0,.55),0 4px 14px rgba(0,0,0,.4)}
.dark{background:#171715;border:2px solid #2e2d28;color:#f4f1e8}.light{background:#f4f1e8;color:#131311}
.lab{font-weight:700;letter-spacing:.14em;text-transform:uppercase;font-size:20px;color:#a9a69b}.light .lab{color:#5d5a50}
.tbl{left:0;top:130px;width:350px;height:330px;padding:26px 28px;transform:rotate(-2deg);z-index:1;border-top:6px solid #f4c430}
.tbl table{width:100%;margin-top:14px;border-collapse:collapse;font-size:30px;font-variant-numeric:tabular-nums}
.tbl td{padding:10px 0;border-top:1px solid #2e2d28}.tbl td:nth-child(2){text-align:right;font-weight:600}.tbl td:nth-child(3){text-align:right;color:#a9a69b}.tbl td:first-child{color:#a9a69b;width:44px}
.tbl tr.last td{font-weight:800;color:#f4f1e8}
.stat{left:332px;top:0;width:290px;height:210px;padding:26px 28px;transform:rotate(2deg);z-index:3;border-top:6px solid #f4c430}
.big{font:800 104px/1 BC,sans-serif;margin-top:14px}.sub{font-size:20px;color:#5d5a50;margin-top:10px}
.bars{left:336px;top:318px;width:300px;height:250px;padding:26px 28px;transform:rotate(-1.5deg);z-index:2}
.chart{display:flex;align-items:flex-end;gap:16px;height:150px;margin-top:20px;border-bottom:2px solid #2e2d28}
.chart i{flex:1;background:#5d5a50;border-radius:6px 6px 0 0}.chart i.hi{background:#f4c430}`;

// text: x/width of the text block, y centre; col: collage scale/left/top. Banners keep the text inside the centre ~60% safe zone.
const SIZES = [
  { f: 'sport-builds-x-post-1600x900', W: 1600, H: 900, grid: 60, bar: 12, logo: 92, tag: 92, url: 38, gap: 34, text: { x: 96, w: 820, mid: 450 }, col: { s: 1.05, x: 830, y: 165 } },
  { f: 'sport-builds-linkedin-post-1200x627', W: 1200, H: 627, grid: 45, bar: 10, logo: 70, tag: 68, url: 30, gap: 26, text: { x: 72, w: 620, mid: 313 }, col: { s: 0.79, x: 625, y: 85 } },
  { f: 'sport-builds-x-banner-1500x500', W: 1500, H: 500, grid: 50, bar: 10, logo: 54, tag: 50, url: 26, gap: 20, text: { x: 330, w: 680, mid: 250 }, col: { s: 0.82, x: 1060, y: 40 } },
  { f: 'sport-builds-linkedin-banner-1584x396', W: 1584, H: 396, grid: 44, bar: 8, logo: 46, tag: 42, url: 23, gap: 16, text: { x: 345, w: 640, mid: 198 }, col: { s: 0.66, x: 1110, y: 20 } },
];
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? '/usr/bin/google-chrome', args: ['--no-sandbox', '--allow-file-access-from-files'] });
for (const z of SIZES) {
  const html = `<!doctype html><meta charset=utf-8><style>${css}body{width:${z.W}px;height:${z.H}px;--grid:${z.grid}px;--bar:${z.bar}px;--tag:${z.tag}px;--url:${z.url}px;--gap:${z.gap}px}
.txt{left:${z.text.x}px;width:${z.text.w}px;top:${z.text.mid}px;transform:translateY(-50%)}.col{left:${z.col.x}px;top:${z.col.y}px;transform:scale(${z.col.s})}</style><body>
<div class="txt">${lockup(z.logo)}<h1>A different sports app, <span class="hl">built with AI</span>, every week.</h1><div class="url">sportbuilds.co</div></div>${collage}`;
  writeFileSync(`${TMP}/${z.f}.html`, html);
  const page = await browser.newPage({ viewport: { width: z.W, height: z.H } });
  await page.goto(`file://${TMP}/${z.f}.html`); await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(200);
  const m = await page.evaluate(() => { const r = document.querySelector('.txt').getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom].map(Math.round); });
  console.log(z.f, 'text box', m.join(','), 'in', `${z.W}x${z.H}`);
  await page.screenshot({ path: `${OUT}/${z.f}.png` }); await page.close();
}
await browser.close();
// zero-green check (every pixel) + size report
execFileSync('python3', ['-c', `
from PIL import Image
import colorsys, os, glob
for f in sorted(glob.glob('${OUT}/sport-builds-*.png')):
    im = Image.open(f).convert('RGB'); n = 0
    for r, g, b in im.getdata():
        if max(r, g, b) > 38:
            h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            if 80 <= h * 360 <= 170 and s > .25: n += 1
    print(os.path.basename(f), im.size, os.path.getsize(f), 'bytes, green-ish pixels:', n); assert n == 0
`], { stdio: 'inherit' });
