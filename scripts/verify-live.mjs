// ─────────────────────────────────────────────────────────────────────────────
// verify-live.mjs — asserts what the DEPLOYED site actually serves.
//
// Written for launch day. Flipping SITE_NOINDEX is a repository-variable change,
// which fires no workflow: the flip only reaches visitors after a build runs, and
// until now nothing confirmed it had. This script is the confirmation step.
//
//   node scripts/verify-live.mjs              # expects the pre-launch posture
//   node scripts/verify-live.mjs --launched   # expects the post-launch posture
//
// Checks, in both modes:
//   · every sitemap URL responds 200 and carries the expected robots posture
//   · /404.html keeps its noindex unconditionally, and claims no canonical
//   · robots.txt advertises the sitemap only after launch
//   · each roadmap's OG card is reachable AND its numbers match the live page
//     — a launch is exactly when a stale social card gets copied everywhere.
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = process.env.SITE_URL || 'https://proofstone.dev';
const launched = process.argv.includes('--launched');

let failures = 0;
const pass = (m, d = '') => console.log(`  ✓ ${m}${d ? ` — ${d}` : ''}`);
const fail = (m, d) => {
  console.error(`  ✗ ${m} — ${d}`);
  failures++;
};

// Retries transient network failures. This runs on launch day, where a false
// alarm is expensive: a blip must not read as "the launch did not ship".
async function get(url, attempts = 3) {
  let lastErr;
  for (let i = 1; i <= attempts; i++) {
    try {
      const res = await fetch(url, {
        headers: { 'user-agent': 'proofstone-verify' },
        signal: AbortSignal.timeout(20000),
        redirect: 'follow'
      });
      return { status: res.status, body: await res.text() };
    } catch (e) {
      lastErr = e;
      if (i < attempts) await new Promise((r) => setTimeout(r, 800 * i));
    }
  }
  throw lastErr;
}

console.log(`\nverifying ${BASE} — expecting the ${launched ? 'POST-launch' : 'PRE-launch'} posture\n`);

// ── Sitemap is the list of pages that are meant to be public ─────────────────
let urls = [];
try {
  const { status, body } = await get(`${BASE}/sitemap.xml`);
  if (status !== 200) fail('sitemap.xml', `HTTP ${status}`);
  else {
    urls = [...body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    const lastmods = [...body.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].length;
    pass('sitemap.xml', `${urls.length} urls, ${lastmods} with lastmod`);
  }
} catch (e) {
  fail('sitemap.xml unreachable', e.message);
}

// ── Every listed page: reachable, right robots posture, self-canonical ───────
console.log('\nPAGES');
for (const url of urls) {
  try {
    const { status, body } = await get(url);
    if (status !== 200) {
      fail(url, `HTTP ${status}`);
      continue;
    }
    const noindex = /<meta name="robots" content="noindex/.test(body);
    if (launched && noindex) fail(url, 'still carries noindex after launch');
    else if (!launched && !noindex) fail(url, 'noindex missing before launch');
    else {
      const canon = body.match(/<link rel="canonical" href="([^"]+)"/);
      if (!canon) fail(url, 'no canonical');
      else if (canon[1].replace(/\/$/, '') !== url.replace(/\/$/, '')) fail(url, `canonical points elsewhere: ${canon[1]}`);
      else pass(url, launched ? 'indexable, canonical self' : 'noindex, canonical self');
    }
  } catch (e) {
    fail(url, e.message);
  }
}

// ── The error page must stay out of the index in BOTH modes ─────────────────
console.log('\nERROR PAGE');
try {
  const { status, body } = await get(`${BASE}/404.html`);
  const noindex = /<meta name="robots" content="noindex/.test(body);
  const canon = /<link rel="canonical"/.test(body);
  if (!noindex) fail('/404.html', 'missing noindex — it must never depend on the launch flag');
  else if (canon) fail('/404.html', 'declares a canonical — every real 404 would point crawlers at it');
  else pass('/404.html', `HTTP ${status}, noindex, no canonical`);
} catch (e) {
  fail('/404.html', e.message);
}

// ── robots.txt: crawling always allowed; sitemap advertised only post-launch ─
console.log('\nROBOTS');
try {
  const { body } = await get(`${BASE}/robots.txt`);
  const allows = /Allow:\s*\//i.test(body);
  const hasSitemap = /Sitemap:/i.test(body);
  if (!allows) fail('robots.txt', 'crawling not allowed — the noindex tag would never be read');
  else if (launched && !hasSitemap) fail('robots.txt', 'no Sitemap: line after launch');
  else if (!launched && hasSitemap) fail('robots.txt', 'advertises the sitemap before launch');
  else pass('robots.txt', launched ? 'allows crawling, advertises sitemap' : 'allows crawling, no sitemap line');
} catch (e) {
  fail('robots.txt', e.message);
}

// ── Social cards: reachable, and telling the truth about the live pages ──────
// A launch is precisely when the card gets copied into every platform's cache,
// so this is the moment the freshness gate has to be hard.
console.log('\nSOCIAL CARDS');
{
  const manifestPath = join(root, 'og-manifest.json');
  const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : null;
  if (!manifest) fail('og-manifest.json', 'missing — cannot verify card freshness');

  for (const url of urls) {
    const slug = url.replace(BASE, '').replace(/\//g, '') || null;
    if (!slug) continue; // home card is generic
    try {
      const { status, body } = await get(url);
      if (status !== 200) continue;
      const og = body.match(/<meta property="og:image" content="([^"]+)"/);
      if (!og) {
        fail(url, 'no og:image');
        continue;
      }
      const img = await fetch(og[1], { method: 'GET', signal: AbortSignal.timeout(20000) });
      if (!img.ok) {
        fail(og[1], `card unreachable: HTTP ${img.status}`);
        continue;
      }
      // Compare what the picture was baked with against what the page now says.
      const live = (body.match(/data-ms="M\d+\.\d+"/g) || []).length;
      const baked = manifest?.[slug]?.milestones;
      if (manifest && baked !== undefined && live > 0 && baked !== live)
        fail(og[1], `STALE card: image says ${baked} milestones, page shows ${live} — run: npm run og`);
      else pass(og[1], `reachable${baked !== undefined ? `, ${baked} milestones matches the page` : ''}`);
    } catch (e) {
      fail(url, `card check failed: ${e.message}`);
    }
  }
}

console.log('');
if (failures) {
  console.error(`verify-live: ${failures} check(s) failed.`);
  process.exit(1);
}
console.log(`verify-live: ${BASE} matches the ${launched ? 'post-launch' : 'pre-launch'} posture.`);
