// The shelves of /become/ (owner's decisions 2026-10-23 and 2026-11-02): an
// AREA holds DIRECTIONS, a direction holds professions (roadmaps and the
// professions being built). Three floors of the same card: /become/ →
// /become/<area>/ → /become/<area>/<direction>/ → the profession's page.
//
// The whole landscape is declared here, up front, so every new map has a shelf
// waiting — the person who "wants C++" sees Systems & desktop and Games exist
// before either has a map. But a shelf with nothing on it gets NO page and NO
// link (honest navigation): it shows as a card that says so, and opens with its
// first map. An area with no directions named yet shows its professions
// directly; its directions get named when there are enough maps to split.
//
// The order here IS the order on the page (owner's call). Shelves with nothing
// on them fall to the end regardless, so a page always opens on real content.
//
// This is the site's classification of its maps, not a line from any README —
// the README rule (a surface's words about a map come only from that map's own
// README) is about what a card SAYS, not about which shelf it sits on.
export default [
  {
    slug: 'software-engineering',
    title: 'Software engineering',
    desc: 'Code, wherever it runs: the browser, the phone, the server, the cluster, the chip inside a machine.',
    intro: 'Code, wherever it runs. Pick a direction, then a profession inside it: each one is a map you walk node by node. A direction opens when it has its first map.',
    directions: [
      { slug: 'web', title: 'Web', desc: 'Pages, APIs, and everything between the browser and the server.' },
      { slug: 'infrastructure', title: 'Infrastructure', desc: 'Servers, clusters, networks — and keeping them up.' },
      { slug: 'systems-desktop', title: 'Systems & desktop', desc: 'Compilers, databases, operating systems, desktop apps — close to the metal.' },
      { slug: 'embedded', title: 'Embedded', desc: 'Code that runs on a machine, not on a server.' },
      { slug: 'mobile', title: 'Mobile', desc: 'Apps for the phone in your pocket.' },
      { slug: 'games', title: 'Games', desc: 'Engines, worlds, and the loop that runs sixty times a second.' }
    ]
  },
  // Security, data and AI left Software engineering on 2026-11-02 (owner's
  // call): each is an area of its own now, with no directions named yet.
  {
    slug: 'cybersecurity',
    title: 'Cybersecurity',
    desc: 'Attack, defend, prove: the systems people trust, tested by the people who break them.',
    intro: 'Breaking things, to ship them right. Pick a direction, then a profession inside it: each one is a map you walk node by node. A direction opens when it has its first map.',
    // Named 2026-11-02 with the first eight planned professions (owner's call).
    directions: [
      { slug: 'offensive', title: 'Offensive security', desc: 'Breaking in, on purpose and on paper: tests, exploits, the report that follows.' },
      { slug: 'defensive', title: 'Defensive security', desc: 'Keeping them out, and finding out when they got in: hardening, monitoring, response.' },
      { slug: 'application', title: 'Application security', desc: 'Security inside the code and the pipeline that ships it.' },
      { slug: 'cryptography', title: 'Cryptography', desc: 'The math that keeps secrets, shipped without getting it wrong.' }
    ]
  },
  {
    slug: 'data-science',
    title: 'Data science & big data',
    desc: 'Data at any size: collecting it, moving it, making it answer questions.',
    intro: 'Data at any size. Pick a direction, then a profession inside it: each one is a map you walk node by node. A direction opens when it has its first map.',
    // Named 2026-11-02 with the first eight professions (owner's call).
    directions: [
      { slug: 'analytics', title: 'Analytics', desc: 'Questions answered from data: reports, dashboards, the models behind them.' },
      { slug: 'engineering', title: 'Data engineering', desc: 'The pipes data flows through: collection, storage, pipelines — and the databases themselves.' },
      { slug: 'science', title: 'Data science', desc: 'Experiments and models on data: statistics, forecasts, A/B tests.' }
    ]
  },
  {
    // The slug stays short (/become/ai/ is live); the title says the whole
    // thing (owner's call, 2026-11-02).
    slug: 'ai',
    title: 'Artificial intelligence & machine learning',
    desc: 'Models and the systems around them: training, serving, evaluating, keeping them safe.',
    intro: 'Models and the systems around them. Pick a direction, then a profession inside it: each one is a map you walk node by node. A direction opens when it has its first map.',
    // Named 2026-11-02 with the first seven planned professions (owner's call).
    directions: [
      { slug: 'applied', title: 'Applied AI', desc: 'Models in products: trained, served, evaluated, watched.' },
      { slug: 'research', title: 'Research', desc: 'New models and architectures: experiments, papers, the math behind them.' },
      { slug: 'safety', title: 'Safety', desc: 'Evals, red-teaming, guardrails: models that stay within the lines.' }
    ]
  },
  {
    slug: 'hardware-electronics',
    title: 'Hardware & electronics',
    desc: 'The board, the circuit and the machine around it — the part of engineering you can hold.',
    intro: 'The board, the circuit and the machine around it. Pick a profession: each one is a map you walk node by node, and every card says, up front, what you need before you start.',
    // No directions yet: one map is not a landscape. Named with the second map.
    directions: []
  }
];
