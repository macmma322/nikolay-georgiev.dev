import type { CircuitEnergy } from './circuit-reactivity';

export type ReactivityMode = 'ambient' | 'player' | 'live';
export const electricalInput: {
  mode: ReactivityMode;
  strength: number;
  audio: CircuitEnergy | undefined;
} = { mode: 'ambient', strength: 1, audio: undefined };
