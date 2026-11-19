import { clips, loadClip } from './clips';
import { sequence, type Pose } from './choreography';
import { observePlaybackState } from '../playback-state';

const preference = 'nikolay.avatar.motion';
type Anchor = { element: HTMLElement; pose: Pose };

function overlaps(a: DOMRect, b: DOMRect) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

// Use the actual text runs: the blank half of a bilingual grid cell is usable.
function obstructs(rect: DOMRect, scope: Element) {
  for (const el of scope.querySelectorAll(
    'a, button, input, h1, h2, h3, p, dt, dd, .plate-fig, .plate-strip',
  )) {
    if (
      el.closest('[data-avatar-anchor], [aria-hidden=true]:not(.project-plate)') ||
      el.classList.contains('visually-hidden')
    )
      continue;
    if (!overlaps(rect, el.getBoundingClientRect())) continue;
    if (el.matches('a,button,input')) return true;
    const nodes = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let text = nodes.nextNode(); text; text = nodes.nextNode()) {
      if (!text.textContent?.trim()) continue;
      const range = document.createRange();
      range.selectNodeContents(text);
      if ([...range.getClientRects()].some((box) => overlaps(rect, box))) return true;
    }
  }
  return false;
}

class AvatarRuntime extends HTMLElement {
  #cleanup: (() => void) | undefined;
  connectedCallback() {
    if (this.#cleanup) return;
    const toggle = this.querySelector<HTMLButtonElement>('[data-avatar-toggle]');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx || !toggle || !('IntersectionObserver' in window) || !('ResizeObserver' in window))
      return;
    canvas.setAttribute('aria-hidden', 'true');
    canvas.className = 'avatar-drawing';
    const bubble = document.createElement('button');
    bubble.type = 'button';
    bubble.className = 'avatar-remark';
    bubble.title = this.dataset['dismiss']!;
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const anchors: Anchor[] = Array.from(
      document.querySelectorAll<HTMLElement>('[data-avatar-anchor]'),
      (element) => ({
        element,
        pose: element.dataset['pose'] as Pose,
      }),
    );
    const stage = document.querySelector<HTMLElement>('[data-street] [data-stage]');
    const visible = new Set<Element>();
    const skipped = new Set<Anchor>();
    const visits = new Map<Anchor, number>();
    const said = new Set<string>();
    const events = new AbortController();
    const { signal } = events;
    let active: Anchor | undefined,
      token = 0,
      timer = 0,
      remarkTimer = 0,
      pending = 0;
    let lastEgg = -Infinity,
      lastRemark = -Infinity,
      playing = false,
      disabled = false;
    try {
      disabled = localStorage.getItem(preference) === 'off';
    } catch {
      /* private session */
    }
    // Keep remarks quiet across ordinary full-page case-study navigation.
    try {
      for (const line of JSON.parse(sessionStorage.getItem('avatar.remarks') ?? '[]')) {
        if (typeof line === 'string') said.add(line);
      }
      const saved = Number(sessionStorage.getItem('avatar.last-remark'));
      if (saved > 0) lastRemark = performance.now() - (Date.now() - saved);
    } catch {
      /* Storage can be disabled. */
    }

    const scope = (a: Anchor) =>
      a.element.closest('article.chapter,.case-hero,.hero,.finale,section') ??
      a.element.parentElement!;
    const header = document.querySelector('.site-header');
    function dismiss() {
      clearTimeout(remarkTimer);
      bubble.remove();
    }
    function cancel() {
      token++;
      clearTimeout(timer);
      dismiss();
      canvas.getAnimations().forEach((animation) => animation.cancel());
      canvas.remove();
      active = undefined;
      delete document.documentElement.dataset['avatarAway'];
    }
    function safe(anchor: Anchor) {
      const rect = anchor.element.getBoundingClientRect();
      return (
        rect.width > 0 &&
        rect.height > 0 &&
        rect.top >= (header?.getBoundingClientRect().bottom ?? 0) &&
        rect.bottom <= innerHeight &&
        rect.left >= 0 &&
        rect.right <= document.documentElement.clientWidth &&
        !obstructs(rect, scope(anchor))
      );
    }
    function speak(anchor: Anchor, line: string) {
      if (!line || said.has(line) || performance.now() - lastRemark < 45000) return;
      bubble.textContent = line + ' ×';
      bubble.setAttribute('aria-label', line + ' — ' + bubble.title);
      delete bubble.dataset['align'];
      anchor.element.append(bubble);
      let r = bubble.getBoundingClientRect();
      if (r.right > innerWidth - 4 || r.left < 4) {
        bubble.dataset['align'] = r.left < 4 ? 'start' : 'end';
        r = bubble.getBoundingClientRect();
      }
      if (
        r.left < 4 ||
        r.right > innerWidth - 4 ||
        r.top < (header?.getBoundingClientRect().bottom ?? 4) ||
        obstructs(r, scope(anchor))
      ) {
        dismiss();
        return;
      }
      said.add(line);
      lastRemark = performance.now();
      try {
        sessionStorage.setItem('avatar.remarks', JSON.stringify([...said]));
        sessionStorage.setItem('avatar.last-remark', String(Date.now()));
      } catch {
        /* Keep the per-page cooldown. */
      }
      remarkTimer = window.setTimeout(dismiss, 4200);
    }
    const musicLine = this.dataset['music']!;
    function play(anchor: Anchor) {
      if (anchor.pose === 'peek') {
        if (visits.has(anchor) || performance.now() - lastEgg < 75000 || Math.random() >= 0.14) {
          skipped.add(anchor);
          schedule();
          return;
        }
        lastEgg = performance.now();
      }
      active = anchor;
      const generation = ++token;
      const previous = visits.get(anchor);
      const returning = previous !== undefined && performance.now() - previous < 60000;
      const rare =
        anchor.pose === 'sit' &&
        !returning &&
        performance.now() - lastEgg > 75000 &&
        (playing || Math.random() < 0.12);
      if (rare) lastEgg = performance.now();
      const bounds = anchor.element.getBoundingClientRect();
      const shortTrack = anchor.pose === 'walk' && bounds.width < bounds.height * 2.7;
      const choreography = sequence(anchor.pose, returning || shortTrack, rare);
      const plan = returning ? choreography.slice(-1) : choreography;
      async function draw(i: number) {
        const step = plan[i];
        if (!step || generation !== token) return;
        const img = await loadClip(step.clip);
        if (generation !== token || !anchor.element.isConnected) return;
        const { width, height } = anchor.element.getBoundingClientRect();
        if (!width || !height) {
          cancel();
          return;
        }
        const density = Math.min(2, devicePixelRatio || 1);
        const w = Math.round(width * density),
          h = Math.round(height * density);
        if (canvas.width !== w || canvas.height !== h) {
          canvas.width = w;
          canvas.height = h;
        }
        const clip = clips[step.clip],
          sw = img.naturalWidth / clip.frames;
        let drawHeight = h;
        if (anchor.pose === 'peek') drawHeight = h / 0.32;
        if (anchor.pose === 'sit') drawHeight = h / 1.12;
        const dw = (drawHeight * sw) / img.naturalHeight;
        let x = (w - dw) / 2,
          y = 0;
        if (anchor.pose === 'walk') {
          const stride = h * 1.96;
          const center = w / 2 + ((step.x ?? 0.5) - 0.5) * Math.min(stride * 0.96, w - h * 0.81);
          x = center - dw / 2;
          y = h * (0.99 - clip.contact);
        } else if (anchor.pose === 'sit') {
          const seat = step.clip === 'listen' && step.index >= 3 ? 0.68 : clip.contact;
          y = h * 0.625 - drawHeight * seat;
        }
        ctx!.clearRect(0, 0, w, h);
        ctx!.save();
        if (step.state === 'walk-left' || step.mirror) {
          ctx!.translate(2 * x + dw, 0);
          ctx!.scale(-1, 1);
        }
        ctx!.drawImage(img, step.index * sw, 0, sw, img.naturalHeight, x, y, dw, drawHeight);
        ctx!.restore();
        canvas.dataset['state'] = step.state;
        canvas.dataset['frame'] = String(step.index);
        if (canvas.parentElement !== anchor.element) {
          anchor.element.prepend(canvas);
          document.documentElement.dataset['avatarAway'] = '';
          visits.set(anchor, performance.now());
          if (anchor.pose === 'peek')
            canvas.animate([{ transform: 'translateY(100%)' }, { transform: 'translateY(0)' }], {
              duration: 340,
              easing: 'ease-out',
            });
        }
        if (step.state === 'exit') {
          canvas.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(100%)' }], {
            duration: 250,
            fill: 'forwards',
          });
          timer = window.setTimeout(() => {
            skipped.add(anchor);
            cancel();
            schedule();
          }, 250);
          return;
        }
        if (step.state === 'interact' && anchor.pose === 'inspect' && !returning) {
          const field = anchor.element.parentElement?.querySelector('circuit-field');
          const box = anchor.element.getBoundingClientRect();
          field?.dispatchEvent(
            new CustomEvent('avatar-contact', {
              detail: { x: box.left + box.width * 0.75, y: box.top + box.height * 0.92 },
            }),
          );
        }
        if (i === 1 && !returning && (rare || (anchor.pose !== 'walk' && Math.random() < 0.22))) {
          speak(anchor, rare && playing ? musicLine : anchor.element.dataset['line']!);
        }
        if (i + 1 < plan.length) timer = window.setTimeout(() => startFrame(i + 1), step.ms);
      }
      function startFrame(i: number) {
        void draw(i).catch(() => {
          if (generation === token) {
            skipped.add(anchor);
            cancel();
            schedule();
          }
        });
      }
      timer = window.setTimeout(() => startFrame(0), 350);
    }
    function reconcile() {
      pending = 0;
      if (
        disabled ||
        motion.matches ||
        document.hidden ||
        document.querySelector('dialog[open], [role="dialog"]:popover-open') ||
        (stage && visible.has(stage))
      ) {
        cancel();
        return;
      }
      const candidates = anchors.filter(
        (a) => visible.has(a.element) && !skipped.has(a) && safe(a),
      );
      const selected =
        candidates.find((a) => a === active) ??
        candidates.sort((a, b) => {
          const distance = (item: Anchor) =>
            Math.abs(item.element.getBoundingClientRect().top - innerHeight * 0.45);
          return distance(a) - distance(b);
        })[0];
      if (active !== selected) {
        cancel();
        if (selected) play(selected);
      } else if (
        active &&
        bubble.isConnected &&
        obstructs(bubble.getBoundingClientRect(), scope(active))
      )
        dismiss();
    }
    function schedule() {
      if (!pending) pending = requestAnimationFrame(reconcile);
    }
    function syncPreference() {
      toggle!.hidden = false;
      toggle!.disabled = motion.matches;
      toggle!.setAttribute('aria-pressed', String(!disabled && !motion.matches));
      document.documentElement.toggleAttribute('data-avatar-still', disabled || motion.matches);
      cancel();
      schedule();
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) visible.add(e.target);
          else visible.delete(e.target);
        }
        schedule();
      },
      { threshold: [0, 0.5, 1] },
    );
    for (const anchor of anchors) observer.observe(anchor.element);
    if (stage) observer.observe(stage);
    const resize = new ResizeObserver((entries) => {
      if (active && entries.some((entry) => entry.target === active?.element)) cancel();
      schedule();
    });
    resize.observe(document.body);
    for (const anchor of anchors) resize.observe(anchor.element);
    // Handle scroll within the visibility thresholds, sticky headers and zoom.
    window.addEventListener('scroll', schedule, { passive: true, signal });
    window.addEventListener('resize', schedule, { signal });
    document.addEventListener(
      'visibilitychange',
      () => {
        if (document.hidden) cancel();
        else schedule();
      },
      { signal },
    );
    document.addEventListener('toggle', schedule, { capture: true, signal });
    motion.addEventListener('change', syncPreference, { signal });
    const unwatch = observePlaybackState((state) => {
      playing = state === 'playing';
    });
    bubble.addEventListener('click', dismiss, { signal });
    document.addEventListener(
      'keydown',
      (e) => {
        if (e.key === 'Escape') dismiss();
      },
      { signal },
    );
    toggle.addEventListener(
      'click',
      () => {
        disabled = !disabled;
        try {
          localStorage.setItem(preference, disabled ? 'off' : 'on');
        } catch {
          /* in-memory preference */
        }
        syncPreference();
      },
      { signal },
    );
    window.addEventListener(
      'storage',
      (e) => {
        if (e.key === preference || e.key === null) {
          disabled = e.newValue === 'off';
          syncPreference();
        }
      },
      { signal },
    );
    syncPreference();
    this.#cleanup = () => {
      events.abort();
      observer.disconnect();
      resize.disconnect();
      unwatch();
      cancel();
      cancelAnimationFrame(pending);
    };
  }
  disconnectedCallback() {
    this.#cleanup?.();
    this.#cleanup = undefined;
  }
}
if (!customElements.get('avatar-runtime')) customElements.define('avatar-runtime', AvatarRuntime);
