# Synthwave player and living circuitry

The English and Bulgarian layouts show the copper vinyl dock in the bottom-right
corner. It offers four selections in the opt-in YouTube dialog.
Choosing a track replaces the previous frame and waits for the visitor to use
YouTube’s Play control. The Watch on YouTube link always follows the selection.

| Selection                              | Source                                                         |
| -------------------------------------- | -------------------------------------------------------------- |
| Memory Reboot — VØJ, Narvent           | [Narvent’s music video](https://youtu.be/44UaY-AN6ho)          |
| Fainted (You’re Wonderful) — Narvent   | [Narvent’s Topic release](https://youtu.be/5Kn0Yc56jaw)        |
| Distant Echoes — VXLLAIN, VØJ, Narvent | [VXLLAIN’s official music video](https://youtu.be/IzTJQiFoNGE) |
| Fade Into Darkness — Narvent           | [Narvent’s music video](https://youtu.be/JOUELP4mnCQ)          |

YouTube’s oEmbed metadata confirmed the titles and uploader channels. On
19 November 2026, all four videos returned IFrame API error 150 on both embed
domains from the local preview. The YouTube developer control video initialized.
Memory Reboot is the default selection. The panel highlights the Watch on YouTube
link for the selected track when embedded playback fails.
Current availability can vary by video, viewer, browser and origin.

## Visual reactivity

The circuit renderer places a seeded SVG beneath a bounded Canvas 2D signal
layer. The static board remains visible with reduced motion or without
JavaScript. Motion runs only on screen in a visible tab. The full-viewport
background draws at most every 48 ms on desktop and 76 ms on mobile. Each
drawing buffer is limited to about one megapixel. Compact viewports draw fewer
pulses.

The player publishes confirmed state transitions through
`src/scripts/playback-state.ts`. The envelope in
`src/scripts/circuit-reactivity.ts` eases independent glow, trace and node
levels. Playback increases energy, buffering keeps it restrained, and pause,
end, close and errors decay toward idle. Seeking inherits the underlying
player state. Switching tracks tears down the old player before publishing
the new loading state.

No cue sheet is configured. The supplied videos have no verified timing
annotations, and their embed availability prevented a playback timing check.
The three visual channels are animation envelopes. Future licensed sources
can supply envelopes to the renderer independently of this YouTube adapter.

## Pedestrian footer integration

The shared footer mounts its decorative field ahead of the skyline and both
crowd canvases. The fixed dock lives in the shared layout, with room at the end
of the page to reach the footer links above it. The dialog header uses a masked
circuit field.

## Verification

Run `npm run build` followed by
`npm run test:e2e -- tests/e2e/music.spec.ts --project=desktop --project=mobile`.
The tests use mocked IFrame API events for playback, buffering, pause, errors
and track switching. Use an actual browser to recheck current embed
availability separately.

- [IFrame API and error codes](https://developers.google.com/youtube/iframe_api_reference#onError)
- [YouTube privacy-enhanced mode](https://support.google.com/youtube/answer/171780)
