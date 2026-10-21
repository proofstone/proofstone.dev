// Professions on /become/ that the site is building toward but cannot open yet.
// Each one is a card without a page (honest navigation), so each one is a public
// promise: only what is actually being built goes in. The live professions are
// the roadmaps — they come from roadmaps.config.mjs, not from here.
export default [
  {
    slug: 'frontend-developer',
    title: 'Frontend developer',
    desc: 'The part of the web people see and touch: pages, layouts, interfaces.',
    // The courses this map is assembled from, in order (phase 2 of the plan:
    // proofstone/proofstone.dev#1). Each becomes a link when its course is live.
    path: ['HTML & CSS', 'JavaScript', 'TypeScript', 'React'],
    // null = no prerequisites: the map starts from zero.
    requires: null,
    status: 'planned'
  }
];
