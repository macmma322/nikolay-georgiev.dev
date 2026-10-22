# Design

A bound engineering document: typographic spreads for reading, drawn plates
for explaining, and one interaction for exploring, in which a text label lights
its drawing and the drawing lights its label. Dark graphite, ivory type, a cool
steel for structure and one signal red. It should read as a datasheet with
cinematic typography, not as a SaaS landing page or a cyberpunk dashboard.

Voice: **datasheet · drafting plate · bench instrument.** Nothing is decoration:
a line connects something, a label names something.

## Tokens (`src/styles/tokens.css`)

- **Surfaces:** graphite in OKLCH at hue 255 with chroma under 0.01
  (`--ink-0` to `--ink-3`, `--ink-deep`). Hairlines use `--line`,
  `--line-soft` and `--line-strong`.
- **Type colour:** warm ivory `--fg` and `--fg-2` on cool graphite, with
  `--fg-3` for metadata. All pairs pass WCAG AA; axe checks every page.
- **Signal:** `--signal` (red) marks the brand square, the production and live
  status glyphs and the home "Selected work" index, and nothing else.
- **Project accents:** each project sets `data-accent`, which maps `--accent`
  to its identity. There is never more than one accent per element.
- **Type axes:** `--wide-1/2/3` (Hubot width), `--w-text` to `--w-heavy`,
  `--track-display`, `--track-heading`, `--track-label`, `--text-label`,
  `--text-caption`.
- **Lighting:** the registered numbers `--lit` and `--plate-lit` (0 or 1)
  drive every "lights up" state, so colour changes interpolate.

| Project       | Accent                  | Reason                         |
| ------------- | ----------------------- | ------------------------------ |
| Zone 32-19    | `oklch(0.7 0.15 305)`   | the brand's purple triangle    |
| J.A.R.V.I.S.  | `oklch(0.86 0.085 205)` | a cold instrument cyan         |
| USS X Academy | `oklch(0.78 0.11 250)`  | an institutional blue          |
| KObait        | `oklch(0.82 0.12 170)`  | marine-chart green             |
| Malrynth      | `oklch(0.83 0.13 78)`   | firmware amber                 |
| Stemini       | `oklch(0.8 0.13 58)`    | filament orange, kept off Zone |

## Type

- **Hubot Sans** (display, variable width): names and headings, usually at
  `font-stretch` 110–118% with tight tracking. Its zero has a crossbar, so
  strings people retype (the email address) are set in Mona Sans instead.
- **Mona Sans** (body): reading text, notes, kickers and links, 68ch measure.
- **Martian Mono** (labels): only uppercase labels of four words or fewer and
  machine values (dates, counts, identifiers, diagram tags). Never sentences.
- Hierarchy on the home page: hero name, then project names, then section
  titles. Section headings come in two tiers (`SectionHeader tier`).
- Fluid scale from `--step--2` to `--step-hero`. The hero name is sized by
  container query so it fills its column without overflowing.

## Layout

- `--max` 92rem container with a fluid `--gutter`.
- Home chapters vary their composition per project (open, mirror, lead, essay)
  and each fits one laptop screen. No two neighbouring sections share a
  scaffold: Capabilities has a sticky rail header, Experience hangs its header
  over the text column with dates in the margin, and Lab is a ruled ledger.
- Case studies: Overview, Architecture, Media, Hard problems, Decisions, What I
  built, Status (Today / Next), What I learned, Stack. A sticky contents rail
  with an active section from 1180px, a compact contents bar below it. From
  1180px the diagrams widen under the rail.
- Borders only for objects (plates, spec sheet, diagrams, controls, images)
  and semantic boundaries (built vs not built). Radii are 2, 4 and 8px.
- Tested at 360, 390, 430, 768, 1024, 1366, 1440, 1920 and 2560 px wide.

## Signature: text lights its drawing

