// ─────────────────────────────────────────────────────────────────────────────
// content-guard.mjs — border checks for content fetched from roadmap repos.
//
// Extracted so the same rules are used by the fetcher (scripts/fetch-content.mjs)
// and by the proof harness (scripts/check-guards.mjs) — a gate nobody can
// demonstrate firing is not a gate.
// ─────────────────────────────────────────────────────────────────────────────

// The two structural facts every roadmap page depends on. Losing either does not
// blank the page — it renders a full-looking page with the milestone format, the
// progress bar, the outline and the map links all silently gone.
export const MILESTONE_HEADING_RE = /^###\s+M\d+\.\d+/gm;
export const SECTION_HEADING_RE = /^##\s+§\d+/gm;

export function shapeOf(md) {
  return {
    milestones: (md.match(MILESTONE_HEADING_RE) || []).length,
    sections: (md.match(SECTION_HEADING_RE) || []).length
  };
}

// Executable markup. Patterns are anchored to tag/attribute context rather than
// to bare words, so ordinary prose ("JavaScript: The Good Parts", a sentence
// containing " once =") cannot trip the build.
export const UNSAFE_MARKUP = [
  ['<script> tag', /<script[\s>]/i],
  ['<iframe> tag', /<iframe[\s>]/i],
  ['<object> tag', /<object[\s>]/i],
  ['<embed> tag', /<embed[\s>]/i],
  ['<foreignObject> tag', /<foreignObject[\s>]/i],
  ['javascript: URL in an attribute', /(?:href|src|xlink:href)\s*=\s*["']?\s*javascript:/i],
  ['inline event handler', /<[a-z][a-z0-9-]*(?:\s[^>]*)?\son[a-z]+\s*=/i]
];

export function unsafeMarkupIn(text) {
  return UNSAFE_MARKUP.filter(([, re]) => re.test(text)).map(([name]) => name);
}

// Returns { problems, warnings, shape }. A non-empty `problems` means the payload
// must not cross the border; `warnings` are loud but never fail the build.
export function inspectReadme(text, roadmap = {}) {
  const problems = [];
  const warnings = [];

  for (const name of unsafeMarkupIn(text)) problems.push(`executable markup rejected: ${name}`);

  const shape = shapeOf(text);
  if (shape.milestones < 1) problems.push('parsed 0 milestone headings (expected "### M<n>.<n>")');
  if (shape.sections < 1) problems.push('parsed 0 section headings (expected "## §<n>")');

  // Drift against the declared count is a WARNING, never a failure: a roadmap PR
  // that legitimately adds milestones must not red the site build from a repo
  // whose author cannot edit this registry.
  if (shape.milestones >= 1 && roadmap.milestones && shape.milestones !== roadmap.milestones) {
    warnings.push(
      `milestone count drifted: README has ${shape.milestones}, registry declares ${roadmap.milestones}` +
        ` — update roadmaps.config.mjs and regenerate OG cards (node scripts/make-og.mjs)`
    );
  }

  return { problems, warnings, shape };
}

// The map SVG is inlined raw into the page, so it gets the same treatment.
export function inspectSvg(text) {
  return unsafeMarkupIn(text).map((name) => `executable markup rejected: ${name}`);
}
