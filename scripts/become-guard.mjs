// become-guard.mjs — the honesty rule of the /become/ tree, as a module so
// check-guards.mjs can feed it poisoned pages (an inline rule in check-build
// cannot be shown to fire). Three floors of cards: areas, directions,
// professions. A card is a link only when there is a page behind it, and a
// page exists only when it is reachable from the floor above.
//
// A card that says "no map yet" carries class chip--none; the guard keys on
// the class, not the words, so a dictionary change cannot blind it.

// The card's own element only: class "mcard" or "mcard <modifiers>", never the
// card's inner parts ("mcard__top", "mcard__meta"…).
const LINKED = /<a class="mcard(?: [^"]*)?"[^>]*>([\s\S]*?)<\/a>/g;
const STATIC_OPEN = /<div class="mcard(?: [^"]*)?"[^>]*>/g;
const ANY_CARD = /class="mcard(?: [^"]*)?"/g;

// One built page: no linked card may claim it has nothing behind it, and no
// static card may carry a link.
export function inspectBecomeCards(html) {
  const problems = [];
  let linked = 0;
  let statics = 0;
  for (const m of html.matchAll(LINKED)) {
    linked++;
    if (/class="chip chip--none"/.test(m[1])) problems.push('a card that says "no map yet" is a link');
  }
  for (const m of html.matchAll(STATIC_OPEN)) {
    statics++;
    if (/\shref=/.test(m[0])) problems.push('a static card carries an href');
  }
  return { linked, statics, problems };
}

// The tree as built: `pages` maps a site-relative path ("become/index.html",
// "become/<area>/index.html", "become/<area>/<dir>/index.html") to its HTML.
// Every floor below /become/ must be linked from the floor above it, and every
// direction page must hold at least one profession card — an unreachable page
// or an empty one is a page the site should not have built.
export function inspectBecomeReach(pages) {
  const problems = [];
  const rels = Object.keys(pages);
  const home = pages['become/index.html'];
  if (home === undefined) return { problems: ['become/index.html was not built'] };
  for (const rel of rels) {
    const m = rel.match(/^become\/([a-z0-9-]+)\/(?:([a-z0-9-]+)\/)?index\.html$/);
    if (!m) continue;
    const [, area, dir] = m;
    if (!dir) {
      if (!home.includes(`href="/become/${area}/"`)) problems.push(`/become/${area}/ was built but /become/ does not link to it`);
    } else {
      const parent = pages[`become/${area}/index.html`];
      if (parent === undefined) problems.push(`/become/${area}/${dir}/ was built but its area page was not`);
      else if (!parent.includes(`href="/become/${area}/${dir}/"`)) problems.push(`/become/${area}/${dir}/ was built but /become/${area}/ does not link to it`);
      const cards = (pages[rel].match(ANY_CARD) || []).length;
      if (cards === 0) problems.push(`/become/${area}/${dir}/ holds no profession card — an empty shelf must not have a page`);
    }
  }
  return { problems };
}
