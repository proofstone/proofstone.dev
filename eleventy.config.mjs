import markdownIt from 'markdown-it';
import markdownItAnchor from 'markdown-it-anchor';
import GithubSlugger from 'github-slugger';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { roadmaps, loadRoadmaps } from './roadmaps.config.mjs';

// One slugger per rendered document (GitHub-compatible slugs + dedup). Reassigned
// before each roadmap render so anchors match the source README exactly.
let slugger = new GithubSlugger();

const md = markdownIt({ html: true, linkify: true, typographer: false }).use(
  markdownItAnchor,
  {
    slugify: (s) => slugger.slug(s),
    tabIndex: false,
    permalink: markdownItAnchor.permalink.linkInsideHeader({
      symbol: '#',
      placement: 'after',
      class: 'ps-anchor',
      ariaHidden: true,
      // The "#" is decorative: it is hidden from assistive tech (ariaHidden) and
      // invisible until hover, so leaving it in the tab order put ~52 stops per
      // page that announce nothing (a quarter of all stops on this page).
      // renderAttrs — NOT linkAttrs: this version of markdown-it-anchor has no
      // such option and would ignore it silently. `tabIndex: false` above governs
      // the HEADING, not this link, so it does not cover it either.
      renderAttrs: () => ({ tabindex: '-1' })
    })
  }
);

