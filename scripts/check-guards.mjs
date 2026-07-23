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
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inspectReadme, inspectSvg, shapeOf } from './content-guard.mjs';
import { inspectRenderedPage } from './a11y-guard.mjs';
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
