// ─────────────────────────────────────────────────────────────────────────────
// check-guards.mjs — proves the build's safety gates actually fire.
//
// A gate nobody has seen reject anything is a decoration. Each case below feeds
// a deliberately poisoned payload to the REAL guard code (no reimplementation)
// and asserts it is refused; the healthy cases assert real content still passes,
// which is what stops the gates from being tightened into false positives.
//
//   node scripts/check-guards.mjs
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inspectReadme, inspectSvg, shapeOf } from './content-guard.mjs';
import { inspectRenderedPage, inspectStylesheet, FONT_SIZE_FLOOR_REM } from './a11y-guard.mjs';
import { inspectFlagships } from './star-guard.mjs';
import { inspectPalette, inspectFonts } from './palette-guard.mjs';
import { roadmaps } from '../roadmaps.config.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const contentRoot = join(root, '.content');
const siteRoot = join(root, '_site');

let failures = 0;
const ok = (name, detail = '') => console.log(`  ✓ ${name}${detail ? ` — ${detail}` : ''}`);
const bad = (name, detail) => {
  console.error(`  ✗ ${name} — ${detail}`);
  failures++;
};

function mustReject(name, text, expectFragment) {
  const { problems } = inspectReadme(text, {});
  if (!problems.length) return bad(name, 'guard accepted a payload it must refuse');
  if (expectFragment && !problems.join('; ').includes(expectFragment))
    return bad(name, `rejected, but for the wrong reason: ${problems.join('; ')}`);
  ok(name, problems[0]);
}

function mustAccept(name, text) {
  const { problems } = inspectReadme(text, {});
  if (problems.length) return bad(name, `false positive: ${problems.join('; ')}`);
  ok(name);
}

// A minimal well-formed roadmap body — the baseline every poisoned case mutates.
const HEALTHY = ['## §1 — Foundations', '', '### M1.1 — Do the thing', '', "> **You're done when** it runs.", ''].join('\n');

console.log('\nSHAPE — a README that parses to nothing must not publish');
mustAccept('healthy body passes', HEALTHY);
mustReject('no milestone headings', HEALTHY.replace('### M1.1', '#### M1.1'), '0 milestone headings');
mustReject('no section headings', HEALTHY.replace('## §1', '## 1.'), '0 section headings');
mustReject('empty document', '', '0 milestone headings');

console.log('\nMARKUP — executable markup from a repo we do not own must not reach the origin');
mustReject('<script> tag', HEALTHY + '\n<script>alert(1)</script>', '<script>');
mustReject('<iframe> tag', HEALTHY + '\n<iframe src="//evil.test"></iframe>', '<iframe>');
mustReject('inline event handler', HEALTHY + '\n<img src=x onerror=alert(1)>', 'event handler');
mustReject('javascript: URL', HEALTHY + '\n<a href="javascript:alert(1)">x</a>', 'javascript:');

console.log('\nMARKUP — prose must NOT trip the guard (false positives break the build)');
mustAccept('book title "JavaScript: The Good Parts"', HEALTHY + '\nRead JavaScript: The Good Parts.');
mustAccept('prose containing " once ="', HEALTHY + '\nSet it once = done, then move on.');
mustAccept('allowed <sub> tag actually used by the roadmaps', HEALTHY + '\n<sub>a footnote</sub>');
mustAccept('code fence mentioning onerror', HEALTHY + '\n```\nimg.onerror = handler\n```');

console.log('\nSVG — the map is inlined raw, so it gets the same border check');
const svgOk = '<svg xmlns="http://www.w3.org/2000/svg"><rect x="1" y="2" width="3" height="4"/></svg>';
if (inspectSvg(svgOk).length) bad('clean SVG passes', 'false positive'); else ok('clean SVG passes');
if (!inspectSvg(svgOk.replace('<rect', '<script>fetch("//evil")</script><rect')).length)
  bad('SVG with <script>', 'guard accepted it'); else ok('SVG with <script> rejected');
if (!inspectSvg('<svg onload="alert(1)"></svg>').length)
  bad('SVG with onload=', 'guard accepted it'); else ok('SVG with onload= rejected');

