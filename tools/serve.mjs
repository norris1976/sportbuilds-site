// Tiny static server for local checks: node tools/serve.mjs <dir> <port>
// Mimics Cloudflare Pages: /about/ -> about/index.html, /about -> /about/ redirect, custom 404.html.
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';
const root = join(process.cwd(), process.argv[2] ?? 'dist'); const port = Number(process.argv[3] ?? 5174);
// Apply the /* block of dist/_headers (CSP etc.) so local checks behave like Cloudflare Pages.
const globalHeaders = {};
try { const txt = (await readFile(join(root, '_headers'), 'utf8')); const blk = txt.split(/\n\s*\n/).find((b) => b.startsWith('/*')); for (const l of blk.split('\n').slice(1)) { const i = l.indexOf(':'); if (i > 0) globalHeaders[l.slice(0, i).trim()] = l.slice(i + 1).trim(); } } catch {}
const types = { '.html':'text/html; charset=utf-8', '.css':'text/css', '.js':'text/javascript', '.svg':'image/svg+xml', '.png':'image/png', '.xml':'application/xml', '.txt':'text/plain', '.json':'application/json' };
http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x'); let p = normalize(decodeURIComponent(u.pathname)).replace(/^(\.\.[/\\])+/, '');
  try {
    let f = join(root, p); const s = await stat(f).catch(() => null);
    if (s?.isDirectory()) { if (!u.pathname.endsWith('/')) { res.writeHead(308, { Location: u.pathname + '/' }); return res.end(); } f = join(f, 'index.html'); }
    const body = await readFile(f); res.writeHead(200, { ...globalHeaders, 'Content-Type': types[extname(f)] ?? 'application/octet-stream' }); res.end(body);
  } catch { const body = await readFile(join(root, '404.html')).catch(() => 'Not found'); res.writeHead(404, { ...globalHeaders, 'Content-Type': 'text/html; charset=utf-8' }); res.end(body); }
}).listen(port, () => console.log(`serving ${root} on http://localhost:${port}`));
