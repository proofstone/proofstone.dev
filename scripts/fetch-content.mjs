// ─────────────────────────────────────────────────────────────────────────────
// fetch-content.mjs — pulls each LIVE roadmap's README + referenced assets/ files
// from its repo into .content/<slug>/ (fetch-at-build; the roadmap repo is the
// source of truth). Offline-safe: if a fetch fails but a cached copy exists, it
// keeps the cache and warns instead of failing the build.
// ─────────────────────────────────────────────────────────────────────────────
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { roadmaps } from '../roadmaps.config.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const contentRoot = join(root, '.content');

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

async function fetchText(url) {
  const res = await fetch(url, { headers: { 'user-agent': 'proofstone-build' } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return res.text();
}

async function fetchBinary(url) {
  const res = await fetch(url, { headers: { 'user-agent': 'proofstone-build' } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

function save(absPath, data) {
  mkdirSync(dirname(absPath), { recursive: true });
  writeFileSync(absPath, data);
}

let hadError = false;

for (const r of roadmaps) {
  if (r.status !== 'live') continue;
  const dir = join(contentRoot, r.slug);
  const readmePath = join(dir, 'README.md');
  console.log(`\n• ${r.slug}  (${r.repo}@${r.branch})`);

  let readme = null;
  try {
    readme = await fetchText(rawUrl(r.repo, r.branch, 'README.md'));
    save(readmePath, readme);
    console.log(`  ✓ README.md (${readme.length} bytes)`);
  } catch (e) {
    if (existsSync(readmePath)) {
      console.warn(`  ! README fetch failed (${e.message}) — keeping cached copy`);
    } else {
      console.error(`  ✗ README fetch failed and no cache: ${e.message}`);
      hadError = true;
      continue;
    }
  }

  const readmeForParse = readme ?? (existsSync(readmePath) ? readFileSync(readmePath, 'utf8') : '');
  const paths = assetPaths(readmeForParse);
  for (const p of paths) {
    const dest = join(dir, p);
    try {
      save(dest, await fetchBinary(rawUrl(r.repo, r.branch, p)));
      console.log(`  ✓ ${p}`);
    } catch (e) {
      if (existsSync(dest)) console.warn(`  ! ${p} fetch failed (${e.message}) — keeping cache`);
      else {
        console.error(`  ✗ ${p} fetch failed and no cache: ${e.message}`);
        hadError = true;
      }
    }
  }
}

if (hadError) {
  console.error('\nfetch-content: finished with errors (missing content + no cache).');
  process.exit(1);
}
console.log('\nfetch-content: done.');