console.log('\nFLAGSHIP DISPLAY — the star comes out of the heading, so the stamp must be there');
{
  // The README the site does not own, and the HTML this build makes of it. Two
  // milestones, because the interesting failure is a flagship that has NO
  // criterion of its own while a LATER milestone does — the shape that was
  // silently counted as stamped for as long as this rule lived inline.
  const FLAG_MD = [
    '### M1.1 — ⭐ The flagship',
    '',
    "> **You're done when** it ships.",
    '',
    '### M1.2 — The ordinary one',
    '',
    "> **You're done when** it runs.",
    ''
  ].join('\n');
  const FLAG_HTML = [
    '<h3 id="m11" class="ps-ms-h is-star" data-ms="M1.1">M1.1 — The flagship</h3>',
    '<blockquote class="ps-criterion">',
    "<p><strong>You're done when</strong> it ships.</p>",
    '</blockquote>',
    '<h3 id="m12" class="ps-ms-h" data-ms="M1.2">M1.2 — The ordinary one</h3>',
    '<blockquote class="ps-criterion">',
    "<p><strong>You're done when</strong> it runs.</p>",
    '</blockquote>'
  ].join('\n');

  const flagReject = (name, html, md, fragment) => {
    const { problems } = inspectFlagships(html, md);
    if (!problems.length) return bad(name, 'guard accepted a page it must refuse');
    const said = problems.map((p) => `${p.title}: ${p.detail}`).join('; ');
    if (fragment && !said.includes(fragment)) return bad(name, `rejected, but for the wrong reason: ${said}`);
    ok(name, problems[0].title);
  };

  const healthy = inspectFlagships(FLAG_HTML, FLAG_MD);
  if (healthy.problems.length) bad('a healthy flagship passes', `false positive: ${healthy.problems[0].detail}`);
  else ok('a healthy flagship passes', `${healthy.starred} starred, ${healthy.stamped} stamped`);

  // Poison 1 — the criterion is still there, one paragraph below. The CSS rule
  // that draws the gold stamp is an adjacent-sibling rule, so the reader sees an
  // ordinary milestone with the star already stripped out of its heading.
  flagReject(
    'criterion separated from its flagship by a paragraph',
    FLAG_HTML.replace(
      '<h3 id="m11" class="ps-ms-h is-star" data-ms="M1.1">M1.1 — The flagship</h3>',
      '<h3 id="m11" class="ps-ms-h is-star" data-ms="M1.1">M1.1 — The flagship</h3>\n<p>This is the headline artifact.</p>'
    ),
    FLAG_MD,
    'flagship without a stamp'
  );

  // Poison 2 — the flagship has no criterion at all; the next milestone does.
  flagReject(
    'flagship with no criterion, a later milestone with one',
    FLAG_HTML.replace(
      '<blockquote class="ps-criterion">\n<p><strong>You\'re done when</strong> it ships.</p>\n</blockquote>\n',
      ''
    ),
    FLAG_MD,
    'flagship without a stamp'
  );

  flagReject(
    'emoji survived in the rendered heading',
    FLAG_HTML.replace('M1.1 — The flagship</h3>', 'M1.1 — ⭐ The flagship</h3>'),
    FLAG_MD,
    'emoji survived'
  );

  flagReject(
    'is-star lost while the README still says flagship',
    FLAG_HTML.replace('"ps-ms-h is-star"', '"ps-ms-h"'),
    FLAG_MD,
    'flagship count drifted'
  );

  // A roadmap with no flagship at all is legal and must not be failed.
  {
    const none = inspectFlagships(
      FLAG_HTML.replace('"ps-ms-h is-star"', '"ps-ms-h"'),
      FLAG_MD.replace('⭐ ', '')
    );
    if (none.problems.length) bad('a roadmap with no flagship passes', none.problems[0].detail);
    else ok('a roadmap with no flagship passes');
  }
}

console.log('\nDRIFT — a legitimate roadmap change warns, it does not fail the build');
{
  const r = inspectReadme(HEALTHY, { milestones: 99 });
  if (r.problems.length) bad('drift stays non-fatal', 'drift was treated as a failure');
  else if (!r.warnings.length) bad('drift is reported', 'no warning emitted');
  else ok('drift warns but does not fail', r.warnings[0].slice(0, 58) + '…');
}

