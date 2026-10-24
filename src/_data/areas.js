// The shelves of /become/ (owner's decision 2026-10-23): an AREA holds
// DIRECTIONS, a direction holds professions (roadmaps and the professions being
// built). Three floors of the same card: /become/ → /become/<area>/ →
// /become/<area>/<direction>/ → the profession's page.
//
// The whole landscape is declared here, up front, so every new map has a shelf
// waiting — the person who "wants C++" sees Systems & desktop and Games exist
// before either has a map. But a shelf with nothing on it gets NO page and NO
// link (honest navigation): it shows as a card that says so, and opens with its
// first map. An area with no directions named yet (hardware today) shows its
// professions directly; its directions get named with the second map.
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
    // The order here IS the order on the page (owner's call, 2026-10-24: Web
    // first). Shelves with nothing on them fall to the end regardless, so the
    // page always opens on real content.
    directions: [
      { slug: 'web', title: 'Web', desc: 'Pages, APIs, and everything between the browser and the server.' },
      { slug: 'data-ai', title: 'Data & AI', desc: 'Models, evals, and the pipelines that feed them.' },
      { slug: 'infrastructure', title: 'Infrastructure', desc: 'Servers, clusters, networks — and keeping them up.' },
      { slug: 'security', title: 'Security', desc: 'Breaking things, to ship them right.' },
      { slug: 'systems-desktop', title: 'Systems & desktop', desc: 'Compilers, databases, operating systems, desktop apps — close to the metal.' },
      { slug: 'embedded', title: 'Embedded', desc: 'Code that runs on a machine, not on a server.' },
      { slug: 'mobile', title: 'Mobile', desc: 'Apps for the phone in your pocket.' },
      { slug: 'games', title: 'Games', desc: 'Engines, worlds, and the loop that runs sixty times a second.' }
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
