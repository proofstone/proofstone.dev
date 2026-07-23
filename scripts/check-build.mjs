// ─────────────────────────────────────────────────────────────────────────────
// check-build.mjs — deterministic, offline assertions over the BUILT site.
//
// These run inside the deploy path on purpose. The site rebuilds itself from
// repositories it does not own, on triggers no human watches (repository_dispatch,
// nightly cron), so the checks that must never be skipped are the ones that need
// no network: anchors resolving, map hotspots covering every section, the home
// page's proof sample present, no private repo leaking, noindex still on.
//
// External link checking is deliberately NOT here — a rate-limited third party
// must never block a content deploy. That lives in the separate check workflow.
//
//   node scripts/check-build.mjs
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { roadmaps } from '../roadmaps.config.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const site = join(root, '_site');

let failures = 0;
const pass = (m, d = '') => console.log(`  ✓ ${m}${d ? ` — ${d}` : ''}`);
const fail = (m, d) => {
  console.error(`  ✗ ${m} — ${d}`);
  console.error(`::error::${m}: ${d}`);
  failures++;
};

if (!existsSync(site)) {
  console.error('check-build: _site does not exist — run the build first.');
  process.exit(1);
}

function htmlFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...htmlFiles(p));
    else if (name.endsWith('.html')) out.push(p);
  }
  return out;
}

const pages = htmlFiles(site);
console.log(`\nchecking ${pages.length} page(s) in _site\n`);

// ── 1. In-page anchors resolve ───────────────────────────────────────────────
// lychee and friends do not verify fragments, and this project has already been
// bitten by anchor drift, so it is checked explicitly.
console.log('ANCHORS — every #fragment must resolve to an id on the same page');
for (const file of pages) {
  const html = readFileSync(file, 'utf8');
  const rel = relative(site, file).replace(/\\/g, '/');
  const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));
  const dead = [
    ...new Set(
      [...html.matchAll(/href="#([^"]+)"/g)]
        .map((m) => decodeURIComponent(m[1]))
        .filter((frag) => frag && !ids.has(frag))
    )
  ];
  if (dead.length) fail(`${rel}: dead in-page anchors`, dead.slice(0, 5).join(', ') + (dead.length > 5 ? ` … +${dead.length - 5}` : ''));
  else pass(`${rel}`, `${ids.size} ids, all fragments resolve`);
}

// ── 1b. Duplicate ids ────────────────────────────────────────────────────────
// A full HTML validator was considered and declined: it would mostly flag raw
// HTML inherited from roadmap READMEs, which this repo is forbidden to edit.
// Duplicate ids are the one validity class that actually breaks this site —
// anchors, the outline and the map all address elements by id.
console.log('\nDUPLICATE IDS — anchors, outline and map all address elements by id');
for (const file of pages) {
  const html = readFileSync(file, 'utf8');
  const rel = relative(site, file).replace(/\\/g, '/');
  const seen = new Map();
  for (const [, id] of html.matchAll(/\bid="([^"]+)"/g)) seen.set(id, (seen.get(id) || 0) + 1);
  const dupes = [...seen].filter(([, n]) => n > 1).map(([id, n]) => `${id} ×${n}`);
  if (dupes.length) fail(`${rel}: duplicate ids`, dupes.slice(0, 5).join(', '));
  else pass(`${rel}`, 'no duplicate ids');
}