console.log('\nACCESSIBILITY — each rule refuses the exact regression it was written for');
{
  // A minimal page carrying every shape the a11y guard inspects. Each case below
  // breaks exactly one of them; the healthy page must keep passing all of them.
  const HEALTHY_CSS = '.toc__details::details-content { content-visibility: visible; block-size: auto; }';
  const HEALTHY_PAGE = [
    '<main id="main" tabindex="-1">',
    '<nav class="site-nav" aria-label="Main"><a href="/">home</a></nav>',
    '<nav class="toc" aria-label="Sections"><details class="toc__details"><summary>Sections</summary></details></nav>',
    '<div class="progress"><span class="progress__bar" role="progressbar" aria-valuemin="0" aria-valuemax="1" aria-valuenow="0"></span></div>',
    '<article class="roadmap prose">',
    '<h3 id="m11" class="ps-ms-h" data-ms="M1.1">M1.1</h3>',
    '<h2 id="s1">§1 <a class="ps-anchor" href="#s1" aria-hidden="true" tabindex="-1">#</a></h2>',
    '<nav class="ps-map-nav" aria-label="Roadmap map"><figure class="ps-map" tabindex="0" data-hotspots="1" data-sections="1">',
    '<svg><a href="#s1" aria-label="Jump to section 1 — Foundations"><rect class="ps-map__hit" x="1" y="2" width="3" height="4" rx="10"/></a></svg>',
    '</figure></nav>',
    '<div class="prose__scroll" role="group" aria-label="Table" tabindex="0"><table><tr><td>x</td></tr></table></div>',
    '<pre tabindex="0"><code>x</code></pre>',
    '<a class="skip-link" href="#main">Skip to content</a>',
    '</article></main>'
  ].join('\n');

  const a11yReject = (name, page, fragment, css = HEALTHY_CSS) => {
    const { problems } = inspectRenderedPage(page, { css });
    if (!problems.length) return bad(name, 'guard accepted a page it must refuse');
    if (fragment && !problems.join('; ').includes(fragment))
      return bad(name, `rejected, but for the wrong reason: ${problems.join('; ')}`);
    ok(name, problems[0].slice(0, 72) + (problems[0].length > 72 ? '…' : ''));
  };

  const { problems } = inspectRenderedPage(HEALTHY_PAGE, { css: HEALTHY_CSS });
  if (problems.length) bad('a healthy page passes', `false positive: ${problems.join('; ')}`);
  else ok('a healthy page passes');

  a11yReject(
    'heading anchor back in the tab order',
    HEALTHY_PAGE.replace(' aria-hidden="true" tabindex="-1"', ' aria-hidden="true"'),
    'aria-hidden'
  );
  a11yReject('unnamed <nav> landmark', HEALTHY_PAGE.replace(' aria-label="Main"', ''), 'accessible name');
  a11yReject('skip link with nowhere to land', HEALTHY_PAGE.replace(' tabindex="-1"', ''), 'skip link');
  a11yReject(
    'table that only a mouse can scroll',
    HEALTHY_PAGE.replace('<div class="prose__scroll" role="group" aria-label="Table" tabindex="0">', '<div>'),
    'scroll wrapper'
  );
  a11yReject('code block off the keyboard path', HEALTHY_PAGE.replace('<pre tabindex="0">', '<pre>'), '<pre>');
  a11yReject(
    'map hotspots named by number only',
    HEALTHY_PAGE.replace('aria-label="Jump to section 1 — Foundations"', 'aria-label="Jump to §1"'),
    'number only'
  );
  a11yReject(
    'map unreachable without a mouse',
    HEALTHY_PAGE.replace('<figure class="ps-map" tabindex="0"', '<figure class="ps-map"'),
    'unreachable by keyboard'
  );
  a11yReject(
    'progress bar back to being built after paint',
    HEALTHY_PAGE.replace(/<div class="progress">.*?<\/div>/, ''),
    'no reserved progress bar'
  );
  a11yReject(
    'progress total disagreeing with the page',
    HEALTHY_PAGE.replace('aria-valuemax="1"', 'aria-valuemax="9"'),
    'rewrites itself after paint'
  );
  a11yReject(
    'outline shipping open again',
    HEALTHY_PAGE.replace('<details class="toc__details">', '<details class="toc__details" open>'),
    'ships open'
  );
  a11yReject(
    'stylesheet losing the desktop outline rule',
    HEALTHY_PAGE,
    'does not force ::details-content visible',
    '.toc__details { border: 0; }'
  );
}

