// ─────────────────────────────────────────────────────────────────────────────
// palette-guard.mjs — the palette has exactly one home.
//
// Written after the Stone repaint, which found FIVE places where a colour was
// baked in as a literal and therefore could not be reached by changing a token:
// the map's hover/focus wash, the header mark, favicon.svg, the OG generator and
// verify-live's own assertions. Three of the five were fixed by routing through
// var(). The two that CANNOT be are pinned here instead:
//
//   • favicon.svg is painted by browser chrome, outside any page that could
//     supply a custom property;
//   • the OG card is rendered standalone by a headless browser, which never sees
//     the stylesheet.
//
// Copies are allowed. Copies nobody checks are how a repaint ships half done.
//
// Pure functions over text, no filesystem: check-build runs them on the built
// site, check-guards runs them on poisoned payloads to prove they refuse.
// ─────────────────────────────────────────────────────────────────────────────

// Read a token out of a SPECIFIC block. The two themes' values differ only by
// which selector holds them, so a search over the whole file would happily
// return the wrong theme's colour and call it a match.
//
// Since the graphite wave the DEFAULT theme is the dark one, and a default theme
// has no attribute to hang a block on: its values live in :root, and the only
// override in the file is the light theme a reader picks. So a dark read prefers
// [data-theme="dark"] and falls back to :root when the stylesheet has no such
// block. That is not a loosening — the values it then reads are the ones the
// site actually paints in the dark, which is exactly what the mirrored files
// (favicon, OG card) have to copy. The poisoned fixtures in check-guards.mjs do
// carry both blocks, so the case that proves light and dark are not
// interchangeable still fires against a file where the distinction exists.
export function readToken(css, name, theme = 'light') {
  // Print is cut off first. It repaints every token to pure black and white for
  // paper, and it does so through a selector LIST that names both themes — so a
  // search for a theme's block would find the print one and report that a
  // mirrored file "is not" #fff. Neither the favicon nor the OG card is ever
  // printed; screen is the only medium either of them can be in.
  const screen = css.replace(/@media\s+print\s*\{[\s\S]*$/m, '');
  const dark = '[data-theme="dark"] {';
  const marker = theme === 'dark' && screen.includes(dark) ? dark : ':root {';
  const at = screen.indexOf(marker);
  if (at < 0) return null;
  const m = screen.slice(at).match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{3,8})`));
  return m ? m[1].toLowerCase() : null;
}

// Everything that is allowed to hold a colour is BLANKED, and whatever hex is
// still standing afterwards is the finding. Blanking preserves newlines so a
// reported line number keeps pointing at the right line.
//
// Blanked, and why:
//   • comments — they are full of measured hexes (the pre-wave-A blue, the 1.2:1
//     print regression). Flagging those would train everyone to ignore the check,
//     which is worse than not having it;
//   • custom-property declarations — this is the one place a colour belongs;
//   • @media print — it deliberately repaints to pure black and white for paper.
//
// The declaration match is on the DECLARATION, not on the line. An earlier draft
// tested whole lines against `^\s*(--token: value;)+$`, which passed the shipped
// file only because its no-JS fallback branch happens to put the selector on its
// own line: writing `:root { --accent: #005ab8; }` on one line was reported as a
// stray literal. A guard that depends on where someone pressed Enter is a guard
// that will be switched off.
export function strayLiterals(css) {
  const blank = (m) => m.replace(/[^\n]/g, ' ');
  let text = css.replace(/\/\*[\s\S]*?\*\//g, blank);
  const printAt = text.indexOf('@media print');
  if (printAt > 0) text = text.slice(0, printAt) + blank(text.slice(printAt));
  // Token names carry digits (--surface-2), so the class needs 0-9.
  text = text.replace(/--[a-z0-9-]+\s*:\s*[^;}]*/g, blank);

  const out = [];
  text.split('\n').forEach((line, i) => {
    if (/#[0-9a-fA-F]{3,8}\b/.test(line)) {
      out.push(`line ${i + 1}: ${css.split('\n')[i].trim().slice(0, 90)}`);
    }
  });
  return out;
}

// The four dark-theme values make-og.mjs has to copy. Named here rather than in
// the caller so the guard and its demonstration cannot disagree about the list.
export const OG_MIRRORED = [
  ['BG', 'bg'],
  ['TEXT', 'text'],
  ['ACCENT', 'accent'],
  ['MUTED', 'muted']
];

// Fonts nobody asked for. Written because the Stone wave shipped exactly this
// defect for one build: the display serif's @font-face and both <link rel=preload>
// tags were removed, and the two 26 KB woff2 files stayed on disk. The whole
// assets directory is a passthrough copy, so the deploy got BIGGER — 631.0 KiB
// against 622.8 before — while every visible sign said the family was gone. Only
// weighing the output caught it, and only because someone thought to weigh it.
//
// Both directions matter and both are cheap:
//   • a face in the bundle that no @font-face names is dead weight;
//   • a face an @font-face names that is not in the bundle is a silent fallback,
//     which is worse — the page still renders, in the wrong typeface.
export function inspectFonts({ css, bundled }) {
  const problems = [];
  const declared = new Set(
    [...String(css).matchAll(/url\(\s*['"]?([^'")]*?([a-z0-9-]+\.woff2))/gi)].map((m) => m[2])
  );
  const present = new Set(bundled.filter((f) => f.endsWith('.woff2')));
  for (const f of present) if (!declared.has(f)) problems.push(`${f} is in the bundle but no @font-face names it`);
  for (const f of declared) if (!present.has(f)) problems.push(`@font-face names ${f} but it is not in the bundle`);
  return { problems, declared: [...declared].sort(), present: [...present].sort() };
}

export function inspectPalette({ css, favicon, ogSource }) {
  const problems = [];
  if (!css) return { problems: ['no stylesheet to check'], tokens: {} };

  const tokens = {
    accent: readToken(css, 'accent', 'light'),
    onAccent: readToken(css, 'on-accent', 'light')
  };

  for (const s of strayLiterals(css)) problems.push(`colour literal outside the token block — ${s}`);

  if (favicon !== undefined) {
    if (!tokens.accent || !tokens.onAccent) problems.push('cannot read --accent / --on-accent from :root');
    else {
      const f = String(favicon).toLowerCase();
      if (!f.includes(tokens.accent)) problems.push(`favicon.svg badge is not --accent ${tokens.accent}`);
      if (!f.includes(tokens.onAccent)) problems.push(`favicon.svg glyph is not --on-accent ${tokens.onAccent}`);
    }
  }

  if (ogSource !== undefined) {
    for (const [constName, tokenName] of OG_MIRRORED) {
      const m = String(ogSource).match(new RegExp(`const ${constName} = '(#[0-9a-fA-F]{3,8})'`));
      const want = readToken(css, tokenName, 'dark');
      if (!want) problems.push(`cannot read --${tokenName} from the dark block`);
      else if (!m) problems.push(`make-og.mjs has no ${constName} literal to compare`);
      else if (m[1].toLowerCase() !== want) problems.push(`make-og.mjs ${constName} is ${m[1]}, --${tokenName} (dark) is ${want}`);
    }
  }

  return { problems, tokens };
}
