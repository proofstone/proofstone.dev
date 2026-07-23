// ─────────────────────────────────────────────────────────────────────────────
// a11y-guard.mjs — accessibility invariants asserted over the DELIVERED HTML.
//
// Every rule here corresponds to a defect this site actually shipped, and each
// one is invisible in the source: the heading anchors come from a markdown-it
// plugin whose fix option is version-dependent (an earlier proposal was a silent
// no-op), the map hotspots are generated from an SVG produced in another repo,
// and the scroll wrappers are injected during render. So they are checked in the
// output, not in the intent.
//
// Pure string rules on purpose: this runs inside the deploy path, offline, on
// rebuilds nobody watches. Extracted from check-build.mjs so check-guards.mjs can
// feed each rule a poisoned page and prove it fires.
// ─────────────────────────────────────────────────────────────────────────────

// Focusable things that assistive tech is told to ignore. A tab stop that
// announces nothing is axe's `aria-hidden-focus` (serious, WCAG 4.1.2).
const FOCUSABLE_TAG = /<(a\b[^>]*\shref=|button\b|input\b|select\b|textarea\b|summary\b)[^>]*>/gi;

function tagsWith(html, re) {
  return [...html.matchAll(re)].map((m) => m[0]);
}

export function inspectRenderedPage(html, opts = {}) {
  const problems = [];
  const isRoadmap = opts.roadmap !== false && /class="roadmap prose"/.test(html);

  // ── 1. No focusable element is hidden from assistive tech ──────────────────
  const hiddenFocusable = tagsWith(html, FOCUSABLE_TAG).filter(
    (t) => /aria-hidden="true"/i.test(t) && !/tabindex="-1"/i.test(t)
  );
  if (hiddenFocusable.length) {
    problems.push(
      `${hiddenFocusable.length} focusable element(s) carry aria-hidden="true" without tabindex="-1" ` +
        `— e.g. ${hiddenFocusable[0].slice(0, 90)}`
    );
  }

  // ── 2. Every navigation landmark is named ─────────────────────────────────
  // Roadmap pages carry five; an unnamed one is the confusing row in a rotor.
  const navs = tagsWith(html, /<nav\b[^>]*>/gi).filter(
    (t) => !/aria-label(?:ledby)?=/i.test(t)
  );
  if (navs.length) problems.push(`${navs.length} <nav> without an accessible name — e.g. ${navs[0].slice(0, 80)}`);

  // ── 3. The skip link has somewhere to put focus ───────────────────────────
  if (/href="#main"/.test(html) && !/<main\b[^>]*\stabindex="-1"/i.test(html)) {
    problems.push('skip link targets #main, but <main> has no tabindex="-1" — activating it would not move focus');
  }

  // ── 4. Sideways-scrolling regions are reachable by keyboard ───────────────
  // Browsers only auto-focus a scroll container that has no focusable children,
  // which the map (11 hotspot links) can never satisfy.
  const tables = (html.match(/<table\b/gi) || []).length;
  const wrappers = (html.match(/class="prose__scroll"/g) || []).length;
  if (tables !== wrappers) {
    problems.push(`${tables} <table> vs ${wrappers} focusable scroll wrapper(s) — a table can only scroll with a mouse`);
  }
  const pres = tagsWith(html, /<pre\b[^>]*>/gi).filter((t) => !/tabindex="0"/.test(t));
  if (pres.length) problems.push(`${pres.length} <pre> without tabindex="0" — code blocks scroll sideways`);

  if (!isRoadmap) return { problems };

  // ── 5. Roadmap-only: the map must say where its links go ──────────────────
  const figure = html.match(/<figure class="ps-map"[^>]*>/);
  if (!figure) {
    problems.push('no .ps-map figure on a roadmap page');
  } else if (!/\stabindex="0"/.test(figure[0])) {
    problems.push('the map is a scroll container with focusable children and no tabindex — unreachable by keyboard');
  }
  const hotspotLabels = [...html.matchAll(/<a href="#[^"]*" aria-label="([^"]*)"><rect class="ps-map__hit"/g)].map(
    (m) => m[1]
  );
  if (!hotspotLabels.length) problems.push('map hotspots have no aria-label at all');
  const opaque = hotspotLabels.filter((l) => /^Jump to (?:§|section )\d+\s*$/.test(l));
  if (opaque.length) {
    problems.push(`${opaque.length} map hotspot(s) named by number only ("${opaque[0]}") — the section titles are in the data`);
  }

  return { problems };
}
