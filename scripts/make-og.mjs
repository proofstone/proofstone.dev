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
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadRoadmaps } from '../roadmaps.config.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'src/assets/og');
mkdirSync(outDir, { recursive: true });

// Dark-theme tokens, copied as literals: this HTML is rendered standalone by a
// headless browser, so it cannot read the stylesheet's custom properties. If a
// token changes in styles.css it has to change here too — which is why there is
// exactly ONE accent to keep in sync, and why check-build asserts these four
// values against the stylesheet instead of trusting anyone to remember.
const BG = '#101317';
const TEXT = '#e3e8ee';
const ACCENT = '#72bdff';
const MUTED = '#a0a9b2';

// Same rule the site uses: a milestone heading carrying a star marker. This
// keeps reading ⭐ from the README — the star is data, and only its DISPLAY
// moved to a stamp.
const countStars = (md) => (md.match(/^###\s+M\d+\.\d+.*[⭐★].*$/gm) || []).length;

// The real faces, inlined as data URIs. A file:// or http reference would make
// the render depend on load timing and could silently fall back to a system
// font, producing a card in the wrong typeface with a green run.
const fontFile = (name) =>
  readFileSync(join(root, 'src/assets/fonts', name)).toString('base64');
const FACE = (family, weight, file) =>
  `@font-face{font-family:'${family}';font-weight:${weight};font-display:block;` +
  `src:url(data:font/woff2;base64,${fontFile(file)}) format('woff2')}`;
// One variable file covers body text AND the display weight: the declaration goes
// to 700 because the axis in the file does (measured — 900 renders identically to
// 700, so that is where it ends). Under the old pair this card carried a whole
// second family for two headings.
const FONTS =
  FACE('IBM Plex Sans', '400 700', 'plex-sans-var.woff2') +
  FACE('IBM Plex Mono', 400, 'plex-mono-400.woff2');

const FONT = "'IBM Plex Sans',-apple-system,'Segoe UI',Arial,sans-serif";
const DISPLAY = FONT;
const MONO = "'IBM Plex Mono',ui-monospace,Consolas,monospace";

// The proofstone mark (chiseled P), identical to favicon.svg and the header
// lockup. It is the same on every card — the series identity is the mark, and
// there is one accent behind every direction rather than one hue each.
// The badge takes the LIGHT accent even though the card is dark: the mark is an
// object with its own paint, and #005ab8 with a white P is what ships in the
// favicon and the org avatar. On this background it measures 1.42:1, which is
// why the wordmark next to it carries the readable dark-theme accent instead.
const MARK =
  '<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">' +
  '<rect width="32" height="32" rx="7" fill="#005ab8"/>' +
  '<path fill="#ffffff" fill-rule="evenodd" d="M8.5 9.3L10.3 7.5L21.7 7.5L23.5 9.3L23.5 15.7L21.7 17.5L13.5 17.5L13.5 22.8L11.7 24.5L10.3 24.5L8.5 22.8Z M13.5 10.6L20 10.6L21.3 11.9L21.3 13.1L20 14.4L13.5 14.4Z"/></svg>';

function card({ title, meta }) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    ${FONTS}
    *{margin:0;padding:0;box-sizing:border-box}
    body{width:1200px;height:630px;background:${BG};color:${TEXT};font-family:${FONT};
         display:flex;overflow:hidden}
    .stripe{width:18px;background:${ACCENT};flex:0 0 auto}
    .body{flex:1;padding:74px 82px;display:flex;flex-direction:column;justify-content:space-between}
    .brand{display:flex;align-items:center;gap:16px;font-family:${DISPLAY};
           font-size:34px;font-weight:700;letter-spacing:-.01em}
    .brand .mark{width:46px;height:46px;display:block;flex:0 0 auto}
    .brand .mark svg{width:100%;height:100%;display:block}
    .brand .word span{color:${ACCENT}}
    h1{font-family:${DISPLAY};font-weight:700;
       font-size:${title.length > 34 ? 66 : 76}px;line-height:1.08;letter-spacing:-.02em}
    .meta{font-family:${MONO};font-size:26px;color:${ACCENT};letter-spacing:.02em}
    .foot{font-size:27px;color:${MUTED}}
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
  const meta = milestones ? `${milestones} milestones · ${stars} flagship` : '';
  await shoot(card({ title: r.title, meta }), `${r.slug}.png`);
  manifest[r.slug] = { milestones, stars };
}

writeFileSync(join(root, 'og-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log('✓ manifest.json');
await browser.close();
