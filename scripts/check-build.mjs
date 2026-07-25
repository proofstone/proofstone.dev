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
import { inspectRenderedPage } from './a11y-guard.mjs';

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

// ── 3d. Print covers the map tokens ──────────────────────────────────────────
// A second-generation map paints itself entirely from --map-* custom
// properties, which means a printed page follows whatever those resolve to.
// Miss one in the print block and the map prints its dark-theme value: a black
// rectangle on white paper, worse than the force-light panel it replaced.
//
// This failure is invisible in the browser and invisible in light theme — it
// only appears when someone in dark theme hits print. It already happened once
// here: the edit that was meant to add these tokens did not match, nothing
// complained, and the maps printed black. So the rule is checked rather than
// remembered: every --map-* token the light theme defines must be redefined
// inside @media print.
console.log('\nPRINT TOKENS — a map paints from tokens, so print must define them all');
{
  const css = readFileSync(join(site, 'assets', 'styles.css'), 'utf8');
  const printAt = css.indexOf('@media print');
  const declared = [...new Set([...css.slice(0, printAt > 0 ? printAt : css.length)
    .matchAll(/(--map-[a-z-]+)\s*:/g)].map((m) => m[1]))];
  const printBlock = printAt > 0 ? css.slice(printAt) : '';
  const missing = declared.filter((t) => !new RegExp(`${t}\\s*:`).test(printBlock));

  if (printAt < 0) fail('no print block', 'the stylesheet has no @media print at all');
  else if (!declared.length) fail('no map tokens found', 'expected --map-* custom properties before the print block');
  else if (missing.length) fail('print does not repaint the map', `${missing.join(', ')} keep their screen value on paper`);
  else pass('print repaints every map token', `${declared.length} token(s): ${declared.join(', ')}`);
}

// ── 3c. Dead map copies ──────────────────────────────────────────────────────
// The build consumes roadmap.svg by inlining it and stripping the README's own
// <img>, so the copied file at /<slug>/assets/roadmap.svg is referenced by
// nothing. It is excluded from the passthrough for that reason — 15,567 bytes
// today, about double once the maps are redrawn.
//
// "Referenced by nothing" is a property of the current content, not a law, and
// an upstream README could link the file directly tomorrow. So it is re-proved
// on every build rather than checked once: if any rendered page references the
// path, the build fails here and says why, instead of shipping a 404 that only
// a reader would find. The reverse is asserted too — the file must not be back
// in the output, or the weight returns silently.
console.log('\nDEAD MAP COPIES — the inlined map must not also ship as a file');
{
  const referenced = [];
  for (const file of pages) {
    const html = readFileSync(file, 'utf8');
    const rel = relative(site, file).replace(/\\/g, '/');
    const hits = [...html.matchAll(/["'(]([^"'()\s]*\/assets\/roadmap\.svg)["')]/g)].map((m) => m[1]);
    if (hits.length) referenced.push(`${rel} → ${[...new Set(hits)].join(', ')}`);
  }
  const shipped = roadmaps
    .filter((x) => x.status === 'live')
    .filter((r) => existsSync(join(site, r.slug, 'assets', 'roadmap.svg')))
    .map((r) => `${r.slug}/assets/roadmap.svg`);

  if (referenced.length) {
    fail('a page references the map file', `${referenced.join(' · ')} — it is no longer deployed, so this link is a 404`);
  } else if (shipped.length) {
    fail('the map is deployed as a file again', `${shipped.join(', ')} — nothing links it, so this is dead weight`);
  } else {
    pass('map ships inline only', `${roadmaps.filter((x) => x.status === 'live').length} roadmap(s), no unreferenced copy`);
  }
}

