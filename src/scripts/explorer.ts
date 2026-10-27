/**
 * Equipment explorers on /setup (src/components/setup/Explorer.astro).
 * One part is selected per explorer: its list button is pressed, its detail
 * panel shown and its drawing lit. The choice is kept in localStorage so the
 * same part is open after a language switch or a reload.
 *
 * Where WebGL works, each view's 3D stage (src/scripts/setup3d) is loaded when
 * the view comes near the screen and released when it leaves, so at most the
 * visible models hold GPU memory. A failed load leaves the drawing in place.
 *
 * Switching views with both on the GPU is a camera move, not a swap: the old
 * stage flies to the doorway it shares with the new one (the desk's tower is
 * the inside view's case), its last frame holds while the new stage loads,
 * and the new one starts on that same frame and travels in. Any click during
 * the move retargets it; under reduced motion, or without a model, the view
 * simply changes.
 */
import type { Stage } from './setup3d/stage';
import type { Mode } from './setup3d/scene';

type StageModule = typeof import('./setup3d/stage');
let stageModule: Promise<StageModule> | null = null;
const loadStageModule = () => (stageModule ??= import('./setup3d/stage'));

const allowSoftware = () => {
  try {
    return localStorage.getItem('ng-setup:3d') === 'software';
  } catch {
    return false;
  }
};

const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
  ?.saveData;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
/** Contexts the browser took back on this page; past two, the drawings stay. */
let losses = 0;
const wait = (ms: number) => new Promise<void>((done) => setTimeout(done, ms));

