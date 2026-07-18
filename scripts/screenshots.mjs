// Dev-only visual QA: capture key pages in both themes + mobile using the system
// Chrome (no browser download). Run against a served _site. Not used by the site build.
//   node scripts/screenshots.mjs   (server must serve _site at $BASE)
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const base = process.env.BASE || 'http://localhost:8123';
const out = process.env.OUT || './_shots';
mkdirSync(out, { recursive: true });

const shots = [
  { name: '01-home-light',            url: '/',                                      scheme: 'light', vw: 1280, vh: 860 },
  { name: '02-home-dark',             url: '/',                                      scheme: 'dark',  vw: 1280, vh: 860 },
  { name: '03-roadmap-light-top',     url: '/ai-safety-engineer/',                   scheme: 'light', vw: 1280, vh: 1000 },
  { name: '04-roadmap-dark-top',      url: '/ai-safety-engineer/',                   scheme: 'dark',  vw: 1280, vh: 1000 },
  { name: '05-roadmap-dark-evals',    url: '/ai-safety-engineer/#2--evals-the-core-skill', scheme: 'dark', vw: 1280, vh: 1000 },
  { name: '06-roadmap-light-evals',   url: '/ai-safety-engineer/#2--evals-the-core-skill', scheme: 'light', vw: 1280, vh: 1000 },
  { name: '07-roadmap-mobile-dark',   url: '/ai-safety-engineer/',                   scheme: 'dark',  vw: 390,  vh: 844, mobile: true },
  { name: '08-roadmap-dark-flagship', url: '/ai-safety-engineer/#m24---ship-an-eval-the-uk-government-institute-lists', scheme: 'dark', vw: 1280, vh: 1000 }
];

const browser = await chromium.launch({ channel: 'chrome' });
for (const s of shots) {
  const ctx = await browser.newContext({
    colorScheme: s.scheme,
    viewport: { width: s.vw, height: s.vh },
    deviceScaleFactor: s.mobile ? 2 : 1
  });
  const page = await ctx.newPage();
  await page.goto(base + s.url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${out}/${s.name}.png` });
  await ctx.close();
  console.log('✓', s.name);
}
await browser.close();
console.log('done →', out);
