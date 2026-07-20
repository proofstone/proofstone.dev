import markdownIt from 'markdown-it';
import markdownItAnchor from 'markdown-it-anchor';
import GithubSlugger from 'github-slugger';
import { roadmaps } from './roadmaps.config.mjs';

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
      ariaHidden: true
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
const SECTION_BOX_RE =
  /<rect\s+x="([\d.]+)"\s+y="([\d.]+)"\s+width="([\d.]+)"\s+height="([\d.]+)"[^>]*\/>\s*<text[^>]*>§(\d+)<\/text>/g;

function buildInteractiveMap(svg, toc, altText) {
  if (!svg) return '';
  const byNum = new Map(toc.map((s) => [String(s.num), s.id]));

  const hotspots = [...svg.matchAll(SECTION_BOX_RE)]
    .map(([, x, y, w, h, num]) => {
      const id = byNum.get(num);
      if (!id) return '';
      return `<a href="#${id}" aria-label="Jump to §${num}"><rect class="ps-map__hit" x="${x}" y="${y}" width="${w}" height="${h}" rx="10"/></a>`;
    })
    .join('');

  // role="img" would hide the links from assistive tech now that it is interactive.
  const opened = svg
    .replace(/\s*role="img"/, '')
    .replace('<svg ', '<svg class="ps-map__svg" ');

  const withHotspots = opened.replace(/<\/svg>\s*$/, `${hotspots}</svg>`);
  const caption = altText ? `<figcaption class="ps-map__cap">${altText}</figcaption>` : '';
  return `<figure class="ps-map">${withHotspots}${caption}</figure>`;
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

  const result = enhanceHeadings(html);

  const stripped = extractAndRemoveMapImg(result.html);
  const map = buildInteractiveMap(roadmap.mapSvg, result.toc, stripped.alt);
  result.html = insertBeforeFirstSection(stripped.html, map);

  renderCache.set(key, result);
  return result;
}

export default function (eleventyConfig) {
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
    const id = String(msId).replace('.', '\\.');
    const re = new RegExp(
      `<h3 id="[^"]*"[^>]*data-ms="${id}">[\\s\\S]*?<\\/h3>\\s*<blockquote class="ps-criterion">[\\s\\S]*?<\\/blockquote>`
    );
    const m = html.match(re);
    if (!m) return '';
    return m[0].replace(/href="#([^"]*)"/g, `href="/${roadmap.slug}/#$1"`);
  });

  eleventyConfig.addFilter('roadmapMarkdown', (_content, roadmap) => renderRoadmap(roadmap).html);
  eleventyConfig.addFilter('roadmapToc', (roadmap) => renderRoadmap(roadmap).toc);
  // Computed from the README when the content is there; falls back to the declared
  // value for roadmaps still private (nothing to count at build).
  eleventyConfig.addFilter('roadmapStars', (roadmap) => renderRoadmap(roadmap).stars || roadmap.stars || 0);

  eleventyConfig.addWatchTarget('./src/assets/');

  return {
    dir: { input: 'src', includes: '_includes', data: '_data', output: '_site' },
    markdownTemplateEngine: 'njk',
    htmlTemplateEngine: 'njk'
  };
}
