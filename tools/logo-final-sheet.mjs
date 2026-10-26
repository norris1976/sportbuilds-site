// Renders docs/logo-options/option-b-final-preview.png: the final Track logo on dark and light, large, header size, and as favicon-size marks.
import { readFileSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright-core';
const svg = (f) => readFileSync(`docs/logo-options/${f}.svg`, 'utf8');
const sz = (s, px) => s.replace('<svg ', `<svg style="height:${px}px;width:auto" `);
const html = `<!doctype html><meta charset=utf-8><style>
body{margin:0;padding:28px;background:#1d1c1a;font:13px/1.4 system-ui,sans-serif;color:#f4f1e8;width:1300px}
h1{font-size:20px;margin:0 0 4px} p.n{margin:0 0 18px;color:#b9b6ab}
.cells{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin-bottom:14px}
.cell{border-radius:12px;padding:22px;border:1px solid #3a3935}.light{background:#f5f2ea;color:#131311}.dark{background:#0c0c0b;color:#f4f1e8}
.row{display:flex;align-items:flex-end;gap:22px;margin:0 0 18px}.cell p{margin:0;font-size:12px;opacity:.7}svg{display:block}</style>
<h1>Sport Builds: final logo (Track, no green)</h1><p class=n>Near-black #0c0c0b, off-white #f4f1e8, gold #f4c430. Text is outlined (Barlow Condensed ExtraBold, SIL OFL).</p>
<div class=cells>
<div class="cell dark"><div class=row>${sz(svg('option-b-final-dark'), 72)}</div><div class=row>${sz(svg('option-b-final-dark'), 40)}${sz(svg('option-b-final-dark'), 24)}</div><p>lockup on dark: large, 40px, header size (24px)</p></div>
<div class="cell light"><div class=row>${sz(svg('option-b-final-light'), 72)}</div><div class=row>${sz(svg('option-b-final-light'), 40)}${sz(svg('option-b-final-light'), 24)}</div><p>lockup on light: large, 40px, header size (24px)</p></div>
<div class="cell dark" style="background:#2c2b27"><div class=row>${sz(svg("option-b-final-mark"), 128)}${sz(svg('option-b-final-mark'), 32)}${sz(svg('option-b-final-mark'), 16)}</div><p>tile mark (favicon, touch icon, OG): 128px, 32px, 16px on a mid-dark surface (the tile is near-black)</p></div>
<div class="cell light"><div class=row>${sz(svg('option-b-final-mark'), 128)}${sz(svg('option-b-final-mark'), 32)}${sz(svg('option-b-final-mark'), 16)}${sz(svg('option-b-final-mark-light'), 64)}${sz(svg('option-b-final-mark-light'), 32)}</div><p>tile on light, plus the tile-less light mark (near-black track, gold baton)</p></div>
</div>`;
writeFileSync('/tmp/logo-final-sheet.html', html);
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 1356, height: 700 } });
await p.goto('file:///tmp/logo-final-sheet.html'); await p.screenshot({ path: 'docs/logo-options/option-b-final-preview.png', fullPage: true }); await b.close();
