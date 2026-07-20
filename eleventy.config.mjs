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

// Render once per roadmap; both the HTML and the outline come from the same pass.
const renderCache = new Map();
function renderRoadmap(roadmap) {
  const key = `${roadmap.slug}:${(roadmap.content || '').length}`;
  if (renderCache.has(key)) return renderCache.get(key);

  slugger = new GithubSlugger(); // reset dedup state per document
  let html = md.render(roadmap.content || '');
  html = rewriteLinks(html, roadmap);
  html = markCriteria(html);

  const result = enhanceHeadings(html);
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

  eleventyConfig.addFilter('roadmapMarkdown', (_content, roadmap) => renderRoadmap(roadmap).html);
  eleventyConfig.addFilter('roadmapToc', (roadmap) => renderRoadmap(roadmap).toc);
  eleventyConfig.addFilter('roadmapStars', (roadmap) => renderRoadmap(roadmap).stars);

  eleventyConfig.addWatchTarget('./src/assets/');

  return {
    dir: { input: 'src', includes: '_includes', data: '_data', output: '_site' },
    markdownTemplateEngine: 'njk',
    htmlTemplateEngine: 'njk'
  };
}
