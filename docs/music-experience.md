# Synthwave player and living circuitry

The English and Bulgarian homepages retain the copper vinyl player and offer
the four original selections. Each opens the same opt-in YouTube dialog.
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
domains from the local preview. The YouTube developer control video initialized. The first choice remains Memory Reboot. The panel
shows a fallback for the individual selection when embedded playback fails.
Current availability can vary by video, viewer, browser and origin.

## Visual reactivity

The circuit renderer places a seeded SVG beneath a bounded Canvas 2D signal
layer. The static board remains visible with reduced motion or without
JavaScript. Motion runs only on screen in a visible tab. Rendering is capped
at 30 frames per second, the drawing buffer is capped at 1.5 DPR and 1,800
pixels wide, and compact viewports draw fewer pulses.

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

The footer field renders in the homepage’s footer circuit slot. Once the
pedestrian footer supplies `[data-street] [data-stage]` in the same footer, the
decorative field moves to the first position inside that stage. Keep that
mount ahead of the skyline and both crowd canvases. The layer leaves the
stage’s background, pavement, cast controls and illustrated character owned
by the existing footer. The current homepage also uses a static treatment in
the lab and a masked, animated field in the music dialog header.

The separate pedestrian worktree remains the owner of its in-progress assets
and scene. The combined browser preview used a read-only snapshot of that
checkout.

## Verification

Run `npm run build` followed by
`npm run test:e2e -- tests/e2e/music.spec.ts --project=desktop --project=mobile`.
The tests use mocked IFrame API events for playback, buffering, pause, errors
and track switching. Use an actual browser to recheck current embed
availability separately.

- [IFrame API and error codes](https://developers.google.com/youtube/iframe_api_reference#onError)
- [YouTube privacy-enhanced mode](https://support.google.com/youtube/answer/171780)