console.log(`\nTYPE FLOOR — a label under ${(FONT_SIZE_FLOOR_REM * 16).toFixed(2)}px must fail, and only a label`);
{
  const floorReject = (name, css, fragment) => {
    const { problems } = inspectStylesheet(css);
    if (!problems.length) return bad(name, 'guard accepted a size it must refuse');
    if (fragment && !problems.join('; ').includes(fragment))
      return bad(name, `rejected, but for the wrong reason: ${problems.join('; ')}`);
    ok(name, problems[0].slice(0, 74) + (problems[0].length > 74 ? '…' : ''));
  };
  const floorAccept = (name, css) => {
    const { problems } = inspectStylesheet(css);
    if (problems.length) return bad(name, `false positive: ${problems.join('; ')}`);
    ok(name);
  };

  // Rejected — each of these is a real size the site shipped before this wave.
  floorReject('a stamp back at .6rem', '.stamp { font-size: .6rem; }', '9.60px');
  floorReject('the PROOF stamp back at .62rem', '.ps-criterion::before { font-size: .62rem; }', '9.92px');
  floorReject('a counter back at .68rem', '.toc__count { font-size: .68rem; }', '10.88px');
  floorReject('the shelf mark back at .72rem', '.card__num { font-size: .72rem; }', '11.52px');
  floorReject('a px value under the floor', '.x { font-size: 12px; }', '12.00px');
  // clamp() is judged by the size it can actually reach, not by its middle term.
  floorReject('clamp() whose floor is too low', '.y { font-size: clamp(.7rem, 2vw, 1.4rem); }', '11.20px');

  // Accepted — the guard must not become a reason to stop writing small type
  // where small type is correct, or the next person will delete it.
  floorAccept('the bottom rung itself', '.stamp { font-size: .78rem; }');
  floorAccept('an em value in prose', '.prose code { font-size: .86em; }');
  floorAccept('a percentage', '.z { font-size: 90%; }');
  floorAccept('11pt inside @media print', '@media print { body { font-size: 11pt; } .a { font-size: .5rem; } }');
  floorAccept('a var() the guard cannot resolve', '.stamp { font-size: var(--fs-stamp); }');
  floorAccept('a comment mentioning a small size', '/* was .6rem before the wave */ .stamp { font-size: .82rem; }');

  // And the shipped stylesheet itself, which is the case that actually matters.
  const shipped = join(siteRoot, 'assets', 'styles.css');
  if (existsSync(shipped)) floorAccept('the shipped stylesheet passes', readFileSync(shipped, 'utf8'));
  else console.warn('  … no _site/assets/styles.css (run: npm run build) — skipped');
}

