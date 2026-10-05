// ─────────────────────────────────────────────────────────────────────────────
// verify-live.mjs — asserts what the DEPLOYED site actually serves.
//
// Written for launch day. Flipping SITE_NOINDEX is a repository-variable change,
// which fires no workflow: the flip only reaches visitors after a build runs, and
// until now nothing confirmed it had. This script is the confirmation step.
//
//   node scripts/verify-live.mjs               # expects the site as it IS: launched
//   node scripts/verify-live.mjs --prelaunch   # expects noindex and no Sitemap: line
//
// The default flipped on 2026-07-29. It used to expect the pre-launch posture,
// which stopped being true on 2026-07-28 when the site launched: from that day
// on, an unflagged run reported five failures for the sole reason that the
// launch had succeeded. An instrument that is always red is an instrument that
// stops being read, and this one is the only thing that checks the deployed
// artifact rather than the one on the build machine.
//
// The pre-launch branch is KEPT rather than deleted, because the lever it
// verifies is still in the build: SITE_NOINDEX is read by src/_data/site.js,
// asserted by check-build, and passed by build-deploy.yml. Setting it back to
// true and re-running the workflow is the emergency way to pull the site out of
// the index — and pulling that lever is exactly the moment someone needs to
// confirm the de-index actually shipped, which is what this script exists for.
// Deleting the verifier while keeping the lever would leave that operation
// unverifiable. It is not a decorative branch either: the poison harness
// (Redisgn/tools/poison-verify-live.mjs, `posture` mode) proves BOTH postures
// can fail, so neither can rot into an assertion that always passes.
//
// Checks, in both modes:
//   · every sitemap URL responds 200 and carries the expected robots posture
//   · /404.html keeps its noindex unconditionally, and claims no canonical
//   · robots.txt advertises the sitemap only after launch
//   · each roadmap's OG card is reachable AND its numbers match the live page
//     — a launch is exactly when a stale social card gets copied everywhere.
//   · the redesign actually reached production: every map is second-generation,
//     the map file nothing links is gone, the self-hosted faces are served, and
//     the warm palette is in the stylesheet the browser receives.
//
// That last group exists because of a gap this project kept walking into. The
// build gates assert things about _site on the machine that built it; they
// cannot assert that the artifact reached the origin, that a passthrough
// change actually removed a file from the deploy, or that a font 404s behind a
// CDN. Twice now a green build and a green verify:live were both true while a
// redesign-specific fact on production was not checked at all, and the check
// lived in a scratch script that no one would inherit.
//
// Nothing here duplicates check-build. Hotspot coverage, structural soundness,
// stamp counts and print tokens are asserted at build time and are not re-run
// against HTML — only the facts that are properties of the DEPLOY.
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = process.env.SITE_URL || 'https://proofstone.dev';
const launched = !process.argv.includes('--prelaunch');
// `--launched` is what the launch runbook in the project docs tells the operator
// to type. It is now the default, so it is accepted and says so instead of
// looking like a typo — and the notice is what will make the doc get updated.
if (process.argv.includes('--launched')) {
  console.log('note: --launched is the default since 2026-07-29 and does nothing; the flag to pass now is --prelaunch');
}

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