- **Layer stack** (hero, FIG. 01): hovering or focusing a layer label lights
  its plate with `:has()` and `--lit`; hovering a plate lights its label; the
  statement's four phrases light their plates; on touch screens the plates
  light in order as the figure scrolls through the viewport.
- **Layer glyph** (`LayerGlyph`): a miniature of the stack beside each project
  with its layers lit, so every project points back to FIG. 01.
- **Project plates** (`components/work/art`, framed by `PlateFrame`): one drawn
  technical plate per project with a parts list. In a case-study hero the list
  is shown and each item lights its part. A chapter's title link lights its
  whole plate. Plates are illustrations built from repository facts, captioned
  as such; no telemetry, no screenshots, nothing that spins.
- **Architecture diagrams** (`lib/diagram.ts`): typed nodes on a grid,
  orthogonal routing, dashed planned parts, and a text list for phones and
  screen readers. Hovering a node lights its edges and neighbours; the legend
  links to Today and Next and dims the other category.
- **Capabilities:** pointing at a project lights the technologies it proves,
  and pointing at a technology lights its projects.
- **Status badge:** shape plus label, drawn as SVG so it survives forced
  colours. Production solid red; live pre-launch red outline, half filled;
  active solid ivory; prototype, research and experimental hollow; paused
  hollow with a diagonal stroke; planned and concept dashed. Nothing pulses.

## Motion

One system, four tiers and four curves (`tokens.css`):

| Tier      | Token                        | Used for                               |
| --------- | ---------------------------- | -------------------------------------- |
| Fast      | `--dur-press` / `--dur-fast` | press, hover colour, icon tint         |
| Interface | `--dur-ui` / `--dur-panel`   | control state, lighting, menus         |
| Content   | `--dur-content`              | one-time reveals, diagram build stages |
| Cinematic | `--dur-cinematic`            | the hero entrance only                 |

`--ease-out` answers input, `--ease-out-expo` runs entrances, `--ease-in-out`
moves things between two resting states (view transitions, line draws), and
`--ease-drawer` opens the mobile menu. No bounce, no springs, never ease-in.

- Every hover response is also a `:focus-visible` response. Pressables scale
  to 0.97. Arrows nudge in the direction they point.
- `.reveal` plays once as a block arrives (`scripts/reveal.ts`); diagrams run
  their own build (core, neighbours, edges, labels, packets) once, and skip to
  the end on interaction, deep links and back/forward.
- Cross-document view transitions carry a project's title and plate between
  the index, the homepage and its case study (`data-vt-title`, `data-vt-art`).
- `prefers-reduced-motion: reduce` removes all movement and keeps short colour
  and opacity changes. Diagram packets and view transitions are off.
- There is no loader, no fake terminal, no WebGL, no scroll hijacking, and no
  animation library.

## Icons

Technology icons come from simple-icons (CC0) through one content-hashed SVG
sprite (`/icons/tech-<hash>.svg`), referenced with `<use>`, as bare glyphs
beside the name. Brand colour appears only when the technology or a link that
contains it is pointed at or focused. Technologies without a logo get a two or
three letter monogram.

## CSP

`security.csp` hashes every bundled script and style. Styles generated at build
time into a `<style set:html>` block inside the page body are not hashed and
are blocked in production, so interaction rules are written statically or
driven by a class toggle from a bundled script. Test anything interactive
against `npm run build` and `astro preview`, not only the dev server.

## Production-only pitfalls

- **CSP:** see above. `tests/e2e/interaction.spec.ts` checks the plate,
  diagram and Capabilities lighting against the production build.
- **CSS minifier:** the build folds `animation-timeline` into the `animation`
  shorthand, which browsers reject, and the scroll-driven animation disappears.
  Write scroll- and view-timeline animations with longhands only
  (`animation-name`, `animation-timing-function`, `animation-timeline`). The
  e2e suite asserts the layer-stack and header timelines survive the build.
