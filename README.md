# proofstone.dev

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
4. Commit and push — the site build fetches and renders it.

## How content stays in sync

The build (`.github/workflows/build-deploy.yml`) runs on: a push here · a
`repository_dispatch` fired by a roadmap repo when its README/assets change · a
nightly schedule (safety net) · manual dispatch. Each run re-fetches every live
roadmap, so a content edit lands on the site with no manual steps.

## noindex / launch

The site ships with `<meta name="robots" content="noindex, nofollow">` on every page
while `SITE_NOINDEX` is unset or `"true"`. Launch = build with `SITE_NOINDEX=false`
(or set the repo variable `SITE_NOINDEX` to `false`). robots.txt intentionally allows
crawling so the noindex tag is seen.

## Structure

```
roadmaps.config.mjs      # roadmap registry (single source of truth for the site)
eleventy.config.mjs      # markdown render (GitHub-compatible anchors + link rewrite)
scripts/fetch-content.mjs# fetch-at-build: README + assets per live roadmap → .content/
src/                     # templates, data, assets (css/js/favicon)
docs/notify-site.yml.tmpl# drop-in workflow for a roadmap repo
```

## License

Site code: MIT. Each roadmap's content is licensed in its own repository.
