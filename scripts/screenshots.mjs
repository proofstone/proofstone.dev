// Dev-only visual QA: capture key pages in both themes + mobile using the system
// Chrome (no browser download). Run against a served _site. Not used by the site build.
//   BASE=http://127.0.0.1:8123 OUT=../shots node scripts/screenshots.mjs
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const base = process.env.BASE || 'http://localhost:8123';
const out = process.env.OUT || './_shots';
mkdirSync(out, { recursive: true });

const DESKTOP = { vw: 1280, vh: 1000 };
const MOBILE = { vw: 390, vh: 844, mobile: true };

const shots = [
  { name: '01-home-light',              url: '/',                             scheme: 'light', ...DESKTOP, vh: 900 },
  { name: '02-home-dark',               url: '/',                             scheme: 'dark',  ...DESKTOP, vh: 900 },
  { name: '03-home-mobile',             url: '/',                             scheme: 'dark',  ...MOBILE },

  { name: '04-aisafety-light-top',      url: '/ai-safety-engineer/',          scheme: 'light', ...DESKTOP },
  { name: '05-aisafety-dark-top',       url: '/ai-safety-engineer/',          scheme: 'dark',  ...DESKTOP },
  { name: '06-aisafety-dark-milestones',url: '/ai-safety-engineer/#2--evals-the-core-skill', scheme: 'dark', ...DESKTOP },
  { name: '07-aisafety-light-milestones',url:'/ai-safety-engineer/#2--evals-the-core-skill', scheme: 'light', ...DESKTOP },
  { name: '08-aisafety-mobile',         url: '/ai-safety-engineer/',          scheme: 'dark',  ...MOBILE },

  { name: '09-distsys-dark-top',        url: '/distributed-systems-engineer/', scheme: 'dark',  ...DESKTOP },
  { name: '10-distsys-light-top',       url: '/distributed-systems-engineer/', scheme: 'light', ...DESKTOP },
  { name: '11-crypto-dark-top',         url: '/applied-cryptography/',        scheme: 'dark',  ...DESKTOP },
  { name: '12-crypto-light-top',        url: '/applied-cryptography/',        scheme: 'light', ...DESKTOP }
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