// ─────────────────────────────────────────────────────────────────────────────
// PALETTE — each case here is a real thing the Stone repaint found, restated as
// a payload. The point of the guard is that the NEXT repaint cannot miss the
// same places, so the demonstrations are the misses themselves.
// ─────────────────────────────────────────────────────────────────────────────
console.log('\nPALETTE — a colour that escapes the token block must fail, and only that');
{
  // A minimal but honest stylesheet: both theme blocks, a print block, and a
  // comment carrying a hex — all four are load-bearing for the cases below.
  const PALETTE_CSS = `:root {
  --bg: #fcfdfe;
  --surface-2: #eaeef3;
  --accent: #005ab8;
  --on-accent: #ffffff;
}
[data-theme="dark"] {
  --bg: #101317; --text: #e3e8ee; --accent: #72bdff; --muted: #a0a9b2;
}
/* The pre-wave-A blue was #2457d6 and the print regression was #e6e8ec on white. */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) { --bg: #101317; --accent: #72bdff; }
}
.stamp { background: var(--accent); }
@media print { :root { --bg: #fff; --text: #000; } .x { color: #333; } }`;
  // Deliberately packed onto one line: the formatting-independence case.
  const ONE_LINER = ':root { --accent: #005ab8; --on-accent: #ffffff; }\n'
    + '[data-theme="dark"] { --bg: #101317; --text: #e3e8ee; --accent: #72bdff; --muted: #a0a9b2; }';
  const FAVICON = '<svg><rect fill="#005ab8"/><path fill="#ffffff"/></svg>';
  const OG = "const BG = '#101317';\nconst TEXT = '#e3e8ee';\nconst ACCENT = '#72bdff';\nconst MUTED = '#a0a9b2';";

  const reject = (name, payload, fragment) => {
    const { problems } = inspectPalette(payload);
    if (!problems.length) return bad(name, 'guard accepted a payload it must refuse');
    if (fragment && !problems.join('; ').includes(fragment))
      return bad(name, `rejected, but for the wrong reason: ${problems.join('; ')}`);
    ok(name, problems[0].slice(0, 78) + (problems[0].length > 78 ? '…' : ''));
  };
  const accept = (name, payload) => {
    const { problems } = inspectPalette(payload);
    if (problems.length) return bad(name, `false positive: ${problems.join('; ')}`);
    ok(name);
  };

  accept('the healthy shape', { css: PALETTE_CSS, favicon: FAVICON, ogSource: OG });
  accept('a whole rule written on one line', { css: ONE_LINER, favicon: FAVICON, ogSource: OG });

  // The exact miss this guard exists for: the map's hover wash was rgba()/hex.
  reject('the map hover wash back as a literal',
    { css: HEALTHY + '\n.ps-map a:hover .ps-map__hit { fill: rgba(157,59,31,.12); stroke: #9d3b1f; }' },
    'colour literal outside the token block');
  // And the header mark, which was a presentation attribute no guard could see.
  reject('a literal fill on the header mark',
    { css: HEALTHY + '\n.brand__mark rect { fill: #9d3b1f; }' },
    'colour literal outside the token block');
  reject('a stray literal in a plain rule',
    { css: HEALTHY + '\n.card { border-color: #dadfe6; }' },
    'colour literal outside the token block');

  // Repaint half done: stylesheet moved, the two mirrors did not.
  reject('favicon left on the old accent',
    { css: PALETTE_CSS, favicon: '<svg><rect fill="#9d3b1f"/><path fill="#f7f3ea"/></svg>' },
    'favicon.svg badge is not --accent');
  reject('OG generator left on the old dark palette',
    { css: PALETTE_CSS, ogSource: "const BG = '#14110d';\nconst TEXT = '#ece5d6';\nconst ACCENT = '#e08b62';\nconst MUTED = '#a89d8a';" },
    'make-og.mjs BG is #14110d');
  // One drifted value out of four still has to fail: three green rows would read
  // as a pass on a glance, which is how a half-repaint gets shipped.
  reject('one drifted OG value out of four',
    { css: PALETTE_CSS, ogSource: "const BG = '#101317';\nconst TEXT = '#e3e8ee';\nconst ACCENT = '#e08b62';\nconst MUTED = '#a0a9b2';" },
    'make-og.mjs ACCENT is #e08b62');
  reject('OG generator that stopped declaring a value',
    { css: PALETTE_CSS, ogSource: "const BG = '#101317';\nconst TEXT = '#e3e8ee';\nconst MUTED = '#a0a9b2';" },
    'no ACCENT literal to compare');
  // Light vs dark must not be interchangeable: the OG card is dark, and reading
  // the light --accent for it would pass a card nobody can read.
  reject('OG generator mirroring the LIGHT accent',
    { css: PALETTE_CSS, ogSource: OG.replace('#72bdff', '#005ab8') },
    'make-og.mjs ACCENT is #005ab8');

  // Accepted — the guard must not become a reason to stop writing colour where
  // colour belongs, or the next person will delete it.
  accept('a hex inside a comment', { css: HEALTHY + '\n/* was #9d3b1f before the Stone wave */' });
  accept('a hex inside @media print', { css: HEALTHY + '\n@media print { .y { color: #999; } }' });
  accept('the packed no-JS fallback branch', { css: PALETTE_CSS });
  accept('a token whose name carries a digit', { css: PALETTE_CSS });
  accept('color-mix over a token', { css: HEALTHY + '\n.a { fill: color-mix(in srgb, var(--accent) 12%, transparent); }' });

  // And the shipped files themselves, which is the case that actually matters.
  const shippedCss = join(siteRoot, 'assets', 'styles.css');
  const shippedFav = join(siteRoot, 'assets', 'favicon.svg');
  const shippedOg = join(root, 'scripts', 'make-og.mjs');
  if (existsSync(shippedCss) && existsSync(shippedFav)) {
    accept('the shipped palette passes', {
      css: readFileSync(shippedCss, 'utf8'),
      favicon: readFileSync(shippedFav, 'utf8'),
      ogSource: readFileSync(shippedOg, 'utf8')
    });
  } else console.warn('  … no _site/assets/styles.css (run: npm run build) — skipped');

  // ── Fonts declared vs fonts shipped ──────────────────────────────────────
  // The first case is not hypothetical. It is what this wave actually shipped for
  // one build: the display serif's @font-face and both preloads were removed and
  // the two 26 KB files stayed in the passthrough, so the deploy grew from 622.8
  // to 631.0 KiB while every visible sign said the family was gone. Weighing the
  // output caught it. This guard is so that next time nobody has to think of it.
  const FONT_CSS = "@font-face { src: url('fonts/plex-sans-var.woff2') format('woff2'); }\n"
    + "@font-face { src: url('fonts/plex-mono-400.woff2') format('woff2'); }";
  const fontReject = (name, payload, fragment) => {
    const { problems } = inspectFonts(payload);
    if (!problems.length) return bad(name, 'guard accepted a bundle it must refuse');
    if (fragment && !problems.join('; ').includes(fragment))
      return bad(name, `rejected, but for the wrong reason: ${problems.join('; ')}`);
    ok(name, problems[0]);
  };
  const fontAccept = (name, payload) => {
    const { problems } = inspectFonts(payload);
    if (problems.length) return bad(name, `false positive: ${problems.join('; ')}`);
    ok(name);
  };

  fontAccept('declared and shipped agree', { css: FONT_CSS, bundled: ['plex-sans-var.woff2', 'plex-mono-400.woff2', 'OFL-IBMPlex.txt'] });
  fontReject('a retired face left in the bundle',
    { css: FONT_CSS, bundled: ['plex-sans-var.woff2', 'plex-mono-400.woff2', 'zilla-slab-700.woff2'] },
    'zilla-slab-700.woff2 is in the bundle but no @font-face names it');
  fontReject('a declared face missing from the bundle',
    { css: FONT_CSS, bundled: ['plex-sans-var.woff2'] },
    '@font-face names plex-mono-400.woff2 but it is not in the bundle');
  fontAccept('licence files are not faces', { css: FONT_CSS, bundled: ['plex-sans-var.woff2', 'plex-mono-400.woff2', 'OFL-IBMPlex.txt', 'readme.md'] });

  const fontDir = join(siteRoot, 'assets', 'fonts');
  if (existsSync(shippedCss) && existsSync(fontDir)) {
    const r = inspectFonts({ css: readFileSync(shippedCss, 'utf8'), bundled: readdirSync(fontDir) });
    if (r.problems.length) bad('the shipped bundle carries only declared faces', r.problems.join('; '));
    else ok('the shipped bundle carries only declared faces', `${r.present.length}: ${r.present.join(', ')}`);
  }
}

