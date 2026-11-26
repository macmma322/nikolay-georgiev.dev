import type { CharacterState, Clip } from './clips';
export type Pose = 'walk' | 'lean' | 'sit' | 'typing' | 'inspect' | 'peek';
type Frame = {
  clip: Clip;
  index: number;
  state: CharacterState;
  ms: number;
  x?: number;
  mirror?: boolean;
};

const frames = (clip: Clip, state: CharacterState, indices: number[], times: number[]): Frame[] =>
  indices.map((index, i) => ({ clip, state, index, ms: times[i] ?? times[0]! }));

/** Filmed frames `from`..`to` (either direction) at the clip's own frame rate. */
const film = (clip: Clip, state: CharacterState, from: number, to: number, fps = 16): Frame[] => {
  const step = to >= from ? 1 : -1;
  return Array.from({ length: Math.abs(to - from) + 1 }, (_, i) => ({
    clip,
    state,
    index: from + i * step,
    ms: Math.round(1000 / fps),
  }));
};
/** The last frame of a plan holds: nothing follows it. */
const hold = (list: Frame[]) => list.map((f, i) => (i === list.length - 1 ? { ...f, ms: 0 } : f));

// Between repeats a cameo rests for a varied moment, so a loop left on screen
// never comes round on an exact beat. The film itself always plays at its rate.
const vary = (ms: number, spread = 0.3) =>
  Math.round(ms * (1 - spread + Math.random() * spread * 2));

/**
 * The filmed walk: 29 frames are one loop of two steps (scripts/avatar-film.mjs),
 * covering 0.906 figure heights. The track is about 1.88 standing heights and the
 * figure 0.97 of the cell, so crossing it takes 62 frames at 24 a second, and
 * each frame advances the root by the same share: the planted foot stays put.
 */
const WALK_LOOP = 29;
const WALK_FRAMES = 62;

export function sequence(pose: Pose, returning: boolean, music: boolean): Frame[] {
  switch (pose) {
    case 'peek':
      return [...frames('standing', 'peek', [0], [1700]), ...frames('standing', 'exit', [0], [0])];
    case 'walk': {
      if (returning) return frames('standing', 'idle', [0], [0]);
      const left = Math.random() < 0.5;
      const steps: Frame[] = Array.from({ length: WALK_FRAMES }, (_, i) => {
        const distance = i / (WALK_FRAMES - 1);
        return {
          clip: 'walk',
          index: i % WALK_LOOP,
          state: left ? 'walk-left' : 'walk-right',
          ms: 42,
          x: left ? 1 - distance : distance,
        };
      });
      const settle = [
        ...frames('turn', 'stop', [0, 1], [140, 210]),
        ...frames('turn', 'turn', [2, 3], [180, 220]),
        ...frames('standing', 'idle', [0], [0]),
      ].map((f) => ({ ...f, x: left ? 0 : 1, mirror: left }));
      return [...steps, ...settle];
    }
    case 'lean':
      return hold([
        ...frames('lean-phone', 'lean', [0], [1400]),
        ...film('lean-phone', 'phone', 1, 47),
        ...frames('lean-phone', 'lean', [48], [0]),
      ]);
    case 'sit':
      if (music)
        // Headphones from the neck onto the ears, then a nod to the track.
        return hold([
          ...frames('listen', 'sit', [0], [900]),
          ...film('listen', 'interact', 1, 26),
          ...film('listen', 'phone', 27, 48),
        ]);
      return hold([...frames('phone', 'sit', [0], [900]), ...film('phone', 'phone', 1, 48)]);
    case 'typing':
      return hold([...frames('typing', 'typing', [0], [700]), ...film('typing', 'typing', 1, 48)]);
    case 'inspect':
      return hold([
        ...frames('inspect', 'inspect', [0], [600]),
        ...film('inspect', 'inspect', 1, 7),
        ...frames('inspect', 'interact', [8], [62]),
        ...film('inspect', 'react', 9, 48),
      ]);
  }
}

/**
 * What a cameo does while it stays on screen: its film again, from the frame
 * the last plan ended on (the clips end where they began), after a short rest.
 */
export function idleCycle(pose: Pose, music: boolean): { pauseMs: number; frames: Frame[] } | null {
  switch (pose) {
    case 'sit':
      // The nod plays back and forth: the clip ends with headphones on, not off.
      if (music)
        return {
          pauseMs: vary(400),
          frames: hold([...film('listen', 'phone', 47, 27), ...film('listen', 'phone', 28, 48)]),
        };
      return { pauseMs: vary(1600), frames: hold(film('phone', 'phone', 0, 48)) };
    case 'lean':
      return {
        pauseMs: vary(2200),
        frames: hold([
          ...film('lean-phone', 'phone', 0, 47),
          ...frames('lean-phone', 'lean', [48], [0]),
        ]),
      };
    case 'typing':
      return { pauseMs: vary(300), frames: hold(film('typing', 'typing', 0, 48)) };
    case 'inspect':
      return {
        pauseMs: vary(2600),
        frames: hold([
          ...film('inspect', 'inspect', 0, 7),
          ...frames('inspect', 'interact', [8], [62]),
          ...film('inspect', 'react', 9, 48),
        ]),
      };
    default:
      return null;
  }
}
