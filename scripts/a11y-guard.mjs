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

// The floor for a service label, in rem. Below this the site had eleven ad-hoc
// values between .6rem and .78rem — stamps at 9.6px, PROOF at 9.92px, the shelf
// mark and the milestone count at 11.52px. Five readers named the small type
// before anything else. 0.78rem = 12.48px is the bottom rung of the scale that
// replaced them, so the guard's job is to keep a twelfth ad-hoc value from
// appearing later, when nobody is looking at the page with fresh eyes.
export const FONT_SIZE_FLOOR_REM = 0.78;

function tagsWith(html, re) {
  return [...html.matchAll(re)].map((m) => m[0]);
}

// ── Minimum size of a rendered label, asserted in the stylesheet ────────────
//
// Checked in the CSS rather than in the browser because that is what this file
// has: the guard runs offline inside the deploy path, with no renderer. That
// costs nothing here — every small label on this site gets its size from a rule,
// not from an inline style or a script.
//
// Three exclusions, each for a reason and not for convenience:
//   • @media print — a different medium with its own units (body is 11pt there),
//     and a screen floor applied to paper is a category error;
//   • em and % — relative to a parent whose own rule is checked, so flagging
//     `.prose code { font-size: .86em }` would be flagging 15.05px as too small;
//   • comments are stripped first, or the text before a rule lands in the
//     reported selector and the failure names the wrong thing.
// Inside clamp()/min()/max() the SMALLEST absolute value decides — that is the
// size the label can actually reach.
export function inspectStylesheet(css, floorRem = FONT_SIZE_FLOOR_REM) {
  const problems = [];
  const screen = css.replace(/@media\s+print\s*\{[\s\S]*$/m, '').replace(/\/\*[\s\S]*?\*\//g, '');
  for (const [, selRaw, body] of screen.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const decl = body.match(/(?:^|;)\s*font-size\s*:\s*([^;]+)/);
    if (!decl) continue;
    const value = decl[1].trim();
    const sizes = [...value.matchAll(/(-?[\d.]+)(rem|px)\b/g)].map(([, n, unit]) =>
      unit === 'rem' ? Number(n) : Number(n) / 16
    );
    if (!sizes.length) continue;
    const smallest = Math.min(...sizes);
    if (smallest < floorRem) {
      const sel = selRaw.trim().replace(/\s+/g, ' ').slice(0, 60);
      problems.push(
        `${sel} sets font-size ${value} = ${(smallest * 16).toFixed(2)}px, under the ` +
          `${(floorRem * 16).toFixed(2)}px floor for a service label`
      );
    }
  }
  return { problems };
}

export function inspectRenderedPage(html, opts = {}) {
  const problems = [];
  const isRoadmap = opts.roadmap !== false && /class="roadmap prose"/.test(html);
  const css = opts.css || '';

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

  // ── 6. The progress bar is reserved in HTML, and its total is the truth ────
  // Two failures in one number: a bar built by script after paint shifts the
  // article down ~61 px, and an aria-valuemax that disagrees with the page makes
  // the announced progress a fiction. Both are invisible without this check.
  const milestones = (html.match(/<h3\b[^>]*\sdata-ms="/g) || []).length;
  const declared = html.match(/<span class="progress__bar"[^>]*aria-valuemax="(\d+)"/);
  if (milestones && !declared) {
    problems.push(`${milestones} milestones but no reserved progress bar — a bar inserted after paint pushes the article down`);
  } else if (declared && Number(declared[1]) !== milestones) {
    problems.push(`progress bar says ${declared[1]} milestones, the page has ${milestones} — the label rewrites itself after paint`);
  }

  // ── 7. The section outline survives without script ────────────────────────
  // It ships collapsed so nothing has to collapse it after paint; on desktop the
  // stylesheet forces the content visible. If either half goes, the page either
  // shifts again or (worse) shows no outline at all, and nothing else notices.
  const details = html.match(/<details class="toc__details"([^>]*)>/);
  if (details) {
    if (/\bopen\b/.test(details[1])) {
      problems.push('the section outline ships open — collapsing it after paint is what shifted the article ~340 px on mobile');
    }
    if (css && !/\.toc__details::details-content\s*{[^}]*content-visibility:\s*visible/.test(css)) {
      problems.push('the outline ships collapsed but the stylesheet does not force ::details-content visible — desktop would show no outline');
    }
  }

  return { problems };
}
