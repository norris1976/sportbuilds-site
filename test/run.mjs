// Dependency-free tests: data validation, "add a week = one entry", Kit wiring is a one-line change,
// forbidden-content guard. Run: npm test
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, cpSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

let passed = 0;
const t = (name, fn) => { try { fn(); passed++; console.log('ok  ', name); } catch (e) { console.error('FAIL', name, '\n    ', e.message); process.exitCode = 1; } };
const builds = JSON.parse(readFileSync('data/builds.json', 'utf8'));

t('data: required fields, https URLs, ISO dates, unique issue numbers', () => {
  const seen = new Set();
  for (const b of builds) {
    for (const k of ['issue', 'title', 'description', 'date', 'url', 'repo', 'tags']) assert.ok(b[k] !== undefined && b[k] !== '', `issue ${b.issue} missing ${k}`);
    assert.ok(Number.isInteger(b.issue) && b.issue > 0); assert.ok(!seen.has(b.issue), 'duplicate issue ' + b.issue); seen.add(b.issue);
    assert.match(b.date, /^\d{4}-\d{2}-\d{2}$/); assert.ok(!Number.isNaN(Date.parse(b.date)));
    for (const k of ['url', 'repo', 'fallbackUrl']) if (b[k]) assert.match(b[k], /^https:\/\//, k);
    assert.match(b.repo, /^https:\/\/github\.com\/norris1976\//);
    assert.ok(Array.isArray(b.tags) && b.tags.length > 0);
  }
});

t('data: issue 1 is the Saturday 5K Pace Planner on its own subdomain', () => {
  const b = builds.find((x) => x.issue === 1);
  assert.equal(b.title, 'Saturday 5K Pace Planner'); assert.equal(b.url, 'https://5k.sportbuilds.co');
  assert.equal(b.repo, 'https://github.com/norris1976/saturday-5k-pace-planner');
});

function buildCopy(mutate) {
  const dir = mkdtempSync(join(tmpdir(), 'sbtest-'));
  for (const f of ['build.mjs', 'site.config.mjs', 'data', 'public']) cpSync(f, join(dir, f), { recursive: true });
  mutate(dir);
  const out = execFileSync('node', ['build.mjs'], { cwd: dir }).toString();
  return { dir, out, read: (p) => readFileSync(join(dir, 'dist', p), 'utf8') };
}

t('adding one entry updates archive, home "latest" and sitemap unchanged otherwise', () => {
  const r = buildCopy((dir) => {
    const p = join(dir, 'data/builds.json'); const d = JSON.parse(readFileSync(p, 'utf8'));
    d.push({ issue: 2, title: 'Test Tool Two', description: 'Second tool.', date: '2026-11-02', url: 'https://two.sportbuilds.co', repo: 'https://github.com/norris1976/two', tags: ['test'] });
    writeFileSync(p, JSON.stringify(d));
  });
  const archive = r.read('archive/index.html'); const home = r.read('index.html');
  assert.match(archive, /Test Tool Two/); assert.match(archive, /Saturday 5K Pace Planner/);
  assert.ok(archive.indexOf('Test Tool Two') < archive.indexOf('Saturday 5K Pace Planner'), 'newest first');
  assert.match(home, /This week.s build<\/strong>[\s\S]*Test Tool Two/); assert.match(home, /Recent builds/);
  assert.match(r.read('welcome/index.html'), /Saturday 5K Pace Planner/, 'welcome still points at issue 1');
});

t('Kit not configured: no form action, flagged unconfigured, placeholders visible', () => {
  const r = buildCopy(() => {}); const home = r.read('index.html');
  assert.match(r.out, /NOT configured/); assert.match(home, /data-configured="false"/);
  assert.doesNotMatch(home, /app\.kit\.com/); assert.match(home, /PLACEHOLDER: paste Kit/);
});

t('Kit configured: one-line change sets the form action and uses supplied consent text', () => {
  const r = buildCopy((dir) => {
    const p = join(dir, 'site.config.mjs'); let s = readFileSync(p, 'utf8');
    s = s.replace("KIT_FORM_ID = 'REPLACE_ME'", "KIT_FORM_ID = '1234567'").replace("KIT_CONSENT_TEXT = ''", "KIT_CONSENT_TEXT = 'Consent line supplied by Kit.'");
    writeFileSync(p, s);
  });
  const home = r.read('index.html');
  assert.match(r.out, /CONFIGURED/); assert.match(home, /action="https:\/\/app\.kit\.com\/forms\/1234567\/subscriptions"/);
  assert.match(home, /data-configured="true"/); assert.match(home, /Consent line supplied by Kit\./); assert.doesNotMatch(home, /PLACEHOLDER: paste Kit/);
  assert.doesNotMatch(home, /PLACEHOLDER: the Kit form is not connected/);
  assert.match(r.read('_headers'), /form-action 'self' https:\/\/app\.kit\.com/);
});

t('welcome is noindex and not in the sitemap; others are indexable', () => {
  const r = buildCopy(() => {});
  assert.match(r.read('welcome/index.html'), /<meta name="robots" content="noindex, nofollow">/);
  assert.match(r.read('404.html'), /noindex/); assert.doesNotMatch(r.read('sitemap.xml'), /welcome/);
  for (const p of ['index.html', 'archive/index.html', 'about/index.html', 'privacy/index.html']) assert.doesNotMatch(r.read(p), /noindex/, p);
  assert.match(r.read('_headers'), /\/welcome[\s\S]*X-Robots-Tag: noindex/);
});

t('guard: no forbidden terms (brand/employer) anywhere in the repo', () => {
  const bad = new RegExp(['park\\s?run', 'stat' + 'sports', 'stats' + 'ports'].join('|'), 'i');
  const walk = (d) => readdirSync(d).flatMap((f) => { if (['.git', 'node_modules', 'dist'].includes(f)) return []; const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
  for (const f of walk('.')) { if (/\.(png|ico)$/.test(f) || f.endsWith('test/run.mjs')) continue; assert.doesNotMatch(readFileSync(f, 'utf8'), bad, f); }
});

t('built pages make no external references except outbound <a> links', () => {
  const r = buildCopy(() => {});
  for (const p of ['index.html', 'archive/index.html', 'welcome/index.html', 'about/index.html', 'privacy/index.html', '404.html']) {
    const html = r.read(p);
    assert.doesNotMatch(html, /<(script|link|img|iframe)[^>]+(src|href)="https?:\/\/(?!sportbuilds\.co)/, p + ' loads an external resource');
    assert.doesNotMatch(html, /\sstyle="/, p + ' has an inline style attribute (blocked by CSP)');
    assert.doesNotMatch(html, /<script(?![^>]*src=)/, p + ' has an inline script');
  }
});
console.log(`\n${passed} passed`);
