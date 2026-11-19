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
import { watchCircuitClock } from './circuit-clock';
import { electricalInput } from './electrical-input';

const palette = ['214,143,94', '239,179,99', '167,135,214'] as const;
const backgroundPalette = ['221,96,70', '205,126,85', '153,122,175'] as const;
const interval = 1000 / 30;

function measureTrace(trace: Trace) {
  const points = [...(trace.feed ?? []), ...trace.points];
  let length = 0;
  const offsets = points.map(([x, y], index) => {
    const previous = points[index - 1];
    if (previous) length += Math.hypot(x - previous[0], y - previous[1]);
    return length;
  });

  const at = (distance: number) => {
    const edge = offsets.findIndex((offset, index) => index > 0 && offset >= distance);
    const index = edge < 0 ? points.length - 1 : edge;
    const from = points[index - 1]!;
    const to = points[index]!;
    const fraction = (distance - offsets[index - 1]!) / (offsets[index]! - offsets[index - 1]!);
    return {
      x: from[0] + (to[0] - from[0]) * fraction,
      y: from[1] + (to[1] - from[1]) * fraction,
      index,
    };
  };
  return { ...trace, points, length, at };
}

class CircuitField extends HTMLElement {
  #dispose: (() => void) | undefined;

  connectedCallback() {
    if (this.#dispose) return;
    const canvas = this.querySelector('canvas');
    const context = canvas?.getContext('2d');
    if (!canvas || !context || !('IntersectionObserver' in window) || !('ResizeObserver' in window))
      return;

    const seed = Number(this.dataset['seed']);
    const background = this.dataset['place'] === 'background';
    const designHeight = background ? backdropHeight : circuitHeight;
    const traces = (background ? makeBackdropBoard(seed) : makeCircuitBoard(seed)).map(
      measureTrace,
    );
    const colors = background ? backgroundPalette : palette;
    let playback: PlaybackState = 'idle';
    const reactivity = createCircuitReactivity();
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const panel = this.closest('dialog');
    let visible = false;
    let frame: (() => void) | undefined;
    let last = 0;
    let time = 0;
    let mobile = false;
    let scale = 1;
    let offsetX = 0;
    let offsetY = 0;
    let width = 0;
    let height = 0;

    const sizeBuffer = () => {
      if (!visible || !width || !height || motion.matches) return;
      mobile = width < 600;
      const density = Math.min(
        window.devicePixelRatio || 1,
        mobile ? 1 : 1.5,
        (background ? 1440 : 1800) / width,
        Math.sqrt(1_000_000 / (width * height)),
      );
      const w = Math.round(width * density);
      const h = Math.round(height * density);
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
      if (elapsed < (background ? (mobile ? 76 : 48) : interval)) return;
      last = now;
      const step = Math.min(elapsed / 1000, 0.08);
      const { mode, strength, audio } = electricalInput;
      reactivity.setState(mode === 'player' ? playback : 'idle');
      const energy = reactivity.advance(step, mode === 'live' ? audio : undefined, strength);
      if (this.dataset['reactivity'] !== mode) this.dataset['reactivity'] = mode;
      time += step * (0.57 + energy.wave * 0.38 + energy.signals * 0.82);

      context.setTransform(1, 0, 0, 1, 0, 0);
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.setTransform(scale, 0, 0, scale, offsetX, offsetY);

      // A diffuse envelope, short moving trace segments and small terminal lights.
      const bank = circuitWidth * (0.5 + Math.sin(time * 0.27) * 0.34);
      const wash = context.createRadialGradient(
        bank,
        designHeight / 2,
        0,
        bank,
        designHeight / 2,
        225,
      );
      wash.addColorStop(0, `rgba(176,100,88,${(background ? 0.13 : 0.18) * energy.wave})`);
      wash.addColorStop(1, 'rgba(176,100,88,0)');
      context.fillStyle = wash;
      context.fillRect(bank - 225, 0, 450, designHeight);

      const count = Math.round((mobile ? 3 : 5) + energy.signals * (mobile ? 5 : 11));
      context.lineCap = 'round';
      for (let index = 0; index < count; index++) {
        const trace = traces[(index * 7 + Math.floor(time / 12) * 3) % traces.length]!;
        const progress = (time * (0.085 + (index % 4) * 0.021) + index * 0.217) % 1;
        const fade = Math.sin(Math.PI * progress);
        const head = trace.at(trace.length * progress);
        const tail = trace.at(trace.length * Math.max(0, progress - 0.07));
        const tone = colors[trace.tone];
        context.beginPath();
        context.moveTo(tail.x, tail.y);
        for (let bend = tail.index; bend < head.index; bend++) {
          const [x, y] = trace.points[bend]!;
          context.lineTo(x, y);
        }
        context.lineTo(head.x, head.y);
        context.lineWidth = 2.4 + energy.wave * 3;
        context.strokeStyle = `rgba(${tone},${fade * (0.1 + energy.wave * 0.14)})`;
        context.stroke();
        context.lineWidth = 1.15;
        context.strokeStyle = `rgba(${tone},${fade * (0.32 + energy.signals * 0.43)})`;
        context.stroke();

        const end = trace.points.at(-1)!;
        const terminal = Math.max(0, (progress - 0.79) / 0.21);
        if (terminal > 0) {
          context.beginPath();
          context.arc(end[0], end[1], 1.8 + terminal * 1.3, 0, Math.PI * 2);
          context.fillStyle = `rgba(${tone},${terminal * (0.22 + energy.nodes * 0.58)})`;
          context.fill();
        }
      }
    };

    const sync = () => {
      const running = visible && !document.hidden && !motion.matches && (panel?.open ?? true);
      this.toggleAttribute('data-running', running);
      if (running && !frame) {
        sizeBuffer();
        last = performance.now();
        frame = watchCircuitClock(tick);
      } else if (!running && frame) {
        frame();
        frame = undefined;
        canvas.width = 1;
        canvas.height = 1;
      }
    };

    const resize = new ResizeObserver(([entry]) => {
      if (!entry) return;
      width = entry.contentRect.width;
      height = entry.contentRect.height;
      sizeBuffer();
    });
    const intersection = new IntersectionObserver(
      ([entry]) => {
        visible = entry?.isIntersecting ?? false;
        sync();
      },
      { threshold: [0, 0.25, 0.5, 1] },
    );
    const unobserve = observePlaybackState((state) => {
      this.dataset['playback'] = state;
      playback = state;
    });
    const events = new AbortController();
    const { signal } = events;
    motion.addEventListener('change', sync, { signal });
    document.addEventListener('visibilitychange', sync, { signal });
    resize.observe(this);
    intersection.observe(this);

    this.#dispose = () => {
      frame?.();
      events.abort();
      resize.disconnect();
      intersection.disconnect();
      unobserve();
      this.removeAttribute('data-running');
    };
  }

  disconnectedCallback() {
    this.#dispose?.();
    this.#dispose = undefined;
  }
}

if (!customElements.get('circuit-field')) customElements.define('circuit-field', CircuitField);
