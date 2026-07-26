#!/usr/bin/env python3
"""Form check for README.md — the shape proofstone.dev renders.

proofstone.dev renders this README directly: a push to main re-fetches it and
the site rebuilds within seconds. The checks that protect that render live in
the SITE's repository, which means they run after a merge — a pull request can
be green here, break the site the moment it lands, and the contributor never
sees it. This script moves those checks in front of the merge.

    python scripts/check_form.py                 # checks ../README.md
    python scripts/check_form.py path/to/file.md # checks that file instead
    python scripts/check_form.py --map other.svg # checks it against another map

Stdlib only, like scripts/render_map.py: nothing to install in CI, no lockfile
to age.

────────────────────────────────────────────────────────────────────────────
THREE RULES THIS FILE MUST KEEP.

1.  THE PATTERNS ARE COPIES, NOT OPINIONS.
    Every regex below is transcribed from the site's own code, and the source
    is named where it is used. If one drifts, this check goes green while the
    site build stays red — precisely the failure it exists to prevent. Change
    one only together with its original:
      proofstone.dev · scripts/content-guard.mjs   shape, executable markup
      proofstone.dev · scripts/check-build.mjs     STAR DISPLAY, MAP HOTSPOTS
      proofstone.dev · eleventy.config.mjs         markCriteria, SECTION_BOX_RE

2.  NO COUNTS.
    Nothing here asserts "33 milestones" or "3 flagships". The roadmap grows;
    a number baked into a check turns an honest contribution red and teaches
    people to edit the check. Only structure is asserted — the counts are
    printed as findings, never compared to a literal.

3.  THE WHOLE FILE, CODE FENCES INCLUDED.
    The markup patterns run over the raw text, because that is what the site
    matches. A fenced <script> example would be refused at the site's border
    too, so it is refused here as well: the two must agree, and agreement is
    the whole point of this file.
────────────────────────────────────────────────────────────────────────────
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

# A contributor on a Windows console gets cp866/cp1251 on a pipe, and the first
# heading quoted back at them contains "§" or "⭐" — which would end the run in
# UnicodeEncodeError instead of a verdict. UTF-8 with replacement can only ever
# cost a glyph, never the exit code.
for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8", errors="replace")
    except (AttributeError, ValueError):  # not a text stream / already closed
        pass


# --- patterns, copied from the site (rule 1) ---------------------------------

# content-guard.mjs:
#   export const SECTION_HEADING_RE   = /^##\s+§\d+/gm;
#   export const MILESTONE_HEADING_RE = /^###\s+M\d+\.\d+/gm;
# The site refuses a README that parses to zero of either: the page would still
# render, with the milestone format, the progress bar, the outline and the map
# links all silently gone.
SECTION_HEADING_RE = re.compile(r"^##\s+§\d+", re.M)
MILESTONE_HEADING_RE = re.compile(r"^###\s+M\d+\.\d+", re.M)

# The same section pattern with the heading captured, for the checks below. Its
# left half must stay character-for-character the site's, or the two disagree
# about what a section even is.
SECTION_LINE_RE = re.compile(r"^##\s+(§\d+.*)$", re.M)

# eleventy.config.mjs, enhanceHeadings: a section reaches the page outline — and
# therefore the map — only if its heading text parses as "§N — Title".
#   const m = text.match(/^§(\d+)\s*[—–-]\s*(.*)$/);
SECTION_TITLE_RE = re.compile(r"^§(\d+)\s*[—–-]\s*(.*)$")

# eleventy.config.mjs, SECTION_BOX_RE — how the site finds a section's clickable
# box: a <rect> immediately followed by the <text> carrying its "§N" label, with
# only <title>/<desc> allowed in between. Transcribed literally, including the
# tolerances that exist because the renderer lives in another repo (self-closing
# or paired <rect>, an optional <tspan> around the label). JS /gi → re.I here;
# Python needs no /g.
SECTION_BOX_RE = re.compile(
    r"<rect\b([^>]*?)(?:/>|>\s*</rect>)\s*"
    r"(?:<(?:title|desc)\b[^>]*>[\s\S]*?</(?:title|desc)>\s*)?"
    r"<text\b[^>]*>\s*(?:<tspan\b[^>]*>\s*)?§(\d+)",
    re.I,
)

# eleventy.config.mjs, numAttr: geometry is read with a pattern that accepts
# digits and a dot and nothing else, and a box whose x/y/width/height it cannot
# read is dropped from the map — so here it counts as no box at all.
#   const m = attrs.match(new RegExp(`\\b${name}\\s*=\\s*["']([\\d.]+)["']`, 'i'));
BOX_GEOMETRY = ("x", "y", "width", "height")

# check-build.mjs, STAR DISPLAY: a flagship is a milestone heading carrying the
# star marker — /^###\s+M\d+\.\d+.*[⭐★].*$/gm.
STARRED_MILESTONE_RE = re.compile(r"^###\s+M\d+\.\d+.*[⭐★].*$", re.M)

# eleventy.config.mjs, markCriteria: the site tags the blockquote whose first
# paragraph opens with <strong>You're done when</strong>, and that tag is what
# draws the stamp. Matched literally there, so matched literally here —
# capitalisation and a straight apostrophe included.
# " {0,3}" is markdown's own rule: three spaces still open a quote, a fourth
# makes it a code block. Without it this check would red an indented but
# perfectly valid criterion.
CRITERION_RE = re.compile(r"^ {0,3}>\s*\*\*You're done when\*\*")
# Not a site pattern: a near miss, kept only to say WHICH character is wrong
# instead of "not a criterion block".
CRITERION_NEARLY_RE = re.compile(r"^ {0,3}>\s*\*\*\s*you\s*['’‘]\s*re\s+done\s+when\s*\*\*", re.I)
QUOTE_OPEN_RE = re.compile(r"^ {0,3}>")

# content-guard.mjs, UNSAFE_MARKUP — transcribed one for one, same order, same
# case-insensitivity. Anchored to tag/attribute context rather than bare words,
# so ordinary prose ("JavaScript: The Good Parts", a sentence containing " once
# =") cannot trip it. The only translation is JS /…/i → Python re.I; \s differs
# between the engines in exotic code points that cannot occur inside a tag name.
UNSAFE_MARKUP = [
    ("<script> tag", re.compile(r"<script[\s>]", re.I)),
    ("<iframe> tag", re.compile(r"<iframe[\s>]", re.I)),
    ("<object> tag", re.compile(r"<object[\s>]", re.I)),
    ("<embed> tag", re.compile(r"<embed[\s>]", re.I)),
    ("<foreignObject> tag", re.compile(r"<foreignObject[\s>]", re.I)),
    ("javascript: URL in an attribute",
     re.compile(r"""(?:href|src|xlink:href)\s*=\s*["']?\s*javascript:""", re.I)),
    ("inline event handler", re.compile(r"<[a-z][a-z0-9-]*(?:\s[^>]*)?\son[a-z]+\s*=", re.I)),
]


