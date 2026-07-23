// ─────────────────────────────────────────────────────────────────────────────
// proofstone — roadmap registry (single source consumed by _data files AND the
// Eleventy config for passthrough). To connect a new roadmap: add ONE entry here
// (+ drop docs/notify-site.yml.tmpl into that roadmap's repo).
// Full procedure: see "Connect a new roadmap" in README.md.
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const contentRoot = join(__dirname, '.content');

export const roadmaps = [
  // status: 'live'   → fetched, rendered, linked, gets a page
  // status: 'review' → shown on the home page as a card with an honest status badge.
  //                    Deliberately has NO `repo` field: these repositories are private
  //                    until an external practitioner review passes, so a link would
  //                    hand visitors a 404. Nothing to link, nothing to leak.
  {
    slug: 'ai-safety-engineer',          // = repo name without the "-roadmap" suffix
    accent: 'blue',
    // Org path — valid after the Ф3 transfer of ai-safety-engineer-roadmap into the
    // proofstone org (transfer is step 1 of deploy). Local pre-transfer builds keep
    // working from the cached .content/. Old personal-account links stay redirected.
    repo: 'proofstone/ai-safety-engineer-roadmap',
    branch: 'main',
    title: 'AI Safety Engineer Roadmap',
    tagline: 'The map for the engineer moving into AI safety — evals, red-teaming, guardrails, agent security — and getting hired doing it.',
    milestones: 33,   // fallback only; real count is computed from the README at build
    order: 1,
    status: 'live',                       // "live" | "teaser" | "review"
    star: true,
    // The milestone the home page shows as "what a milestone looks like".
    // Declared here rather than hardcoded in the template so the flagship sample
    // is a registry decision; if it ever stops resolving, the build says so.
    sampleMilestone: 'M2.1'
  },
  {
    slug: 'distributed-systems-engineer',   // = repo name without the "-roadmap" suffix
    accent: 'teal',
    repo: 'proofstone/distributed-systems-engineer-roadmap',
    branch: 'main',
    title: 'Distributed Systems Engineer Roadmap',
    tagline: 'The map for the engineer moving into distributed systems — consensus, replication, failure detection — where every node is a test that passes or fails, not a keyword you nod at.',
    milestones: 29,   // fallback only; real count computed from the README at build
    order: 2,
    status: 'live',
    star: true,
    // Own reference implementation promised by §4 of this roadmap, shipped and public.
    lab: {
      name: 'swim-lab',
      url: 'https://github.com/proofstone/swim-lab',
      note: 'the §4.1 milestone made executable — you implement SWIM, a deterministic suite grades it'
    }
  },
  {
    slug: 'applied-cryptography',
    accent: 'violet',
    repo: 'proofstone/applied-cryptography-roadmap',
    branch: 'main',
    title: 'Applied Cryptography Roadmap',
    tagline: 'For engineers who ship cryptography and cannot afford to get it wrong: break it in Cryptopals and CryptoHack, then ship it right.',
    milestones: 18,
    order: 3,
    status: 'live',
    star: true
  },
  {
    slug: 'robotics-software-engineer',
    accent: 'amber',
    title: 'Robotics Software Engineer Roadmap',
    tagline: 'You already ship software. Robotics does not need you to start over — it needs you to port what you know and respect what is genuinely different.',
    // Counts cannot be derived at build while the repo is private, so they are
    // declared — but taken by counting the README itself on 2026-07-20, not copied
    // from a summary. They become automatic the moment status flips to 'live'.
    milestones: 20,
    stars: 3,
    order: 4,
    status: 'review'
  },
  {
    slug: 'pcb-design',
    accent: 'green',
    title: 'PCB Design Roadmap',
    tagline: 'Embedded roadmaps teach you to write the firmware and say plainly that the board is not their topic. This is the map for the board.',
    milestones: 22,   // counted from the README 2026-07-20 (see note above)
    stars: 3,
    order: 5,
    status: 'review',
    // Its own reference board is designed but not yet fabricated — mentioned, not linked.
    labNote: 'ships with a reference board of its own — designed, fabrication pending'
  }
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
      // No `|| r.milestones` fallback: the fetch-time shape gate guarantees a live
      // roadmap has at least one milestone, so a zero here means something really
      // broke — and a card silently showing the declared number instead of the
      // truth is exactly the drift this project keeps getting bitten by.
      const count = countMilestones(content);
      // The roadmap's own SVG map, fetched alongside the README. Inlined at build
      // so its section boxes can link into the page (an <img> cannot do that).
      const mapPath = join(contentRoot, r.slug, 'assets', 'roadmap.svg');
      const mapSvg = existsSync(mapPath) ? readFileSync(mapPath, 'utf8') : '';
      return { ...r, content, mapSvg, hasContent: content.length > 0, milestones: count, declaredMilestones: r.milestones };
    }
    return { ...r, content: '', mapSvg: '', hasContent: false };
  });
}