for (const explorer of document.querySelectorAll<HTMLElement>('[data-explorer]')) {
  const key = `ng-setup:${explorer.dataset.explorer}`;
  const buttons = [...explorer.querySelectorAll<HTMLButtonElement>('button[data-pick]')];
  const parts = [...explorer.querySelectorAll<SVGElement>('[data-part]')];
  const details = [...explorer.querySelectorAll<HTMLElement>('[data-detail]')];
  const radios = [...explorer.querySelectorAll<HTMLInputElement>('input[data-view]')];
  const panes = [...explorer.querySelectorAll<HTMLElement>('[data-view-pane]')];
  const views = explorer.querySelector<HTMLElement>('.views');
  if (buttons.length === 0) continue;

  const stages = new Map<string, Stage>();
  const pending = new Map<string, Promise<Stage | undefined>>();
  let current: string | undefined;
  /** The view on screen; it trails the radios while a move is under way. */
  let shown = radios.find((r) => r.checked)?.value ?? panes[0]?.dataset.viewPane ?? '';
  if (radios.length) explorer.dataset.shown = shown;

  const buttonFor = (id: string | undefined) => buttons.find((b) => b.dataset.pick === id);
  const paneFor = (view: string) => panes.find((p) => p.dataset.viewPane === view);

  const light = (id: string | null, cls: 'is-on' | 'is-hover') => {
    for (const part of parts) part.classList.toggle(cls, part.dataset.part === id);
    if (cls === 'is-hover') for (const stage of stages.values()) stage.hover(id);
  };

  const select = (id: string | undefined, store = true) => {
    const button = buttonFor(id);
    if (!button) return;
    current = id;
    for (const b of buttons) b.setAttribute('aria-pressed', String(b === button));
    for (const d of details) d.hidden = d.dataset.detail !== id;
    light(id ?? null, 'is-on');
    for (const stage of stages.values()) stage.select(id ?? null, store);
    const radio = radios.find((r) => r.value === button.dataset.view);
    if (radio && !radio.checked) {
      radio.checked = true;
      radio.dispatchEvent(new Event('change'));
    }
    if (!store) return;
    try {
      localStorage.setItem(key, id ?? '');
    } catch {
      // Storage blocked: the choice simply is not remembered.
    }
  };

  const firstIn = (view: string) => buttons.find((b) => b.dataset.view === view);

  for (const b of buttons) {
    b.addEventListener('click', () => select(b.dataset.pick));
    b.addEventListener('pointerenter', () => light(b.dataset.pick ?? null, 'is-hover'));
    b.addEventListener('pointerleave', () => light(null, 'is-hover'));
    b.addEventListener('focus', () => light(b.dataset.pick ?? null, 'is-hover'));
    b.addEventListener('blur', () => light(null, 'is-hover'));
  }

  for (const part of parts) {
    part.addEventListener('click', () => select(part.dataset.part));
    part.addEventListener('pointerenter', () => light(part.dataset.part ?? null, 'is-hover'));
    part.addEventListener('pointerleave', () => light(null, 'is-hover'));
  }

  // ---------- View changes ----------
  let run = 0;
  /** Focused once the next view is on screen (the “look inside” button). */
  let focusOnShow: HTMLElement | undefined;
  /** The leaving view's last frame, held over the stage while the next one loads. */
  let handoff: HTMLCanvasElement | null = null;

  const clearHandoff = () => {
    handoff?.remove();
    handoff = null;
  };
  const fadeHandoff = () => {
    const shot = handoff;
    if (!shot) return;
    handoff = null;
    const drop = () => shot.remove();
    shot.addEventListener('transitionend', drop, { once: true });
    setTimeout(drop, 800);
    requestAnimationFrame(() => shot.classList.add('is-leaving'));
  };

  const modeInput = (view: string) =>
    paneFor(view)?.querySelector<HTMLInputElement>('[data-stage-mode]:checked');

  const show = (view: string) => {
    const from = paneFor(shown);
    const to = paneFor(view);
    // The next pane takes the place of the one on screen: load it now rather
    // than a frame later, when the observer would notice.
    if (from && to && near.has(from)) near.add(to);
    shown = view;
    explorer.dataset.shown = view;
    for (const pane of panes) pane.inert = false;
    // Looking inside opens the case.
    const mode = modeInput(view);
    if (mode?.value === 'assembled') {
      const cutaway = paneFor(view)?.querySelector<HTMLInputElement>(
        '[data-stage-mode][value="cutaway"]',
      );
      if (cutaway) cutaway.checked = true;
    }
    syncStages();
    focusOnShow?.focus();
    focusOnShow = undefined;
  };

  const go = async (to: string) => {
    const token = ++run;
    clearHandoff();
    const from = shown;
    const leaving = stages.get(from);
    const done = () => {
      if (token === run) delete explorer.dataset.transition;
    };
    if (to === from) {
      // Back to the view still on screen: undo a move that had started.
      if (leaving && explorer.dataset.transition) await leaving.settle();
      for (const pane of panes) pane.inert = false;
      return done();
    }
    if (!leaving || reducedMotion.matches) {
      show(to);
      return done();
    }
    explorer.dataset.transition = `${from}-${to}`;
    const fromPane = paneFor(from)!;
    fromPane.inert = true;
    void loadStageModule().then((m) => m.prefetch(to));
    // Frames can stall (a hidden or occluded window): the view changes on time regardless.
    await Promise.race([leaving.leave(to), wait(1500)]);
    if (token !== run) return;

    const host = fromPane.querySelector<HTMLElement>('.stage-canvas');
    if (host && views) {
      const shot = leaving.snapshot();
      const box = views.getBoundingClientRect();
      const r = host.getBoundingClientRect();
      shot.className = 'stage-handoff';
      shot.setAttribute('aria-hidden', 'true');
      Object.assign(shot.style, {
        left: `${r.left - box.left}px`,
        top: `${r.top - box.top}px`,
        width: `${r.width}px`,
        height: `${r.height}px`,
      });
      views.append(shot);
      handoff = shot;
    }
    show(to);
    // Hold the picture until the next model is ready (or give up waiting).
    const arriving = await Promise.race([pending.get(to) ?? stages.get(to), wait(5000)]);
    if (token !== run) return;
    const mode = (modeInput(to)?.value ?? 'assembled') as Mode;
    const travel = arriving?.arrive(from, mode);
    fadeHandoff();
    await Promise.race([travel, wait(2000)]);
    done();
  };

  for (const radio of radios) {
    radio.addEventListener('change', () => {
      const button = buttonFor(current);
      if (button?.dataset.view !== radio.value) select(firstIn(radio.value)?.dataset.pick);
      void go(radio.value);
    });
  }

  for (const goView of explorer.querySelectorAll<HTMLButtonElement>('[data-go-view]')) {
    goView.addEventListener('click', () => {
      const first = firstIn(goView.dataset.goView ?? '');
      focusOnShow = first;
      select(first?.dataset.pick);
      // Already on screen (no view change): focus now.
      if (shown === first?.dataset.view) {
        first?.focus();
        focusOnShow = undefined;
      }
    });
  }

  // ---------- 3D stages ----------
  const near = new Set<HTMLElement>();
  const visible = (pane: HTMLElement) => pane.offsetParent !== null;

  const mount = (pane: HTMLElement) => {
    const view = pane.dataset.viewPane!;
    const holder = pane.querySelector<HTMLElement>('[data-stage]');
    const canvasHost = holder?.querySelector<HTMLElement>('.stage-canvas');
    if (!holder || !canvasHost || stages.has(view) || pending.has(view) || losses > 2) return;
    const work = (async () => {
      try {
        const { mountStage, webglSupport } = await loadStageModule();
        const support = webglSupport();
        // Software WebGL only on request (the 3D tests set it; see setup.spec.ts).
        if (!support || (support === 'software' && !allowSoftware())) return;
        const numbers = new Map(
          buttons
            .filter((b) => b.dataset.view === view)
            .map((b) => [b.dataset.pick!, b.querySelector('.pick-n')?.textContent?.trim() ?? '']),
        );
        holder.hidden = false;
        pane.dataset.loading = '';
        const stage = await mountStage(support === 'software', canvasHost, view, numbers, {
          pick: (id) => select(id),
          hover: (id) => {
            for (const b of buttons) b.classList.toggle('is-lit', b.dataset.pick === id);
            light(id, 'is-hover');
          },
          mode: (next) => {
            const input = holder.querySelector<HTMLInputElement>(
              `[data-stage-mode][value="${next}"]`,
            );
            if (input && !input.checked) {
              input.checked = true;
              input.dispatchEvent(new Event('change'));
            }
          },
          lost: () => {
            losses++;
            unmount(pane);
            // A fresh context usually works; after repeated losses the drawing stays.
            if (losses <= 2) setTimeout(syncStages, 400);
          },
        });
        if (!near.has(pane) || !visible(pane)) {
          stage.dispose();
          holder.hidden = true;
          return;
        }
        stages.set(view, stage);
        const mode = modeInput(view);
        stage.setMode((mode?.value ?? 'assembled') as Mode, false);
        const upgrade = holder.querySelector<HTMLInputElement>('[data-stage-upgrade]');
        if (upgrade) stage.setUpgrade(upgrade.checked);
        stage.select(current ?? null, false);
        pane.dataset.live = '';
        return stage;
      } catch (error) {
        holder.hidden = true;
        console.warn('3D view unavailable; showing the drawing.', error);
        return undefined;
      } finally {
        delete pane.dataset.loading;
        pending.delete(view);
      }
    })();
    pending.set(view, work);
  };

  const unmount = (pane: HTMLElement) => {
    const view = pane.dataset.viewPane!;
    stages.get(view)?.dispose();
    stages.delete(view);
    delete pane.dataset.live;
    const holder = pane.querySelector<HTMLElement>('[data-stage]');
    if (holder) holder.hidden = true;
  };

  function syncStages() {
    for (const pane of panes) {
      if (near.has(pane) && visible(pane)) mount(pane);
      else if (stages.has(pane.dataset.viewPane!)) unmount(pane);
    }
  }

  for (const pane of panes) {
    const holder = pane.querySelector<HTMLElement>('[data-stage]');
    if (!holder) continue;
    const stage = () => stages.get(pane.dataset.viewPane!);
    for (const button of holder.querySelectorAll<HTMLButtonElement>('[data-stage-act]')) {
      button.addEventListener('click', () => {
        const s = stage();
        const act = button.dataset.stageAct;
        if (act === 'left') s?.orbit(-1);
        else if (act === 'right') s?.orbit(1);
        else if (act === 'zoomIn') s?.zoom(1);
        else if (act === 'zoomOut') s?.zoom(-1);
        else s?.reset();
      });
    }
    for (const input of holder.querySelectorAll<HTMLInputElement>('[data-stage-mode]')) {
      input.addEventListener('change', () => stage()?.setMode(input.value as Mode));
    }
    holder
      .querySelector<HTMLInputElement>('[data-stage-upgrade]')
      ?.addEventListener('change', (event) =>
        stage()?.setUpgrade((event.target as HTMLInputElement).checked),
      );
  }

  if (!saveData && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const pane = entry.target as HTMLElement;
          if (entry.isIntersecting) near.add(pane);
          else near.delete(pane);
        }
        syncStages();
      },
      { rootMargin: '50% 0px' },
    );
    for (const pane of panes) if (pane.querySelector('[data-stage]')) io.observe(pane);
  }

  let stored: string | null = null;
  try {
    stored = localStorage.getItem(key);
  } catch {
    stored = null;
  }
  select(buttonFor(stored ?? undefined) ? (stored ?? undefined) : buttons[0]?.dataset.pick, false);
  explorer.dataset.ready = '';
}