# --- reporting ---------------------------------------------------------------

class Report:
    """Prints as it goes, in the site's own check style: a headline per rule,
    then either one finding line or the failures with why-and-fix under each."""

    def __init__(self) -> None:
        self.failed = 0
        self.passed = 0

    def rule(self, title: str, claim: str) -> None:
        print(f"\n{title} — {claim}")

    def ok(self, detail: str) -> None:
        self.passed += 1
        print(f"  ok    {detail}")

    def bad(self, what: str, why: str, fix: str) -> None:
        self.failed += 1
        print(f"  FAIL  {what}")
        print(f"        why: {why}")
        print(f"        fix: {fix}")

    def note(self, detail: str) -> None:
        """Loud, never fatal — for drift the site tolerates. Failing on it would
        red an honest pull request over something the site renders fine."""
        print(f"  note  {detail}")


def lineno(text: str, pos: int) -> int:
    return text.count("\n", 0, pos) + 1


def quote(line: str, width: int = 78) -> str:
    line = line.strip()
    return line if len(line) <= width else line[: width - 1] + "…"


# --- rule 1: the two structural facts the site parses ------------------------

def check_shape(text: str, r: Report) -> None:
    r.rule("SHAPE", "the site parses sections and milestones out of this file")
    sections = len(SECTION_HEADING_RE.findall(text))
    milestones = len(MILESTONE_HEADING_RE.findall(text))

    if not sections:
        r.bad(
            "no section headings",
            "the site refuses a README that parses to zero sections — it would render "
            "a full-looking page with the outline and every map link gone",
            'give each section an "## §<n> — Title" heading',
        )
    if not milestones:
        r.bad(
            "no milestone headings",
            "the site refuses a README that parses to zero milestones — the format, the "
            "progress bar and the checkboxes all hang off them",
            'give each milestone a "### M<n>.<n> — Title" heading',
        )
    if sections and milestones:
        r.ok(f"{sections} section heading(s), {milestones} milestone heading(s)")


