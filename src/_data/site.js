// Site-wide metadata. noindex defaults ON (pre-launch). Launch = build with
// SITE_NOINDEX=false (a separate, deliberate user command — not part of this TZ).
export default {
  name: 'proofstone',
  url: 'https://proofstone.dev',
  tagline: 'Engineering roadmaps where every milestone is a proof.',
  thesisSub: 'Measured in artifacts, not keywords.',
  thesis:
    "Every node is a milestone you can prove you passed — a merged eval, a confirmed break, a shipped guardrail — not a keyword you can nod at. When you finish a node, you have an artifact, not a feeling.",
  seriesLine: 'proofstone is a growing series of engineering roadmaps — AI Safety is the first.',
  org: 'https://github.com/proofstone',
  noindex: process.env.SITE_NOINDEX !== 'false',
  buildYear: 2026
};
