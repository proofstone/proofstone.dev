// Professions on /become/ that have no map yet. Each one is a card without a
// page (honest navigation) and an OPEN SHELF: the owner or a contributor brings
// the map, and the card becomes a link the day it is live (owner's rule,
// 2026-10-24 — "I will not be the only one adding; contributors will too").
// The live professions are the roadmaps — they come from roadmaps.config.mjs,
// not from here. Every entry names its shelf (`area`, `direction`, declared in
// src/_data/areas.js); a card without a shelf fails the build.
//
// Fields: `path` — the courses the map is assembled from, in order (becomes
// links as courses go live); `stack` — the technologies named instead, while
// no course path exists; `requires` — the entry condition stated before the
// first step (null = from zero).
export default [
  // ── Web ───────────────────────────────────────────────────────────────────
  {
    slug: 'frontend-developer',
    title: 'Frontend developer',
    desc: 'The part of the web people see and touch: pages, layouts, interfaces.',
    // Phase 2 of the plan (proofstone/proofstone.dev#1): the pilot map.
    path: ['HTML & CSS', 'JavaScript', 'TypeScript', 'React'],
    requires: null,
    status: 'planned',
    area: 'software-engineering',
    direction: 'web'
  },
  {
    slug: 'backend-developer',
    title: 'Backend developer',
    desc: 'Servers, data and APIs: everything that runs behind the page.',
    stack: ['Python', 'Node.js', 'Java', 'Go'],
    requires: null,
    status: 'planned',
    area: 'software-engineering',
    direction: 'web'
  },
  {
    slug: 'full-stack-developer',
    title: 'Full-stack developer',
    desc: 'Both sides of a web app, on one stack.',
    stack: ['MERN', 'Django + React'],
    requires: null,
    status: 'planned',
    area: 'software-engineering',
    direction: 'web'
  },
  {
    slug: 'web-tooling-engineer',
    title: 'Web tooling engineer',
    desc: 'The tools web developers build with: bundlers, compilers, linters, frameworks.',
    stack: ['TypeScript', 'Rust', 'Go'],
    requires: 'you already write TypeScript and have shipped a web app',
    status: 'planned',
    area: 'software-engineering',
    direction: 'web'
  },
  {
    slug: 'web-performance-engineer',
    title: 'Web performance engineer',
    desc: 'Speed: Core Web Vitals, loading, rendering — measured, then fixed.',
    stack: ['JavaScript', 'browser APIs', 'profilers'],
    requires: 'you already build web pages',
    status: 'planned',
    area: 'software-engineering',
    direction: 'web'
  },
  {
    slug: 'accessibility-engineer',
    title: 'Accessibility engineer',
    desc: 'The web for everyone: WCAG, screen readers, the keyboard.',
    stack: ['HTML', 'ARIA', 'assistive-technology testing'],
    requires: 'you already write HTML and CSS',
    status: 'planned',
    area: 'software-engineering',
    direction: 'web'
  },
  {
    slug: 'design-systems-engineer',
    title: 'Design systems engineer',
    desc: 'The component library and the tokens a whole product is built from.',
    stack: ['TypeScript', 'React / Vue', 'Storybook'],
    requires: 'you already build interfaces in a component framework',
    status: 'planned',
    area: 'software-engineering',
    direction: 'web'
  },
  {
    slug: 'creative-webgl-developer',
    title: 'Creative / WebGL developer',
    desc: '3D, graphics and interaction in the browser.',
    stack: ['WebGL', 'Three.js', 'shaders'],
    requires: 'you already write JavaScript; the math comes along the way',
    status: 'planned',
    area: 'software-engineering',
    direction: 'web'
  },
  {
    slug: 'qa-automation-engineer',
    title: 'QA automation engineer',
    desc: 'Tests that run themselves, for web applications.',
    stack: ['Playwright', 'Cypress', 'TypeScript'],
    requires: null,
    status: 'planned',
    area: 'software-engineering',
    direction: 'web'
  },
  {
    slug: 'technical-seo-engineer',
    title: 'Technical SEO engineer',
    desc: 'Indexing, structured data, rendering for crawlers.',
    stack: ['HTML', 'server-side rendering', 'structured data'],
    requires: 'you already build web pages',
    status: 'planned',
    area: 'software-engineering',
    direction: 'web'
  },
  // ── Systems & desktop ─────────────────────────────────────────────────────
  {
    slug: 'browser-engine-engineer',
    title: 'Browser engine engineer',
    desc: 'The browser itself — Chromium, WebKit, Gecko — not the sites inside it.',
    stack: ['C++', 'Rust'],
    requires: 'you already write C++ or Rust',
    status: 'planned',
    area: 'software-engineering',
    direction: 'systems-desktop'
  },
  // ── Security ──────────────────────────────────────────────────────────────
  {
    slug: 'application-security-engineer',
    title: 'Application security engineer',
    desc: 'XSS, CSP, auth, audits: the application attacked, then fixed.',
    stack: ['web', 'one backend language', 'security tooling'],
    requires: 'you already ship web applications',
    status: 'planned',
    area: 'software-engineering',
    direction: 'security'
  },
  // ── Infrastructure ────────────────────────────────────────────────────────
  {
    slug: 'web-infrastructure-engineer',
    title: 'Web infrastructure engineer',
    desc: 'CDNs, edge, caching, the network between the server and the reader.',
    stack: ['Linux', 'networking', 'Go / Rust'],
    requires: 'you already run services in production',
    status: 'planned',
    area: 'software-engineering',
    direction: 'infrastructure'
  }
];
