// Chrome strings, one dictionary per locale. English is the source of truth,
// and since the become wave (2026-10-06) it is the only locale shipped: the site
// speaks English until a reader brings their own language. Adding one is still
// the same small surface — one more entry here, a `/<code>/` copy of each chrome
// page in src/, and the language switcher back in base.njk (it was removed with
// the Russian mirror; see git history of base.njk, styles.css and check-build).
// Roadmap CONTENT pages are English-only regardless (their source of truth is
// each repository's README), so these strings cover only the chrome pages:
// home, /become/, /projects/.
//
// Values ending in `Html` are trusted markup written in this file, not user
// input — they pass through `| safe` in the templates.

// " · 3 live · 1 planned · 1 in review" — only the parts that are not zero, so
// a shelf with one live map does not announce "0 planned · 0 in review".
const tallyTail = (t) =>
  [['live', 'live'], ['planned', 'planned'], ['review', 'in review']]
    .filter(([k]) => t[k])
    .map(([k, word]) => ` · <b>${t[k]}</b> ${word}`)
    .join('');

export default {
  en: {
    code: 'en',
    label: 'English',
    paths: { home: '/', become: '/become/', projects: '/projects/' },
    // No "Learn" entry: /learn/ appears together with its first course. A nav
    // link without a page is the same broken promise as a linked PLANNED card.
    // starShort must be the first word(s) of star: it is what the narrowest
    // phones show, and the accessible name (star) has to contain it.
    nav: { become: 'Become', projects: 'Projects', star: 'Star on GitHub', starShort: 'Star' },
    footer: {
      line1Html: 'proofstone — a community that keeps the craft · static site · no cookies, no personal data — anonymous analytics via <a href="https://umami.is" rel="noopener">Umami</a>',
      line2Html: 'content licensed per each roadmap’s repository · <a href="https://github.com/proofstone" rel="noopener">github.com/proofstone</a>',
    },
    home: {
      title: 'proofstone — a community that keeps the craft',
      description: 'AI is growing fast — and the small moments at the keyboard are disappearing. Proofstone is a community for people who don’t want to lose the craft: roadmaps, projects, and people, side by side with AI.',
      h1Html: 'We won’t say goodbye<br>to <span class="hw">"Hello World"</span>.',
      p1Html: 'AI is growing fast — and becoming a real engineer is getting harder, not easier. Code is written by hand less and less. The small moments at the keyboard are disappearing: the <b>"Aha!"</b> when you understand, the <b>"Wow, it works!"</b> when it runs. It is sad to say — soon, maybe nobody will write their own Hello World.',
      p2Html: '<b>Proofstone</b> is a community for people who don’t want to lose the craft. Roadmaps, projects, and people — so you become an engineer in this era, <b>side by side with AI</b>, not behind it.',
      p3Html: 'And one hard question. If AI is down tomorrow — for a day, for a month — are you still an engineer, or were you its operator? Here the answer is proven, not claimed: <b>a milestone closed by an AI’s hands was never yours.</b>',
      cardsKicker: 'what’s inside',
      // Six equal doors (owner's decision 2026-10-06). The first two are the two
      // ways in: by profession and by language or technology.
      cards: {
        become: { title: 'What do you want to become?', desc: 'AI safety, distributed systems, cryptography — and next, Frontend from zero. Pick a profession and follow its map.', tag: 'maps' },
        learn: { title: 'What do you want to learn?', desc: 'Pick a language or a technology and learn it lesson by lesson, with tasks your browser checks. HTML and CSS come first.', tag: 'planned' },
        projects: { title: 'Projects', desc: 'Build-your-own labs: an agent, a SWIM test suite, an eval scorer validator. Written by hand, from scratch.', tag: 'labs' },
        foundations: { title: 'Foundations', desc: 'The bedrock: algorithms, networks, operating systems — the parts AI can’t feel for you.', tag: 'planned' },
        challenges: { title: 'Challenges', desc: 'Break it, build it, prove it: hands-on challenges with a definite finish line.', tag: 'idea' },
        museum: { title: 'The Hello World Museum', desc: 'The first words of every language, kept alive — because someone should.', tag: 'idea' },
      },
    },
    becomePage: {
      title: 'What do you want to become? — proofstone',
      description: 'Professions as maps you walk node by node. Every card says, up front, what you need before you start; every milestone states the artifact that closes it.',
      crumb: 'become',
      h1: 'What do you want to become?',
      // Three floors since the areas wave (2026-10-23): area → direction → profession.
      intro: 'Pick an area, then a direction inside it, then a profession. Each profession is a map you walk node by node, and every milestone states, in advance, the artifact that closes it. Every card says, up front, what you need before you start.',
      privateNote: 'Private until published.',
      live: 'live', review: 'in review', planned: 'planned',
      milestonesWord: () => 'milestones',
      flagshipWord: () => 'flagship',
      // Every count is a becomeTree tally: { maps, live, planned, review }.
      countsHtml: (t) =>
        `<b>${t.areas}</b> areas · <b>${t.maps}</b> professions · <b>${t.live}</b> live · <b>${t.planned}</b> planned · <b>${t.review}</b> in practitioner review`,
      areaCountsHtml: (t, directions) =>
        (directions ? `<b>${directions}</b> directions · ` : '') + `<b>${t.maps}</b> ${t.maps === 1 ? 'map' : 'maps'}` + tallyTail(t),
      directionCountsHtml: (t) =>
        `<b>${t.maps}</b> ${t.maps === 1 ? 'profession' : 'professions'}` + tallyTail(t),
      // The floor line of an area or direction card.
      tallyHtml: (t, directions) =>
        (directions ? `<b>${directions}</b> directions · ` : '') + `<b>${t.maps}</b> ${t.maps === 1 ? 'map' : 'maps'}` + tallyTail(t),
      // The chip of a shelf: its best content. chip--none is what the become
      // guard keys on — a linked card must never carry it.
      shelfChipHtml: (best, t) =>
        best === 'live' ? `<span class="chip chip--live">${t.live} live</span>`
        : best === 'planned' ? '<span class="chip chip--planned">planned</span>'
        : best === 'review' ? '<span class="chip chip--review">in review</span>'
        : '<span class="chip chip--none">no map yet</span>',
      directionsWord: 'directions',
      professionsWord: 'professions',
      directionsPending: 'named with the second map',
      noneYet: 'none yet — this card opens with the first map',
      open: 'open →',
      directionIntro: (desc) => `${desc} Pick a profession: each one is a map you walk node by node, and every card says, up front, what you need before you start.`,
      otherDirections: 'other directions:',
      otherDirectionsLabel: 'Other directions',
      allDirections: (n) => `all ${n} →`,
      labWord: 'lab',
      // The entry condition, stated before the first step — the same idea as
      // "you're done when", at the other end of the map.
      requiresWord: 'before you start:',
      fromZero: 'nothing — start from zero',
      requiresPending: 'named when the map is published',
    },
    projectsPage: {
      title: 'Projects — proofstone',
      description: 'Build-your-own labs: understand it by building it from scratch, by hand. Each lab states what you build and how it is checked.',
      crumb: 'projects',
      h1: 'Projects',
      intro: 'Understand it by building it — from scratch, by hand. Each lab states what you build and how it is checked: a grading suite, a running program, a test set. No lab is finished by reading about it.',
      countsHtml: (labs) => `<b>${labs}</b> labs · <b>${labs}</b> live · checked by machines, not opinions`,
    },
  },
};