// ── 2. Internal links point at something that exists ─────────────────────────
console.log('\nINTERNAL LINKS — every site-relative href/src must exist in _site');
for (const file of pages) {
  const html = readFileSync(file, 'utf8');
  const rel = relative(site, file).replace(/\\/g, '/');
  const targets = [
    ...new Set(
      [...html.matchAll(/(?:href|src)="(\/[^"#?]*)/g)]
        .map((m) => m[1])
        .filter((u) => !u.startsWith('//'))
    )
  ];
  const missing = targets.filter((t) => {
    const p = join(site, t.endsWith('/') ? join(t, 'index.html') : t);
    return !existsSync(p);
  });
  if (missing.length) fail(`${rel}: internal links to nothing`, missing.join(', '));
  else pass(`${rel}`, `${targets.length} internal targets exist`);
}

// ── 3. Map hotspot coverage ──────────────────────────────────────────────────
// The SVG is produced by a renderer outside this repo; a cosmetic change there
// used to be able to drop every hotspot with a green build.
console.log('\nMAP HOTSPOTS — every §-section must have a clickable box');
for (const r of roadmaps.filter((x) => x.status === 'live')) {
  const file = join(site, r.slug, 'index.html');
  if (!existsSync(file)) {
    fail(`${r.slug}: page missing`, file);
    continue;
  }
  const html = readFileSync(file, 'utf8');
  const m = html.match(/data-hotspots="(\d+)" data-sections="(\d+)"/);
  if (!m) fail(`${r.slug}: no map figure`, 'expected an inlined .ps-map with coverage data');
  else if (m[1] !== m[2]) fail(`${r.slug}: incomplete map coverage`, `${m[1]} hotspots for ${m[2]} sections — the upstream SVG shape likely changed`);
  else pass(`${r.slug}`, `${m[1]}/${m[2]} sections clickable`);
}

// ── 4. The home page actually shows a milestone ──────────────────────────────
console.log('\nPROOF SAMPLE — the landing page must demonstrate the format, not promise it');
{
  const html = readFileSync(join(site, 'index.html'), 'utf8');
  const block = html.match(/<div class="prose sample__block">([\s\S]*?)<\/div>/);
  const body = block ? block[1].trim() : '';
  if (!body) fail('home page sample block is empty', 'the "What a milestone looks like" section promises a sample and shows nothing');
  else if (!/ps-criterion/.test(body)) fail('home page sample has no proof block', 'sample rendered without its "You\'re done when" criterion');
  else pass('home page shows a real milestone', `${body.length} bytes incl. proof block`);
}

// ── 4a. Structured data ──────────────────────────────────────────────────────
// Built as data and serialized with escaping, so the failure mode to guard is a
// template regression producing invalid JSON or leaking markup that ends the
// <script> early.
console.log('\nJSON-LD — valid, correctly branched, and unable to close its own script tag');
for (const file of pages) {
  const html = readFileSync(file, 'utf8');
  const rel = relative(site, file).replace(/\\/g, '/');
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1]);

  if (rel === '404.html') {
    if (blocks.length) fail('404.html carries structured data', 'the error page must not describe itself as a thing');
    else pass('404.html', 'no structured data, as intended');
    continue;
  }
  if (!blocks.length) {
    fail(`${rel}: no structured data`, 'expected a JSON-LD block');
    continue;
  }
  let parsed;
  try {
    parsed = JSON.parse(blocks[0]);
  } catch (e) {
    fail(`${rel}: JSON-LD does not parse`, e.message);
    continue;
  }
  if (/<\/script/i.test(blocks[0])) {
    fail(`${rel}: JSON-LD contains a raw </script`, 'the block can be terminated early by content');
    continue;
  }
  const types = (parsed['@graph'] || [parsed]).map((n) => n['@type']);
  const wanted = rel === 'index.html' ? ['Organization', 'WebSite'] : ['BreadcrumbList', 'LearningResource'];
  const missing = wanted.filter((t) => !types.includes(t));
  if (missing.length) fail(`${rel}: structured data missing types`, missing.join(', '));
  else pass(`${rel}`, types.join(' + '));
}

// ── 4b. XML outputs are well-formed ──────────────────────────────────────────
// A stray newline ahead of the prolog is enough to make a sitemap unparseable,
// and templating whitespace makes that a one-character mistake away at all times.
console.log('\nXML — sitemap must be well-formed (prolog first, tags balanced)');
{
  const xmlPath = join(site, 'sitemap.xml');
  if (!existsSync(xmlPath)) fail('sitemap.xml missing', site);
  else {
    const xml = readFileSync(xmlPath, 'utf8');
    if (!xml.startsWith('<?xml')) {
      fail('sitemap.xml: content before the XML prolog', JSON.stringify(xml.slice(0, 20)));
    } else {
      const opens = (xml.match(/<(?!\?|!)([a-z][\w:-]*)[^>]*(?<!\/)>/gi) || []).length;
      const closes = (xml.match(/<\/[a-z][\w:-]*>/gi) || []).length;
      if (opens !== closes) fail('sitemap.xml: unbalanced tags', `${opens} open vs ${closes} close`);
      else pass('sitemap.xml well-formed', `${(xml.match(/<loc>/g) || []).length} urls, ${(xml.match(/<lastmod>/g) || []).length} with lastmod`);
    }
  }
}

// ── 5. Private repositories must not leak ────────────────────────────────────
console.log('\nPRIVATE REPOS — content under practitioner review must not be linked');
{
  const priv = roadmaps.filter((r) => r.status === 'review').map((r) => `${r.slug}-roadmap`);
  const extra = ['robotics-software-engineer-roadmap', 'pcb-design-roadmap'];
  const needles = [...new Set([...priv, ...extra])];
  let leaked = false;
  for (const file of [...pages, join(site, 'sitemap.xml')].filter(existsSync)) {
    const html = readFileSync(file, 'utf8');
    for (const n of needles) {
      if (html.includes(n)) {
        fail(`${relative(site, file)} mentions a private repo`, n);
        leaked = true;
      }
    }
  }
  if (!leaked) pass('no private repo appears in any page or the sitemap', needles.join(', '));
}

// ── 6. noindex posture ───────────────────────────────────────────────────────
// This wave does not launch. If a change ever drops the tag by accident, the
// build says so rather than quietly publishing the site to search engines.
console.log('\nNOINDEX — this wave does not launch the site');
{
  const expected = process.env.SITE_NOINDEX !== 'false';
  for (const file of pages) {
    const html = readFileSync(file, 'utf8');
    const rel = relative(site, file).replace(/\\/g, '/');
    const has = /<meta name="robots" content="noindex/.test(html);
    if (expected && !has) fail(`${rel}: noindex missing`, 'SITE_NOINDEX is on but the page does not carry the tag');
    else if (expected) pass(`${rel}`, 'noindex present');
  }
  if (!expected) pass('SITE_NOINDEX=false — launch build, noindex intentionally absent');
}

console.log('');
if (failures) {
  console.error(`check-build: ${failures} check(s) failed.`);
  process.exit(1);
}
console.log('check-build: site is structurally sound.');
