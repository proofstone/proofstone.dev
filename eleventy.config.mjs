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

  // Render a roadmap README to HTML with GitHub-compatible anchors + rewritten links.
  eleventyConfig.addFilter('roadmapMarkdown', (content, roadmap) => {
    slugger = new GithubSlugger(); // reset dedup state per document
    const html = md.render(content || '');
    return rewriteLinks(html, roadmap);
  });

  eleventyConfig.addWatchTarget('./src/assets/');

  return {
    dir: { input: 'src', includes: '_includes', data: '_data', output: '_site' },
    markdownTemplateEngine: 'njk',
    htmlTemplateEngine: 'njk'
  };
}
