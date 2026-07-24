// Dev-only: render the Open Graph preview cards (1200×630) for the home page and
// each roadmap, using the system Chrome we already drive for icons/screenshots.
// No new dependency, no external service, no page screenshots — a fixed template.
//
//   node scripts/make-og.mjs
//
// Output: src/assets/og/<slug>.png, src/assets/og/default.png and og/manifest.json.
// The manifest records the numbers baked into each image; the Eleventy build
// compares it against the live counts and shouts if an image has gone stale.
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadRoadmaps } from '../roadmaps.config.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'src/assets/og');
mkdirSync(outDir, { recursive: true });

const ACCENT = {
  blue: '#6f9bff',
  teal: '#2dd4bf',
  violet: '#a78bfa',
  amber: '#e0b64d',
  green: '#4ade80'
};

// Same rule the site uses: a milestone heading carrying a star marker.
const countStars = (md) => (md.match(/^###\s+M\d+\.\d+.*[⭐★].*$/gm) || []).length;

const FONT =
  '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif';

// The proofstone mark (chiseled P), identical to favicon.svg and the header
// lockup. The badge navy stays fixed across cards; only the wordmark/stripe pick
// up the per-roadmap accent, so the mark reads as the constant series identity.
const MARK =
  '<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">' +
  '<rect width="32" height="32" rx="7" fill="#16223b"/>' +
  '<path fill="#6f9bff" fill-rule="evenodd" d="M8.5 9.3L10.3 7.5L21.7 7.5L23.5 9.3L23.5 15.7L21.7 17.5L13.5 17.5L13.5 22.8L11.7 24.5L10.3 24.5L8.5 22.8Z M13.5 10.6L20 10.6L21.3 11.9L21.3 13.1L20 14.4L13.5 14.4Z"/></svg>';

function card({ accent, title, meta }) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{width:1200px;height:630px;background:#0e1116;color:#e6e8ec;font-family:${FONT};
         display:flex;overflow:hidden}
    .stripe{width:18px;background:${accent};flex:0 0 auto}
    .body{flex:1;padding:74px 82px;display:flex;flex-direction:column;justify-content:space-between}
    .brand{display:flex;align-items:center;gap:16px;font-size:34px;font-weight:800;letter-spacing:-.01em}
    .brand .mark{width:46px;height:46px;display:block;flex:0 0 auto}
    .brand .mark svg{width:100%;height:100%;display:block}
    .brand .word span{color:${accent}}
    h1{font-size:${title.length > 34 ? 68 : 78}px;line-height:1.06;letter-spacing:-.025em;font-weight:800}
    .meta{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
          font-size:26px;color:${accent};letter-spacing:.02em}
    .foot{font-size:27px;color:#99a1ad}
  </style></head><body>
    <div class="stripe"></div>
    <div class="body">
      <div class="brand"><span class="mark">${MARK}</span><span class="word">proof<span>stone</span></span></div>
      <h1>${title}</h1>
      <div>
        ${meta ? `<div class="meta">${meta}</div>` : ''}
        <div class="foot" style="margin-top:14px">Every milestone is a proof — an artifact, not a keyword.</div>
      </div>
    </div>
  </body></html>`;
}

const roadmaps = loadRoadmaps();
const manifest = {};
const browser = await chromium.launch({ channel: 'chrome' });

async function shoot(html, file) {
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.setContent(html, { waitUntil: 'load' });
  await page.screenshot({ path: join(outDir, file) });
  await ctx.close();
  console.log('✓', file);
}

// Home / fallback card.
await shoot(
  card({
    accent: ACCENT.blue,
    title: 'Engineering roadmaps where every milestone is a proof.',
    meta: `${roadmaps.filter((r) => r.status === 'live').length} live · ${roadmaps.filter((r) => r.status === 'review').length} in review`
  }),
  'default.png'
);

// Live roadmaps only. A roadmap under review has no page, so nothing can ever
// reference its card — it only shipped a 42 KB image advertising a repository
// that is not public yet. When one goes live, flipping `status` and re-running
// this script produces its card. checkOgFreshness in eleventy.config.mjs filters
// the same way, so the missing cards do not turn into a permanent warning.
for (const r of roadmaps.filter((x) => x.status === 'live')) {
  const stars = r.hasContent ? countStars(r.content) : r.stars || 0;
  const milestones = r.milestones || 0;
  const meta = milestones ? `${milestones} milestones · ${stars} ★ artifacts` : '';
  await shoot(card({ accent: ACCENT[r.accent] || ACCENT.blue, title: r.title, meta }), `${r.slug}.png`);
  manifest[r.slug] = { milestones, stars };
}

writeFileSync(join(root, 'og-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log('✓ manifest.json');
await browser.close();