# --- rule 2: a flagship keeps the block that draws its stamp -----------------

def check_flagship_criteria(text: str, r: Report) -> None:
    r.rule("FLAGSHIP CRITERION", "every starred milestone keeps the block that stamps it")
    before = r.failed
    lines = text.splitlines()
    starred = list(STARRED_MILESTONE_RE.finditer(text))

    for m in starred:
        n = lineno(text, m.start())          # 1-based
        heading = quote(m.group(0))
        # The site strips the star out of the heading and lets the FLAGSHIP stamp
        # on the criterion block carry the meaning. That stamp is drawn by an
        # adjacent-sibling CSS rule (.ps-ms-h.is-star + .ps-criterion), so only
        # blank lines may sit between heading and quote — a paragraph, an image
        # or an HTML comment in between is a sibling element, the rule stops
        # matching, and the flagship silently renders as an ordinary milestone.
        i = n  # index of the line after the heading
        while i < len(lines) and not lines[i].strip():
            i += 1
        following = lines[i] if i < len(lines) else ""

        if CRITERION_RE.match(following):
            continue
        if CRITERION_NEARLY_RE.match(following):
            r.bad(
                f"line {n}: {heading}",
                'the criterion is matched literally by the site — "**You\'re done when**" '
                "with a straight apostrophe and this capitalisation; the line here differs "
                f"({quote(following, 60)})",
                "type the marker exactly: > **You're done when** …",
            )
        elif QUOTE_OPEN_RE.match(following):
            r.bad(
                f"line {n}: {heading}",
                "the block under this flagship is a quote that does not open with the "
                f"criterion marker ({quote(following, 60)}), so the site tags it as ordinary "
                "prose and no stamp is drawn at all",
                'open the quote with "**You\'re done when**" and put any other note after it',
            )
        else:
            r.bad(
                f"line {n}: {heading}",
                "the site strips the star out of the heading and lets the gold FLAGSHIP "
                "stamp on this quote say it instead — and that stamp is drawn by an "
                "adjacent-sibling rule, so a criterion that is missing, or separated from "
                "the heading by anything but blank lines, loses its only marker and the "
                "milestone renders as an ordinary one (verified on a built page, "
                "2026-07-26)",
                "put the criterion quote directly under the heading, one blank line "
                "between: > **You're done when** …",
            )

    if starred and r.failed == before:
        r.ok(f"{len(starred)} flagship milestone(s), each followed by its criterion")
    elif not starred:
        # Not a failure: a roadmap is allowed to have no flagship. Said out loud
        # because silence here would read as "checked and fine".
        r.ok("no starred milestones in this file — nothing to stamp")


# --- rule 3: executable markup ----------------------------------------------

def check_markup(text: str, r: Report) -> None:
    r.rule("EXECUTABLE MARKUP", "refused here, exactly as the site refuses it at its border")
    hits = 0
    for name, pattern in UNSAFE_MARKUP:
        m = pattern.search(text)
        if not m:
            continue
        hits += 1
        n = lineno(text, m.start())
        r.bad(
            f"line {n}: {name} — {quote(m.group(0), 40)}",
            "raw HTML in this README is rendered verbatim into the page, so the site "
            "rejects the whole file at its border and keeps serving the previous copy",
            "drop the markup; a code example still counts — the site does not exempt fences either",
        )
    if not hits:
        r.ok(f"none of the {len(UNSAFE_MARKUP)} rejected patterns present")


# --- rule 5: every section the site puts in the outline has a box in the map --

