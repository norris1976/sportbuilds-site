import { readFileSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright-core';
const names = { a: 'Stack: three building blocks rising, the top one lit', b: 'Track: a running-track oval with a baton block', c: 'Brackets: code brackets around a ball' };
const svg = (f) => readFileSync(`docs/logo-options/${f}.svg`, 'utf8').replace(/<\?xml.*?\?>/, '');
const sz = (s, px) => s.replace('<svg ', `<svg style="height:${px}px;width:auto" `);
const row = (k) => `<section><h2><b>${k.toUpperCase()}</b> ${names[k]}</h2>
<div class="cells">
 <div class="cell light"><div class="big">${sz(svg('option-' + k), 44)}</div><div class="sm">${sz(svg('option-' + k), 24)}</div><p>lockup, light (ink #0b3d2e)</p></div>
 <div class="cell dark"><div class="big">${sz(svg('option-' + k), 44)}</div><div class="sm">${sz(svg('option-' + k), 24)}</div><p>lockup, dark (ink #f5f2ea)</p></div>
 <div class="cell light"><div class="marks">${sz(svg(`option-${k}-mark`), 120)}${sz(svg(`option-${k}-mark`), 32)}${sz(svg(`option-${k}-mark`), 16)}</div><p>mark tile: large, 32px, 16px (light)</p></div>
 <div class="cell dark"><div class="marks">${sz(svg(`option-${k}-mark`), 120)}${sz(svg(`option-${k}-mark`), 32)}${sz(svg(`option-${k}-mark`), 16)}</div><p>mark tile: large, 32px, 16px (dark)</p></div>
</div></section>`;
const html = `<!doctype html><meta charset=utf-8><style>
body{margin:0;padding:28px;background:#e9e6dc;font:14px/1.4 system-ui,sans-serif;color:#10201a;width:1500px}
h1{font-size:22px;margin:0 0 4px} p.n{margin:0 0 18px;color:#4b5a53}
section{margin:0 0 22px} h2{font-size:16px;margin:0 0 8px} h2 b{display:inline-grid;place-items:center;width:30px;height:30px;border-radius:50%;background:#0b3d2e;color:#f4c430;margin-right:8px}
.cells{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
.cell{border-radius:12px;padding:18px;min-height:150px;border:1px solid #cfcab9}.light{background:#f5f2ea;color:#0b3d2e}.dark{background:#0a1511;color:#f5f2ea;border-color:#0a1511}
.big{margin-bottom:16px}.sm{margin-bottom:12px}.marks{display:flex;align-items:flex-end;gap:18px;margin:6px 0 20px}.cell p{margin:0;font-size:12px;opacity:.75}
svg{display:block}</style>
<h1>Sport Builds logo options</h1><p class=n>Each shown large, small (header size), and as a tile mark at 120px, 32px and 16px, on light and dark. Text is converted to outlines (Archivo Black, Barlow Condensed ExtraBold, Alata; all SIL OFL).</p>
${['a', 'b', 'c'].map(row).join('')}`;
writeFileSync('/tmp/logo-sheet.html', html);
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 1556, height: 900 }, deviceScaleFactor: 1 });
await p.goto('file:///tmp/logo-sheet.html'); await p.screenshot({ path: 'docs/logo-options/preview-sheet.png', fullPage: true }); await b.close();
