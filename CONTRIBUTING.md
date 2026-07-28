# Contributing to proofstone.dev

This repository is the **render layer**. The roadmaps themselves live in their own
repositories and are fetched at build time, so almost every change divides cleanly
into one of two places — and putting it in the wrong one is the only way to waste
your afternoon here.

## Where your change belongs

| You want to change | Open the pull request in |
|---|---|
| a milestone, a resource, the wording of a roadmap, the data behind its map | that roadmap's repo — it has its own `CONTRIBUTING.md` and issue templates |
| the site: templates, CSS, JS, build scripts, guards, docs | **here** |

The roadmaps:
[ai-safety-engineer-roadmap](https://github.com/proofstone/ai-safety-engineer-roadmap) ·
[distributed-systems-engineer-roadmap](https://github.com/proofstone/distributed-systems-engineer-roadmap) ·
[applied-cryptography-roadmap](https://github.com/proofstone/applied-cryptography-roadmap)

A roadmap's README is the source of truth for its content, and this repo never
edits it. Several rules below exist to keep that true.

## Run it locally

```
npm install
npm run dev          # fetch the roadmaps, then serve http://localhost:8080
npm run dev:offline  # reuse whatever is already in .content/ — no network
npm run build        # production build into _site/, assertions included
npm run check        # the guard harness, then the post-build assertions
```

Node 22, which is what CI uses; CI installs with `npm ci`. Nothing else to set up —
there is no database, no CMS and no API key. `npm run build` fetches each live
roadmap's README over the network; if that fails it falls back to the cached copy
in `.content/` and says so.

Order matters for `npm run check`: it asserts things about `_site`, so build first.

## What runs on your pull request

`.github/workflows/check.yml`: `npm ci` → `npm run check:guards` → `npm run build`
→ `npm run check:links`. The link check is **advisory** and marked
`continue-on-error` on purpose — third-party servers rate-limit and bot-block, and
a stranger's flaky host must never hold a content deploy hostage. Everything else
is a gate.

## The rules

**1. Guards are not weakened.** `npm run build` ends in a list of assertions about
the built site, and `npm run check:guards` proves those guards still reject what
they are meant to reject. If one blocks your change, the guard is the thing to
discuss, not the thing to edit. A pull request that relaxes an assertion needs to
say, in the description, what it is now allowed to ship.

**2. A new guard is demonstrated firing.** Add the rule to a module the harness can
import, then add poisoned cases to `scripts/check-guards.mjs`: one payload per
failure mode, plus a healthy payload that must still pass. The healthy case is not
a formality — it is what keeps a guard from being tightened into a false positive.
A gate nobody has seen reject anything is a decoration.

Some of these rules are mirrored in the roadmap repositories, so a contributor
there learns about a problem before merging instead of after. That mirror is
[`docs/check_form.py`](docs/check_form.py); its patterns are transcribed from
`scripts/content-guard.mjs`, `scripts/star-guard.mjs` and `eleventy.config.mjs`,
each with its origin named at the point of use. Change a rule in one of those
files and the copy is part of the same change — otherwise the roadmap CI goes
green while this build goes red, which is the failure it exists to prevent.

**3. Accessibility is asserted, not reviewed.** `scripts/a11y-guard.mjs` runs over
every built page and refuses, among others: focusable elements hidden from
assistive tech, unnamed `<nav>` landmarks, scroll containers (tables, `<pre>`, the
map) that only a mouse can reach, and map hotspots named by number alone. Two of
its rules exist for layout stability rather than semantics — the progress bar must
be reserved in the markup, and the section outline must ship collapsed with the
stylesheet forcing `::details-content` visible on desktop. Both encode a measured
layout shift; defeating them re-introduces it.

**4. One third-party request, and it was a decision.** Fonts, styles, scripts,
icons and the maps are all served from this origin. The single external byte is
the cookieless analytics beacon in `src/_includes/base.njk`. Adding a second host —
a CDN, a webfont service, an embed — is a decision to raise in an issue first, not
a detail of an implementation pull request.

**5. Print is part of the design.** The `@media print` block at the end of
`src/assets/styles.css` re-inks the page for paper. A map paints entirely from
`--map-*` custom properties, so a new one of those must be redefined inside that
block or the map prints as a black rectangle — asserted by the PRINT TOKENS guard,
because the failure is invisible in the browser.

**6. Reader state is not renamed.** Milestone progress lives in `localStorage`
under `proofstone:progress:<slug>:<M>`. Live readers have checkmarks under those
keys; renaming or versioning them silently wipes someone's progress.

**7. `noindex` stays as it is.** The site ships `noindex` until launch, driven by
the `SITE_NOINDEX` repository variable. Launching is a deliberate, separate act —
not a side effect of a pull request.

## Opening the pull request

- Say what you **measured**, not what you expect. "CLS 0.0008 worst of three runs
  at CPU ×6" beats "should not shift".
- Visual changes: screenshots in both themes. The site has a light and a dark
  personality and they are not the same design.
- Keep the diff to one subject. Two subjects are two pull requests.

Facts only in review comments — no need for pleasantries.
