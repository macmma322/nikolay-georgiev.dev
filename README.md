# nikolay-georgiev.dev

Portfolio of Nikolay Georgiev, software engineer in Varna, Bulgaria. A static
Astro + TypeScript site: seven case studies, a lab of tooling and planned
systems, an open-source page (the MIT-licensed CLAUDE.md blueprint and
upstream credits), a setup page (hardware, environment, decisions and
roadmap), an about page and a generated one-page CV.

Every claim on the site comes from the project repositories, and each project
states its real status. [PRODUCT.md](PRODUCT.md) covers the content rules and
[DESIGN.md](DESIGN.md) the visual system.

## Stack

- Astro 7, static output, no client framework. The only client JavaScript is
  the copy-email button, the mobile-menu close handler and the local clock.
- TypeScript in strictest mode, content collections validated with Zod.
- Self-hosted variable fonts (Hubot Sans, Mona Sans, Martian Mono) through
  Astro's font pipeline.
- Astro's built-in CSP: script and style hashes in a meta tag, no inline
  style attributes anywhere.
- Playwright + axe for end-to-end and accessibility tests.
- Docker image: Node build stage, Caddy runtime serving `dist/`.

## Commands

| Command             | What it does                                                        |
| ------------------- | ------------------------------------------------------------------- |
| `npm run dev`       | Dev server on http://localhost:4321                                 |
| `npm run build`     | Production build, then `scripts/audit-dist.mjs` (fails on problems) |
| `npm run preview`   | Serve `dist/`                                                       |
| `npm run typecheck` | `astro check` and `tsc --noEmit`                                    |
| `npm run format`    | Prettier (`format:check` in CI)                                     |
| `npm run test:e2e`  | Playwright against the production build (desktop, phone, tablet)    |
| `npm run og`        | Re-render the Open Graph cards (`public/og/`, `src/data/og.json`)   |
| `npm run cv`        | Re-render `public/Nikolay-Georgiev-CV.pdf` (fails if over one page) |

Node 22.12 or newer. Run `npm run build` before `npm run test:e2e`.

## Structure

```
src/
  content/projects/*.md   case studies (front matter is the structured data)
  content/lab.json        lab entries: tooling, planned systems, paused ideas
  data/open-source.ts     public repositories and upstream credits (/open-source)
  content.config.ts       schemas for both collections, including statuses
  data/                   site identity, experience, layers, tech registry
  data/diagrams/*.ts      architecture diagrams as typed nodes and edges
  lib/diagram.ts          diagram layout and orthogonal edge routing
  lib/sprite.ts           content-hashed SVG sprite of technology icons
  components/             layout, home, work, diagrams and UI components
  components/work/art/    one drawn plate per project, framed by PlateFrame
  scripts/                small client scripts (reveal once, case contents)
  pages/                  routes, plus icons/[name].svg.ts for the sprite
scripts/
  audit-dist.mjs          post-build audit: leaks, SEO, a11y basics, links
  og.mjs, cv.mjs          Playwright renderers for OG cards and the CV
  shoot.mjs               screenshot helper for design review
tests/e2e/                Playwright suites (pages, navigation, axe)
```

## Languages

English is at `/`, Bulgarian under `/bg`, with the same slugs. Interface text
lives in `src/i18n/ui/*.ts` as `{ en, bg }` pairs, so a missing translation
fails the typecheck; Bulgarian case studies mirror the English list shapes
(`src/lib/projects.ts` checks them). Terms are fixed in
[docs/i18n-glossary.md](docs/i18n-glossary.md). The post-build audit also
fails on unresolved values in visible text (`undefined`, `${`, `[object …]`)
and on Bulgarian text in an English page outside a `lang="bg"` element.

## Adding or updating a project

1. Edit or add `src/content/projects/<slug>.md`. The schema in
   `src/content.config.ts` lists every field; the build fails on a mismatch.
2. Pick an honest `status`: `production`, `live-pre-launch`, `active`,
   `prototype`, `research`, `experimental`, `paused`, `planned` or `concept`.
3. Reference technologies by id from `src/data/tech.ts`. A technology's
   `level` describes evidence (core, working, learning, planned), not skill.
4. Diagrams live in `src/data/diagrams/`. Nodes sit on a grid; mark anything
   not built with `planned: true` or `dashed: true`. The dev server warns when
   a label would overflow its box.
5. Give the homepage chapter one `signature` sentence and, where a hard problem
   already states a number, a `figure` for it. Both must quote the case study.
6. A new slug also needs: a plate in `src/components/work/art/` registered in
   `ProjectArt.astro`; a pair of linking rules at the end of
   `components/home/Capabilities.astro`; and `data-vt-title` / `data-vt-art`
   name rules in `styles/base.css`. Generated `<style set:html>` blocks in the
   page body are blocked by the CSP in production, so write rules statically.
7. Run `npm run og` if the name, kicker, status or plate changed (a new slug
   gets its cards automatically), then `npm run test:e2e`.

## Open source page and blueprint

`blueprint/` mirrors the public repository `macmma322/engineering-blueprint`:
`CLAUDE.md` (the rules), `README.md`, `SETUP.md` and `SETUP.bg.md` (setup
guides), `examples/` and `LICENSE` (MIT). `blueprint/CLAUDE.md` is the single
source of the rules. `/open-source/blueprint` renders it,
`/open-source/CLAUDE.md` and `/open-source/LICENSE.txt` serve it byte for
byte, and the copy button carries the same text. The public copy lives in
`macmma322/engineering-blueprint`; copy `blueprint/` over a clone of it to
publish, and keep the quick-start commands on `/open-source` identical to the
ones in `blueprint/README.md` (an e2e test checks this). `npm run build`
scans the served Markdown for leaks like every other text file.

Credits in `src/data/open-source.ts` are curated, not a dependency dump. State
the license as the upstream project declares it, mark design references as
`reference`, and describe KObait hardware drivers by kind (PRODUCT.md).

## Deployment (Railway)

`railway.json` tells Railway to build the `Dockerfile` and health-check `/`.
The image runs Caddy on `$PORT` with the headers in `Caddyfile`: HSTS,
nosniff, referrer and permissions policies, COOP, `frame-ancestors 'none'`,
immutable caching for `/_astro/*`, `/icons/*` and the content-hashed `/og/*` cards, 308 redirects from `.html`
and trailing slashes, a real 404 status and a `Speculation-Rules` header.

Canonical URLs and the sitemap point at `https://nikolay-georgiev.dev`
(`site` in `astro.config.mjs`). The domain is not purchased or connected yet;
until it is, the Railway URL serves the same pages with canonical tags that
point at the future domain.

## Privacy rules

- No secrets, `.env` values, internal hostnames, local paths, client data or
  private repository URLs in the output. `npm run build` scans `dist/` for
  them and fails if it finds one.
- The only published email is the contact address. The public CV has no
  phone number or postal address.
- Private repositories are described as private and are not linked.
