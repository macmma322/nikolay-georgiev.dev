/**
 * Equipment explorers on /setup (src/components/setup/Explorer.astro).
 * One part is selected per explorer: its list button is pressed, its detail
 * panel shown and its drawing lit. The choice is kept in localStorage so the
 * same part is open after a language switch or a reload.
 *
 * Where WebGL works, each view's 3D stage (src/scripts/setup3d) is loaded when
 * the view comes near the screen and released when it leaves, so at most the
 * visible models hold GPU memory. A failed load leaves the drawing in place.
 */
import type { Stage } from './setup3d/stage';

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

for (const explorer of document.querySelectorAll<HTMLElement>('[data-explorer]')) {
  const key = `ng-setup:${explorer.dataset.explorer}`;
  const buttons = [...explorer.querySelectorAll<HTMLButtonElement>('button[data-pick]')];
  const parts = [...explorer.querySelectorAll<SVGElement>('[data-part]')];
  const details = [...explorer.querySelectorAll<HTMLElement>('[data-detail]')];
  const radios = [...explorer.querySelectorAll<HTMLInputElement>('input[data-view]')];
  if (buttons.length === 0) continue;

  const stages = new Map<string, Stage>();
  let current: string | undefined;

  const buttonFor = (id: string | undefined) => buttons.find((b) => b.dataset.pick === id);

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
    for (const stage of stages.values()) stage.select(id ?? null);
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

  for (const radio of radios) {
    radio.addEventListener('change', () => {
      const button = buttonFor(current);
      if (button?.dataset.view !== radio.value) select(firstIn(radio.value)?.dataset.pick);
      syncStages();
    });
  }

  for (const go of explorer.querySelectorAll<HTMLButtonElement>('[data-go-view]')) {
    go.addEventListener('click', () => {
      const first = firstIn(go.dataset.goView ?? '');
      select(first?.dataset.pick);
      first?.focus();
    });
  }

  // ---------- 3D stages ----------
  const panes = [...explorer.querySelectorAll<HTMLElement>('[data-view-pane]')];
  const near = new Set<HTMLElement>();
  const loading = new Set<HTMLElement>();
  const visible = (pane: HTMLElement) => pane.offsetParent !== null;

  const mount = async (pane: HTMLElement) => {
    const view = pane.dataset.viewPane!;
    const holder = pane.querySelector<HTMLElement>('[data-stage]');
    const canvasHost = holder?.querySelector<HTMLElement>('.stage-canvas');
    if (!holder || !canvasHost || stages.has(view) || loading.has(pane)) return;
    loading.add(pane);
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
      });
      if (!near.has(pane) || !visible(pane)) {
        stage.dispose();
        holder.hidden = true;
        return;
      }
      stages.set(view, stage);
      const mode = holder.querySelector<HTMLInputElement>('[data-stage-mode]:checked');
      if (mode) stage.setMode(mode.value as Parameters<Stage['setMode']>[0]);
      const upgrade = holder.querySelector<HTMLInputElement>('[data-stage-upgrade]');
      if (upgrade) stage.setUpgrade(upgrade.checked);
      stage.select(current ?? null);
      pane.dataset.live = '';
    } catch (error) {
      holder.hidden = true;
      console.warn('3D view unavailable; showing the drawing.', error);
    } finally {
      loading.delete(pane);
    }
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
      if (near.has(pane) && visible(pane)) void mount(pane);
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
      input.addEventListener('change', () =>
        stage()?.setMode(input.value as Parameters<Stage['setMode']>[0]),
      );
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
