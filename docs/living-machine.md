# NIKOLAY.RUNTIME living machine

The English and Bulgarian homepages use one circuit renderer from the hero to
the street. The art depicts an imagined board for the portfolio, so the
packages and buses are illustrative hardware rather than project specifications.

- The hero places the processor under the existing introduction and layer diagram.
- Selected Work pairs the six feature projects with graphics, networking,
  inference, services, embedded radio and firmware component layouts.
- Capabilities shows a processor, memory banks and copper buses. The Lab adds
  a prototype board with headers, surface-mount parts and an RF section.
- The contact node feeds into the street. The layout renders the transmission
  board immediately before the stage and the footer circuit before the skyline.
  Both are placed at build time. The street owns its ground, walkers and portrait.

`machine-board.ts` defines component placements and their trace endpoints.
Astro renders the board and metallic packages as SVG. A shared frame clock
renders the visible Canvas signal layers and samples live audio. The shared
passive scroll listener caches position. Intersection observers measure where
each scene enters, and the progress function works in both directions.
Reduced motion retains the SVG. Offscreen fields release their drawing buffer.

## Electricity reactivity

- **Ambient** is the default and uses autonomous low-level activity.
- **Player activity** uses the official YouTube IFrame player’s state. The
  source URLs and error-150 fallbacks are those documented in
  [Synthwave player and living circuitry](music-experience.md).
- **Live audio** uses the generated demo or a file the visitor explicitly
  selects. Audio is processed locally, and the dock provides Pause and Stop
  during the scroll journey. Switching to YouTube stops the local session.

`live-circuit-audio.ts` connects the authorized source to an `AnalyserNode`
and a single output path. The sampler reads FFT magnitude and time-domain RMS
at a capped rate. It applies a noise gate, adaptive loudness normalization,
separate attack and release constants and a bass-onset accent with a refractory
interval. Bass feeds broad power traces, mids feed packets and travel speed,
and treble energizes contacts and junctions. Output remains within capped
visual envelopes at all intensity settings.

Site-owned or properly licensed hosted files can be passed through the
`ElectricityControls` component’s `sources` prop. It exposes those sources
only on explicit selection, registers their approved origins in `media-src`
and uses anonymous CORS for audio from another origin. The project currently
ships the generated demonstration and local file picker. Hosted CORS media
requires the remote server to authorize the portfolio origin.

## Capture decision

The Screen Capture API makes a display track part of the share and allows
an optional audio track. The selected surface settings describe its type
and do not establish the provider authorization of the material being
captured. The shipped sources are therefore the site-approved media path,
the generated demo and selected local files. There is no tab, system audio
or microphone capture route.

- [W3C Screen Capture draft](https://www.w3.org/TR/screen-capture/)
- [Web Audio API, MediaElementAudioSourceNode](https://webaudio.github.io/web-audio-api/#MediaElementAudioSourceNode)
- [YouTube API developer policies](https://developers.google.com/youtube/terms/developer-policies)
- [Spotify developer policy](https://developer.spotify.com/policy)

## Verification

Build the site and run `tests/e2e/living-machine.spec.ts` and
`tests/e2e/music.spec.ts` against the production preview. Browser tests use
generated tones and WAV files to verify bass, treble, silence and teardown.
The dedicated integration branch includes the independent street commit. Its handoff slot places the transmission board immediately before the stage.
Mocked YouTube state verification and measured Web Audio verification are
separate exercises.
