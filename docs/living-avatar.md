# The living avatar

The portfolio uses the illustrated master from the pedestrian street. The standing finish and footer retain that drawing. Five transparent pose sheets derived from it supply the new silhouettes, hands, clothing folds and changes of direction. Final likeness and accessory artwork are available for Nikolay’s visual review at actual display size.

## Where to see it

| Location                    | Action and contact                                                                                                                                        |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Home, above the facts strip | Two eight-frame strides, a planted stop, a turn and a standing hold. The ground is the strip’s top rule. Short tracks use the standing pose.              |
| Caelora                     | The pelvis sits on the plate’s top edge, with the shoes hanging in front. He checks the phone or, occasionally, puts on his headphones.                   |
| J.A.R.V.I.S.                | The sleeve meets the upper-left corner and the feet rest on a small bracket. He checks the phone and pockets it again. Narrow layouts omit this position. |
| KObait on the homepage      | A rare peek appears behind the top edge. The plate clips the lower body.                                                                                  |
| Homepage Lab board          | A crouched fingertip touches a pad. The active prototype circuit field draws the pulse with its existing clock.                                           |
| Lab and Setup pages         | A seated illustration includes the chair, desk, keyboard and monitor. Brief finger movements leave the desk and feet fixed.                               |
| Contact                     | He sits on the facts panel when its text and links leave sufficient space.                                                                                |
| Street                      | The original portrait owns the stage, with its existing chest, head and eyelid animation between the two crowd canvases.                                  |

## Runtime

`AvatarAnchor.astro` declares a pose, locale-aware line and contact area. One runtime moves a decorative canvas between eligible anchors. It checks the viewport, header, controls and rendered text before mounting. The street takes priority, followed by an already visible character and then the eligible anchor nearest the reading area. Resize, visibility changes, dialogs, missing artwork and motion preferences cancel pending cues. A generation counter discards late image decodes.

`choreography.ts` contains finite frame sequences and holds. `clips.ts` registers the frame counts and physical contact lines. Root displacement follows the planted foot in the walking strip. Idle section poses stop rendering after the last drawing. Breathing, blinking and watching nearby pedestrians belong to the street renderer.

Each anchor has a 60-second revisit cooldown. Rare interactions have a 75-second page cooldown. The seated music sequence can also become eligible while the existing player reports playback. Remarks expire after 4.2 seconds, can be dismissed by click or Escape and never enter a live region. Shown lines and the 45-second speech cooldown survive page navigation within the tab. The footer’s **Character motion** toggle persists across visits. The OS reduced-motion setting takes precedence.

## Artwork and rebuild

Run `node scripts/avatar-atlas.mjs` from the repository root to regenerate the transparent WebP strips in `public/avatar` from the sheets in `src/assets/media/avatar/source`. The original master and its street layers remain the source of the standing likeness. Only the artwork needed by the selected sequence is decoded.

The existing portrait layers work for breathing and blinking. Walking, a crossed-ankle lean and a bent seated silhouette need different drawings. A Rive or Spine rig would first require separating the limbs and drawing the surfaces hidden by the hoodie and pockets. Articulated SVG would also require redrawing the detailed fabric and face. Registered raster keyframes preserve those details at cameo size and use the existing browser canvas. Small, bounded mesh displacements supply thumb, keyboard, fingertip and headphone-nod in-betweens. The build adds no animation-library dependency or video decoder.

The reusable rear-view phone and three-quarter headphones are in `public/avatar/props`. The performance frames bake in the hands, hair and contact shadows. Reuse the isolated props when authoring another grip or head angle. Match the phone to the hand before drawing the fingers in front of it. Match the earcup centres to the ears before restoring the foreground hair. The black and red case is an illustrated interpretation of the supplied description. The owner confirmed the black ATH-M20xBT. [Samsung Galaxy S20+ specifications](https://www.samsung.com/lb/business/smartphones/galaxy-s/galaxy-s20-plus-sm-g985-sm-g985flbdmid/) and [Audio-Technica ATH-M20xBT](https://www.audio-technica.com/en-us/ath-m20xbt).

## Verification

`npm run typecheck` checks Astro and TypeScript. `npm run build` produces and audits the bilingual production site. Browser coverage lives in `tests/e2e/avatar.spec.ts` alongside the existing street, living-machine and music suites. The avatar checks cover seating and sleeve contact, scroll cancellation, switch persistence, missing artwork, responsive fit, speech dismissal, the headphone sequence, localized circuit contact and navigation without JavaScript. Use an untraced, single-worker run for the street’s existing wall-clock frame-budget check.
