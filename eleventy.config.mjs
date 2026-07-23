import markdownIt from 'markdown-it';
import markdownItAnchor from 'markdown-it-anchor';
import GithubSlugger from 'github-slugger';
import { readFileSync, existsSync } from 'node:fs';
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

  const out = html.replace(/<h([23]) id="([^"]+)">([\s\S]*?)<\/h\1>/g, (full, level, id, inner) => {
    const text = decodeEntities(inner.replace(/<[^>]+>/g, '').replace(/#\s*$/, '').trim());

    if (level === '2') {
      const m = text.match(/^§(\d+)\s*[—–-]\s*(.*)$/);
      current = m ? { id, num: m[1], title: m[2].trim(), milestones: [] } : null;
      if (current) toc.push(current);
      return full;
    }

    const ms = text.match(MILESTONE_RE);
    if (!ms) return full;

    const isStar = STAR_RE.test(text);
    const isArticulation = ARTICULATION_RE.test(text);
    if (isStar) stars++;
    if (isArticulation) articulations++;
    if (current) current.milestones.push(ms[1]);

    const cls = ['ps-ms-h'];
    if (isStar) cls.push('is-star');
    if (isArticulation) cls.push('is-articulation');

    // No badge on the heading: the README already carries its own marker (⭐ or the
    // italic "(articulation …)"), and the stamp on the proof block below states the
    // kind outright. A third copy would just be noise.
    return `<h3 id="${id}" class="${cls.join(' ')}" data-ms="${ms[1]}">${inner}</h3>`;
  });

  return { html: out, toc, stars, articulations };
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
      `<figure class="ps-map" tabindex="0" data-hotspots="${matched}" data-sections="${toc.length}">${withHotspots}${caption}</figure>` +
      `</nav>`,
    matched,
    expected: toc.length
  };
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
    for (const r of loadRoadmaps()) {
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
  for (const r of roadmaps) {
    eleventyConfig.addPassthroughCopy({ [`.content/${r.slug}/assets`]: `${r.slug}/assets` });
  }

  // One real milestone (heading + its proof block) lifted out of a rendered roadmap,
  // so the home page can *show* the format instead of describing it. Anchors are
  // repointed at the roadmap page so the sample stays clickable.
  eleventyConfig.addFilter('milestoneSample', (roadmap, msId) => {
    const { html } = renderRoadmap(roadmap);

    const blockFor = (id) => {
      const esc = String(id).replace(/\./g, '\\.');
      const m = html.match(
        new RegExp(
          `<h3 id="[^"]*"[^>]*data-ms="${esc}">[\\s\\S]*?<\\/h3>\\s*<blockquote class="ps-criterion">[\\s\\S]*?<\\/blockquote>`
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
        /<h3 id="[^"]*"[^>]*data-ms="(M\d+\.\d+)">[\s\S]*?<\/h3>\s*<blockquote class="ps-criterion">[\s\S]*?<\/blockquote>/
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

  eleventyConfig.addFilter('roadmapMarkdown', (_content, roadmap) => renderRoadmap(roadmap).html);
  eleventyConfig.addFilter('roadmapToc', (roadmap) => renderRoadmap(roadmap).toc);
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
