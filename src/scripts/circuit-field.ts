import { circuitHeight, circuitWidth, makeCircuitBoard, type Trace } from '@/lib/circuit-board';
import { createCircuitReactivity } from './circuit-reactivity';
import { observePlaybackState } from './playback-state';

const palette = ['214,143,94', '239,179,99', '167,135,214'] as const;
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
    // The independently developed footer owns its skyline, avatar and crowd.
    // Move only this decorative layer to the back of the stage when it exists.
    if (this.dataset['place'] === 'footer') {
      const stage = this.closest('footer')?.querySelector('[data-street] [data-stage]');
      if (stage && this.parentElement !== stage) {
        stage.prepend(this);
        return;
      }
    }
    const canvas = this.querySelector('canvas');
    const context = canvas?.getContext('2d');
    if (!canvas || !context || !('IntersectionObserver' in window) || !('ResizeObserver' in window))
      return;

    const traces = makeCircuitBoard(Number(this.dataset['seed'])).map(measureTrace);
    const reactivity = createCircuitReactivity();
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const panel = this.closest('dialog');
    let visible = false;
    let frame = 0;
    let last = 0;
    let time = 0;
    let mobile = false;
    let scale = 1;
    let offsetX = 0;
    let offsetY = 0;

    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);
      const elapsed = now - last;
      if (elapsed < interval) return;
      last = now;
      const step = Math.min(elapsed / 1000, 0.08);
      const energy = reactivity.advance(step);
      time += step * (0.62 + energy.signals * 0.82);

      context.setTransform(1, 0, 0, 1, 0, 0);
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.setTransform(scale, 0, 0, scale, offsetX, offsetY);

      // A diffuse envelope, short moving trace segments and small terminal lights.
      const bank = circuitWidth * (0.5 + Math.sin(time * 0.27) * 0.34);
      const wash = context.createRadialGradient(bank, 145, 0, bank, 145, 225);
      wash.addColorStop(0, `rgba(176,100,88,${0.1 * energy.wave})`);
      wash.addColorStop(1, 'rgba(176,100,88,0)');
      context.fillStyle = wash;
      context.fillRect(bank - 225, 0, 450, circuitHeight);

      const count = Math.round((mobile ? 3 : 5) + energy.signals * (mobile ? 5 : 11));
      context.lineCap = 'round';
      for (let index = 0; index < count; index++) {
        const trace = traces[(index * 7 + Math.floor(time / 12) * 3) % traces.length]!;
        const progress = (time * (0.085 + (index % 4) * 0.021) + index * 0.217) % 1;
        const fade = Math.sin(Math.PI * progress);
        const head = trace.at(trace.length * progress);
        const tail = trace.at(trace.length * Math.max(0, progress - 0.07));
        const tone = palette[trace.tone];
        context.beginPath();
        context.moveTo(tail.x, tail.y);
        for (let bend = tail.index; bend < head.index; bend++) {
          const [x, y] = trace.points[bend]!;
          context.lineTo(x, y);
        }
        context.lineTo(head.x, head.y);
        context.lineWidth = 4;
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
        last = performance.now();
        frame = requestAnimationFrame(tick);
      } else if (!running && frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    };

    const resize = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const { width, height } = entry.contentRect;
      if (!width || !height) return;
      const density = Math.min(window.devicePixelRatio || 1, 1.5, 1800 / width);
      canvas.width = Math.round(width * density);
      canvas.height = Math.round(height * density);
      scale = Math.max(canvas.width / circuitWidth, canvas.height / circuitHeight);
      offsetX = (canvas.width - circuitWidth * scale) / 2;
      offsetY = (canvas.height - circuitHeight * scale) / 2;
      mobile = width < 600;
    });
    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? false;
      sync();
    });
    const unobserve = observePlaybackState((state) => {
      this.dataset['playback'] = state;
      reactivity.setState(state);
    });
    const events = new AbortController();
    const { signal } = events;
    motion.addEventListener('change', sync, { signal });
    document.addEventListener('visibilitychange', sync, { signal });
    resize.observe(this);
    intersection.observe(this);

    this.#dispose = () => {
      cancelAnimationFrame(frame);
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
