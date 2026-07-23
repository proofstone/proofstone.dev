// ─────────────────────────────────────────────────────────────────────────────
// check-links.mjs — external link check over the built site.
//
// Deliberately kept OUT of the deploy path: these links live on third-party
// servers that rate-limit and bot-block, so a red result here must never stop a
// content deploy. It runs in the separate check workflow, advisory by default.
//
//   node scripts/check-links.mjs            # report, exit 0
//   node scripts/check-links.mjs --strict   # exit 1 on genuine failures
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const site = join(root, '_site');
const strict = process.argv.includes('--strict');

// Hosts that answer bots with 403/429 regardless of the URL being fine. Verified
// during the 2026-07-22 audit: both returned non-200 to automated requests while
// resolving normally in a browser.
const BOT_HOSTILE = [/(^|\.)rand\.org$/i, /(^|\.)grayswan\.ai$/i, /(^|\.)x\.com$/i, /(^|\.)twitter\.com$/i, /(^|\.)linkedin\.com$/i];
const TIMEOUT_MS = 15000;
const CONCURRENCY = 8;

if (!existsSync(site)) {
  console.error('check-links: _site does not exist — run the build first.');
  process.exit(1);
}

function htmlFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...htmlFiles(p));
    else if (name.endsWith('.html')) out.push(p);
  }
  return out;
}

const urls = new Map(); // url → Set(page)
for (const file of htmlFiles(site)) {
  const html = readFileSync(file, 'utf8');
  const page = file.replace(site, '').replace(/\\/g, '/');
  for (const [, u] of html.matchAll(/(?:href|src)="(https?:\/\/[^"]+)"/g)) {
    if (!urls.has(u)) urls.set(u, new Set());
    urls.get(u).add(page);
  }
}

const all = [...urls.keys()].sort();
console.log(`\nchecking ${all.length} distinct external link(s)\n`);

const skipped = [];
const broken = [];

// An incomplete certificate chain is not a broken link: browsers repair it by
// fetching the missing intermediate (AIA), and curl succeeds too — only Node's
// stricter verifier rejects it. Reported separately so it neither cries wolf nor
// hides the TLS problems that DO reach a visitor (expired, wrong hostname).
const TLS_CHAIN_ONLY = new Set(['UNABLE_TO_VERIFY_LEAF_SIGNATURE', 'SELF_SIGNED_CERT_IN_CHAIN']);

async function probe(url) {
  const host = new URL(url).hostname;
  if (BOT_HOSTILE.some((re) => re.test(host))) {
    skipped.push([url, 'bot-hostile host']);
    return;
  }
  for (const method of ['HEAD', 'GET']) {
    try {
      const res = await fetch(url, {
        method,
        redirect: 'follow',
        headers: { 'user-agent': 'Mozilla/5.0 (compatible; proofstone-linkcheck/1.0)' },
        signal: AbortSignal.timeout(TIMEOUT_MS)
      });
      if (res.ok) return;
      // Some servers refuse HEAD but serve GET; only judge after GET.
      if (method === 'GET') {
        if ([403, 405, 429].includes(res.status)) skipped.push([url, `${res.status} (likely bot protection)`]);
        else broken.push([url, `${res.status} ${res.statusText}`]);
      }
    } catch (e) {
      if (method !== 'GET') continue;
      const code = e.cause?.code;
      if (TLS_CHAIN_ONLY.has(code)) skipped.push([url, `${code} (incomplete cert chain; browsers recover)`]);
      else broken.push([url, e.name === 'TimeoutError' ? 'timeout' : code || e.message]);
    }
  }
}

for (let i = 0; i < all.length; i += CONCURRENCY) {
  await Promise.all(all.slice(i, i + CONCURRENCY).map(probe));
  process.stdout.write(`  … ${Math.min(i + CONCURRENCY, all.length)}/${all.length}\r`);
}

console.log(`\n\nok:      ${all.length - broken.length - skipped.length}`);
console.log(`skipped: ${skipped.length} (bot protection)`);
console.log(`broken:  ${broken.length}\n`);

for (const [u, why] of skipped) console.log(`  … ${why}  ${u}`);
for (const [u, why] of broken) {
  console.error(`  ✗ ${why}  ${u}`);
  for (const p of urls.get(u)) console.error(`      on ${p}`);
}

if (broken.length && strict) process.exit(1);
console.log(broken.length ? '\ncheck-links: failures above are advisory (not blocking the deploy).' : '\ncheck-links: all reachable.');
