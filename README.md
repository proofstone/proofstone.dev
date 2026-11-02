# proofstone.dev

**Live at [proofstone.dev](https://proofstone.dev).**

The site of the **proofstone** community: engineering roadmaps where every node is a
milestone you can *prove* you passed (an artifact), not a keyword — and a map of the
professions those roadmaps lead to.

**The roadmap repositories are the source of truth. This repo is the render layer.**
Each roadmap's `README.md` is fetched at build time and rendered into a page. You
contribute to the *content* by opening a pull request on a roadmap's own repo; the
site rebuilds itself.

Static site: [Eleventy](https://www.11ty.dev/) → GitHub Pages. No backend, no CMS,
no tracking, no cookies.

## What is on the site

- `/` — the manifesto, and six doors; two are open today (`/become/`, `/projects/`),
  the rest stay shut until they have content.
- `/become/` — professions as maps, on three floors of the same card:
  **areas** (`/become/<area>/`) → **directions** (`/become/<area>/<direction>/`) →
  **professions**. A profession with a live roadmap links to its page. A planned
  one is a card without a link — an *open shelf*: the owner or a contributor brings
  the map, and the card becomes a link the day the map is live. Every card says, up
  front, what you need before you start.
- `/<roadmap-slug>/` — a roadmap rendered from its repository's README, with its map.
- `/projects/` — build-your-own labs.

Honest navigation is the one rule every floor shares: nothing links to a page that
does not exist yet, and a shelf (an area or a direction) with nothing on it gets no
page. `npm run build` asserts both.

## Run locally

```
npm install
npm run dev          # fetches roadmap content, then serves at http://localhost:8080
```

Offline (use already-fetched content in `.content/`):

```
npm run dev:offline
```

Build for production into `_site/`:

```
npm run build        # SITE_NOINDEX defaults to "true" locally; production sets it to "false"
```

## Connect a new roadmap (target: a few minutes)

1. Add one entry to [`roadmaps.config.mjs`](roadmaps.config.mjs) — `slug`, `repo`,
   `branch`, `title`, `tagline`, `status: 'live'`, and its shelf on `/become/`:
   `area` plus `direction` (the slugs declared in
   [`src/_data/areas.js`](src/_data/areas.js); an area that has not named its
   directions takes `area` alone). A map without a shelf fails the build.
   (`slug` = repo name without the `-roadmap` suffix. Milestone count is read
   from the README automatically.)
2. Nothing else to write — the fetch step is generic.
3. In the roadmap's repo, add [`docs/notify-site.yml.tmpl`](docs/notify-site.yml.tmpl)
   as `.github/workflows/notify-site.yml` so content edits trigger a site rebuild.
   The token it needs lives as an **organization** secret (see *How content stays in
   sync* below), so a public roadmap repo needs nothing else. A repo still private
   for its practitioner review needs its own copy of the secret — on the Free plan
   org secrets reach public repositories only.
4. In the roadmap's repo, add [`docs/check_form.py`](docs/check_form.py) as
   `scripts/check_form.py` and the job in
   [`docs/checks-form-job.yml.tmpl`](docs/checks-form-job.yml.tmpl) to its checks
   workflow. Both files are identical in every roadmap repo. Without them the
   rules below run only here, after a merge: a contributor's pull request can be
   green in their repo and break this build the moment it lands.
5. Generate its social card: `npm run og`, then commit the new PNG **and**
   `og-manifest.json`. Skipping this ships a page whose `og:image` 404s, and the
   build refuses to pass without a card for every registered roadmap.
6. Commit and push — the site build fetches and renders it.

## Add a profession (an open shelf)

A profession that has no roadmap yet is still worth a card: it tells a reader the
profession exists here, and tells a contributor where a map is wanted. Add one entry
to [`src/_data/professions.js`](src/_data/professions.js):

```js
{
  slug: 'kernel-engineer',              // the future page's address
  title: 'Kernel engineer',
  desc: 'One sentence: what this profession builds.',
  stack: ['C', 'Rust', 'Linux kernel'],  // or `path: [...]` — the courses, in order
  requires: 'you already write C',       // the entry condition; null = from zero
  status: 'planned',
  area: 'software-engineering',          // a slug from src/_data/areas.js
  direction: 'systems-desktop'           // required when the area names directions
}
```

What the build enforces: the shelf must exist (an unknown `area` or `direction`
fails the build), a planned card is never a link, and the numbers on every floor
are computed — nothing is typed into a template. A profession lives on exactly one
shelf: if it pulls two ways, it is two professions.

When the roadmap exists, the profession moves from this file to
`roadmaps.config.mjs` (step 1 above) and the card opens.

## Add a direction or an area

The shelves are declared in [`src/_data/areas.js`](src/_data/areas.js), in display
order. A direction may be declared before its first map: it shows as a card that
says "no map yet" and opens with its first profession. An area that has not named
its directions shows its professions directly; name them when there are enough maps
to split. Retiring an address (a direction that moves) keeps a forwarding stub —
see `src/become-retired-*.njk` and the REDIRECTS assertion.

## How content stays in sync

The build (`.github/workflows/build-deploy.yml`) runs on: a push here · a
`repository_dispatch` fired by a roadmap repo when its README/assets change · a
nightly schedule (safety net) · manual dispatch. Each run re-fetches every live
roadmap, so a content edit lands on the site with no manual steps.

The dispatch needs a credential GitHub does not hand out to a workflow: a job's
built-in `GITHUB_TOKEN` is scoped to its own repository and cannot fire an event
in another one. So the roadmap repos authenticate with a fine-grained PAT scoped
to **this** repo with `Contents: read & write`, stored as the organization secret
`PROOFSTONE_DISPATCH_TOKEN`. Org-level rather than per-repo on purpose: the same
token was once present in exactly one of four repositories, and the other three
had a dead sync nobody could see.

**The two ways this quietly breaks, and what now says so out loud:**

- *The secret is missing* — the notifier fails the run with a named error instead
  of skipping. A silent skip was tried first and is precisely how three repos ran
  green with no sync at all.
- *The PAT expires* — every authenticated response carries a
  `github-authentication-token-expiration` header, so the notifier prints the
  remaining days and raises a workflow warning under three weeks.

Neither failure loses content: the nightly schedule still re-fetches everything,
so the worst case is an edit landing up to 24h late rather than in seconds.

## noindex / launch

The site ships with `<meta name="robots" content="noindex, nofollow">` on every page
while `SITE_NOINDEX` is unset or `"true"`. robots.txt intentionally allows crawling
so the noindex tag is seen. `/404.html` keeps its noindex unconditionally and
declares no canonical, so launching never turns the error page into an indexable
soft-404.

Launching is three steps, not one — **changing the repository variable starts no
build by itself**, so the flip only reaches visitors once a run happens:

1. Set the repository variable `SITE_NOINDEX` to `false`
   (Settings → Secrets and variables → Actions → Variables).
2. Run the workflow: Actions → **build-deploy** → **Run workflow** on `main`.
   Without this the change lands whenever the nightly build next runs — up to ~24h later.
3. Confirm what actually shipped: `npm run verify:live`.
   It walks the sitemap and asserts noindex is gone where it should be, still
   present on `/404.html`, robots.txt now advertises the sitemap, and every social
   card is reachable **and** numerically matches its page.

This site launched on 2026-07-28, so the launched posture is what `verify:live`
expects with no flags — an instrument whose default disagrees with production is
one that reports five failures for the sole reason that the launch worked, and
gets ignored accordingly. `npm run verify:live -- --prelaunch` asserts the other
posture: use it before a first launch, or after deliberately pulling a site out
of the index by setting `SITE_NOINDEX` back to `true` and re-running the workflow.

## Structure

```
roadmaps.config.mjs       # roadmap registry (single source of truth for the site)
src/_data/areas.js        # the shelves of /become/: areas and their directions, in display order
src/_data/professions.js  # professions without a map yet — the open shelves
src/_data/becomeTree.js   # builds the /become/ tree from the three sources; a card without a shelf fails the build
eleventy.config.mjs       # markdown render: GitHub-compatible anchors, link rewrite,
                          #   milestone/criterion tagging, §-section outline; structured data
scripts/fetch-content.mjs # fetch-at-build: README + assets per live roadmap → .content/
scripts/content-guard.mjs # border checks applied to fetched content (shape, markup)
scripts/star-guard.mjs    # how a flagship milestone is allowed to render
scripts/a11y-guard.mjs    # accessibility and layout-stability rules over every built page
scripts/palette-guard.mjs # one source of colour, and the files that must mirror it
scripts/map-type-guard.mjs # the type floor inside the SVG maps
scripts/become-guard.mjs  # the /become/ tree: a card is a link only when a page is behind it
scripts/escape-guard.mjs  # text is escaped exactly once
scripts/check-build.mjs   # post-build assertions over _site (runs inside `npm run build`)
scripts/check-guards.mjs  # proves every guard still rejects what it must
scripts/check-links.mjs   # external link check (advisory, never blocks a deploy)
scripts/verify-live.mjs   # asserts what production actually serves after a deploy
scripts/make-og.mjs       # dev-only: render the 1200×630 social cards + og-manifest.json
scripts/screenshots.mjs   # dev-only visual QA (both themes + mobile)
scripts/make-icons.mjs    # dev-only: rasterise the SVG mark into PNG icon fallbacks
src/                      # templates, data, assets (css/js/icons)
docs/notify-site.yml.tmpl # drop-in workflow for a roadmap repo
docs/check_form.py        # the form check a roadmap repo runs on its own pull requests
docs/checks-form-job.yml.tmpl # the CI job that runs it there
```

The three `dev-only` scripts (`make-og`, `screenshots`, `make-icons`) drive the
**system Chrome** through `playwright-core` (a devDependency; no browser download,
not part of the production build).

## Checks

`npm run build` ends in `scripts/check-build.mjs`: deterministic, offline assertions
over `_site`, so they also guard the autonomous rebuilds fired by roadmap repos.
Today they are: in-page anchors resolve · no duplicate ids · internal links exist ·
every map section is clickable · print redefines every map token · the map ships
inline only · each map declares how it paints · flagship stamps replace the emoji
and lose nothing · the home states the manifesto and opens only real doors · the
`/become/` tree opens only real doors and every floor is reachable · text is
escaped exactly once · JSON-LD is valid and correctly branched · the sitemap is
well-formed · every retired address forwards to a built page · accessibility
(named landmarks, no silent tab stops, reachable scroll regions) · no label under
the type floor · one source of colour · no private repo is linked · the noindex
posture matches `SITE_NOINDEX`.

`npm run check:guards` proves each guard still rejects the payloads it exists for,
with a healthy payload that must still pass. `npm run check:links` probes external
links and is advisory by design — third-party rate limits must never block a
content deploy. `npm run verify:live` asserts what production actually serves
after a deploy: the posture, the retired addresses, the social cards, the
stylesheet's markers.

## License

Site code: MIT. Each roadmap's content is licensed in its own repository.
