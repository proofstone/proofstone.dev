# proofstone.dev

**Live at [proofstone.dev](https://proofstone.dev)** *(noindex, pre-launch)*

The umbrella site for the **proofstone** engineering roadmaps — roadmaps where every
node is a milestone you can *prove* you passed (an artifact), not a keyword.

**The roadmap repositories are the source of truth. This repo is the render layer.**
Each roadmap's `README.md` is fetched at build time and rendered into a page. You
contribute to the *content* by opening a pull request on a roadmap's own repo; the
site rebuilds itself.

Static site: [Eleventy](https://www.11ty.dev/) → GitHub Pages. No backend, no CMS,
no tracking, no cookies.

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
npm run build        # SITE_NOINDEX defaults to "true" (pre-launch)
```

## Connect a new roadmap (target: a few minutes)

1. Add one entry to [`roadmaps.config.mjs`](roadmaps.config.mjs) — `slug`, `repo`,
   `branch`, `title`, `tagline`, `status: 'live'`. (`slug` = repo name without the
   `-roadmap` suffix. Milestone count is read from the README automatically.)
2. Nothing else to write — the fetch step is generic.
3. In the roadmap's repo, add [`docs/notify-site.yml.tmpl`](docs/notify-site.yml.tmpl)
   as `.github/workflows/notify-site.yml` so content edits trigger a site rebuild.
4. Generate its social card: `npm run og`, then commit the new PNG **and**
   `og-manifest.json`. Skipping this ships a page whose `og:image` 404s, and the
   build refuses to pass without a card for every registered roadmap.
5. Commit and push — the site build fetches and renders it.

## How content stays in sync

The build (`.github/workflows/build-deploy.yml`) runs on: a push here · a
`repository_dispatch` fired by a roadmap repo when its README/assets change · a
nightly schedule (safety net) · manual dispatch. Each run re-fetches every live
roadmap, so a content edit lands on the site with no manual steps.

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
3. Confirm what actually shipped: `npm run verify:live -- --launched`.
   It walks the sitemap and asserts noindex is gone where it should be, still
   present on `/404.html`, robots.txt now advertises the sitemap, and every social
   card is reachable **and** numerically matches its page.

Before launch, the same script with no flag asserts the pre-launch posture.

## Structure

```
roadmaps.config.mjs       # roadmap registry (single source of truth for the site)
eleventy.config.mjs       # markdown render: GitHub-compatible anchors, link rewrite,
                          #   milestone/criterion tagging, §-section outline
scripts/fetch-content.mjs # fetch-at-build: README + assets per live roadmap → .content/
scripts/content-guard.mjs # border checks applied to fetched content (shape, markup)
scripts/check-build.mjs   # post-build assertions over _site (runs inside `npm run build`)
scripts/check-guards.mjs  # proves the border guards still reject what they must
scripts/check-links.mjs   # external link check (advisory, never blocks a deploy)
scripts/make-og.mjs       # dev-only: render the 1200×630 social cards + og-manifest.json
scripts/screenshots.mjs   # dev-only visual QA (both themes + mobile)
scripts/make-icons.mjs    # dev-only: rasterise the SVG mark into PNG icon fallbacks
src/                      # templates, data, assets (css/js/icons)
docs/notify-site.yml.tmpl # drop-in workflow for a roadmap repo
```

The three `dev-only` scripts (`make-og`, `screenshots`, `make-icons`) drive the
**system Chrome** through `playwright-core` (a devDependency; no browser download,
not part of the production build).

## Checks

`npm run build` runs the deterministic, offline assertions itself, so they also
guard the autonomous rebuilds fired by roadmap repos: in-page anchors resolve, no
duplicate ids, internal links exist, every map section is clickable, the home page
really shows a milestone, no private repo leaks, and the noindex posture matches
`SITE_NOINDEX`. `npm run check:guards` proves the content border checks still
reject bad payloads; `npm run check:links` probes external links and is advisory
by design — third-party rate limits must never block a content deploy.

## License

Site code: MIT. Each roadmap's content is licensed in its own repository.
