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
    advance(seconds: number, audio?: CircuitEnergy, strength = 1): Readonly<CircuitEnergy> {
      const blend = 1 - Math.exp(-seconds / (audio ? 0.07 : target === idle ? 1.4 : 0.8));
      const level = (base: number, selected: number, amplitude?: number) =>
        Math.min(
          0.92,
          base + strength * (amplitude === undefined ? selected - base : amplitude * (0.92 - base)),
        );
      energy.wave += (level(idle.wave, target.wave, audio?.wave) - energy.wave) * blend;
      energy.signals +=
        (level(idle.signals, target.signals, audio?.signals) - energy.signals) * blend;
      energy.nodes += (level(idle.nodes, target.nodes, audio?.nodes) - energy.nodes) * blend;
      return energy;
    },
  };
}
