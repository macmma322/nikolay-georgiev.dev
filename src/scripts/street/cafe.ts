/**
 * Scenario B — The evening café at the foot of the page.
 *
 * Nikolay sits at a small round walnut-and-copper café table in a warm evening
 * coffee spot. Outside the café windows, evening passers-by walk past on the
 * back canvas; inside, the front canvas renders the registered café sprite
 * atlas (/avatar/cafe.webp) with natural transitions between relaxed idle,
 * glancing around, checking his Samsung Galaxy S20+ phone, reaching for and
 * sipping his espresso, and working on his laptop.
 */
import { CAST, paintFor, pick } from './cast';
import { cycleLength, drawFigure, type C3, type Look, type Paint, type Pose } from './figure';
import {
  getQualityTier,
  observeQualityTier,
  watchCircuitClock,
  type QualityTier,
} from '../circuit-clock';
import type { Street, StreetOptions, StreetStats } from './scene';

export type CafeAction = 'idle' | 'glance' | 'phone' | 'coffee' | 'laptop';

export interface CafeState {
  action: CafeAction;
  stepName:
    | 'idle'
    | 'glance'
    | 'coffee-reach'
    | 'coffee-sip'
    | 'coffee-return'
    | 'phone-check'
    | 'phone-scroll'
    | 'laptop-type-a'
    | 'laptop-type-b';
  frame: number;
  cupOnTable: boolean;
  phoneOnTable: boolean;
  laptopOpen: boolean;
  handContactsCup: boolean;
  sips: number;
  phoneChecks: number;
  laptopSessions: number;
  glances: number;
}

export interface CafeScene extends Street {
  cafeState(): CafeState;
  triggerAction(action: CafeAction): void;
}

interface CafeKeyframe {
  frame: number;
  stepName: CafeState['stepName'];
  duration: number;
  cupOnTable: boolean;
  phoneOnTable: boolean;
  laptopOpen: boolean;
  handContactsCup: boolean;
}

const ACTION_PLANS: Record<Exclude<CafeAction, 'idle'>, readonly CafeKeyframe[]> = {
  glance: [
    {
      frame: 1,
      stepName: 'glance',
      duration: 1.8,
      cupOnTable: true,
      phoneOnTable: true,
      laptopOpen: false,
      handContactsCup: false,
    },
  ],
  coffee: [
    {
      frame: 2,
      stepName: 'coffee-reach',
      duration: 0.65,
      cupOnTable: true,
      phoneOnTable: true,
      laptopOpen: false,
      handContactsCup: true,
    },
    {
      frame: 3,
      stepName: 'coffee-sip',
      duration: 1.75,
      cupOnTable: false,
      phoneOnTable: true,
      laptopOpen: false,
      handContactsCup: true,
    },
    {
      frame: 2,
      stepName: 'coffee-return',
      duration: 0.55,
      cupOnTable: true,
      phoneOnTable: true,
      laptopOpen: false,
      handContactsCup: true,
    },
  ],
  phone: [
    {
      frame: 4,
      stepName: 'phone-check',
      duration: 1.15,
      cupOnTable: true,
      phoneOnTable: false,
      laptopOpen: false,
      handContactsCup: false,
    },
    {
      frame: 5,
      stepName: 'phone-scroll',
      duration: 0.95,
      cupOnTable: true,
      phoneOnTable: false,
      laptopOpen: false,
      handContactsCup: false,
    },
    {
      frame: 4,
      stepName: 'phone-check',
      duration: 0.95,
      cupOnTable: true,
      phoneOnTable: false,
      laptopOpen: false,
      handContactsCup: false,
    },
  ],
  laptop: [
    {
      frame: 6,
      stepName: 'laptop-type-a',
      duration: 0.5,
      cupOnTable: true,
      phoneOnTable: true,
      laptopOpen: true,
      handContactsCup: false,
    },
    {
      frame: 7,
      stepName: 'laptop-type-b',
      duration: 0.48,
      cupOnTable: true,
      phoneOnTable: true,
      laptopOpen: true,
      handContactsCup: false,
    },
    {
      frame: 6,
      stepName: 'laptop-type-a',
      duration: 0.52,
      cupOnTable: true,
      phoneOnTable: true,
      laptopOpen: true,
      handContactsCup: false,
    },
    {
      frame: 7,
      stepName: 'laptop-type-b',
      duration: 0.65,
      cupOnTable: true,
      phoneOnTable: true,
      laptopOpen: true,
      handContactsCup: false,
    },
  ],
};

