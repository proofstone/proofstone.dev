// Dev-only: rasterise the SVG mark into PNG fallbacks (favicon + apple-touch),
// using the system Chrome we already drive for screenshots — no new dependency,
// no external service. Outputs are committed as static assets.
//   node scripts/make-icons.mjs
import { chromium } from 'playwright-core';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const svg = readFileSync(join(root, 'src/assets/favicon.svg'), 'utf8');
const outDir = join(root, 'src/assets');

const sizes = [
  { name: 'favicon-32.png', size: 32 },
  { name: 'favicon-180.png', size: 180 } // apple-touch-icon
];

const browser = await chromium.launch({ channel: 'chrome' });
for (const { name, size } of sizes) {
  const ctx = await browser.newContext({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.setContent(
    `<style>html,body{margin:0;padding:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`
  );
  await page.screenshot({ path: join(outDir, name), omitBackground: true });
  await ctx.close();
  console.log('✓', name, `${size}×${size}`);
}
await browser.close();
console.log('done');
