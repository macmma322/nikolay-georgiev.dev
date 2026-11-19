# NIKOLAY.RUNTIME living machine

The portfolio uses a continuous circuit layer in the shared layout across its
English and Bulgarian pages. Copper-red traces cross a deep navy field. The
street scene keeps a separate decorative layer behind its skyline and crowd.
A compact vinyl dock stays at the bottom right on both desktop and mobile.
It contains the player and the electricity settings. Opening the player is
the first action that contacts YouTube.

Astro renders the trace geometry from `circuit-board.ts` as SVG. The same
geometry drives a bounded Canvas signal overlay through a shared frame clock.
Reduced motion retains the SVG. Hidden or offscreen fields suspend drawing
and release their drawing buffer.

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
The shared layout mounts the backdrop and vinyl. The footer mounts a separate circuit field before the street skyline.
Mocked YouTube state verification and measured Web Audio verification are
separate exercises.
