import {
  backdropHeight,
  circuitHeight,
  circuitWidth,
  makeBackdropBoard,
  makeCircuitBoard,
  type Trace,
} from '@/lib/circuit-board';
import { createCircuitReactivity } from './circuit-reactivity';
import { observePlaybackState, type PlaybackState } from './playback-state';
import {
  getQualityTier,
  observeQualityTier,
  sampleScrollEnergy,
  watchCircuitClock,
  watchScrollEnergy,
  type QualityTier,
} from './circuit-clock';
import { electricalInput } from './electrical-input';

const palette = ['214,143,94', '239,179,99', '167,135,214'] as const;
const backgroundPalette = ['221,96,70', '205,126,85', '153,122,175'] as const;

interface MeasuredTrace {
  points: readonly (readonly [number, number])[];
  offsets: Float32Array;
  tone: 0 | 1 | 2;
  length: number;
}

interface SamplePoint {
  x: number;
  y: number;
  index: number;
}

function measureTrace(trace: Trace): MeasuredTrace {
  const points = trace.feed ? [...trace.feed, ...trace.points] : trace.points;
  const offsets = new Float32Array(points.length);
  let length = 0;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1]!;
    const curr = points[i]!;
    length += Math.hypot(curr[0] - prev[0], curr[1] - prev[1]);
    offsets[i] = length;
  }
  return { points, offsets, tone: trace.tone, length };
}

function sampleTrace(trace: MeasuredTrace, distance: number, out: SamplePoint) {
  const { offsets, points } = trace;
  const lastIdx = points.length - 1;
  let index = lastIdx;
  for (let i = 1; i <= lastIdx; i++) {
    if (offsets[i]! >= distance) {
      index = i;
      break;
    }
  }
  const from = points[index - 1]!;
  const to = points[index]!;
  const segLen = offsets[index]! - offsets[index - 1]!;
  const fraction = segLen > 0 ? (distance - offsets[index - 1]!) / segLen : 0;
  out.x = from[0] + (to[0] - from[0]) * fraction;
  out.y = from[1] + (to[1] - from[1]) * fraction;
  out.index = index;
}

/** Shared cache of measured circuit trace geometry keyed by board kind and seed. */
const traceCache = new Map<string, readonly MeasuredTrace[]>();
function getMeasuredTraces(background: boolean, seed: number): readonly MeasuredTrace[] {
  const key = `${background ? 'bg' : 'fg'}:${seed}`;
  let cached = traceCache.get(key);
  if (!cached) {
    cached = (background ? makeBackdropBoard(seed) : makeCircuitBoard(seed)).map(measureTrace);
    traceCache.set(key, cached);
  }
  return cached;
}

/** Shared pre-rendered soft glow sprite so ticks never allocate CanvasGradients. */
let glowSprite: HTMLCanvasElement | undefined;
function getGlowSprite() {
  if (glowSprite) return glowSprite;
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const g = c.getContext('2d');
  if (g) {
    const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, 'rgba(176,100,88,1)');
    grad.addColorStop(1, 'rgba(176,100,88,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
  }
  glowSprite = c;
  return c;
}

class CircuitField extends HTMLElement {
  #dispose: (() => void) | undefined;

