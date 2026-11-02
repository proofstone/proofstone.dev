// escape-guard.mjs — a built page must escape its text exactly once.
//
// "&amp;amp;" in a <title> is what a reader saw on /become/hardware-electronics/
// for nine days (2026-10-24 → 11-02): a computed front-matter string is
// rendered with autoescape on, and the layout escaped it again. The fix is
// `| safe` at the computed string; this guard is what makes the fix stay.
// A module, so check-guards.mjs can feed it a poisoned page.

const DOUBLE = /&amp;(amp|lt|gt|quot|#39|#x27);/g;

export function inspectDoubleEscape(html) {
  const problems = [];
  const hits = html.match(DOUBLE) || [];
  if (hits.length) problems.push(`${hits.length} double-escaped entit${hits.length === 1 ? 'y' : 'ies'} (${[...new Set(hits)].join(', ')}) — text escaped twice on its way to the page`);
  return { problems, hits: hits.length };
}
