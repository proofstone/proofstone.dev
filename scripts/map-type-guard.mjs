// ─────────────────────────────────────────────────────────────────────────────
// map-type-guard.mjs — the type floor, applied to the map.
//
// The stylesheet's floor (a11y-guard) covers CSS rules. It has never covered the
// roadmap maps, because their labels are SVG attributes on a file produced in
// another repository — so the maps were the one place on this site where a label
// could be any size at all, and they were: 9 to 13 units, which is 8.26 to 11.93
// real pixels once the map is squeezed into the reading column.
//
// TWO THINGS THIS GUARD KNOWS THAT A NAIVE ONE WOULD NOT:
//
// 1.  A MAP'S font-size IS NOT PIXELS. It is user units, scaled by however wide
//     the figure is drawn. The binding case is the reading column, where an
//     800-unit map is shown at 734 px — scale 0.917 — so 13 units renders 11.93.
//     The required authored size is therefore FLOOR / scale, and it DIFFERS PER
//     MAP because the maps are different widths: 13.60 units for an 800-wide map,
//     14.96 for an 880-wide one. A single number would be wrong for both.
//     (Wider is not safer, it is worse: a wider map is squeezed harder.)
//
// 2.  SOME LABELS ARE DELIBERATELY EXEMPT, AND THE EXEMPTION IS DECLARED.
//     The FLAGSHIP / OFF / DEF plates are decorative duplicates of information
//     the reader already has in words — the flagship count on the card, the stamp
//     on the milestone itself, the track in the section heading. They are marks,
//     not text to read, and blowing them up to 15 units would mean redrawing
//     every map around a decoration.
//     They carry class="map-plate" IN THE RENDERER. The exemption is a property
//     the map states about itself, not a rule this guard infers from a size or a
//     word — otherwise "exempt" would silently grow to mean "small".
// ─────────────────────────────────────────────────────────────────────────────

// Declared exemptions: class → why. Adding a class here is a decision someone
// has to write a reason for, which is the point.
export const EXEMPT = {
  'map-plate': 'decorative duplicate of information available as text (FLAGSHIP / OFF / DEF marks)'
};

// The reading column is the narrowest place the map is drawn, so it sets the
// requirement. Derived from the stylesheet rather than hardcoded: --measure is
// the reading measure, and .ps-map takes a 1px border on each side.
export function readingColumnPx(css, { remPx = 16, borderPx = 1 } = {}) {
  const m = css.match(/--measure:\s*([\d.]+)rem/);
  if (!m) return null;
  return Number(m[1]) * remPx - borderPx * 2;
}

export function inspectMapType(svg, { columnPx, floorPx = 12.48 }) {
  const problems = [];
  const vb = (svg.match(/viewBox="([^"]+)"/) || [])[1];
  if (!vb || !columnPx) return { problems: ['cannot read viewBox or the reading column'], labels: [] };
  const vbWidth = Number(vb.trim().split(/\s+/)[2]);
  // On a screen wider than the reading column the map is drawn at 1:1 or wider,
  // so it can only get better. The floor is set by the worst case.
  const scale = Math.min(1, columnPx / vbWidth);
  const required = floorPx / scale;

  const labels = [];
  for (const [, attrs] of svg.matchAll(/<text\b([^>]*)>/g)) {
    const size = Number((attrs.match(/\bfont-size="([\d.]+)"/) || [])[1]);
    if (!size) continue;                       // inherits; the <svg> sets no size
    const cls = (attrs.match(/\bclass="([^"]*)"/) || [])[1] || '';
    const exempt = cls.split(/\s+/).find((c) => EXEMPT[c]);
    labels.push({ size, cls, exempt: exempt || null, px: size * scale });
    if (exempt || size >= required) continue;
    problems.push(
      `a label at ${size} units renders ${(size * scale).toFixed(2)}px in the reading column `
      + `(needs ${required.toFixed(2)} units for ${floorPx}px) and claims no exemption`
    );
  }
  return { problems, vbWidth, scale, required, labels };
}
