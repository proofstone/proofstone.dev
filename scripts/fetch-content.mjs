// ─────────────────────────────────────────────────────────────────────────────
// fetch-content.mjs — pulls each LIVE roadmap's README + referenced assets/ files
// from its repo into .content/<slug>/ (fetch-at-build; the roadmap repo is the
// source of truth).
//
// This script is the site's border control. Content arrives from repositories the
// site does not own, on triggers no human reviews (repository_dispatch, nightly
// cron), so everything crossing the border is checked here:
//
//   · shape      — a README that parses to zero milestones or zero sections would
//                  render a plausible-looking but gutted page. Refuse it.
//   · markup     — raw HTML in a README is rendered verbatim into the page, so
//                  executable markup is rejected before it can reach the origin
//                  that holds every visitor's progress.
//   · resilience — timeouts and retries, so one blip does not red the build.
//
// Offline-safe: a failure of any kind falls back to the cached copy and warns;
// only "bad content AND no cache" fails the build. CI never has a cache
// (.content/ is gitignored), so there a bad README is a hard stop.
// ─────────────────────────────────────────────────────────────────────────────
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { roadmaps } from '../roadmaps.config.mjs';
import { inspectReadme, inspectSvg, shapeOf } from './content-guard.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const contentRoot = join(root, '.content');

const FETCH_TIMEOUT_MS = 15000;
const RETRIES = 3;

function rawUrl(repo, branch, path) {
  return `https://raw.githubusercontent.com/${repo}/${branch}/${path}`;
}

// Collect assets/… paths referenced by the README (markdown images/links + html src).
function assetPaths(readme) {
  const set = new Set();
  const re = /(?:\]\(|src=["'])\s*(assets\/[^)"'\s]+)/g;
  let m;
  while ((m = re.exec(readme)) !== null) set.add(m[1]);
  return [...set];
}

// ── Network ──────────────────────────────────────────────────────────────────

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Retries transient failures (timeout, network, 5xx). Never retries 4xx: a 404
// means the file genuinely is not in the repo, and retrying only triples the
// build time on a real miss.
async function fetchWithRetry(url, as) {
  let lastErr;
  for (let attempt = 1; attempt <= RETRIES; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'user-agent': 'proofstone-build' },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
      });
      if (!res.ok) {
        const err = new HttpError(res.status, `${res.status} ${res.statusText} for ${url}`);
        if (res.status >= 400 && res.status < 500) throw err;
        lastErr = err;
      } else {
        return as === 'text' ? await res.text() : Buffer.from(await res.arrayBuffer());
      }
    } catch (e) {
      if (e instanceof HttpError && e.status >= 400 && e.status < 500) throw e;
      lastErr = e;
    }
    if (attempt < RETRIES) {
      const backoff = 500 * attempt;
      console.warn(`  … retry ${attempt}/${RETRIES - 1} in ${backoff}ms (${lastErr.message})`);
      await sleep(backoff);
    }
  }
  throw lastErr;
}

function save(absPath, data) {
  mkdirSync(dirname(absPath), { recursive: true });
  writeFileSync(absPath, data);
}

// ── Content age ──────────────────────────────────────────────────────────────
//
// raw.githubusercontent sends no Last-Modified (verified), and every deploy
// rewrites file mtimes, so the only honest age signal is the upstream commit
// date for README.md. Never falls back to build time: a timestamp that advances
// on every nightly rebuild is worse than none — crawlers learn to distrust it.
async function fetchUpdatedAt(repo, path = 'README.md') {
  const url = `https://api.github.com/repos/${repo}/commits?path=${encodeURIComponent(path)}&per_page=1`;
  const headers = { 'user-agent': 'proofstone-build', accept: 'application/vnd.github+json' };
  // Unauthenticated api.github.com is 60 req/hr per IP and runner IPs are shared.
  if (process.env.GITHUB_TOKEN) headers.authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

  const res = await fetch(url, { headers, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (!res.ok) throw new HttpError(res.status, `${res.status} ${res.statusText}`);
  const json = await res.json();
  const date = Array.isArray(json) && json[0]?.commit?.committer?.date;
  if (!date) throw new Error('no commit date in API response');
  return date;
}

// ── Main ─────────────────────────────────────────────────────────────────────

let hadError = false;

for (const r of roadmaps) {
  if (r.status !== 'live') continue;
  const dir = join(contentRoot, r.slug);
  const readmePath = join(dir, 'README.md');
  console.log(`\n• ${r.slug}  (${r.repo}@${r.branch})`);

  let readme = null;
  try {
    const fetched = await fetchWithRetry(rawUrl(r.repo, r.branch, 'README.md'), 'text');

    // Inspect BEFORE writing: a bad payload must not overwrite a good cache.
    const { problems, warnings } = inspectReadme(fetched, r);
    for (const w of warnings) console.warn(`  ! ${w}`);
    if (problems.length) throw new Error(problems.join('; '));

    save(readmePath, fetched);
    readme = fetched;
    const { milestones, sections } = shapeOf(fetched);
    console.log(`  ✓ README.md (${fetched.length} bytes · ${milestones} milestones · ${sections} sections)`);
  } catch (e) {
    if (existsSync(readmePath)) {
      console.warn(`  ! README rejected (${e.message}) — keeping cached copy`);
    } else {
      console.error(`  ✗ README rejected and no cache: ${e.message}`);
      hadError = true;
      continue;
    }
  }

  // Content age, cached like everything else: a failed API call reuses the last
  // known date rather than inventing one.
  const metaPath = join(dir, 'meta.json');
  try {
    const updated = await fetchUpdatedAt(r.repo, 'README.md');
    save(metaPath, JSON.stringify({ updated }, null, 2) + '\n');
    console.log(`  ✓ meta.json (README updated ${updated})`);
  } catch (e) {
    if (existsSync(metaPath)) console.warn(`  ! commit date unavailable (${e.message}) — keeping cached meta.json`);
    else console.warn(`  ! commit date unavailable (${e.message}) — lastmod will be omitted`);
  }

  const readmeForParse = readme ?? (existsSync(readmePath) ? readFileSync(readmePath, 'utf8') : '');
  const paths = assetPaths(readmeForParse);
  for (const p of paths) {
    const dest = join(dir, p);
    try {
      const bytes = await fetchWithRetry(rawUrl(r.repo, r.branch, p), 'binary');

      // The map SVG is inlined raw into the page, so it needs the same border
      // check as the README — an SVG can carry <script> and event handlers.
      if (/\.svg$/i.test(p)) {
        const bad = inspectSvg(bytes.toString('utf8'));
        if (bad.length) throw new Error(bad.join('; '));
      }

      save(dest, bytes);
      console.log(`  ✓ ${p}`);
    } catch (e) {
      if (existsSync(dest)) console.warn(`  ! ${p} rejected (${e.message}) — keeping cache`);
      else {
        console.error(`  ✗ ${p} rejected and no cache: ${e.message}`);
        hadError = true;
      }
    }
  }
}

if (hadError) {
  console.error('\nfetch-content: finished with errors (bad or missing content + no cache).');
  process.exit(1);
}
console.log('\nfetch-content: done.');
