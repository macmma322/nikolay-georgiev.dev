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

export function sequence(pose: Pose, returning: boolean, music: boolean): Frame[] {
  switch (pose) {
    case 'peek':
      return [...frames('standing', 'peek', [0], [1700]), ...frames('standing', 'exit', [0], [0])];
    case 'walk': {
      if (returning) return frames('standing', 'idle', [0], [0]);
      // Measure the rearward displacement of the planted sole at each drawing.
      // Advance the root at the same instant as the foot changes, in either direction.
      const travel = [0, 0.15, 0.235, 0.38, 0.5, 0.65, 0.735, 0.88];
      const left = Math.random() < 0.5;
      const steps: Frame[] = Array.from({ length: 16 }, (_, i) => {
        const distance = ((i >= 8 ? 1 : 0) + travel[i % 8]!) / 2;
        return {
          clip: 'walk',
          index: i % 8,
          state: left ? 'walk-left' : 'walk-right',
          ms: 115,
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
      return [
        ...frames('lean-phone', 'lean', [0], [2000]),
        ...frames(
          'lean-phone',
          'phone',
          [1, 2, 3, 4, 3, 2, 1],
          [180, 170, 1700, 1100, 280, 180, 160],
        ),
        ...frames('lean-phone', 'lean', [0], [0]),
      ];
    case 'sit':
      if (music)
        return [
          ...frames('listen', 'sit', [0], [1100]),
          ...frames('listen', 'interact', [1, 2], [250, 700]),
          ...frames('listen', 'phone', [3, 4, 3], [1150, 310, 1440]),
          ...frames('listen', 'react', [2], [800]),
          ...frames('listen', 'sit', [1, 0], [230, 0]),
        ];
      return [
        ...frames('phone', 'sit', [0], [1250]),
        ...frames('phone', 'phone', [1, 0, 3, 0], [340, 900, 350, 0]),
      ];
    case 'typing':
      return frames(
        'typing',
        'typing',
        [0, 1, 2, 3, 0, 1, 2, 3, 0],
        [980, 170, 280, 190, 480, 215, 150, 190, 0],
      );
    case 'inspect':
      return [
        ...frames('inspect', 'inspect', [0, 3], [750, 650]),
        ...frames('inspect', 'interact', [1], [260]),
        ...frames('inspect', 'react', [0, 2], [400, 0]),
      ];
  }
}

/**
 * Restrained ambient follow-up cycles while a cameo stays on screen, using only
 * registered sprite keyframes so proportions and physical contacts stay locked.
 */
export function idleCycle(pose: Pose, music: boolean): { pauseMs: number; frames: Frame[] } | null {
  switch (pose) {
    case 'sit':
      if (music) {
        return {
          pauseMs: 2800,
          frames: frames('listen', 'phone', [3, 4, 3, 4, 3], [900, 300, 950, 300, 0]),
        };
      }
      return {
        pauseMs: 5600,
        frames: [...frames('phone', 'phone', [1, 0, 3, 0], [320, 820, 340, 0])],
      };
    case 'lean':
      return {
        pauseMs: 7800,
        frames: [
          ...frames(
            'lean-phone',
            'phone',
            [1, 2, 3, 4, 3, 2, 1],
            [170, 160, 1400, 900, 240, 170, 150],
          ),
          ...frames('lean-phone', 'lean', [0], [0]),
        ],
      };
    case 'typing':
      return {
        pauseMs: 4200,
        frames: frames('typing', 'typing', [1, 2, 3, 1, 2, 0], [160, 240, 180, 170, 210, 0]),
      };
    case 'inspect':
      return {
        pauseMs: 6800,
        frames: [
          ...frames('inspect', 'inspect', [3], [480]),
          ...frames('inspect', 'interact', [1], [240]),
          ...frames('inspect', 'react', [0, 2, 0], [340, 360, 0]),
        ],
      };
    default:
      return null;
  }
}
