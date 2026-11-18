import type { PlaybackState } from './playback-state';

export type CircuitEnergy = { wave: number; signals: number; nodes: number };

const idle: CircuitEnergy = { wave: 0.16, signals: 0.18, nodes: 0.09 };
const levels: Partial<Record<PlaybackState, CircuitEnergy>> = {
  playing: { wave: 0.66, signals: 0.85, nodes: 0.53 },
  buffering: { wave: 0.24, signals: 0.29, nodes: 0.14 },
};

/** The renderer consumes visual envelopes. An authorized source could supply
 * different envelopes in future without adding audio access to the renderer. */
export function createCircuitReactivity() {
  const energy = { ...idle };
  let target = idle;

  return {
    setState(state: PlaybackState) {
      target = levels[state] ?? idle;
    },
    advance(seconds: number): Readonly<CircuitEnergy> {
      const blend = 1 - Math.exp(-seconds / (target === idle ? 1.4 : 0.8));
      energy.wave += (target.wave - energy.wave) * blend;
      energy.signals += (target.signals - energy.signals) * blend;
      energy.nodes += (target.nodes - energy.nodes) * blend;
      return energy;
    },
  };
}