// The same reasoning as get(), for the checks that only need a status code.
// They used bare fetch, and one blip on one of them printed as a production
// defect: 2026-07-28, "fonts/plex-sans-var.woff2 — check failed: fetch failed"
// on a file curl then served four times in a row. A launch-day instrument that
// cries wolf gets ignored, which is the whole of its value.
//
// It retries what the NETWORK threw, and — since 2026-08-01 — the two answers
// that are not verdicts either. A 404 IS a verdict: retrying it would only make
// a real defect slower to report, and one of these checks (the deleted map copy)
// asserts a 404 on purpose. A 5xx is the edge telling you to come back: the
// graphite deploy printed "plex-mono-400.woff2 — HTTP 503" on a file that then
// served 200 three times in a row, which is the same false alarm as the fetch
// blip above, just answered instead of thrown.
const RETRYABLE = new Set([429, 502, 503, 504]);
async function probe(url, init = {}, attempts = 3) {
  let lastErr;
  for (let i = 1; i <= attempts; i++) {
    try {
      const res = await fetch(url, {
        headers: { 'user-agent': 'proofstone-verify' },
        signal: AbortSignal.timeout(20000),
        ...init
      });
      if (!RETRYABLE.has(res.status) || i === attempts) return res;
    } catch (e) {
      lastErr = e;
    }
    await new Promise((r) => setTimeout(r, 800 * i));
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
    // The advice matters: a page that still carries noindex after launch and a
    // deliberate de-index look identical from here, so the failure names both
    // the defect and the flag that says "this was on purpose".
    if (launched && noindex) fail(url, 'carries noindex — if the site was pulled from the index on purpose, run with --prelaunch');
    else if (!launched && !noindex) fail(url, 'noindex missing — the site is indexable, which is the default posture');
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
  else if (launched && !hasSitemap) fail('robots.txt', 'no Sitemap: line — the site is launched and should advertise it');
  else if (!launched && hasSitemap) fail('robots.txt', 'advertises the sitemap while --prelaunch was asked for');
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
      const img = await probe(og[1], { method: 'GET' });
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

// ── The redesign, as the origin actually serves it ───────────────────────────
console.log('\nDEPLOYED REDESIGN');
{
  // Derived from each URL's PATH, not by string-replacing BASE out of it. The
  // sitemap always carries canonical absolute URLs, so when SITE_URL points
  // somewhere else — a staging origin, or the poisoned copy this check is
  // tested against — the replace matched nothing and every slug came out as
  // garbage. The map checks then passed on paths that do not exist: a false
  // green, which is worse than the failure it was hiding.
  const slugs = urls
    .map((u) => { try { return new URL(u).pathname.replace(/^\/|\/$/g, ''); } catch { return ''; } })
    .filter(Boolean);

  // Every map must be second-generation. A first-generation map would render as
  // light artwork on a dark page: the force-light panel that carried those was
  // deleted once the migration finished.
  for (const slug of slugs) {
    try {
      const { status, body } = await get(`${BASE}/${slug}/`);
      if (status !== 200) { fail(`${slug}`, `HTTP ${status}`); continue; }
      const gen = (body.match(/data-map-theme="([a-z]+)"/) || [])[1];
      if (gen !== 'tokens') fail(`${slug}: map generation "${gen || 'none'}"`, 'expected "tokens" — the panel for fixed-colour maps no longer exists');
      else pass(`${slug}`, 'map paints from theme tokens');
    } catch (e) {
      fail(slug, `map check failed: ${e.message}`);
    }
  }

  // The map is inlined into the page, so the copied file is referenced by
  // nothing and is excluded from the deploy. Proven here against the origin,
  // because "the passthrough no longer copies it" is a build-time fact and
  // "the origin no longer serves it" is not the same statement.
  for (const slug of slugs) {
    try {
      const res = await probe(`${BASE}/${slug}/assets/roadmap.svg`, { method: 'HEAD' });
      if (res.status === 404) pass(`${slug}/assets/roadmap.svg`, 'gone, as intended — the map ships inline');
      else fail(`${slug}/assets/roadmap.svg`, `HTTP ${res.status} — nothing links this file, so shipping it is dead weight`);
    } catch (e) {
      fail(`${slug}/assets/roadmap.svg`, `check failed: ${e.message}`);
    }
  }

  // Self-hosted faces. A missing one does not break the page — the metric-matched
  // fallback takes over silently — which is exactly why it needs asserting.
  // Three now, not five: the display serif is gone and the variable sans covers
  // every heading weight from one file. Note this list is an assertion about what
  // the site NEEDS, not about what happens to sit in the bucket — a stale
  // zilla-slab-*.woff2 left behind by an old deploy is dead weight, not a pass.
  const FACES = ['plex-sans-var.woff2', 'plex-mono-400.woff2', 'plex-mono-600.woff2'];
  let facesOk = 0;
  for (const f of FACES) {
    try {
      const res = await probe(`${BASE}/assets/fonts/${f}`, { method: 'HEAD' });
      if (res.ok) facesOk++;
      else fail(`fonts/${f}`, `HTTP ${res.status} — the page would fall back silently`);
    } catch (e) {
      fail(`fonts/${f}`, `check failed: ${e.message}`);
    }
  }
  if (facesOk === FACES.length) pass('self-hosted faces', `${facesOk}/${FACES.length} served`);

  // The stylesheet the browser receives, not the one on disk.
  try {
    const { status, body } = await get(`${BASE}/assets/styles.css`);
    if (status !== 200) {
      fail('styles.css', `HTTP ${status}`);
    } else {
      // What the palette IS, and what it must no longer be. The second list is
      // the half this instrument was missing: after the Stone repaint, every
      // marker in the first list could be present in a stylesheet that ALSO
      // still carried the old wave's colours — a half-applied deploy, a stale
      // CDN object, a bad merge — and the check would have gone green.
      const need = [
        ['--bg: #0b0b0c', 'the mono near-black page'],
        ['--accent: #f2efe6', 'the warm paper-white accent'],
        ['[data-theme="light"]', 'the second theme, served'],
        ['--map-ink', 'map tokens'],
        ['font-weight: 400 700', 'sans declared through to a real 700']
      ];
      // Each retired marker is one wave's signature, kept because a stale CDN
      // object or a half-applied deploy is exactly a stylesheet that carries the
      // new markers AND an old one. The graphite line is the last three:
      //   • #101317 / #72bdff were the previous wave's dark page and accent —
      //     they are what this wave replaced, not what it renamed;
      //   • the prefers-color-scheme branch is gone by construction, because the
      //     dark theme IS :root now. Its return would mean the tokens are
      //     duplicated again, which is how the print regression got in last time.
      //     Matched with the "@media (" prefix on purpose: the palette comment
      //     names the mechanism it removed, and a bare string would flag that.
      const forbid = [
        ['#9d3b1f', 'sealing wax'],
        ['#f7f3ea', 'warm paper'],
        ["'Zilla Slab'", 'the display serif'],
        ['rgba(157, 59, 31', 'the map hover wash literal'],
        ['#fcfdfe', 'white paper'],
        ['#101317', "the stone wave's dark page"],
        ['#72bdff', "the stone wave's dark accent"],
        ['--bg: #161717', "the graphite wave's page"],
        ['#5b9dff', "the graphite wave's cobalt"],
        ['@media (prefers-color-scheme', 'the duplicated OS-theme branch']
      ];
      const missing = need.filter(([t]) => !body.includes(t));
      const lingering = forbid.filter(([t]) => body.includes(t));
      if (missing.length || lingering.length) {
        if (missing.length) fail('styles.css', `${missing.map(([, n]) => n).join(', ')} not in the served stylesheet`);
        if (lingering.length) fail('styles.css', `${lingering.map(([, n]) => n).join(', ')} still in the served stylesheet`);
      }
      // Buffer.byteLength, not body.length: the stylesheet's comments carry
      // arrows, section signs and em dashes, and `.length` counts UTF-16 code
      // units. On 2026-07-29 that made the instrument report 64,357 "bytes" for
      // a 66,605-byte file — a 2 KB discrepancy that needed a footnote to
      // explain instead of a number that was simply right.
      else pass('styles.css', `${need.length} markers present, ${forbid.length} retired colours absent, ${Buffer.byteLength(body)} bytes`);
    }
  } catch (e) {
    fail('styles.css', `check failed: ${e.message}`);
  }
}

console.log('');
if (failures) {
  console.error(`verify-live: ${failures} check(s) failed.`);
  process.exit(1);
}
console.log(`verify-live: ${BASE} matches the ${launched ? 'post-launch' : 'pre-launch'} posture.`);
