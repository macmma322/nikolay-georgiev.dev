# Motion storyboard (November 2026)

A motion-only pass. Layout, palette, type, content and the CV are unchanged.
The reference was a phone recording of another portfolio; what was taken from
it is its mechanics, rebuilt in this site's datasheet voice.

## What the reference does, and what it becomes here

| Reference                                                | Here                                                                                 |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Intro: boxes appear as outlined wireframes, then fill in | **Blueprint build**: a plate's frame draws, its lines draw, then its parts arrive    |
| Giant display word rises behind a mask                   | Hero name rises behind its line mask, a drafting rule sweeps under each line         |
| Section titles slide up as they arrive                   | Section headers: the rule draws, the eyebrow wipes in, the title rises from its mask |
| Thin borders draw around cards                           | Chapter and section rules draw left to right as they arrive                          |
| Cards ease in as a group                                 | Lab cards and the "also" rows stagger in, 40ms apart                                 |
| Artwork drifts against the text while scrolling          | Plates drift 12px against the copy (desktop, scroll-linked, native timelines)        |
| Finale: centred heading, soft red glow                   | Contact finale: one soft signal-red light breathes in once, the title rises          |
| Cursor-shaped particle swarms                            | Not taken: decoration that never stops, against "nothing is decoration"              |
| Intro screen before the content                          | Not taken: no loader, the hero is readable in the first frame                        |

## Classification and ownership

- **Time-driven, on load:** hero entrance, `/contact` finale. Pure CSS, plays
  once per load, skipped on a language switch.
- **Scroll-triggered, once:** section headers, chapters, plate builds, card
  staggers, footer finale. `scripts/reveal.ts` decides when (`data-shown`),
  CSS plays it. `.reveal-parts` marks a block that animates its children
  instead of fading as one.
- **Scroll-linked:** plate parallax (`animation-timeline: view()`, longhands
  only), the existing layer-stack scan on touch.
- **Owners:** the block fade owns `translate` on `.reveal`; parallax owns
  `translate` on `.chapter .visual`; plate builds own `opacity`/`translate`/
  `stroke-dashoffset` on SVG children; view transitions own the snapshot.

## Plate signatures (homepage chapters only)

Every plate first draws its frame and rule (the blueprint), then:

| Plate         | Signature                                                                  |
| ------------- | -------------------------------------------------------------------------- |
| Caelora       | Voxel columns assemble back to front, the tree skeleton draws, leaves land |
| J.A.R.V.I.S.  | Parts illuminate in routing order from dark, connections draw between them |
| USS X Academy | Interface panels wipe open, top to bottom, like screens arriving           |
| Zone 32-19    | Platform modules seat into place, then the service connections draw        |
| KObait        | Generic stations appear, then the communication lines draw between them    |
| Malrynth      | A boot sequence: stages come up one at a time in strict steps              |

Case-study heroes and listing thumbnails never build: they are view-transition
targets, and a plate that morphs must not also assemble.

## Timing

Within the existing tiers. Hero: everything readable by 900ms. Section header:
rule 640ms, title from 120ms. Chapter: copy within 500ms, plate built within
1.1s. No step waits for the user; nothing replays on scroll back.

## Page transitions

Cross-document view transitions keep their structure: the header holds, titles
and plates travel. The page itself now leaves with a 6px lift and arrives with
a 12px rise instead of a flat crossfade. The language switch keeps its own
matched crossfade. Browsers without view transitions navigate normally.

## Reduced motion

`prefers-reduced-motion: reduce`: no build, no parallax, no travel; the rules
are drawn, the plates are whole, view transitions are off. Short opacity and
colour changes remain.

## Every page

All pages share the entrance vocabulary, so the site moves as one system:

| Page                                          | Entrance                                                                   |
| --------------------------------------------- | -------------------------------------------------------------------------- |
| Home                                          | Hero sequence, chapter builds, plate drift, staggered cards                |
| About, Work, Lab, Open Source, Setup, CV, 404 | Label types on, title rises, lede settles; section headers as they arrive  |
| Case studies                                  | Breadcrumb types on, summary and meta settle; section titles draw and rise |
| Work index                                    | Rows arrive as they are reached                                            |
| Blueprint                                     | Back link types on, actions and document settle                            |
| Contact                                       | The finale plays on load                                                   |
| Every page                                    | Page transition; the footer finale plays as it arrives                     |

The CV page moves only above the CV: its intro and the footer. The CV
preview, its layout, pagination and the generated PDFs are untouched.

Typewriter: short mono labels only, revealed by a stepped clip one character
at a time; the text is in the HTML from the first byte.