console.log('\nACCESSIBILITY — the built pages must pass exactly as they are');
if (!existsSync(siteRoot)) {
  console.warn('  … no _site (run: npm run build) — skipped');
} else {
  for (const rel of ['index.html', '404.html', ...roadmaps.filter((r) => r.status === 'live').map((r) => `${r.slug}/index.html`)]) {
    const p = join(siteRoot, rel);
    if (!existsSync(p)) {
      console.warn(`  … ${rel}: not built — skipped`);
      continue;
    }
    const cssPath = join(siteRoot, 'assets', 'styles.css');
    const css = existsSync(cssPath) ? readFileSync(cssPath, 'utf8') : '';
    const { problems } = inspectRenderedPage(readFileSync(p, 'utf8'), { css });
    if (problems.length) bad(`${rel} passes the a11y guard`, problems.join('; '));
    else ok(`${rel} passes`);
  }
}

console.log('\nREAL CONTENT — the live READMEs must pass exactly as they are');
for (const r of roadmaps) {
  if (r.status !== 'live') continue;
  const p = join(contentRoot, r.slug, 'README.md');
  if (!existsSync(p)) {
    console.warn(`  … ${r.slug}: no cached README (run: node scripts/fetch-content.mjs) — skipped`);
    continue;
  }
  const text = readFileSync(p, 'utf8');
  const { problems, shape } = inspectReadme(text, r);
  if (problems.length) bad(`${r.slug} passes the guard`, problems.join('; '));
  else ok(`${r.slug} passes`, `${shape.milestones} milestones · ${shape.sections} sections`);

  const svg = join(contentRoot, r.slug, 'assets', 'roadmap.svg');
  if (existsSync(svg)) {
    const bads = inspectSvg(readFileSync(svg, 'utf8'));
    if (bads.length) bad(`${r.slug} map SVG passes`, bads.join('; '));
    else ok(`${r.slug} map SVG passes`);
  }
}

console.log('');
if (failures) {
  console.error(`check-guards: ${failures} assertion(s) failed.`);
  process.exit(1);
}
console.log('check-guards: all guards behave as specified.');
