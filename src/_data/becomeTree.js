// The /become/ tree, built once from three sources: the shelves
// (src/_data/areas.js), the roadmaps (roadmaps.config.mjs) and the professions
// being built (src/_data/professions.js). Templates only walk this — no
// ordering, numbering or counting happens in Nunjucks (a `set` does not survive
// a loop, and a number typed into markup is how this project drifted twice).
//
// Every card must sit on a declared shelf: an unknown area or direction, or a
// card in an area that has directions but names none, FAILS THE BUILD. A map
// without a shelf would silently vanish from the site otherwise.
import areas from './areas.js';
import professions from './professions.js';
import { loadRoadmaps } from '../../roadmaps.config.mjs';

// Directions keep the order they are declared in (areas.js is the editorial
// order — owner's call, 2026-10-24); only an empty shelf falls to the end, so
// the page opens on real content. Within a shelf: live → planned → review.
const pad = (n) => String(n).padStart(2, '0');

const tally = (cards) => ({
  maps: cards.length,
  live: cards.filter((c) => c.status === 'live').length,
  planned: cards.filter((c) => c.status === 'planned').length,
  review: cards.filter((c) => c.status === 'review').length
});
const best = (cards) => (cards.length ? ['live', 'planned', 'review'].find((s) => cards.some((c) => c.status === s)) : 'none');

export default function () {
  const roadmaps = loadRoadmaps().sort((a, b) => a.order - b.order);
  // Within any shelf the order is live → planned → review (the /become/ rule
  // since 2026-10-06); building the flat list in that order and filtering keeps it.
  const cards = [
    ...roadmaps.filter((r) => r.status === 'live').map((r) => ({ status: 'live', r, area: r.area, direction: r.direction || null })),
    ...professions.map((p) => ({ status: p.status, p, area: p.area, direction: p.direction || null })),
    ...roadmaps.filter((r) => r.status === 'review').map((r) => ({ status: 'review', r, area: r.area, direction: r.direction || null }))
  ];

  for (const c of cards) {
    const name = c.r ? c.r.slug : c.p.slug;
    const area = areas.find((a) => a.slug === c.area);
    if (!area) throw new Error(`[become] ${name}: area "${c.area}" is not declared in src/_data/areas.js — a map without a shelf would vanish from /become/`);
    if (area.directions.length) {
      if (!c.direction) throw new Error(`[become] ${name}: area "${area.slug}" has directions, so the card must name one (direction: '<slug>')`);
      if (!area.directions.some((d) => d.slug === c.direction)) throw new Error(`[become] ${name}: direction "${c.direction}" is not declared under area "${area.slug}" in src/_data/areas.js`);
    } else if (c.direction) {
      throw new Error(`[become] ${name}: area "${area.slug}" has no directions yet, so the card cannot name "${c.direction}" — declare the directions first`);
    }
  }

  const built = areas.map((a, ai) => {
    const own = cards.filter((c) => c.area === a.slug);
    const dirs = a.directions
      .map((d, i) => {
        const dc = own.filter((c) => c.direction === d.slug);
        return { ...d, area: a.slug, areaTitle: a.title, cards: dc, open: dc.length > 0, tally: tally(dc), best: best(dc), declaredOrder: i };
      })
      .sort((x, y) => Number(y.open) - Number(x.open) || x.declaredOrder - y.declaredOrder);
    // Card numbers run through the whole area in the order the reader meets
    // them; direction numbers run through the area's shelf list.
    let n = 0;
    for (const d of dirs) d.cards = d.cards.map((c) => ({ ...c, no: pad(++n) }));
    const direct = a.directions.length ? [] : own.map((c, i) => ({ ...c, no: pad(i + 1) }));
    // What a direction page needs to know about its neighbours, resolved here
    // so the template never searches a list (Nunjucks has no `find`).
    const siblings = dirs.map((d) => ({ slug: d.slug, title: d.title, open: d.open }));
    return {
      ...a,
      no: pad(ai + 1),
      directions: dirs.map((d, i) => ({ ...d, no: pad(i + 1), siblings, directionsTotal: dirs.length })),
      cards: direct,
      open: own.length > 0,
      tally: tally(own),
      best: best(own),
      openDirections: dirs.filter((d) => d.open).length
    };
  });

  return {
    areas: built,
    // Only shelves with something on them get a page — the pagination sources.
    areaPages: built.filter((a) => a.open),
    directionPages: built.flatMap((a) => a.directions.filter((d) => d.open)),
    totals: { areas: built.length, ...tally(cards) }
  };
}
