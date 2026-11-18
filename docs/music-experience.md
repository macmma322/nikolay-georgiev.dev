# Footer music player

The English and Bulgarian homepages mount `MusicExperience.astro` in the
layout's `footer-companion` slot. The player stays in normal document flow. A
future pedestrian footer can place the component in its composition without a
shared playback or animation dependency.

The card's normal destination is the [official video for Loser](https://www.youtube.com/watch?v=s3a4OQR-10M).
With JavaScript and native dialog support, activating the card loads the IFrame
API and opens a privacy-enhanced YouTube embed. The embed receives the current
site origin, preserves the recommended referrer policy and has autoplay disabled.
YouTube provides all video controls and branding. The surrounding vinyl responds
to confirmed playback and respects reduced motion. Closing or leaving the page
disposes of the iframe. Hiding the tab or scrolling the player out of view
requests a pause, with playback resuming only through YouTube controls.

The YouTube content security policy sources are scoped to the two homepages.
Google may process data once the visitor opens the player.

## Featured video availability

On 19 November 2026, the official video returned IFrame API error **150** in
local testing on both YouTube embed domains. The YouTube developer sample
initialized from the same origin. The player preserves the requested official
video ID and renders a stable fallback with a direct YouTube link if embedding
is denied. In-page playback of the featured video requires the rights holder to
enable embedding for the viewer.

The automated tests substitute a deterministic IFrame API fixture to exercise
the playback lifecycle independently of current YouTube availability. Run
`npm run build` and
`npm run test:e2e -- tests/e2e/music.spec.ts --project=desktop --project=mobile`.

- [IFrame API and error codes](https://developers.google.com/youtube/iframe_api_reference)
- [Required minimum functionality](https://developers.google.com/youtube/terms/required-minimum-functionality)
- [YouTube privacy-enhanced mode](https://support.google.com/youtube/answer/171780)