// Rewrite a single relative URL from a roadmap README to a working site/GitHub URL.
function rewriteUrl(url, roadmap) {
  if (!url) return url;
  if (url.startsWith('#')) return url;                                   // in-page anchor
  if (/^(https?:)?\/\//i.test(url) || url.startsWith('mailto:') || url.startsWith('data:')) return url;
  const clean = url.replace(/^\.\//, '');
  if (clean.startsWith('assets/')) return `/${roadmap.slug}/${clean}`;    // local copied asset
  return `https://github.com/${roadmap.repo}/blob/${roadmap.branch}/${clean}`; // repo file → GitHub
}

function rewriteLinks(html, roadmap) {
  return html
    .replace(/(<a\b[^>]*\shref=")([^"]*)(")/g, (_m, a, u, c) => a + rewriteUrl(u, roadmap) + c)
    .replace(/(<img\b[^>]*\ssrc=")([^"]*)(")/g, (_m, a, u, c) => a + rewriteUrl(u, roadmap) + c);
}

// ── Milestone format markup (build layer only — roadmap READMEs are never edited) ──
//
// The "You're done when …" blockquote is THE element of the format, but markdown
// renders it identically to every other callout (a page has 4–14 ordinary ones).
// Tagging it here lets CSS make it unmistakable, and works with JavaScript off.
function markCriteria(html) {
  return html.replace(
    /<blockquote>(?=\s*<p><strong>You're done when<\/strong>)/g,
    '<blockquote class="ps-criterion">'
  );
}

// The three stamps are the site's own vocabulary, and a reader meets the first
// one with no idea that there are three or that they mean different things. This
// says it once, at the first criterion of the document, and never again — the
// cost is one line per page rather than one per milestone, and unlike a tooltip
// it is still there when the page is printed.
//
// The audience is not being changed: the home page still says this is for people
// who already ship software. What changes is that a vocabulary the site invented
// gets defined where it is first used, which is what a document does.
//
// (?:(?!<\/blockquote>)[\s\S])* rather than the lazy [\s\S]*?: the same tempered
// token the flagship guard is built on. A lazy match is not bounded — it can
// backtrack past this blockquote's own closing tag and land the legend after a
// later one, which is exactly the class of failure that shipped once already
// (REPORT-C, defect 1).
const STAMP_LEGEND =
  '\n<p class="stamp-legend">Every milestone carries one of three stamps: ' +
  '<span class="stamp-legend__k stamp-legend__k--proof">PROOF</span> — the finishing condition, stated in advance; ' +
  '<span class="stamp-legend__k stamp-legend__k--flag">FLAGSHIP PROOF</span> — the artifact is public and carries your name; ' +
  '<span class="stamp-legend__k stamp-legend__k--art">ARTICULATION</span> — you can state and defend it, there is nothing to build. ' +
  'Tick one off and it becomes <span class="stamp-legend__k stamp-legend__k--ok">PROVEN</span>, and a stone is laid in the course at the top of the page.</p>\n';

function insertStampLegend(html) {
  const re = /<blockquote class="ps-criterion">(?:(?!<\/blockquote>)[\s\S])*<\/blockquote>/;
  const m = html.match(re);
  if (!m) return html;                       // no criteria on this page, nothing to explain
  const end = m.index + m[0].length;
  return html.slice(0, end) + STAMP_LEGEND + html.slice(end);
}

// Wide tables and code blocks scroll sideways inside themselves. A scroll
// container that cannot be focused cannot be scrolled without a mouse, so the
// right-hand columns were unreachable by keyboard in Safari and older Chromium.
//   • tables get a wrapper, which also lets the table itself keep its native
//     layout instead of the `display: block` that classically costs a table its
//     row/column semantics. Current Chrome keeps them either way (measured), so
//     that half is insurance against other engines, not a fix for a live bug.
//   • <pre> is already its own scroll container, so it just becomes focusable.
// role="group", not role="region": a landmark per table would be rotor noise on
// a page that already has three of them.
function wrapScrollables(html) {
  return html
    .replace(/<table(\s[^>]*)?>/g, (_m, attrs) => `<div class="prose__scroll" role="group" aria-label="Table" tabindex="0"><table${attrs || ''}>`)
    .replace(/<\/table>/g, '</table></div>')
    .replace(/<pre(\s[^>]*)?>/g, (_m, attrs) => `<pre${attrs || ''} tabindex="0">`);
}

const MILESTONE_RE = /^\s*(M\d+\.\d+)\b/;
// Two articulation conventions exist across the series and both must parse:
//   applied-cryptography / electronics → "*(articulation milestone — …)*"
//   robotics                            → "🧭"
const ARTICULATION_RE = /articulation|🧭/i;
const STAR_RE = /[⭐★]/;

// Heading text is pulled out of already-rendered HTML, so entities are encoded.
// The outline renders it as plain text (the template escapes again), hence decode.
function decodeEntities(s) {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&'); // last — otherwise "&amp;lt;" would decode twice
}

// Tag milestone headings and collect the §-section outline (for the sticky TOC).
function enhanceHeadings(html) {
  const toc = [];
  let current = null;
  let stars = 0;
  let articulations = 0;
  let milestones = 0;

  const out = html.replace(/<h([23]) id="([^"]+)">([\s\S]*?)<\/h\1>/g, (full, level, id, inner) => {
    const text = decodeEntities(inner.replace(/<[^>]+>/g, '').replace(/#\s*$/, '').trim());

    if (level === '2') {
      const m = text.match(/^§(\d+)\s*[—–-]\s*(.*)$/);
      current = m ? { id, num: m[1], title: m[2].trim(), milestones: [] } : null;
      if (current) toc.push(current);
      // A §-number in a heading is an ADDRESS, not a word, so it is set in mono
      // like every other number on the site. Scoped to the leading token of a
      // section heading: a "§4" mentioned inside a sentence stays prose.
      if (current) {
        return full.replace(
          /(<h2 id="[^"]+">)(§\d+)/,
          (_m, open, num) => `${open}<span class="ps-num">${num}</span>`
        );
      }
      return full;
    }

    const ms = text.match(MILESTONE_RE);
    if (!ms) return full;

    milestones++;
    const isStar = STAR_RE.test(text);
    const isArticulation = ARTICULATION_RE.test(text);
    if (isStar) stars++;
    if (isArticulation) articulations++;
    if (current) current.milestones.push(ms[1]);

    const cls = ['ps-ms-h'];
    if (isStar) cls.push('is-star');
    if (isArticulation) cls.push('is-articulation');

    // The star is DATA and stays data: `stars` above is still counted from it,
    // and make-og.mjs still reads it out of the README. Only its rendering
    // changes — the emoji comes out of the visible heading and the FLAGSHIP
    // stamp on the criterion below says the same thing in the site's own
    // language. An emoji rasterises differently on every platform and was the
    // last place the page borrowed someone else's glyph.
    //
    // Three properties this must keep, in order:
    //  • it runs AFTER isStar/stars, so removing the glyph cannot change what
    //    the page knows about the milestone;
    //  • it touches milestone headings only, never prose — a global replace
    //    would edit a README's sentences, which this repo may not do;
    //  • it is asserted afterwards by check-build (STAR DISPLAY), which fails
    //    the build if the number of is-star headings ever stops matching the
    //    number of starred milestone headings in the source markdown.
    const shown = isStar ? inner.replace(/[⭐★]\s*/g, '') : inner;
    // Two wrappers, both structural:
    //  • the milestone id goes to mono for the same reason the §-number does;
    //  • everything else goes into ONE span, because the heading is a flex row
    //    (checkbox + text) and app.js inserts the checkbox as its first child.
    //    Without the span the id, the dash and the title are three flex items
    //    and wrap independently — at 390px the id sat alone on its own line.
    const withNum = shown.replace(/^(\s*)(M\d+\.\d+)/, (_m, sp, num) => `${sp}<span class="ps-num">${num}</span>`);
    return `<h3 id="${id}" class="${cls.join(' ')}" data-ms="${ms[1]}"><span class="ps-ms-h__t">${withNum}</span></h3>`;
  });

  // `milestones` counts exactly what app.js will find in the DOM (h3.ps-ms-h with
  // data-ms), which is what lets the template reserve the progress bar with a
  // total that will not be rewritten after paint.
  return { html: out, toc, stars, articulations, milestones };
}

// ── The roadmap's own SVG map, made navigable ────────────────────────────────
//
// The renderers in the roadmap repos emit a flat SVG: no <g>, no ids, no links —
// and those repos are off limits. Luckily the output is strictly regular: every
// section is a <rect> immediately followed by a <text> holding its "§N" label.
// That label is the join key, so hotspots are matched by section NUMBER rather
// than by fuzzy title text. A box whose label is missing simply stays unlinked.
// Attribute-order-independent on purpose: the renderer lives in a repo we do not
// control, so a cosmetic change there (reordering attributes, adding a class,
// closing with </rect>, wrapping the label in <tspan>) must not silently turn the
// interactive map back into a picture. Coverage is asserted after the build.
const SECTION_BOX_RE =
  /<rect\b([^>]*?)(?:\/>|>\s*<\/rect>)\s*(?:<(?:title|desc)\b[^>]*>[\s\S]*?<\/(?:title|desc)>\s*)?<text\b[^>]*>\s*(?:<tspan\b[^>]*>\s*)?§(\d+)/gi;

function numAttr(attrs, name) {
  const m = attrs.match(new RegExp(`\\b${name}\\s*=\\s*["']([\\d.]+)["']`, 'i'));
  return m ? m[1] : null;
}

function buildInteractiveMap(svg, toc, altText) {
  if (!svg) return { html: '', matched: 0, expected: toc.length };
  const byNum = new Map(toc.map((s) => [String(s.num), s]));

  let matched = 0;
  const hotspots = [...svg.matchAll(SECTION_BOX_RE)]
    .map(([, attrs, num]) => {
      const section = byNum.get(num);
      const x = numAttr(attrs, 'x');
      const y = numAttr(attrs, 'y');
      const w = numAttr(attrs, 'width');
      const h = numAttr(attrs, 'height');
      if (!section || x === null || y === null || w === null || h === null) return '';
      matched++;
      // The section title is right here in the outline data, so the link says
      // where it goes. "Jump to §3" alone left 11 near-identical links, and a
      // screen reader at default verbosity may not even read the "§".
      // escapeHtml is load-bearing: titles are entity-decoded upstream, and §6
      // of one roadmap is literally "Monitoring & AI control".
      const label = md.utils.escapeHtml(`Jump to section ${num} — ${section.title}`);
      return `<a href="#${section.id}" aria-label="${label}"><rect class="ps-map__hit" x="${x}" y="${y}" width="${w}" height="${h}" rx="10"/></a>`;
    })
    .join('');

  // role="img" would hide the links from assistive tech now that it is interactive.
  const opened = svg
    .replace(/\s*role="img"/, '')
    .replace('<svg ', '<svg class="ps-map__svg" ');

  const withHotspots = opened.replace(/<\/svg>\s*$/, `${hotspots}</svg>`);
  const caption = altText ? `<figcaption class="ps-map__cap">${altText}</figcaption>` : '';

  // Which generation of map is this? A themed map paints itself with
  // var(--map-*, #fallback), so inlined here it inherits the page's tokens and
  // follows the theme; standalone on GitHub it falls back to the light literal.
  // An older map carries fixed light colours and has to keep sitting on the
  // force-light panel.
  //
  // This matters because the panel breaks BOTH ways, which is what makes a
  // global CSS switch impossible during a staged migration: an old map on a
  // themed panel is light artwork on a dark page, and a themed map on the
  // force-light panel resolves --map-paper against the page and puts a dark map
  // on a white panel. So the panel is chosen per map, here.
  //
  // Detected from the file rather than declared in the registry: a flag is a
  // thing to forget, and the drift would be silent. The SVG is what actually
  // decides how it paints, so the SVG is what gets asked.
  const mapTheme = /var\(--map-/.test(svg) ? 'tokens' : 'fixed';
  // Two accessibility notes on this wrapper:
  //  • <nav> around the figure, not role="navigation" ON it — a role on <figure>
  //    would sever the figcaption→figure name association. The label explains why
  //    a second set of section links exists next to the outline.
  //  • tabindex="0" on the scrolling element itself. Browsers make scroll
  //    containers keyboard-scrollable only when they hold NO focusable children;
  //    this one holds the hotspot links, so it is disqualified from that
  //    heuristic and the right third of the map was unreachable without a mouse.
  return {
    html:
      `<nav class="ps-map-nav" aria-label="Roadmap map">` +
      `<figure class="ps-map" tabindex="0" data-map-theme="${mapTheme}" data-hotspots="${matched}" data-sections="${toc.length}">${withHotspots}${caption}</figure>` +
      `</nav>`,
    matched,
    expected: toc.length
  };
}

// ── The criterion, as a terminal block ──────────────────────────────────────
//
// The home page shows one milestone and says "that is the whole format", so the
// pages have to be made of the object it shows: a bar naming the milestone and
// its stamp, the command that states the finishing condition, the condition
// itself in prose, and the line the reader earns by ticking the box.
//
// Everything added here is CHROME around text this repo does not own — the
// README's own paragraphs are passed through untouched, as $4.
//
// Three details are deliberate:
//   • the command line is aria-hidden: it repeats the milestone id, which the
//     heading right above it has already announced;
//   • the stamp label is the milestone's own property (proof / flagship proof /
//     articulation) and is NOT repainted when the box is ticked — the green is
//     spent on the status line and the stone, which are what the reader did;
//   • the status line ships in the HTML rather than being built by app.js on
//     click. It is display:none until .is-done, so it costs bytes and not a
//     layout event, and it survives printing.
//
// The pattern is tempered on both halves ((?:(?!…)[\s\S])*), for the reason
// star-guard.mjs documents at length: a lazy [\s\S]*? backtracks past its own
// closing tag and swallows the next milestone whole.
const CRITERION_BLOCK_RE =
  /(<h3 id="[^"]*" class="([^"]*)" data-ms="([^"]+)">(?:(?!<\/h3>)[\s\S])*<\/h3>\s*)<blockquote class="ps-criterion">((?:(?!<\/blockquote>)[\s\S])*)<\/blockquote>/g;

function stampOf(cls) {
  if (/is-star/.test(cls)) return 'flagship proof';
  if (/is-articulation/.test(cls)) return 'articulation';
  return 'proof';
}

function terminalise(html) {
  return html.replace(CRITERION_BLOCK_RE, (_m, heading, cls, ms, body) => {
    const kind = stampOf(cls);
    const earned =
      kind === 'articulation'
        ? 'you can state it and defend it'
        : 'the artifact exists — nothing here is finished by reading about it';
    return (
      heading +
      '<blockquote class="ps-criterion">' +
      `<div class="ps-crit__bar"><span class="ps-crit__id">${ms.toLowerCase()}</span>` +
      `<span class="ps-crit__kind">${kind}</span></div>` +
      '<div class="ps-crit__body">' +
      `<p class="ps-crit__cmd" aria-hidden="true">$ done-when --milestone ${ms}</p>` +
      body +
      `<p class="ps-crit__status"><b>PROVEN ✓</b> · ${earned}</p>` +
      '</div></blockquote>'
    );
  });
}

// The README embeds the same map as a plain <img>; drop it so the page shows the
// interactive one once, near the top, instead of a dead copy in the middle.
function extractAndRemoveMapImg(html) {
  let alt = '';
  const out = html.replace(
    /<p>\s*<img[^>]*roadmap\.svg[^>]*>\s*<\/p>\s*/,
    (m) => {
      const a = m.match(/alt="([^"]*)"/);
      if (a) alt = a[1];
      return '';
    }
  );
  return { html: out, alt };
}

// Place the map right after the opening framing (title, tagline, intro) and before
// the first section — top of the page in reading order, without preceding the H1.
function insertBeforeFirstSection(html, block) {
  if (!block) return html;
  const i = html.indexOf('<h2 ');
  return i === -1 ? html + block : html.slice(0, i) + block + html.slice(i);
}

// Render once per roadmap; both the HTML and the outline come from the same pass.
const renderCache = new Map();
function renderRoadmap(roadmap) {
  const key = `${roadmap.slug}:${(roadmap.content || '').length}:${(roadmap.mapSvg || '').length}`;
  if (renderCache.has(key)) return renderCache.get(key);

  slugger = new GithubSlugger(); // reset dedup state per document
  let html = md.render(roadmap.content || '');
  html = rewriteLinks(html, roadmap);
  html = markCriteria(html);
  html = wrapScrollables(html);

  const result = enhanceHeadings(html);
  // After enhanceHeadings: the stamp a criterion shows is decided by its
  // heading's classes, and those are assigned there.
  result.html = terminalise(result.html);
  // After enhanceHeadings, so the legend can never sit between a flagship
  // heading and its criterion — that adjacency is what draws the gold stamp,
  // and star-guard fails the build if it breaks.
  result.html = insertStampLegend(result.html);

  const stripped = extractAndRemoveMapImg(result.html);
  const map = buildInteractiveMap(roadmap.mapSvg, result.toc, stripped.alt);
  result.html = insertBeforeFirstSection(stripped.html, map.html);
  result.mapHotspots = map.matched;
  result.mapExpected = map.expected;

  renderCache.set(key, result);
  return result;
}

// The OG cards are pre-rendered PNGs (no browser on the CI runner), so their
// numbers are frozen at generation time. If a roadmap has gained or lost
// milestones since, the picture is lying — say so loudly instead of shipping it.
// Cross-checks two independent counters: this build's, and make-og.mjs's.
// Resolved against this file, never the working directory: the gate must not be
// skippable by invoking the build from somewhere else.
const REPO_ROOT = dirname(fileURLToPath(import.meta.url));

// A missing card is always the maintainer's own doing (a registry edit in this
// repo), so it is a hard stop. A STALE card can also be caused by someone editing
// a roadmap README in another repo, which rebuilds this site autonomously via
// repository_dispatch/schedule — failing there would wedge content updates behind
// a human with a Chrome-equipped machine. On those triggers we warn instead, and
// the drift is caught the moment a human next builds.
const AUTONOMOUS_TRIGGERS = new Set(['repository_dispatch', 'schedule']);

function checkOgFreshness() {
  const problems = [];
  const warnings = [];
  const p = join(REPO_ROOT, 'og-manifest.json');

  if (!existsSync(p)) {
    problems.push(`og-manifest.json is missing at ${p} — run: node scripts/make-og.mjs`);
  } else {
    const manifest = JSON.parse(readFileSync(p, 'utf8'));
    // Only live roadmaps have pages, therefore only they have cards (see the
    // matching filter in make-og.mjs). Iterating all of them would report a
    // missing card on every build for the ones under review — a permanent
    // warning is how a check stops being read.
    for (const r of loadRoadmaps().filter((r) => r.status === 'live')) {
      const baked = manifest[r.slug];
      if (!baked) {
        problems.push(`no OG card for "${r.slug}" — run: node scripts/make-og.mjs`);
        continue;
      }
      const stars = r.hasContent ? renderRoadmap(r).stars : r.stars || 0;
      if (baked.milestones !== r.milestones || baked.stars !== stars) {
        warnings.push(
          `STALE card for "${r.slug}": image says ${baked.milestones} milestones / ${baked.stars} ★, ` +
            `content says ${r.milestones} / ${stars}. Run: node scripts/make-og.mjs`
        );
      }
    }
  }

  // Locally everything stays advisory so `--serve` keeps working; CI is where the
  // gate has teeth.
  const isCI = process.env.CI === 'true';
  const autonomous = AUTONOMOUS_TRIGGERS.has(process.env.GITHUB_EVENT_NAME || '');
  const fatal = isCI ? [...problems, ...(autonomous ? [] : warnings)] : [];
  const advisory = [...problems, ...warnings].filter((m) => !fatal.includes(m));

  // On the autonomous path the drift is not fatal, but it must still surface on
  // the run summary rather than dying in the log nobody opens.
  for (const w of advisory) {
    console.warn(`[og] ${w}`);
    if (isCI) console.warn(`::warning file=og-manifest.json::[og] ${w}`);
  }
  if (fatal.length) {
    for (const f of fatal) console.error(`::error file=og-manifest.json::[og] ${f}`);
    throw new Error(`[og] ${fatal.length} card problem(s) — see above.`);
  }
}

export default function (eleventyConfig) {
  checkOgFreshness();

  // Global chrome assets.
  eleventyConfig.addPassthroughCopy({ 'src/assets': 'assets' });

  // Custom-domain marker. Actions deploys do NOT auto-create a CNAME file
  // (GitHub Docs), so we ship one to keep proofstone.dev bound on every deploy.
  eleventyConfig.addPassthroughCopy({ 'src/CNAME': 'CNAME' });

  // Per-roadmap assets fetched into .content/<slug>/assets → /<slug>/assets/…
  //
  // The passthrough itself stays: the fetcher downloads ANY assets/… path a
  // README references and rewriteUrl() points those references at
  // /<slug>/assets/…, so dropping it would make the next image an upstream
  // README adds 404 silently, unfixable from here.
  //
  // roadmap.svg is the one exclusion, and only because this build CONSUMES it:
  // the map is inlined into the page and the README's own <img> is stripped, so
  // the copied file is referenced by nothing. Measured before removing it — zero
  // occurrences of assets/roadmap.svg across all five rendered pages — and worth
  // 15,567 bytes today, roughly double that once the maps are redrawn. That is
  // the same class of finding as PERF-5 in wave A.
  //
  // Enumerated file by file rather than excluded by glob so the intent is
  // visible in the diff, and asserted on every build by the DEAD MAP COPIES gate
  // in check-build: if a page ever does reference the file, the build fails
  // instead of shipping a 404.
  for (const r of roadmaps) {
    const dir = join(REPO_ROOT, '.content', r.slug, 'assets');
    if (!existsSync(dir)) continue;
    for (const file of readdirSync(dir)) {
      if (file === 'roadmap.svg') continue;
      eleventyConfig.addPassthroughCopy({
        [`.content/${r.slug}/assets/${file}`]: `${r.slug}/assets/${file}`
      });
    }
  }

  // One real milestone (heading + its proof block) lifted out of a rendered roadmap,
  // so the home page can *show* the format instead of describing it. Anchors are
  // repointed at the roadmap page so the sample stays clickable.
  eleventyConfig.addFilter('milestoneSample', (roadmap, msId) => {
    const { html } = renderRoadmap(roadmap);

    // (?:(?!<\/h3>)[\s\S])* rather than [\s\S]*? — see scripts/star-guard.mjs.
    // A plain lazy run backtracks past the heading's own closing tag, so a
    // milestone whose criterion is missing or separated by a paragraph yields a
    // "sample" spanning it AND the next milestone: measured at 1610 bytes with
    // two data-ms attributes in it, on a green build. Bounded, the match either
    // is this milestone's own proof block or does not exist, and the fallback
    // below picks a milestone that really has one.
    const blockFor = (id) => {
      const esc = String(id).replace(/\./g, '\\.');
      const m = html.match(
        new RegExp(
          `<h3 id="[^"]*"[^>]*data-ms="${esc}">(?:(?!<\\/h3>)[\\s\\S])*<\\/h3>\\s*<blockquote class="ps-criterion">[\\s\\S]*?<\\/blockquote>`
        )
      );
      return m ? m[0] : null;
    };

    let block = msId ? blockFor(msId) : null;

    // The configured milestone can vanish for reasons outside this repo (a
    // renumbering upstream, a reworded criterion). Degrading to the first usable
    // milestone keeps the landing page's central proof intact; going silent — the
    // old behaviour — left a heading promising a sample above an empty div.
    if (!block) {
      const first = html.match(
        /<h3 id="[^"]*"[^>]*data-ms="(M\d+\.\d+)">(?:(?!<\/h3>)[\s\S])*<\/h3>\s*<blockquote class="ps-criterion">[\s\S]*?<\/blockquote>/
      );
      if (first) {
        console.warn(
          `[sample] "${msId}" not found in ${roadmap.slug} — falling back to ${first[1]}. ` +
            `Update sampleMilestone in roadmaps.config.mjs.`
        );
        block = first[0];
      }
    }

    if (!block) {
      // Nothing at all could be resolved: the home page would ship its flagship
      // demonstration empty. That is worth failing the build over.
      throw new Error(
        `[sample] no milestone with a proof block found in "${roadmap.slug}" — the home page cannot show what a milestone looks like.`
      );
    }
    return block.replace(/href="#([^"]*)"/g, `href="/${roadmap.slug}/#$1"`);
  });

  // ── The card's silhouette ─────────────────────────────────────────────────
  // DERIVED from the roadmap's own map, not drawn: the home page shows the same
  // geometry the roadmap page inlines, so a card cannot advertise a shape the map
  // does not have. A checked-in preview file could drift the first time a
  // renderer moves a node; this cannot.
  //
  // What comes out is the SHAPE and nothing else:
  //   • <text> goes entirely — at ~0.3 scale a 9–16px label is not small type,
  //     it is grey mush, and mush reads as a rendering fault;
  //   • the status plates go with it (rect with height <= 20, or any rotated
  //     rect): they exist to carry a label, and the label is gone;
  //   • <defs>/<marker> go because id="arw" appears in every one of the three
  //     maps, and three cards on one page would be a triple duplicate id;
  //   • the legend at the foot of the map is cropped — not by a magic Y value,
  //     but because the viewBox is recomputed from the NODE rects only, and
  //     connectors outside that box are dropped with it.
  // Stroke widths are multiplied because at this scale 1.6 units lands on half a
  // device pixel and the outline dissolves.
  // The --map-* fallbacks inside the attributes are left alone: they are what the
  // same file uses on GitHub, where var() does not resolve.
  const BADGE_H = 20;
  const STROKE_MUL = 2.6;
  const SIL_PAD = 10;
  const nums = (s) => (s.match(/-?\d+(?:\.\d+)?/g) || []).map(Number);
  const attr = (tag, name) => {
    const m = tag.match(new RegExp(`\\b${name}="([^"]*)"`));
    return m ? m[1] : null;
  };
  const fnum = (tag, name, dflt = 0) => {
    const v = attr(tag, name);
    return v === null ? dflt : Number(v);
  };
  // Every path in these maps is M/L/H/V/z with explicit coordinate pairs.
  const pathPoints = (d) => {
    const xs = [], ys = [];
    for (const [, cmd, body] of d.matchAll(/([MLmlHhVvZz])([^MLmlHhVvZz]*)/g)) {
      if (/[Zz]/.test(cmd)) continue;
      const v = nums(body);
      if (/[MLml]/.test(cmd)) { for (let i = 0; i < v.length; i += 2) { xs.push(v[i]); ys.push(v[i + 1]); } }
      else if (/[Hh]/.test(cmd)) xs.push(...v);
      else if (/[Vv]/.test(cmd)) ys.push(...v);
    }
    return { xs, ys };
  };

  const silhouette = (svg) => {
    const vb = nums(attr(svg, 'viewBox') || '');
    if (vb.length < 4) return '';
    const [, , vbw, vbh] = vb;
    const rects = [], boxes = [];
    for (const tag of svg.match(/<rect[^>]*\/?>/g) || []) {
      const w = fnum(tag, 'width'), h = fnum(tag, 'height');
      const x = fnum(tag, 'x'), y = fnum(tag, 'y');
      if (w >= vbw * 0.98 && h >= vbh * 0.98) continue;   // the map's own paper
      if (h <= BADGE_H) continue;
      if (attr(tag, 'transform')) continue;
      rects.push(tag);
      boxes.push([x, y, x + w, y + h]);
    }
    if (!boxes.length) throw new Error('[silhouette] no node rects found in a roadmap map');
    const x0 = Math.min(...boxes.map((b) => b[0]));
    const y0 = Math.min(...boxes.map((b) => b[1]));
    const x1 = Math.max(...boxes.map((b) => b[2]));
    const y1 = Math.max(...boxes.map((b) => b[3]));
    const inside = (xs, ys) => xs.length && ys.length
      && Math.min(...xs) >= x0 - 2 && Math.max(...xs) <= x1 + 2
      && Math.min(...ys) >= y0 - 2 && Math.max(...ys) <= y1 + 2;

    const links = [];
    for (const tag of svg.match(/<line[^>]*\/?>/g) || []) {
      if (inside([fnum(tag, 'x1'), fnum(tag, 'x2')], [fnum(tag, 'y1'), fnum(tag, 'y2')])) links.push(tag);
    }
    for (const tag of svg.match(/<path[^>]*\/?>/g) || []) {
      const d = attr(tag, 'd') || '';
      if (/z/i.test(d) && d.length < 25) continue;   // the arrowhead out of <defs>
      const { xs, ys } = pathPoints(d);
      if (inside(xs, ys)) links.push(tag);
    }
    const thicken = (tag) => tag
      .replace(/stroke-width="([\d.]+)"/, (_, v) => `stroke-width="${(Number(v) * STROKE_MUL).toFixed(2)}"`)
      .replace(/stroke-dasharray="([^"]+)"/, (_, v) => `stroke-dasharray="${nums(v).map((n) => (n * STROKE_MUL).toFixed(1)).join(' ')}"`)
      .replace(/\s*marker-end="[^"]*"/g, '');

    const w = x1 - x0 + SIL_PAD * 2;
    const h = y1 - y0 + SIL_PAD * 2;
    // No paper rect. The map's own --map-paper is the page colour, and the card's
    // face already has a surface behind it — painting the sheet inside it put a
    // white rectangle in the middle of a grey box, letterboxed by whatever the
    // aspect ratio left over. The box is the sheet; the silhouette is what is on it.
    const body = [
      ...links.map(thicken),   // connectors under the nodes
      ...rects.map(thicken)
    ];
    // A silhouette is the one place on this site where the map's own tokens are
    // the WRONG paint. --map-ink has to carry node labels at 4.5:1, so it is a
    // near-white; here every label has been stripped out and what is left is a
    // decorative shape, which at that brightness reads as the loudest object on
    // the home page. So the shapes are re-pointed at --sil-*, which is the quiet
    // pair the maps themselves cannot use. The var() fallbacks are left alone:
    // they are what the same geometry uses on GitHub, where var() does not
    // resolve, and nothing here is ever rendered without the stylesheet.
    const quiet = (s) =>
      s
        .replace(/var\(--map-node-spine/g, 'var(--sil-node')
        .replace(/var\(--map-node/g, 'var(--sil-node')
        .replace(/var\(--map-ink/g, 'var(--sil-ink')
        .replace(/var\(--map-line/g, 'var(--sil-ink');
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x0 - SIL_PAD} ${y0 - SIL_PAD} ${w} ${h}"`
      + ` preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">${quiet(body.join(''))}</svg>`;
  };

  const silCache = new Map();
  eleventyConfig.addFilter('roadmapSilhouette', (roadmap) => {
    if (!roadmap.mapSvg) {
      throw new Error(`[silhouette] ${roadmap.slug} has no map SVG — the card cannot show a shape it does not have.`);
    }
    if (!silCache.has(roadmap.slug)) silCache.set(roadmap.slug, silhouette(roadmap.mapSvg));
    return silCache.get(roadmap.slug);
  });

  // Totals for the register's head line. A filter rather than arithmetic in the
  // template: Nunjucks `set` does not survive a loop, and the alternative — a
  // number typed into the markup — is the exact failure this project has had
  // twice (27→33, 21→20).
  eleventyConfig.addFilter('sumBy', (list, field) =>
    (list || []).reduce((n, item) => n + (Number(item[field]) || 0), 0)
  );

  eleventyConfig.addFilter('roadmapMarkdown', (_content, roadmap) => renderRoadmap(roadmap).html);
  eleventyConfig.addFilter('roadmapToc', (roadmap) => renderRoadmap(roadmap).toc);
  // Feeds the statically reserved progress bar. NOT the registry's declared
  // number and NOT the sum of the outline's per-section counts: it must equal
  // what app.js counts in the DOM, or the bar rewrites itself and shifts.
  eleventyConfig.addFilter('roadmapMilestoneCount', (roadmap) => renderRoadmap(roadmap).milestones);
  // Computed from the README when the content is there; falls back to the declared
  // value for roadmaps still private (nothing to count at build).
  eleventyConfig.addFilter('roadmapStars', (roadmap) => renderRoadmap(roadmap).stars || roadmap.stars || 0);

  // Structured data is built as an OBJECT and serialized here — never assembled
  // as a string in the template. Nunjucks autoescapes, so hand-written JSON with
  // {{ }} holes emits &#39;/&amp; and silently becomes invalid JSON-LD the first
  // time a title contains an apostrophe. Escaping <, > and & on the way out also
  // means a "</script>" inside any interpolated prose cannot end the block early.
  eleventyConfig.addFilter('jsonLd', (obj) =>
    JSON.stringify(obj)
      .replace(/</g, '\\u003c')
      .replace(/>/g, '\\u003e')
      .replace(/&/g, '\\u0026')
      // U+2028/U+2029 are line terminators in JS source: written as escapes
      // because a literal one inside a regex literal does not parse at all.
      .replace(/[\u2028\u2029]/g, (c) => '\\u' + c.charCodeAt(0).toString(16))
  );

  // Structured data, built as data (see the jsonLd filter above for why).
  // Deliberately NOT emitted: SearchAction/sitelinks-searchbox (Google retired it
  // and there is no site search to point at) and Course (Google expects a real
  // provider offering instruction — there is no instructor or enrolment here, so
  // claiming it would be misleading markup).
  eleventyConfig.addFilter('structuredData', (ctx) => {
    const { pageType, roadmap, site, pageUrl } = ctx;
    const org = `${site.url}/#org`;
    const website = `${site.url}/#website`;
    const canonical = `${site.url}${pageUrl}`;

    if (pageType === 'home') {
      return {
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'Organization',
            '@id': org,
            name: site.name,
            url: `${site.url}/`,
            logo: `${site.url}/assets/favicon-180.png`,
            sameAs: [site.org]
          },
          {
            '@type': 'WebSite',
            '@id': website,
            url: `${site.url}/`,
            name: site.name,
            description: site.tagline,
            inLanguage: 'en',
            publisher: { '@id': org }
          }
        ]
      };
    }

    if (pageType === 'roadmap' && roadmap) {
      const toc = renderRoadmap(roadmap).toc;
      const resource = {
        '@type': 'LearningResource',
        '@id': `${canonical}#roadmap`,
        name: roadmap.title,
        url: canonical,
        description: roadmap.tagline,
        learningResourceType: 'Roadmap',
        educationalLevel: 'Professional',
        inLanguage: 'en',
        isPartOf: { '@id': website },
        provider: { '@id': org }
      };
      if (roadmap.updated) resource.dateModified = roadmap.updated;
      if (toc.length) {
        // One granularity only: the list is the §-sections, so numberOfItems
        // counts sections. Annotating a section list with a milestone total
        // would make the number disagree with the list it describes.
        resource.hasPart = {
          '@type': 'ItemList',
          name: `${roadmap.title} — sections`,
          numberOfItems: toc.length,
          itemListElement: toc.map((s, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: `§${s.num} — ${s.title}`,
            url: `${canonical}#${s.id}`
          }))
        };
      }

      return {
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'BreadcrumbList',
            // Mirrors the visible breadcrumb exactly — no invented levels.
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: site.name, item: `${site.url}/` },
              { '@type': 'ListItem', position: 2, name: roadmap.title, item: canonical }
            ]
          },
          resource
        ]
      };
    }

    return null; // 404 and anything else: no structured data.
  });

  // ISO timestamp → "22 July 2026". Locale pinned to en-GB so the build output is
  // identical on every machine and in CI.
  eleventyConfig.addFilter('isoDate', (iso) =>
    iso
      ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
      : ''
  );

  eleventyConfig.addWatchTarget('./src/assets/');

  return {
    dir: { input: 'src', includes: '_includes', data: '_data', output: '_site' },
    markdownTemplateEngine: 'njk',
    htmlTemplateEngine: 'njk'
  };
}
