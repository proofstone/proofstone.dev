// ─────────────────────────────────────────────────────────────────────────────
// star-guard.mjs — how a flagship milestone is allowed to render.
//
// Extracted from check-build.mjs so the same code runs in the build check and in
// the proof harness (scripts/check-guards.mjs) — a gate nobody can demonstrate
// firing is not a gate. That is not a formality here: while this rule lived
// inline it could not be poisoned, and the adjacency half of it did not hold.
//
// The render layer strips ⭐ out of milestone headings and lets the FLAGSHIP
// stamp carry the meaning. That is an edit to text this repo does not own, so it
// is asserted rather than trusted, in three directions:
//   • the count of is-star headings must equal the count of starred milestone
//     headings in the source README — if a strip ever ran before the class was
//     assigned, or the regex drifted, flagships would silently become ordinary;
//   • no ⭐ may survive inside a milestone heading in the output;
//   • every is-star heading must be followed IMMEDIATELY by the criterion
//     blockquote that renders the stamp — otherwise removing the emoji removes
//     the only marker the reader had, and nothing replaces it.
// Stars elsewhere in the prose are none of our business and are left alone.
// ─────────────────────────────────────────────────────────────────────────────

// The star is data, read from the README the site does not own.
export const SOURCE_FLAGSHIP_RE = /^###\s+M\d+\.\d+.*[⭐★].*$/gm;

// Milestone headings as this build emits them.
export const MILESTONE_HEADING_RE = /<h3 id="[^"]*" class="([^"]*)" data-ms="[^"]*">([\s\S]*?)<\/h3>/g;

// Heading, whitespace, criterion — the same adjacency the stylesheet requires
// (.ps-ms-h.is-star + .ps-criterion is an adjacent-sibling rule, so a paragraph
// in between means no gold stamp is drawn at all).
//
// (?:(?!<\/h3>)[\s\S])* is load-bearing, and the reason this rule was extracted.
// The obvious [\s\S]*? is lazy but not bounded: when the flagship's own criterion
// is missing or pushed away by a paragraph, the engine backtracks PAST the first
// </h3> and settles on a later milestone's criterion, and the flagship is counted
// as stamped. Measured on a built page (2026-07-26): the match opening at M2.4
// swallowed M2.5, the build stayed green, and M2.4 rendered as an ordinary
// milestone with its star already stripped out of the heading. The tempered
// token cannot cross the first </h3>, so the match is the heading's own.
export const STAMPED_RE =
  /<h3 id="[^"]*" class="[^"]*is-star[^"]*"(?:(?!<\/h3>)[\s\S])*<\/h3>\s*<blockquote class="ps-criterion">/g;

export function inspectFlagships(html, md) {
  const inSource = (md.match(SOURCE_FLAGSHIP_RE) || []).length;
  const headings = [...html.matchAll(MILESTONE_HEADING_RE)];
  const starred = headings.filter((h) => / is-star|^is-star/.test(h[1]));
  const leaked = starred.filter((h) => /[⭐★]/.test(h[2])).length;
  const stamped = [...html.matchAll(STAMPED_RE)].length;

  // Reported in this order on purpose: a count mismatch explains the other two,
  // so naming it first points at the cause instead of the symptom.
  const problems = [];
  if (starred.length !== inSource) {
    problems.push({
      title: 'flagship count drifted',
      detail: `${starred.length} is-star headings for ${inSource} starred milestones in the README`
    });
  } else if (leaked) {
    problems.push({
      title: 'emoji survived',
      detail: `${leaked} milestone heading(s) still render ⭐`
    });
  } else if (stamped !== starred.length) {
    problems.push({
      title: 'flagship without a stamp',
      detail: `${stamped} of ${starred.length} starred milestones are followed by a criterion block — the rest lost their only marker`
    });
  }

  return { inSource, starred: starred.length, leaked, stamped, problems };
}