  connectedCallback() {
    if (this.#dispose) return;
    const canvas = this.querySelector('canvas');
    if (!canvas || !('IntersectionObserver' in window) || !('ResizeObserver' in window)) return;

    const seed = Number(this.dataset['seed']);
    const place = this.dataset['place'] ?? '';
    const background = place === 'background';
    const footer = place === 'footer';
    const designHeight = background ? backdropHeight : circuitHeight;
    const colors = background ? backgroundPalette : palette;
    const head: SamplePoint = { x: 0, y: 0, index: 1 };
    const tail: SamplePoint = { x: 0, y: 0, index: 1 };

    // Lazily allocated on the first active draw tick so offscreen fields cost ~0ms at startup.
    let context: CanvasRenderingContext2D | null = null;
    let traces: readonly MeasuredTrace[] | undefined;
    let glow: HTMLCanvasElement | undefined;
    let resizeObserving = false;
    let bufferDirty = true;

    let playback: PlaybackState = 'idle';
    let quality: QualityTier = getQualityTier();
    const reactivity = createCircuitReactivity();
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const panel = this.closest('dialog');
    let visible = false;
    let occluded = false;
    let frame: (() => void) | undefined;
    let unwatchScroll: (() => void) | undefined;
    let last = 0;
    let time = 0;
    let mobile = false;
    let scale = 1;
    let offsetX = 0;
    let offsetY = 0;
    let width = 0;
    let height = 0;
    let contact: { x: number; y: number; at: number } | undefined;

    const frameInterval = () => {
      if (footer) {
        if (quality === 'low') return 220;
        if (quality === 'balanced') return 120;
        return 55;
      }
      if (quality === 'low') return background ? 120 : 90;
      if (quality === 'balanced') return background ? 68 : 50;
      return background ? (mobile ? 76 : 48) : 1000 / 30;
    };

    const sizeBuffer = () => {
      if (!visible || occluded || motion.matches) return;
      if (!width || !height) {
        const rect = this.getBoundingClientRect();
        width = rect.width;
        height = rect.height;
      }
      if (!width || !height) return;
      bufferDirty = false;
      mobile = width < 600;
      const qualityCap = quality === 'low' ? 0.8 : quality === 'balanced' ? 1 : mobile ? 1 : 1.25;
      const maxWidth = footer
        ? quality === 'low'
          ? 560
          : quality === 'balanced'
            ? 720
            : 1080
        : background
          ? 1280
          : 1440;
      const areaCap = footer
        ? quality === 'low'
          ? 100_000
          : quality === 'balanced'
            ? 160_000
            : 340_000
        : background
          ? 650_000
          : 750_000;
      const density = Math.min(
        window.devicePixelRatio || 1,
        qualityCap,
        maxWidth / width,
        Math.sqrt(areaCap / (width * height)),
      );
      const w = Math.max(1, Math.round(width * density));
      const h = Math.max(1, Math.round(height * density));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      scale = Math.max(w / circuitWidth, h / designHeight);
      offsetX = (w - circuitWidth * scale) / 2;
      offsetY = (h - designHeight * scale) / 2;
    };

    const tick = (now: number) => {
      const elapsed = now - last;
      if (elapsed < frameInterval()) return;
      last = now;
      if (!context) {
        context = canvas.getContext('2d');
        if (!context) return;
      }
      if (!traces) traces = getMeasuredTraces(background, seed);
      if (!glow) glow = getGlowSprite();
      if (bufferDirty) {
        sizeBuffer();
        return;
      }
      if (!width || !height) return;
      const step = Math.min(elapsed / 1000, 0.08);
      const { mode, strength, audio } = electricalInput;
      reactivity.setState(mode === 'player' ? playback : 'idle');
      const energy = reactivity.advance(step, mode === 'live' ? audio : undefined, strength);
      if (this.dataset['reactivity'] !== mode) this.dataset['reactivity'] = mode;

      // Scroll-reactive surge on the living motherboard (zero layout reads).
      let scrollBoost = 0;
      let scrollPhase = 0;
      if (background) {
        const s = sampleScrollEnergy(step);
        scrollBoost = s.impulse * 0.55;
        scrollPhase = s.offset * 0.00045;
      }

      const waveEnergy = Math.min(0.95, energy.wave + scrollBoost * 0.45);
      const signalEnergy = Math.min(0.95, energy.signals + scrollBoost * 0.65);
      const nodeEnergy = Math.min(0.95, energy.nodes + scrollBoost * 0.55);

      time += step * (0.57 + waveEnergy * 0.38 + signalEnergy * 0.82);

      context.setTransform(1, 0, 0, 1, 0, 0);
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.setTransform(scale, 0, 0, scale, offsetX, offsetY);

      if (contact) {
        const progress = (now - contact.at) / 720;
        if (progress >= 1) contact = undefined;
        else {
          const x = (contact.x * canvas.width - offsetX) / scale;
          const y = (contact.y * canvas.height - offsetY) / scale;
          context.beginPath();
          context.arc(x, y, 2 + progress * 15, 0, Math.PI * 2);
          context.lineWidth = 1.8;
          context.strokeStyle = `rgba(239,179,99,${0.8 * (1 - progress)})`;
          context.stroke();
        }
      }

      // Stamp cached radial glow sprite (zero per-frame gradient allocations).
      const bank = circuitWidth * (0.5 + Math.sin(time * 0.27 + scrollPhase) * 0.34);
      context.globalAlpha = (background ? 0.13 : 0.18) * waveEnergy;
      context.drawImage(glow, bank - 225, designHeight / 2 - 225, 450, 450);
      context.globalAlpha = 1;

      const qualityScale = quality === 'low' ? 0.5 : quality === 'balanced' ? 0.72 : 1;
      const baseCount = Math.round((mobile ? 3 : 5) + signalEnergy * (mobile ? 5 : 11));
      const count = Math.max(2, Math.round(baseCount * qualityScale));
      const traceShift = Math.floor(time / 12 + scrollPhase * 2) * 3;
      const glowWidth = 2.4 + waveEnergy * 3;
      const glowAlphaFactor = 0.1 + waveEnergy * 0.14;
      const coreAlphaFactor = 0.32 + signalEnergy * 0.43;
      const nodeAlphaFactor = 0.22 + nodeEnergy * 0.58;

      context.lineCap = 'round';
      const traceCount = traces.length;
      for (let index = 0; index < count; index++) {
        const traceIndex = (((index * 7 + traceShift) % traceCount) + traceCount) % traceCount;
        const trace = traces[traceIndex]!;
        const progress =
          (time * (0.085 + (index % 4) * 0.021) + index * 0.217 + scrollPhase * 0.25) % 1;
        const fade = Math.sin(Math.PI * progress);
        sampleTrace(trace, trace.length * progress, head);
        sampleTrace(trace, trace.length * Math.max(0, progress - 0.07), tail);

        // Attenuate footer traces smoothly near the bottom so canvas needs no CSS mask-image.
        const verticalFade = footer
          ? Math.max(0, Math.min(1, (designHeight * 0.92 - head.y) / (designHeight * 0.26)))
          : 1;
        if (verticalFade <= 0.02) continue;

        const tone = colors[trace.tone];
        context.beginPath();
        context.moveTo(tail.x, tail.y);
        for (let bend = tail.index; bend < head.index; bend++) {
          const pt = trace.points[bend]!;
          context.lineTo(pt[0], pt[1]);
        }
        context.lineTo(head.x, head.y);
        if (quality !== 'low') {
          context.lineWidth = glowWidth;
          context.strokeStyle = `rgba(${tone},${fade * verticalFade * glowAlphaFactor})`;
          context.stroke();
        }
        context.lineWidth = 1.15;
        context.strokeStyle = `rgba(${tone},${fade * verticalFade * coreAlphaFactor})`;
        context.stroke();

        const end = trace.points[trace.points.length - 1]!;
        const terminal = Math.max(0, (progress - 0.79) / 0.21);
        if (terminal > 0) {
          context.beginPath();
          context.arc(end[0], end[1], 1.8 + terminal * 1.3, 0, Math.PI * 2);
          context.fillStyle = `rgba(${tone},${terminal * verticalFade * nodeAlphaFactor})`;
          context.fill();
        }
      }
    };

    const sync = () => {
      const active = visible && !document.hidden && !motion.matches && (panel?.open ?? true);
      const drawing = active && !occluded;
      this.toggleAttribute('data-running', active);
      if (drawing && !frame) {
        if (!resizeObserving) {
          resizeObserving = true;
          resize.observe(this);
        }
        bufferDirty = true;
        last = performance.now() - (background ? frameInterval() : 0);
        frame = watchCircuitClock(tick, { priority: background ? 'low' : 'normal' });
        if (background && !unwatchScroll) unwatchScroll = watchScrollEnergy();
      } else if (!drawing && frame) {
        frame();
        frame = undefined;
        unwatchScroll?.();
        unwatchScroll = undefined;
        canvas.width = 1;
        canvas.height = 1;
        bufferDirty = true;
      }
    };

    const resize = new ResizeObserver(([entry]) => {
      if (!entry) return;
      width = entry.contentRect.width;
      height = entry.contentRect.height;
      bufferDirty = true;
      if (frame) sizeBuffer();
    });
    const intersection = new IntersectionObserver(
      ([entry]) => {
        visible = entry?.isIntersecting ?? false;
        sync();
      },
      { threshold: [0, 0.25, 0.5, 1] },
    );

    // Pause background canvas drawing when the opaque street footer enters the viewport.
    let occlusionObserver: IntersectionObserver | undefined;
    if (background) {
      const opaqueFooter = document.querySelector<HTMLElement>(
        '.site-footer:not(.bare) [data-stage]',
      );
      if (opaqueFooter) {
        const footerRect = opaqueFooter.getBoundingClientRect();
        const vh = window.innerHeight || document.documentElement.clientHeight;
        if (footerRect.height > 0 && footerRect.top < vh) {
          const visibleFooter = Math.max(
            0,
            Math.min(vh, footerRect.bottom) - Math.max(0, footerRect.top),
          );
          occluded = visibleFooter / Math.min(footerRect.height, vh) >= 0.2;
        }
        occlusionObserver = new IntersectionObserver(
          ([entry]) => {
            occluded = (entry?.intersectionRatio ?? 0) >= 0.2;
            sync();
          },
          { threshold: [0, 0.2, 0.45, 0.8] },
        );
        occlusionObserver.observe(opaqueFooter);
      }
    }

    const unobserve = observePlaybackState((state) => {
      this.dataset['playback'] = state;
      playback = state;
    });
    const unobserveQuality = observeQualityTier((tier) => {
      quality = tier;
      bufferDirty = true;
      if (frame) sizeBuffer();
    });
    const events = new AbortController();
    const { signal } = events;
    if (place === 'avatar-pad') {
      this.addEventListener(
        'avatar-contact',
        (event) => {
          if (!frame || !width || !height) return;
          const { x, y } = (event as CustomEvent<{ x: number; y: number }>).detail;
          const box = this.getBoundingClientRect();
          contact = {
            x: (x - box.left) / box.width,
            y: (y - box.top) / box.height,
            at: performance.now(),
          };
        },
        { signal },
      );
    }
    motion.addEventListener('change', sync, { signal });
    document.addEventListener('visibilitychange', sync, { signal });
    intersection.observe(this);

    this.#dispose = () => {
      frame?.();
      unwatchScroll?.();
      events.abort();
      resize.disconnect();
      intersection.disconnect();
      occlusionObserver?.disconnect();
      unobserve();
      unobserveQuality();
      this.removeAttribute('data-running');
    };
  }

  disconnectedCallback() {
    this.#dispose?.();
    this.#dispose = undefined;
  }
}

if (!customElements.get('circuit-field')) customElements.define('circuit-field', CircuitField);