// ── 3b. Map generation ───────────────────────────────────────────────────────
// The series migrates its maps one repository at a time, and each one triggers
// an autonomous rebuild the moment it is pushed. So a mixed state — one new map,
// two old — is a normal operating condition, not a deployment window, and it has
// to be provably valid rather than assumed to be.
//
// The panel breaks both ways: a fixed-colour map on a themed panel is light
// artwork on a dark page, and a themed map on the force-light panel is a dark
// map on a white one. What is asserted here is that each figure declares which
// it is, and that the declaration matches the file it was made from.
console.log('\nMAP GENERATION — each map declares how it paints, and the page agrees');
for (const r of roadmaps.filter((x) => x.status === 'live')) {
  const file = join(site, r.slug, 'index.html');
  const svgFile = join(root, '.content', r.slug, 'assets', 'roadmap.svg');
  if (!existsSync(file) || !existsSync(svgFile)) {
    fail(`${r.slug}: cannot check map generation`, 'page or map SVG missing');
    continue;
  }
  const html = readFileSync(file, 'utf8');
  const svg = readFileSync(svgFile, 'utf8');

  const declared = (html.match(/data-map-theme="([a-z]+)"/) || [])[1];
  const actual = /var\(--map-/.test(svg) ? 'tokens' : 'fixed';

  if (!declared) {
    fail(`${r.slug}: map declares no generation`, 'the figure carries no data-map-theme');
  } else if (declared !== actual) {
    fail(`${r.slug}: map generation disagrees with the file`, `page says "${declared}", the SVG is "${actual}"`);
  } else if (declared !== 'tokens') {
    // The migration is finished and the force-light panel that carried the
    // first-generation maps is deleted. A map that goes back to fixed colours
    // would now render as light artwork on a dark page, so it stops the build
    // rather than shipping. Reinstating support means reinstating the panel,
    // deliberately, not by accident.
    fail(`${r.slug}: first-generation map`, 'its colours are hardcoded, and the force-light panel that made those readable no longer exists — regenerate it with scripts/render_map.py');
  } else if (/(?:fill|stroke)="#(?:f|e|d)[0-9a-f]{5}"/i.test(svg)) {
    // A themed map that still carries pale literals would stay light in dark
    // theme while claiming to follow the page — the failure that looks fine in
    // the theme you happen to be developing in.
    fail(`${r.slug}: themed map still has fixed light colours`, 'a var(--map-*) map must not paint anything with a pale literal');
  } else {
    pass(`${r.slug}`, `map generation "${declared}", panel matches`);
  }
}

// ── 3a. Flagship display ─────────────────────────────────────────────────────
// The render layer strips ⭐ out of milestone headings and lets the FLAGSHIP
// stamp carry the meaning. That is an edit to text this repo does not own, so
// it gets asserted rather than trusted, in both directions:
//   • the count of is-star headings must equal the count of starred milestone
//     headings in the source README — if a strip ever ran before the class was
//     assigned, or the regex drifted, flagships would silently become ordinary;
//   • no ⭐ may survive inside a milestone heading in the output;
//   • every is-star heading must be followed by the criterion blockquote that
//     renders the stamp — otherwise removing the emoji removes the only marker
//     the reader had, and nothing replaces it.
// Stars elsewhere in the prose are none of our business and are left alone.
console.log('\nSTAR DISPLAY — the stamp replaces the emoji, and loses nothing');
for (const r of roadmaps.filter((x) => x.status === 'live')) {
  const file = join(site, r.slug, 'index.html');
  const readme = join(root, '.content', r.slug, 'README.md');
  if (!existsSync(file) || !existsSync(readme)) {
    fail(`${r.slug}: cannot check flagships`, 'page or source README missing');
    continue;
  }
  const html = readFileSync(file, 'utf8');
  const md = readFileSync(readme, 'utf8');

  const inSource = (md.match(/^###\s+M\d+\.\d+.*[⭐★].*$/gm) || []).length;
  const headings = [...html.matchAll(/<h3 id="[^"]*" class="([^"]*)" data-ms="[^"]*">([\s\S]*?)<\/h3>/g)];
  const starred = headings.filter((h) => / is-star|^is-star/.test(h[1]));
  const leaked = starred.filter((h) => /[⭐★]/.test(h[2])).length;

  // Adjacency, checked the same way the CSS selector matches: heading, then
  // whitespace, then the criterion blockquote.
  const stamped = [...html.matchAll(
    /<h3 id="[^"]*" class="[^"]*is-star[^"]*"[\s\S]*?<\/h3>\s*<blockquote class="ps-criterion">/g
  )].length;

  if (starred.length !== inSource) {
    fail(`${r.slug}: flagship count drifted`, `${starred.length} is-star headings for ${inSource} starred milestones in the README`);
  } else if (leaked) {
    fail(`${r.slug}: emoji survived`, `${leaked} milestone heading(s) still render ⭐`);
  } else if (stamped !== starred.length) {
    fail(`${r.slug}: flagship without a stamp`, `${stamped} of ${starred.length} starred milestones are followed by a criterion block — the rest lost their only marker`);
  } else {
    pass(`${r.slug}`, `${starred.length} flagship(s), emoji stripped, all stamped`);
  }
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

// ── 4c. Accessibility invariants ─────────────────────────────────────────────
// These live in the delivered HTML because that is where they broke: the heading
// anchors are produced by a plugin whose fix option differs by version, and the
// map hotspots are generated from an SVG this repo does not own.
console.log('\nACCESSIBILITY — no silent tab stops, named landmarks, reachable scroll regions');
{
  // The stylesheet is part of the contract here: the section outline ships
  // collapsed and is re-opened on desktop by CSS alone.
  const cssPath = join(site, 'assets', 'styles.css');
  const css = existsSync(cssPath) ? readFileSync(cssPath, 'utf8') : '';
  if (!css) fail('assets/styles.css missing from _site', 'cannot verify the outline mechanism');
  for (const file of pages) {
    const html = readFileSync(file, 'utf8');
    const rel = relative(site, file).replace(/\\/g, '/');
    const { problems } = inspectRenderedPage(html, { css });
    if (problems.length) for (const p of problems) fail(`${rel}`, p);
    else pass(`${rel}`, 'clean');
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
