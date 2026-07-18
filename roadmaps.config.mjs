// ─────────────────────────────────────────────────────────────────────────────
// proofstone — roadmap registry (single source consumed by _data files AND the
// Eleventy config for passthrough). To connect a new roadmap: add ONE entry here
// (+ drop docs/notify-site.yml.tmpl into that roadmap's repo). See ARCHITECTURE.md §4.
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const contentRoot = join(__dirname, '.content');

export const roadmaps = [
  {
    slug: 'ai-safety-engineer',          // = repo name without the "-roadmap" suffix
    // Org path — valid after the Ф3 transfer of ai-safety-engineer-roadmap into the
    // proofstone org (transfer is step 1 of deploy). Local pre-transfer builds keep
    // working from the cached .content/. Old personal-account links stay redirected.
    repo: 'proofstone/ai-safety-engineer-roadmap',
    branch: 'main',
    title: 'AI Safety Engineer Roadmap',
    tagline: 'The map for the engineer moving into AI safety — evals, red-teaming, guardrails, agent security — and getting hired doing it.',
    milestones: 33,   // fallback only; real count is computed from the README at build
    order: 1,
    status: 'live',                       // "live" | "teaser"
    star: true
  },
  {
    slug: 'applied-cryptography',
    repo: 'proofstone/applied-cryptography-roadmap',
    branch: 'main',
    title: 'Applied Cryptography Roadmap',
    tagline: 'For engineers who ship cryptography and cannot afford to get it wrong: break it in Cryptopals and CryptoHack, then ship it right.',
    milestones: 18,
    order: 3,
    status: 'live',
    star: true
  }
  // Future directions stay OUT of v1 (decision C): the homepage says "a growing
  // series" in one line, no per-direction teaser cards. When #2 is close, add it
  // here with status:'teaser' (renders as a restrained card, no page) or 'live'.
];

// Count milestones straight from the README ("### M<sec>.<n>" headings) so the
// number is always true to the source, never a stale hardcoded value.
function countMilestones(md) {
  const m = md.match(/^###\s+M\d+\.\d+/gm);
  return m ? m.length : 0;
}

export function loadRoadmaps() {
  return roadmaps.map((r) => {
    if (r.status === 'live') {
      const p = join(contentRoot, r.slug, 'README.md');
      const content = existsSync(p) ? readFileSync(p, 'utf8') : '';
      const count = countMilestones(content);
      return { ...r, content, hasContent: content.length > 0, milestones: count || r.milestones };
    }
    return { ...r, content: '', hasContent: false };
  });
}
