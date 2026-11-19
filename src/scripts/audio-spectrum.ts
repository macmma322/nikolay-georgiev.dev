import type { CircuitEnergy } from './circuit-reactivity';

const clamp = (value: number) => Math.max(0, Math.min(1, value));

// Compute the bin ranges once. Peaks preserve narrow tones, and the
// broadband energy prevents a single quiet bin from driving the circuit.
export function createAudioSpectrum(analyser: AnalyserNode, sampleRate: number) {
  const spectrum = new Uint8Array(analyser.frequencyBinCount);
  const waveform = new Float32Array(analyser.fftSize);
  const bands = [
    [30, 230],
    [250, 2200],
    [2500, 9000],
  ].map(([low, high]) => {
    const hz = sampleRate / analyser.fftSize;
    return [
      Math.max(1, Math.ceil(low! / hz)),
      Math.min(spectrum.length - 1, Math.floor(high! / hz)),
    ] as const;
  });
  const energy: CircuitEnergy = { wave: 0, signals: 0, nodes: 0 };
  let peakRms = 0.08;
  let previousBass = 0;
  let transient = 0;
  let sinceOnset = 0.2;

  function readBand([first, last]: readonly [number, number]) {
    let total = 0;
    let peak = 0;
    for (let bin = first; bin <= last; bin++) {
      const value = Math.max(0, (spectrum[bin]! - 42) / 213);
      total += value * value;
      peak = Math.max(peak, value);
    }
    return 0.74 * peak + 0.26 * Math.sqrt(total / Math.max(1, last - first + 1));
  }

  return (seconds: number) => {
    analyser.getFloatTimeDomainData(waveform);
    let power = 0;
    for (const sample of waveform) power += sample * sample;
    const rms = Math.sqrt(power / waveform.length);
    const silent = rms < 0.0025;
    analyser.getByteFrequencyData(spectrum);
    peakRms = Math.max(0.018, rms, peakRms * Math.exp(-seconds / 5));
    const sensitivity = clamp(rms / (peakRms * 0.52));
    const bass = silent ? 0 : readBand(bands[0]!) * sensitivity;
    const mids = silent ? 0 : readBand(bands[1]!) * sensitivity;
    const highs = silent ? 0 : readBand(bands[2]!) * sensitivity;

    sinceOnset += seconds;
    transient *= Math.exp(-seconds / 0.18);
    if (bass - previousBass > 0.19 && bass > 0.28 && sinceOnset > 0.15) {
      transient = 0.43;
      sinceOnset = 0;
    }
    previousBass = bass;

    const follow = (current: number, value: number) => {
      const coefficient = 1 - Math.exp(-seconds / (value > current ? 0.055 : 0.26));
      return current + (value - current) * coefficient;
    };
    energy.wave = follow(energy.wave, clamp(bass + transient));
    energy.signals = follow(energy.signals, clamp(mids));
    energy.nodes = follow(energy.nodes, clamp(highs));
    const dominant = silent
      ? 'silence'
      : bass >= mids && bass >= highs
        ? 'bass'
        : highs > mids
          ? 'high'
          : 'mid';
    return { energy, dominant } as const;
  };
}
