import { clips, loadClip, type CharacterState, type Clip } from './clips';
import { idleCycle, sequence, type Pose } from './choreography';
import { observePlaybackState } from '../playback-state';
import { getQualityTier, observeQualityTier, type QualityTier } from '../circuit-clock';

const preference = 'nikolay.avatar.motion';
type Anchor = { element: HTMLElement; pose: Pose };
export type AvatarLifecycle = 'entering' | 'active' | 'exiting' | 'hidden';

type SavedAnchorState = {
  plan: ReturnType<typeof sequence>;
  stepIndex: number;
  isAmbient: boolean;
  clip: Clip;
  frameIndex: number;
  state: CharacterState;
  x?: number | undefined;
  mirror?: boolean | undefined;
  activeMusic: boolean;
  savedAt: number;
};

const ENTER_DURATION_MS = 160;
const EXIT_DURATION_MS = 220;
// Hysteresis ratios: require more visible height to newly enter than to stay active.
const ENTER_TOP_SLACK_RATIO = 0.12;
const ENTER_BOTTOM_SLACK_RATIO = 0.12;
const ACTIVE_MIN_VISIBLE_RATIO = 0.44;
const STEPPING = new Set<CharacterState>(['walk-left', 'walk-right', 'stop', 'turn', 'exit']);

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
    const savedStates = new WeakMap<Anchor, SavedAnchorState>();
    const said = new Set<string>();
    // Cache layout-invariant clearance and sizes; invalidate only on resize, never on scroll.
    let clearance = new WeakMap<Anchor, boolean>();
    const sizes = new WeakMap<Anchor, { width: number; height: number }>();
    const events = new AbortController();
    const { signal } = events;
    const runtimeEl = this;
    let active: Anchor | undefined,
      lastBoundaryAnchor: Anchor | undefined,
      lifecycle: AvatarLifecycle = 'hidden',
      activeMusic = false,
      token = 0,
      timer = 0,
      enterTimer = 0,
      exitTimer = 0,
      remarkTimer = 0,
      pending = 0,
      resumeRunner: (() => void) | undefined;
    let lastEgg = -Infinity,
      lastRemark = -Infinity,
      playing = false,
      disabled = false,
      quality: QualityTier = getQualityTier();
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

    function setLifecycle(next: AvatarLifecycle, target?: Anchor) {
      lifecycle = next;
      runtimeEl.dataset['lifecycle'] = next;
      canvas.dataset['lifecycle'] = next;
      for (const a of anchors) {
        if (a === target && next !== 'hidden') {
          a.element.dataset['lifecycle'] = next;
        } else {
          delete a.element.dataset['lifecycle'];
        }
      }
    }
    setLifecycle('hidden');

    const scope = (a: Anchor) =>
      a.element.closest('article.chapter,.case-hero,.hero,.finale,section') ??
      a.element.parentElement!;
    const header = document.querySelector<HTMLElement>('.site-header');
    let headerBottom = header ? header.getBoundingClientRect().bottom : 0;
    let viewportWidth = document.documentElement.clientWidth;

    function refreshChromeMetrics() {
      headerBottom = header ? header.getBoundingClientRect().bottom : 0;
      viewportWidth = document.documentElement.clientWidth;
      clearance = new WeakMap();
    }

    function dismiss() {
      clearTimeout(remarkTimer);
      bubble.remove();
    }
    function cancel() {
      token++;
      clearTimeout(timer);
      clearTimeout(enterTimer);
      clearTimeout(exitTimer);
      enterTimer = 0;
      exitTimer = 0;
      resumeRunner = undefined;
      dismiss();
      canvas.getAnimations().forEach((animation) => animation.cancel());
      delete canvas.dataset['idleBreathe'];
      delete canvas.dataset['exitDir'];
      canvas.remove();
      active = undefined;
      activeMusic = false;
      setLifecycle('hidden');
      delete document.documentElement.dataset['avatarAway'];
    }
    function isClear(anchor: Anchor, rect: DOMRect) {
      const cached = clearance.get(anchor);
      if (cached !== undefined) return cached;
      const clear = !obstructs(rect, scope(anchor));
      clearance.set(anchor, clear);
      return clear;
    }
    function canEnter(anchor: Anchor) {
      const rect = anchor.element.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return false;
      if (rect.left < 0 || rect.right > viewportWidth) return false;
      if (!isClear(anchor, rect)) return false;
      // Hysteresis recovery band for an anchor returning from a boundary scroll exit.
      if (anchor === lastBoundaryAnchor && savedStates.has(anchor)) {
        const recoverVisible = rect.height * (ACTIVE_MIN_VISIBLE_RATIO + 0.1);
        return (
          rect.bottom >= headerBottom + recoverVisible && rect.top <= innerHeight - recoverVisible
        );
      }
      const topSlack = Math.min(14, rect.height * ENTER_TOP_SLACK_RATIO);
      const bottomSlack = Math.min(14, rect.height * ENTER_BOTTOM_SLACK_RATIO);
      return rect.top >= headerBottom - topSlack && rect.bottom <= innerHeight + bottomSlack;
    }
    function canStayActive(anchor: Anchor, recovering = false) {
      const rect = anchor.element.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return false;
      if (rect.left < 0 || rect.right > viewportWidth) return false;
      if (!isClear(anchor, rect)) return false;
      const ratio = recovering ? ACTIVE_MIN_VISIBLE_RATIO + 0.1 : ACTIVE_MIN_VISIBLE_RATIO;
      const minVisible = rect.height * ratio;
      return rect.bottom >= headerBottom + minVisible && rect.top <= innerHeight - minVisible;
    }
    function beginExit(anchor: Anchor) {
      if (active !== anchor || lifecycle === 'exiting') return;
      clearTimeout(timer);
      clearTimeout(enterTimer);
      timer = 0;
      enterTimer = 0;
      dismiss();
      delete canvas.dataset['idleBreathe'];
      const rect = anchor.element.getBoundingClientRect();
      const dir = rect.top < headerBottom + rect.height * 0.5 ? 'up' : 'down';
      canvas.dataset['exitDir'] = dir;
      setLifecycle('exiting', anchor);
      lastBoundaryAnchor = anchor;
      canvas.getAnimations().forEach((animation) => animation.cancel());
      canvas.animate(
        [
          { opacity: 1, transform: 'translateY(0)' },
          { opacity: 0, transform: dir === 'up' ? 'translateY(-6px)' : 'translateY(6px)' },
        ],
        {
          duration: EXIT_DURATION_MS,
          easing: 'cubic-bezier(0.23, 1, 0.32, 1)',
          fill: 'forwards',
        },
      );
      exitTimer = window.setTimeout(() => {
        exitTimer = 0;
        if (active === anchor && lifecycle === 'exiting') {
          cancel();
          schedule();
        }
      }, EXIT_DURATION_MS);
    }
    function restoreFromExit(anchor: Anchor) {
      if (active !== anchor || lifecycle !== 'exiting') return;
      clearTimeout(exitTimer);
      exitTimer = 0;
      delete canvas.dataset['exitDir'];
      canvas.getAnimations().forEach((animation) => animation.cancel());
      setLifecycle('entering', anchor);
      canvas.animate(
        [
          { opacity: 0.35, transform: 'translateY(-3px)' },
          { opacity: 1, transform: 'translateY(0)' },
        ],
        {
          duration: ENTER_DURATION_MS,
          easing: 'cubic-bezier(0.23, 1, 0.32, 1)',
        },
      );
      enterTimer = window.setTimeout(() => {
        enterTimer = 0;
        if (active === anchor && lifecycle === 'entering') {
          setLifecycle('active', anchor);
        }
      }, ENTER_DURATION_MS);
      resumeRunner?.();
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
        r.top < (headerBottom || 4) ||
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
    function play(anchor: Anchor, forceMusic = false) {
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
      const returning =
        !forceMusic && previous !== undefined && performance.now() - previous < 60000;
      const saved = !forceMusic && returning ? savedStates.get(anchor) : undefined;
      const rare =
        saved !== undefined
          ? saved.activeMusic
          : anchor.pose === 'sit' &&
            (forceMusic ||
              (!returning &&
                performance.now() - lastEgg > 75000 &&
                (playing || Math.random() < 0.12)));
      activeMusic = rare;
      if (rare && !saved) lastEgg = performance.now();
      const cachedSize = sizes.get(anchor);
      const bounds = cachedSize ?? anchor.element.getBoundingClientRect();
      const shortTrack = anchor.pose === 'walk' && bounds.width < bounds.height * 2.7;
      const choreography = sequence(anchor.pose, returning || shortTrack, rare);
      const initialPlan =
        saved !== undefined ? saved.plan : returning ? choreography.slice(-1) : choreography;
      const initialIndex =
        saved !== undefined ? Math.min(saved.stepIndex, initialPlan.length - 1) : 0;
      const initialAmbient = saved !== undefined ? saved.isAmbient : false;
      setLifecycle('entering', anchor);

      function runPlan(plan: ReturnType<typeof sequence>, isAmbient: boolean, startAt = 0) {
        async function draw(i: number) {
          const step = plan[i];
          if (!step || generation !== token) return;
          const img = await loadClip(step.clip);
          if (generation !== token || !anchor.element.isConnected) return;
          const dim = sizes.get(anchor) ?? anchor.element.getBoundingClientRect();
          const { width, height } = dim;
          if (!width || !height) {
            cancel();
            return;
          }
          const density = Math.min(quality === 'low' ? 1.25 : 2, devicePixelRatio || 1);
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
            y = h * 0.625 - drawHeight * clip.contact;
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
          canvas.dataset['settled'] = i === plan.length - 1 ? 'true' : 'false';
          savedStates.set(anchor, {
            plan,
            stepIndex: i,
            isAmbient,
            clip: step.clip,
            frameIndex: step.index,
            state: step.state,
            x: step.x,
            mirror: step.mirror,
            activeMusic,
            savedAt: performance.now(),
          });
          // The filmed clips breathe by themselves; only the still standing drawing needs help.
          if (quality !== 'low' && step.clip === 'standing' && !STEPPING.has(step.state)) {
            canvas.dataset['idleBreathe'] = '';
            canvas.dataset['pose'] = anchor.pose;
          } else {
            delete canvas.dataset['idleBreathe'];
          }
          if (canvas.parentElement !== anchor.element) {
            canvas.getAnimations().forEach((animation) => animation.cancel());
            anchor.element.prepend(canvas);
            document.documentElement.dataset['avatarAway'] = '';
            visits.set(anchor, performance.now());
            setLifecycle('entering', anchor);
            if (anchor.pose === 'peek') {
              canvas.animate([{ transform: 'translateY(100%)' }, { transform: 'translateY(0)' }], {
                duration: 340,
                easing: 'ease-out',
              });
            } else {
              canvas.animate(
                [
                  { opacity: 0, transform: 'translateY(4px)' },
                  { opacity: 1, transform: 'translateY(0)' },
                ],
                {
                  duration: ENTER_DURATION_MS,
                  easing: 'cubic-bezier(0.23, 1, 0.32, 1)',
                },
              );
            }
            clearTimeout(enterTimer);
            enterTimer = window.setTimeout(
              () => {
                enterTimer = 0;
                if (generation === token && active === anchor && lifecycle === 'entering') {
                  setLifecycle('active', anchor);
                }
              },
              anchor.pose === 'peek' ? 340 : ENTER_DURATION_MS,
            );
          }
          if (step.state === 'exit') {
            setLifecycle('exiting', anchor);
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
          if (step.state === 'interact' && anchor.pose === 'inspect' && (!returning || isAmbient)) {
            const field = anchor.element.parentElement?.querySelector('circuit-field');
            const box = anchor.element.getBoundingClientRect();
            field?.dispatchEvent(
              new CustomEvent('avatar-contact', {
                detail: { x: box.left + box.width * 0.75, y: box.top + box.height * 0.92 },
              }),
            );
          }
          if (
            !isAmbient &&
            i === 1 &&
            !returning &&
            (rare || (anchor.pose !== 'walk' && Math.random() < 0.22))
          ) {
            speak(anchor, rare && playing ? musicLine : anchor.element.dataset['line']!);
          }
          const scheduleNext = () => {
            if (i + 1 < plan.length) {
              timer = window.setTimeout(() => startFrame(i + 1), step.ms);
            } else if (quality !== 'low') {
              // Queue a natural, restrained ambient repeat while the cameo stays on screen.
              const nextLoop = idleCycle(anchor.pose, activeMusic && playing);
              if (nextLoop) {
                timer = window.setTimeout(() => {
                  if (
                    generation !== token ||
                    lifecycle === 'exiting' ||
                    !visible.has(anchor.element) ||
                    document.hidden
                  )
                    return;
                  runPlan(nextLoop.frames, true, 0);
                }, nextLoop.pauseMs);
              }
            }
          };
          resumeRunner = scheduleNext;
          if (lifecycle !== 'exiting') {
            scheduleNext();
          }
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
        startFrame(startAt);
      }

      // Restore immediately without a 350ms blank pause when returning to a saved anchor.
      if (saved !== undefined) {
        runPlan(initialPlan, initialAmbient, initialIndex);
      } else {
        timer = window.setTimeout(() => runPlan(initialPlan, initialAmbient, initialIndex), 350);
      }
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
        if (active) cancel();
        return;
      }
      if (visible.size === 0) {
        if (active) cancel();
        return;
      }
      if (active && visible.has(active.element) && !skipped.has(active)) {
        // If currently exiting and user reverses scroll back into the hysteresis recovery zone, restore smoothly.
        if (lifecycle === 'exiting') {
          if (canStayActive(active, true)) {
            restoreFromExit(active);
          }
          return;
        }
        // Fast path: if the active anchor is still inside the hysteresis retention zone, keep it.
        if (canStayActive(active, false)) {
          if (bubble.isConnected) {
            const br = bubble.getBoundingClientRect();
            if (br.top < (headerBottom || 4) || obstructs(br, scope(active))) {
              dismiss();
            }
          }
          return;
        }
      }
      const candidates = anchors.filter(
        (a) => visible.has(a.element) && !skipped.has(a) && canEnter(a),
      );
      const selected =
        candidates.length <= 1
          ? candidates[0]
          : candidates.sort((a, b) => {
              const distance = (item: Anchor) =>
                Math.abs(item.element.getBoundingClientRect().top - innerHeight * 0.45);
              return distance(a) - distance(b);
            })[0];
      if (active && active !== selected) {
        const rect = active.element.getBoundingClientRect();
        const stillPartiallyVisible =
          rect.width > 0 &&
          rect.height > 0 &&
          rect.bottom > headerBottom + 4 &&
          rect.top < innerHeight - 4 &&
          isClear(active, rect);
        // When approaching/crossing the header or viewport boundary while still partially visible,
        // perform a graceful exit rather than yanking the canvas out of the DOM.
        if (stillPartiallyVisible && canvas.parentElement === active.element) {
          beginExit(active);
          return;
        }
        cancel();
      }
      if (selected && active !== selected) {
        play(selected);
      }
    }
    function schedule() {
      if (!pending) pending = requestAnimationFrame(reconcile);
    }
    function onScroll() {
      if (visible.size === 0 && !active) return;
      schedule();
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
    const anchorByElement = new WeakMap<Element, Anchor>(anchors.map((a) => [a.element, a]));
    const resize = new ResizeObserver((entries) => {
      let activeResized = false;
      for (const entry of entries) {
        if (entry.target === header || entry.target === document.body) {
          refreshChromeMetrics();
        }
        const a = anchorByElement.get(entry.target);
        if (a) {
          sizes.set(a, {
            width: entry.contentRect.width,
            height: entry.contentRect.height,
          });
          clearance.delete(a);
          if (a === active) activeResized = true;
        }
      }
      if (activeResized) cancel();
      schedule();
    });
    resize.observe(document.body);
    if (header) resize.observe(header);
    for (const anchor of anchors) resize.observe(anchor.element);
    // Handle scroll within the visibility thresholds, sticky headers and zoom.
    window.addEventListener('scroll', onScroll, { passive: true, signal });
    window.addEventListener(
      'resize',
      () => {
        refreshChromeMetrics();
        schedule();
      },
      { signal },
    );
    document.addEventListener(
      'visibilitychange',
      () => {
        if (document.hidden) cancel();
        else schedule();
      },
      { signal },
    );
    document.addEventListener(
      'toggle',
      () => {
        clearance = new WeakMap<Anchor, boolean>();
        schedule();
      },
      { capture: true, signal },
    );
    motion.addEventListener('change', syncPreference, { signal });
    const unwatch = observePlaybackState((state) => {
      const started = !playing && state === 'playing';
      playing = state === 'playing';
      if (!playing) activeMusic = false;
      // React live when music starts while the avatar is seated on Caelora/Contact.
      if (
        started &&
        active &&
        active.pose === 'sit' &&
        !activeMusic &&
        visible.has(active.element)
      ) {
        const target = active;
        cancel();
        play(target, true);
      }
    });
    const unwatchQuality = observeQualityTier((tier) => {
      quality = tier;
      if (tier === 'low') delete canvas.dataset['idleBreathe'];
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
      unwatchQuality();
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
