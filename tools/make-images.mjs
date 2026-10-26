// Renders public/assets/og.png (1200x630) and public/apple-touch-icon.png (180x180) with headless Chrome.
// Needs playwright-core resolvable and Chrome at CHROME_PATH (default /usr/bin/google-chrome). Run: node tools/make-images.mjs
import { chromium } from 'playwright-core';
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const base = 'margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;';
{
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await page.setContent(`<body style="${base}width:1200px;height:630px;background:linear-gradient(160deg,#0b3d2e,#14604a);color:#fff;display:flex;flex-direction:column;justify-content:center;padding:0 90px;box-sizing:border-box">
    <div style="display:flex;align-items:center;gap:22px;margin-bottom:34px"><div style="width:84px;height:84px;border-radius:22px;background:#f4c430;color:#1a1500;display:grid;place-items:center;font-size:40px;font-weight:800">SB</div><div style="font-size:44px;font-weight:800">Sport Builds</div></div>
    <div style="font-size:76px;line-height:1.05;font-weight:800;max-width:960px">A different sports app, vibe-coded every week.</div>
    <div style="margin-top:30px;font-size:32px;color:#f4c430;font-weight:700;letter-spacing:.04em">Honest build notes · sportbuilds.co</div></body>`);
  await page.screenshot({ path: 'public/assets/og.png' }); await page.close();
}
{
  const page = await browser.newPage({ viewport: { width: 180, height: 180 } });
  await page.setContent(`<body style="${base}width:180px;height:180px;background:#0b3d2e;display:grid;place-items:center;color:#f4c430;font-size:84px;font-weight:800">SB</body>`);
  await page.screenshot({ path: 'public/apple-touch-icon.png' }); await page.close();
}
await browser.close();
