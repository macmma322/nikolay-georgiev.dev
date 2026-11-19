import { createAudioSpectrum } from './audio-spectrum';
import { watchCircuitClock } from './circuit-clock';
import { electricalInput } from './electrical-input';

export type AudioSource = File | URL | 'demo';
type AudioNotice = 'running' | 'paused' | 'ended' | 'unavailable';

function demo(context: AudioContext) {
  const sampleRate = 24000;
  const buffer = context.createBuffer(1, sampleRate * 8, sampleRate);
  const channel = buffer.getChannelData(0);
  for (let index = 0; index < channel.length; index++) {
    const seconds = index / sampleRate;
    const phase = seconds % 0.625;
    const envelope = Math.min(1, phase * 220) * Math.exp(-phase * 9);
    if (seconds < 2.5) channel[index] = 0.35 * envelope * Math.sin(2 * Math.PI * 64 * seconds);
    else if (seconds < 5) channel[index] = 0.22 * envelope * Math.sin(2 * Math.PI * 520 * seconds);
    else if (seconds < 7.5)
      channel[index] = 0.19 * envelope * Math.sin(2 * Math.PI * 4200 * seconds);
  }
  const player = context.createBufferSource();
  player.buffer = buffer;
  player.loop = true;
  return player;
}

/** A fresh graph per opt-in session. File object URLs stay in this document.
 * URL callers must pass a site-approved source that authorizes CORS. */
export function createLiveCircuitAudio(
  source: AudioSource,
  notice: (state: AudioNotice) => void,
  signal: (band: 'silence' | 'bass' | 'mid' | 'high') => void,
) {
  const context = new AudioContext();
  const analyser = context.createAnalyser();
  analyser.fftSize = 2048;
  analyser.minDecibels = -86;
  analyser.maxDecibels = -24;
  analyser.smoothingTimeConstant = 0.45;
  const analyse = createAudioSpectrum(analyser, context.sampleRate);
  const output = context.createGain();
  output.gain.value = source === 'demo' ? 0.33 : 1;
  analyser.connect(output).connect(context.destination);

  const tone = source === 'demo' ? demo(context) : undefined;
  const audio = source === 'demo' ? undefined : new Audio();
  const objectUrl = source instanceof File ? URL.createObjectURL(source) : undefined;
  const media = audio ? context.createMediaElementSource(audio) : undefined;
  if (audio) {
    audio.crossOrigin = 'anonymous';
    audio.preload = 'auto';
    audio.src = objectUrl ?? String(source);
  }
  (tone ?? media)?.connect(analyser);

  let disposed = false;
  let running = false;
  let started = false;
  let clock: (() => void) | undefined;
  let last = 0;
  const events = new AbortController();
  const sync = () => {
    if (running && !document.hidden && !clock) {
      last = performance.now();
      clock = watchCircuitClock((now) => {
        const elapsed = now - last;
        if (elapsed < 40) return;
        last = now;
        const { energy, dominant } = analyse(Math.min(elapsed / 1000, 0.15));
        electricalInput.audio = energy;
        signal(dominant);
      });
    } else if ((!running || document.hidden) && clock) {
      clock();
      clock = undefined;
      electricalInput.audio = undefined;
    }
  };

  const stop = () => {
    if (disposed) return;
    disposed = true;
    running = false;
    sync();
    events.abort();
    electricalInput.audio = undefined;
    audio?.pause();
    if (audio) {
      audio.removeAttribute('src');
      audio.load();
    }
    if (started) tone?.stop();
    tone?.disconnect();
    media?.disconnect();
    analyser.disconnect();
    output.disconnect();
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    void context.close().catch(() => {});
  };
  const finish = (state: 'ended' | 'unavailable') => {
    if (disposed) return;
    stop();
    notice(state);
  };
  document.addEventListener('visibilitychange', sync, { signal: events.signal });
  audio?.addEventListener('ended', () => finish('ended'), { signal: events.signal });
  audio?.addEventListener('error', () => finish('unavailable'), { signal: events.signal });

  return {
    async resume() {
      if (disposed) return;
      try {
        await Promise.all([context.resume(), audio?.play()]);
        if (disposed) return;
        if (!started && tone) {
          tone.start();
          started = true;
        }
        running = true;
        sync();
        notice('running');
      } catch {
        finish('unavailable');
      }
    },
    pause() {
      if (disposed) return;
      running = false;
      sync();
      audio?.pause();
      void context.suspend().catch(() => {});
      notice('paused');
    },
    stop,
  };
}