def map_section_numbers(svg: str) -> list[str]:
    """The §-numbers the site would actually turn into hotspots — its own parser,
    its own tolerances, including dropping a box whose geometry it cannot read."""
    found = []
    for attrs, num in SECTION_BOX_RE.findall(svg):
        if all(re.search(rf"\b{name}\s*=\s*[\"']([\d.]+)[\"']", attrs, re.I)
               for name in BOX_GEOMETRY):
            found.append(num)
    return found


def check_map_coverage(text: str, map_path: Path, r: Report) -> None:
    r.rule("MAP COVERAGE", "every §-section reaches the outline and has a box in the map")
    before = r.failed

    headings = [(lineno(text, m.start()), m.group(1).strip())
                for m in SECTION_LINE_RE.finditer(text)]
    if not headings:
        r.ok("no §-sections in this file — nothing to cover")
        return

    # A heading the site cannot parse never enters the outline, so its box is
    # never linked either. Both counts drop together and the site's own coverage
    # check stays green — the section just quietly stops existing on the page.
    wanted: list[tuple[int, str, str]] = []
    for n, heading in headings:
        m = SECTION_TITLE_RE.match(heading)
        if m:
            wanted.append((n, heading, m.group(1)))
        else:
            r.bad(
                f"line {n}: {quote(heading)}",
                "the site reads section headings as \"§<n> — Title\"; this one does not "
                "parse, so the section is dropped from the page outline and its box in "
                "the map is left unlinked — silently, with a green build",
                "write the heading as: ## §<n> — Title (an em dash, en dash or hyphen)",
            )

    if not map_path.is_file():
        r.bad(
            f"no map at {map_path}",
            "the site builds the interactive map from this file; without it the roadmap "
            "page renders no map figure at all and the site build stops",
            "generate it: python scripts/render_map.py",
        )
        return

    in_map = map_section_numbers(map_path.read_text(encoding="utf-8"))
    for n, heading, num in wanted:
        if num in in_map:
            continue
        r.bad(
            f"line {n}: {quote(heading)}",
            "the site draws one clickable box per §-section and asserts it found one for "
            "each; a section with no node in the map fails the site build "
            f"(\"{len(in_map)} hotspots for {len(wanted)} sections\") and stops the deploy "
            "for every roadmap in the series, minutes after this merge",
            "a new section needs a map node — add it to SECTIONS (and EDGES) in "
            "scripts/render_map.py, then re-run: python scripts/render_map.py",
        )

    # The other direction is not a failure: a box whose section is gone from the
    # README simply goes unlinked, and the site builds. Said out loud anyway —
    # it means the map is drawing a section the roadmap no longer has.
    orphans = [num for num in in_map if num not in {w[2] for w in wanted}]
    for num in sorted(set(orphans), key=int):
        r.note(f"§{num} has a node in {map_path.name} but no section in this README — "
               f"the box will render unlinked; drop it from SECTIONS/EDGES if the section is gone")

    if r.failed == before:
        r.ok(f"{len(wanted)} §-section(s), each with a box in {map_path.name}")


# --- main --------------------------------------------------------------------

def main() -> int:
    ap = argparse.ArgumentParser(
        description="Check README.md against the form proofstone.dev renders.")
    ap.add_argument("readme", nargs="?", default=None,
                    help="path to the file to check (default: README.md next to this repo's root)")
    ap.add_argument("--map", dest="map", default=None,
                    help="path to the map SVG (default: assets/roadmap.svg beside the README)")
    args = ap.parse_args()

    # Resolved against this file, never the working directory — like render_map.py,
    # so the check cannot be made to pass by running it from somewhere else.
    path = Path(args.readme) if args.readme else Path(__file__).resolve().parent.parent / "README.md"
    if not path.is_file():
        print(f"check_form: no such file: {path}", file=sys.stderr)
        return 2
    map_path = Path(args.map) if args.map else path.resolve().parent / "assets" / "roadmap.svg"

    text = path.read_text(encoding="utf-8")
    print(f"FORM CHECK — {path.name} ({len(text)} bytes)")

    r = Report()
    check_shape(text, r)
    check_flagship_criteria(text, r)
    check_markup(text, r)
    check_map_coverage(text, map_path, r)

    print()
    if r.failed:
        print(f"check_form: {r.failed} problem(s). This README would break proofstone.dev.")
        print("See CONTRIBUTING.md for the milestone format.")
        return 1
    print(f"check_form: {r.passed} check(s) passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