const CELL_W = 224;
const CELL_H = 378;
const UNIT = 0.0057;
const WALL: C3 = [0.24, 0.018, 255];

const WINDOW_LANES = [
  { y: 0.635, scale: 0.44, haze: 0.48, pace: 0.84 },
  { y: 0.655, scale: 0.54, haze: 0.32, pace: 0.92 },
] as const;

interface WindowWalker {
  look: Look;
  paint: Paint;
  lane: number;
  x: number;
  dir: 1 | -1;
  pace: number;
  cycle: number;
  pose: Pose;
  lit: number;
  hold: number;
  half: number;
  tall: number;
}

let atlasPromise: Promise<HTMLImageElement> | null = null;

export function loadCafeAtlas(): Promise<HTMLImageElement> {
  if (!atlasPromise) {
    const img = new Image();
    img.src = '/avatar/cafe.webp';
    atlasPromise = img
      .decode()
      .then(() => img)
      .catch((err: unknown) => {
        atlasPromise = null;
        throw err;
      });
  }
  return atlasPromise;
}

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createCafe(options: StreetOptions): CafeScene {
  const { stage, avatar, counter } = options;
  const backCtx = options.back.getContext('2d');
  const frontCtx = options.front.getContext('2d');
  const random = rng(options.seed ?? (Date.now() ^ (performance.now() * 1000)) >>> 0);
  const between = (lo: number, hi: number) => lo + random() * (hi - lo);

  let width = 0;
  let height = 0;
  let dpr = 1;
  let clock = 0;
  let state: StreetStats['state'] = options.reduce ? 'static' : 'paused';
  let stopClock: (() => void) | undefined;
  let last = 0;
  let visible = false;
  let destroyed = false;
  let quality: QualityTier = getQualityTier();
  let frames = 0;
  let cost = 0;
  let spawned = 0;
  let left = 0;
  let shown = -1;
  let atlas: HTMLImageElement | null = null;

  // Controlled non-repetitive sequence of café actions
  const actionOrder: Exclude<CafeAction, 'idle'>[] = ['glance', 'phone', 'coffee', 'laptop'];
  let orderIndex = 0;
  let currentAction: CafeAction = 'idle';
  let currentStepName: CafeState['stepName'] = 'idle';
  let currentFrame = 0;
  let prevFrame = 0;
  let transitionElapsed = 1;
  let stepIndex = 0;
  let stepLeft = between(1.6, 2.6);
  let cupOnTable = true;
  let phoneOnTable = true;
  let laptopOpen = false;
  let handContactsCup = false;
  let sips = 0;
  let phoneChecks = 0;
  let laptopSessions = 0;
  let glances = 0;

  const walkers: WindowWalker[] = [];
  const pool: WindowWalker[] = [];
  const takenIds = new Set<string>();
  const labels = new Map(options.cast.map((el) => [el.dataset['cast'] ?? '', el]));

  function syncAvatarDataset() {
    if (!avatar) return;
    avatar.dataset['cafeAction'] = currentAction;
    avatar.dataset['cafeStep'] = currentStepName;
    avatar.dataset['cafeFrame'] = String(currentFrame);
    avatar.dataset['cupOnTable'] = String(cupOnTable);
    avatar.dataset['phoneOnTable'] = String(phoneOnTable);
    avatar.dataset['laptopOpen'] = String(laptopOpen);
  }

  function startAction(next: CafeAction) {
    prevFrame = currentFrame;
    transitionElapsed = 0;
    currentAction = next;
    stepIndex = 0;
    if (next === 'idle') {
      currentStepName = 'idle';
      currentFrame = 0;
      cupOnTable = true;
      phoneOnTable = true;
      laptopOpen = false;
      handContactsCup = false;
      stepLeft = between(1.8, 3.2);
    } else {
      const kf = ACTION_PLANS[next][0]!;
      currentStepName = kf.stepName;
      currentFrame = kf.frame;
      cupOnTable = kf.cupOnTable;
      phoneOnTable = kf.phoneOnTable;
      laptopOpen = kf.laptopOpen;
      handContactsCup = kf.handContactsCup;
      stepLeft = kf.duration;
    }
    syncAvatarDataset();
  }

  function advanceCharacter(dt: number) {
    transitionElapsed = Math.min(1, transitionElapsed + dt / 0.12);
    stepLeft -= dt;
    if (stepLeft > 0) return;

    if (currentAction === 'idle') {
      // Pick the next action in a varied cycle so every visit feels natural and non-repetitive.
      const next = actionOrder[orderIndex % actionOrder.length]!;
      orderIndex += 1;
      startAction(next);
      return;
    }

    const plan = ACTION_PLANS[currentAction];
    if (stepIndex + 1 < plan.length) {
      stepIndex += 1;
      const kf = plan[stepIndex]!;
      prevFrame = currentFrame;
      transitionElapsed = 0;
      currentStepName = kf.stepName;
      currentFrame = kf.frame;
      cupOnTable = kf.cupOnTable;
      phoneOnTable = kf.phoneOnTable;
      laptopOpen = kf.laptopOpen;
      handContactsCup = kf.handContactsCup;
      stepLeft = kf.duration;
      syncAvatarDataset();
    } else {
      if (currentAction === 'coffee') sips += 1;
      else if (currentAction === 'phone') phoneChecks += 1;
      else if (currentAction === 'laptop') laptopSessions += 1;
      else if (currentAction === 'glance') glances += 1;
      startAction('idle');
    }
  }

  // ---------- Outside window passers-by ----------
  function targetWalkers(): number {
    if (width === 0) return 0;
    return width < 500 ? 4 : 6;
  }

  function addWalker(look: Look, laneIdx: number, x: number, dir: 1 | -1): WindowWalker {
    const lane = WINDOW_LANES[laneIdx]!;
    const u = height * UNIT * lane.scale * look.h;
    const w: WindowWalker = pool.pop() ?? {
      look,
      paint: null as unknown as Paint,
      lane: laneIdx,
      x,
      dir,
      pace: 0,
      cycle: 1,
      pose: { p: 0, stand: 0, wave: 0, phone: 0, turn: 0, shrug: 0, t: 0, lit: 0 },
      lit: 0,
      hold: 0,
      half: 0,
      tall: 0,
    };
    w.look = look;
    w.lane = laneIdx;
    w.x = x;
    w.dir = dir;
    w.paint = paintFor(
      look,
      lane.haze,
      WALL,
      Math.max(0.85, 1.2 * lane.scale ** 0.5) / Math.max(0.1, u),
    );
    w.cycle = Math.max(1, cycleLength(look) * u);
    w.pace = look.speed * lane.pace * between(0.88, 1.04) * u;
    w.half = u * 24;
    w.tall = u * 104;
    w.lit = 0;
    w.hold = 0;
    w.pose.p = random();
    w.pose.stand = w.pose.wave = w.pose.phone = w.pose.turn = w.pose.shrug = w.pose.lit = 0;
    w.pose.t = between(0, 30);
    walkers.push(w);
    spawned += 1;
    return w;
  }

  function populateWalkers() {
    walkers.length = 0;
    const count = targetWalkers();
    for (let i = 0; i < count; i += 1) {
      takenIds.clear();
      for (const w of walkers) takenIds.add(w.look.id);
      const laneIdx = i % WINDOW_LANES.length;
      const look = pick(random(), takenIds, (c) => !c.roll);
      if (!look) break;
      const slot = width / count;
      const x = slot * i + between(0.15, 0.85) * slot;
      addWalker(look, laneIdx, x, random() < 0.5 ? 1 : -1);
    }
  }

  function updateWalkers(dt: number) {
    if (width === 0) return;
    if (walkers.length < targetWalkers() && random() < dt * 0.8) {
      takenIds.clear();
      for (const w of walkers) takenIds.add(w.look.id);
      const laneIdx = walkers.length % WINDOW_LANES.length;
      const look = pick(random(), takenIds, (c) => !c.roll);
      if (look) {
        const dir: 1 | -1 = random() < 0.5 ? 1 : -1;
        const margin = 40;
        addWalker(look, laneIdx, dir === 1 ? -margin : width + margin, dir);
      }
    }

    for (let i = walkers.length - 1; i >= 0; i -= 1) {
      const w = walkers[i]!;
      const moved = w.pace * dt;
      w.x += w.dir * moved;
      w.pose.p = (w.pose.p + moved / w.cycle) % 1;
      w.pose.t += dt;
      w.hold = Math.max(0, w.hold - dt);
      w.pose.lit = w.hold > 0 ? 1 : 0;

      const margin = w.half + 48;
      if ((w.dir === 1 && w.x > width + margin) || (w.dir === -1 && w.x < -margin)) {
        walkers.splice(i, 1);
        pool.push(w);
        left += 1;
      }
    }

    for (const [slug, label] of labels) {
      const lit = walkers.some((w) => w.look.egg === slug && w.hold > 0);
      if (lit !== (label.dataset['lit'] !== undefined)) {
        if (lit) label.dataset['lit'] = '';
        else delete label.dataset['lit'];
      }
    }

    if (counter && left !== shown) {
      shown = left;
      counter.textContent = String(left).padStart(3, '0');
    }
  }

  function update(dt: number) {
    if (width === 0) return;
    clock += dt;
    advanceCharacter(dt);
    updateWalkers(dt);
  }

  // ---------- Drawing ----------
  function drawBack() {
    if (!backCtx || width === 0 || height === 0) return;
    backCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    backCtx.clearRect(0, 0, width, height);

    // Map SVG 2400x520 window bays with xMidYMax slice
    const scale = Math.max(width / 2400, height / 520);
    const offsetX = (width - 2400 * scale) / 2;
    const offsetY = height - 520 * scale;

    backCtx.save();
    backCtx.beginPath();
    // Left café window panes (x: 110..930, y: 64..340) and far-right bay (x: 2010..2310, y: 64..340)
    backCtx.rect(offsetX + 110 * scale, offsetY + 64 * scale, 820 * scale, 276 * scale);
    backCtx.rect(offsetX + 2010 * scale, offsetY + 64 * scale, 300 * scale, 276 * scale);
    backCtx.clip();

    for (const w of walkers) {
      const lane = WINDOW_LANES[w.lane]!;
      const ground = offsetY + 338 * scale + (w.lane - 1) * 8 * scale;
      const u = height * UNIT * lane.scale * w.look.h;
      backCtx.save();
      backCtx.globalAlpha = 0.76;
      backCtx.translate(w.x, ground);
      backCtx.scale(w.dir * u, u);
      drawFigure(backCtx, w.look, w.paint, w.pose, quality !== 'low');
      backCtx.restore();
    }
    backCtx.restore();
  }

  function drawSteam(g: CanvasRenderingContext2D, cx: number, cy: number, intensity = 1) {
    g.save();
    g.strokeStyle = `rgba(245, 222, 195, ${(0.28 * intensity).toFixed(3)})`;
    g.lineWidth = Math.max(1.1, height * 0.0032);
    g.lineCap = 'round';
    for (let strand = 0; strand < 2; strand += 1) {
      const phase = clock * 2.2 + strand * 2.4;
      const ox = (strand === 0 ? -2.5 : 2.5) * (height / 420);
      const rise = 18 * (height / 420);
      g.beginPath();
      g.moveTo(cx + ox, cy);
      g.quadraticCurveTo(
        cx + ox + Math.sin(phase) * 3.5,
        cy - rise * 0.5,
        cx + ox + Math.cos(phase * 0.8) * 2.5,
        cy - rise,
      );
      g.stroke();
    }
    g.restore();
  }

  function drawFront() {
    if (!frontCtx || width === 0 || height === 0) return;
    frontCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    frontCtx.clearRect(0, 0, width, height);
    if (!atlas) return;

    const drawH = height * 0.74;
    const drawW = (drawH * CELL_W) / CELL_H;
    const breathe =
      state === 'running' && currentAction === 'idle' && quality !== 'low'
        ? Math.sin(clock * 1.45) * (height * 0.0018)
        : 0;
    const dx = Math.round((width - drawW) / 2);
    const dy = Math.round(height * 0.968 - drawH + breathe);

    if (transitionElapsed < 1 && prevFrame !== currentFrame && !options.reduce) {
      frontCtx.save();
      frontCtx.globalAlpha = 1 - transitionElapsed;
      frontCtx.drawImage(atlas, prevFrame * CELL_W, 0, CELL_W, CELL_H, dx, dy, drawW, drawH);
      frontCtx.globalAlpha = transitionElapsed;
      frontCtx.drawImage(atlas, currentFrame * CELL_W, 0, CELL_W, CELL_H, dx, dy, drawW, drawH);
      frontCtx.restore();
    } else {
      frontCtx.drawImage(atlas, currentFrame * CELL_W, 0, CELL_W, CELL_H, dx, dy, drawW, drawH);
    }

    // Live espresso steam wisps rising from the cup (on the table or in his hand during a sip)
    if (quality !== 'low') {
      if (currentStepName === 'coffee-sip') {
        const cupHandX = dx + drawW * (150 / 326);
        const cupHandY = dy + drawH * (170 / 550);
        drawSteam(frontCtx, cupHandX, cupHandY, 1.05);
      } else if (cupOnTable) {
        const cupSourceX = laptopOpen ? 58 : currentStepName === 'coffee-reach' ? 108 : 118;
        const cupTableX = dx + drawW * (cupSourceX / 326);
        const cupTableY = dy + drawH * (295 / 550);
        drawSteam(frontCtx, cupTableX, cupTableY, 0.9);
      }
    }
  }

  function draw() {
    drawBack();
    drawFront();
  }

  function resize() {
    const rect = stage.getBoundingClientRect();
    const w = Math.round(rect.width);
    const h = Math.round(rect.height);
    if (w === 0 || h === 0) return;
    const qualityCap = quality === 'low' ? 0.85 : quality === 'balanced' ? 1.15 : 1.5;
    const areaCap = quality === 'low' ? 240_000 : quality === 'balanced' ? 420_000 : 1_200_000;
    const ratio = Math.min(
      window.devicePixelRatio || 1,
      qualityCap,
      Math.sqrt(areaCap / Math.max(1, w * h)),
    );
    if (w === width && h === height && Math.abs(ratio - dpr) < 0.01) return;
    const first = width === 0;
    for (const walker of walkers) {
      if (width > 0) walker.x *= w / width;
    }
    width = w;
    height = h;
    dpr = ratio;
    for (const canvas of [options.back, options.front]) {
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
    }
    if (first) populateWalkers();
    draw();
  }

  function frame(now: number) {
    if (state !== 'running') return;
    const minInterval = quality === 'low' ? 32 : quality === 'balanced' ? 22 : 0;
    if (minInterval && now - last < minInterval) return;
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    const start = performance.now();
    update(dt);
    draw();
    const spent = performance.now() - start;
    frames += 1;
    cost += (spent - cost) * 0.05;
  }

  function setState(next: StreetStats['state']) {
    state = next;
    stage.dataset['state'] = next;
    if (avatar) avatar.dataset['state'] = next;
  }

  function sync() {
    if (destroyed || options.reduce) return;
    const run = visible && !document.hidden;
    if (run && state !== 'running') {
      setState('running');
      last = performance.now();
      if (!stopClock) stopClock = watchCircuitClock(frame, { priority: 'high' });
    } else if (!run && state === 'running') {
      setState('paused');
      stopClock?.();
      stopClock = undefined;
    }
  }

  function summon(slug: string): boolean {
    const look = CAST.find((candidate) => candidate.egg === slug);
    if (!look || width === 0) return false;
    let walker = walkers.find((w) => w.look === look) ?? null;
    if (!walker && state !== 'static') {
      walker = addWalker(look, 1, width * 0.25, 1);
    }
    if (walker) walker.hold = 6;
    return !!walker;
  }

  const onEnterCast = (event: Event) => {
    const slug = (event.currentTarget as HTMLElement).dataset['cast'];
    if (slug) summon(slug);
  };

  const onInteractAvatar = () => {
    if (state !== 'running') return;
    if (currentAction === 'idle') {
      const next = actionOrder[orderIndex % actionOrder.length]!;
      orderIndex += 1;
      startAction(next);
      draw();
    }
  };

  for (const label of options.cast) {
    label.addEventListener('pointerenter', onEnterCast);
    label.addEventListener('focus', onEnterCast);
  }
  avatar?.addEventListener('pointerenter', onInteractAvatar);
  avatar?.addEventListener('focus', onInteractAvatar);
  avatar?.addEventListener('click', onInteractAvatar);

  const resizer = new ResizeObserver(resize);
  resizer.observe(stage);
  const watcher = new IntersectionObserver(
    (entries) => {
      visible = entries.some((entry) => entry.isIntersecting);
      sync();
    },
    { rootMargin: '80px 0px' },
  );
  watcher.observe(stage);
  const unobserveQuality = observeQualityTier((tier) => {
    quality = tier;
    if (width > 0) resize();
  });
  document.addEventListener('visibilitychange', sync);

  syncAvatarDataset();
  resize();
  setState(state);

  loadCafeAtlas()
    .then((img) => {
      if (destroyed) return;
      atlas = img;
      draw();
    })
    .catch(() => {
      // Fallback: the SVG café room remains intact even if the sprite request is aborted.
    });

  return {
    step(seconds, dt = 1 / 30) {
      for (let t = 0; t < seconds; t += dt) update(dt);
      draw();
    },
    stats: () => ({
      state,
      active: walkers.length,
      target: targetWalkers(),
      spawned,
      left,
      pooled: pool.length,
      frames,
      cost,
      front: 1,
      back: walkers.length,
    }),
    summon,
    walkers: () =>
      walkers.map((w) => ({
        id: w.look.id,
        lane: w.lane,
        x: w.x,
        dir: w.dir,
        front: false,
        act: null,
      })),
    cafeState: () => ({
      action: currentAction,
      stepName: currentStepName,
      frame: currentFrame,
      cupOnTable,
      phoneOnTable,
      laptopOpen,
      handContactsCup,
      sips,
      phoneChecks,
      laptopSessions,
      glances,
    }),
    triggerAction(action: CafeAction) {
      startAction(action);
      transitionElapsed = 1;
      draw();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      stopClock?.();
      stopClock = undefined;
      resizer.disconnect();
      watcher.disconnect();
      unobserveQuality();
      document.removeEventListener('visibilitychange', sync);
      for (const label of options.cast) {
        label.removeEventListener('pointerenter', onEnterCast);
        label.removeEventListener('focus', onEnterCast);
        delete label.dataset['lit'];
      }
      avatar?.removeEventListener('pointerenter', onInteractAvatar);
      avatar?.removeEventListener('focus', onInteractAvatar);
      avatar?.removeEventListener('click', onInteractAvatar);
      walkers.length = 0;
      pool.length = 0;
      backCtx?.clearRect(0, 0, options.back.width, options.back.height);
      frontCtx?.clearRect(0, 0, options.front.width, options.front.height);
      setState('paused');
    },
  };
}
