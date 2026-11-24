/**
 * The street at the foot of every page: people walk past in five lanes while
 * one figure stands still. Two canvases sandwich that figure, so a lane drawn
 * on the front canvas passes in front of him and a lane on the back canvas
 * behind.
 *
 * The loop only exists while the scene is on screen, the tab is visible and
 * motion is welcome. Otherwise nothing is scheduled at all: one composed
 * frame stays painted.
 */
import { createAvatarPresence, type AvatarPresenceSnapshot } from './avatar-presence';
import { CAST, paintFor, pick } from './cast';
import { cycleLength, drawFigure, type C3, type Look, type Paint, type Pose } from './figure';
import {
  getQualityTier,
  observeQualityTier,
  watchCircuitClock,
  type QualityTier,
} from '../circuit-clock';

interface Lane {
  /** Ground line as a fraction of the stage height. */
  y: number;
  scale: number;
  haze: number;
  front: boolean;
  /** Share of the people on the street. */
  share: number;
  pace: number;
}

const LANES: readonly Lane[] = [
  { y: 0.7, scale: 0.47, haze: 0.52, front: false, share: 0.24, pace: 0.86 },
  { y: 0.785, scale: 0.61, haze: 0.32, front: false, share: 0.26, pace: 0.93 },
  { y: 0.875, scale: 0.78, haze: 0.14, front: false, share: 0.24, pace: 1 },
  { y: 0.99, scale: 0.97, haze: 0, front: true, share: 0.2, pace: 1.05 },
  { y: 1.2, scale: 1.34, haze: -0.3, front: true, share: 0.06, pace: 1.15 },
];
/** Stage height taken by an adult in a lane of scale 1, per unit of figure height. */
const UNIT = 0.0057;
const WALL: C3 = [0.3, 0.012, 255];

type Act = 'phone' | 'wave' | 'look' | 'shrug' | 'greet';

interface Walker {
  look: Look;
  paint: Paint;
  lane: number;
  x: number;
  dy: number;
  baseDy: number;
  targetDy: number;
  dir: 1 | -1;
  /** Pixels per second at full pace, and now. */
  pace: number;
  v: number;
  /** Pixels one walk cycle covers. */
  cycle: number;
  act: Act | null;
  actLeft: number;
  /** Seconds until this figure may act again. */
  rest: number;
  pose: Pose;
  /** Lit by its label (target), and summoned by one. */
  lit: number;
  hold: number;
  half: number;
  tall: number;
}

export interface StreetOptions {
  stage: HTMLElement;
  back: HTMLCanvasElement;
  front: HTMLCanvasElement;
  avatar: HTMLElement | null;
  counter: HTMLElement | null;
  cast: readonly HTMLElement[];
  reduce: boolean;
  seed?: number;
}

export interface StreetStats {
  state: 'running' | 'paused' | 'static';
  active: number;
  target: number;
  spawned: number;
  left: number;
  pooled: number;
  frames: number;
  /** Mean milliseconds of simulation and drawing per frame. */
  cost: number;
  front: number;
  back: number;
  vignettes: number;
}

export interface Street {
  /** Advance the simulation without the clock (tests). */
  step(seconds: number, dt?: number): void;
  stats(): StreetStats;
  summon(slug: string): boolean;
  walkers(): {
    id: string;
    lane: number;
    x: number;
    dir: number;
    front: boolean;
    act: string | null;
  }[];
  avatar(): AvatarPresenceSnapshot;
  destroy(): void;
}

/** Small seeded generator (mulberry32): one street per visit, repeatable in tests. */
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

export function createStreet(options: StreetOptions): Street {
  const { stage, avatar, counter } = options;
  const canvases = [options.back, options.front] as const;
  const contexts = canvases.map((canvas) => canvas.getContext('2d'));
  const random = rng(options.seed ?? (Date.now() ^ (performance.now() * 1000)) >>> 0);
  const between = (lo: number, hi: number) => lo + random() * (hi - lo);
  const presence = createAvatarPresence({ avatar, random });

  let width = 0;
  let height = 0;
  let dpr = 1;
  let clock = 0;
  let reduce = options.reduce;
  let state: StreetStats['state'] = reduce ? 'static' : 'paused';
  let stopClock: (() => void) | undefined;
  let last = 0;
  let visible = false;
  let spawned = 0;
  let left = 0;
  let frames = 0;
  let cost = 0;
  let vignettes = 0;
  let quality: QualityTier = getQualityTier();
  /** 1 at full population; the governor lowers it on a device that struggles. */
  let budget = 1;
  let slowFor = 0;
  let nextEvent = 3;
  let nextVignetteCheck = 1.4;
  let lastVignetteAt = -10;
  let shown = -1;
  let destroyed = false;

  // One soft shadow, painted once and stamped under every pair of feet and companions.
  const shadow = document.createElement('canvas');
  shadow.width = 128;
  shadow.height = 32;
  const sg = shadow.getContext('2d');
  if (sg) {
    sg.scale(1, 0.25);
    const fade = sg.createRadialGradient(64, 64, 3, 64, 64, 64);
    fade.addColorStop(0, 'rgb(4 5 10 / 0.68)');
    fade.addColorStop(0.42, 'rgb(4 5 10 / 0.36)');
    fade.addColorStop(1, 'rgb(4 5 10 / 0)');
    sg.fillStyle = fade;
    sg.fillRect(0, 0, 128, 128);
  }

  const walkers: Walker[] = [];
  const pool: Walker[] = [];
  const takenIds = new Set<string>();
  const heldEggs = new Set<string>();
  const storyScratch: Walker[] = [];
  const nextSpawn = LANES.map(() => 0);
  const pointer = { x: -1, y: -1, on: false };
  const labels = new Map(options.cast.map((el) => [el.dataset['cast'] ?? '', el]));
  /** Previous painted bounding box per canvas layer so we clear only dirty regions. */
  const dirty = [
    { active: false, minX: 0, minY: 0, maxX: 0, maxY: 0 },
    { active: false, minX: 0, minY: 0, maxX: 0, maxY: 0 },
  ];

  // ---------- size & avatar composition corridor ----------
  const unit = (lane: Lane) => height * UNIT * lane.scale;
  const avatarCoreHalf = () => Math.max(36, height * 0.13);
  const avatarFlankMin = () => avatarCoreHalf() * 1.15;
  const avatarFlankMax = () => Math.max(115, width * 0.27);

  function resize() {
    const rect = stage.getBoundingClientRect();
    const w = Math.round(rect.width);
    const h = Math.round(rect.height);
    if (w === 0 || h === 0) return;
    const qualityCap = quality === 'low' ? 0.72 : quality === 'balanced' ? 0.85 : 1.25;
    const areaCap = quality === 'low' ? 200_000 : quality === 'balanced' ? 320_000 : 1_150_000;
    const ratio = Math.min(
      window.devicePixelRatio || 1,
      qualityCap,
      Math.sqrt(areaCap / Math.max(1, w * h)),
    );
    if (w === width && h === height && Math.abs(ratio - dpr) < 0.01) return;
    // The first real size: until now there was no street to put anyone on.
    const first = width === 0;
    for (const walker of walkers) {
      if (width > 0) walker.x *= w / width;
      measure(walker, h);
    }
    width = w;
    height = h;
    dpr = ratio;
    for (let i = 0; i < canvases.length; i += 1) {
      const canvas = canvases[i]!;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      dirty[i]!.active = false;
    }
    if (first) populate();
    if (state !== 'running') draw();
  }

  function measure(walker: Walker, h: number) {
    const lane = LANES[walker.lane]!;
    const u = h * UNIT * lane.scale * walker.look.h;
    walker.pace = (walker.pace / (walker.cycle || 1)) * cycleLength(walker.look) * u || 0;
    walker.cycle = cycleLength(walker.look) * u;
    walker.half =
      u *
      (walker.look.with || walker.look.hand === 'bike' || walker.look.hand === 'stroller'
        ? 46
        : 24);
    walker.tall = u * 104;
  }

  /** People the street holds at this width: fewer on a phone, more on a wide screen. */
  function population(): number {
    if (width === 0) return 0;
    const qualityFactor = quality === 'low' ? 0.65 : quality === 'balanced' ? 0.82 : 1;
    const full = Math.min(32, Math.max(8, Math.round(width / (height * 0.16))));
    const scaled = Math.round(full * budget * qualityFactor);
    if (width < 500) return Math.min(10, Math.max(5, scaled));
    return Math.max(14, scaled);
  }

  function laneTarget(index: number): number {
    const total = population();
    // A stage with no size holds nobody: a figure made there would have a
    // walk cycle of zero length.
    if (total === 0) return 0;
    if (index === 4) return total >= 14 ? 1 : 0;
    return Math.max(1, Math.round(total * LANES[index]!.share));
  }

  // ---------- casting ----------
  function taken(): Set<string> {
    takenIds.clear();
    for (const walker of walkers) takenIds.add(walker.look.id);
    return takenIds;
  }

  function fits(look: Look, lane: number): boolean {
    // A project figure belongs where it can be found and pointed at.
    if (look.egg) return lane === 2 || lane === 3;
    if (lane === 4) return !look.roll && !look.run && look.h > 0.8 && !look.with;
    if (lane === 0) return !look.roll;
    return true;
  }

  const order = (walker: Walker) => walker.lane * 10 + walker.dy / (height || 1);

  function add(look: Look, lane: number, x: number, dir: 1 | -1): Walker {
    const def = LANES[lane]!;
    const walker: Walker = pool.pop() ?? {
      look,
      paint: null as unknown as Paint,
      lane,
      x,
      dy: 0,
      baseDy: 0,
      targetDy: 0,
      dir,
      pace: 0,
      v: 0,
      cycle: 1,
      act: null,
      actLeft: 0,
      rest: 0,
      pose: { p: 0, stand: 0, wave: 0, phone: 0, turn: 0, shrug: 0, t: 0, lit: 0 },
      lit: 0,
      hold: 0,
      half: 0,
      tall: 0,
    };
    const u = height * UNIT * def.scale * look.h;
    const baseDy = between(-0.012, 0.012) * height * def.scale;
    walker.look = look;
    walker.lane = lane;
    walker.x = x;
    walker.dir = dir;
    walker.dy = baseDy;
    walker.baseDy = baseDy;
    walker.targetDy = baseDy;
    walker.paint = paintFor(
      look,
      def.haze,
      WALL,
      Math.max(0.85, 1.25 * def.scale ** 0.5) / (height * UNIT * def.scale * look.h),
    );
    walker.cycle = cycleLength(look) * u;
    walker.pace = look.speed * def.pace * between(0.92, 1.08) * u;
    walker.v = walker.pace;
    walker.act = null;
    walker.actLeft = 0;
    walker.rest = between(2, 9);
    walker.lit = 0;
    walker.hold = 0;
    const pose = walker.pose;
    pose.p = random();
    pose.stand = pose.wave = pose.phone = pose.turn = pose.shrug = pose.lit = 0;
    pose.t = between(0, 60);
    measure(walker, height);
    // Kept in drawing order: far lanes first, then by where the feet are.
    let at = walkers.length;
    while (at > 0 && order(walkers[at - 1]!) > order(walker)) at -= 1;
    walkers.splice(at, 0, walker);
    spawned += 1;
    return walker;
  }

  function clearAt(lane: number, x: number, gap: number): boolean {
    for (const walker of walkers) {
      if (walker.lane === lane && Math.abs(walker.x - x) < gap + walker.half) return false;
    }
    return true;
  }

  function spawn(lane: number, look?: Look | null, side?: 1 | -1): Walker | null {
    const chosen = look ?? pick(random(), taken(), (candidate) => fits(candidate, lane));
    if (!chosen) return null;
    const dir: 1 | -1 = side ?? (random() < 0.5 ? 1 : -1);
    const margin = height * UNIT * LANES[lane]!.scale * 60;
    const x = dir === 1 ? -margin : width + margin;
    if (!look && !clearAt(lane, x, margin * 0.8)) return null;
    return add(chosen, lane, x, dir);
  }

  /** The street as it is when the page arrives: already busy, composition-balanced. */
  function populate() {
    const centre = width * 0.5;
    const clearHalf = avatarCoreHalf() * 1.15;
    for (let lane = 0; lane < LANES.length; lane += 1) {
      const count = lane === 4 ? 0 : laneTarget(lane);
      for (let i = 0; i < count; i += 1) {
        const look = pick(random(), taken(), (candidate) => fits(candidate, lane));
        if (!look) break;
        // One slot each across the width, so the first frame is evenly peopled.
        const slot = width / count;
        let x = slot * i + between(0.14, 0.86) * slot;
        // Keep the initial frame from stamping a foreground walker over Nikolay's torso.
        if (lane === 3 && Math.abs(x - centre) < clearHalf) {
          const pushDir = x < centre ? -1 : 1;
          const shifted = centre + pushDir * (clearHalf + 14);
          if (shifted > 24 && shifted < width - 24) x = shifted;
        }
        add(look, lane, x, random() < 0.5 ? 1 : -1);
      }
      nextSpawn[lane] = lane === 4 ? between(4, 10) : between(0.5, 3);
    }
  }

  // ---------- the standing figure ----------
  function standing() {
    if (!avatar) return;
    const { wantsTarget } = presence.tick(clock, state !== 'running');
    if (!wantsTarget || state !== 'running') return;

    const centre = width * 0.5;
    const maxDist = width * 0.24;
    let best: Walker | null = null;
    let bestScore = Infinity;
    for (const walker of walkers) {
      if (walker.lane < 2) continue;
      const dist = Math.abs(walker.x - centre);
      if (dist > maxDist) continue;
      // Subtle preference for companions and project cast passing near the middle.
      const interest = walker.look.egg || walker.look.with ? 0.65 : 1;
      const score = dist * interest;
      if (score < bestScore) {
        bestScore = score;
        best = walker;
      }
    }
    if (!best) return;
    const side = best.x < centre ? 'left' : 'right';
    const kind =
      best.look.with === 'dog' || best.look.with === 'pup'
        ? 'down'
        : Math.abs(best.x - centre) < width * 0.12
          ? 'near'
          : 'soft';
    presence.glance(clock, side, kind, between(1.5, 2.7));
  }

  // ---------- small things & micro-storytelling ----------
  function begin(walker: Walker, act: Act, seconds: number) {
    walker.act = act;
    walker.actLeft = seconds;
    walker.rest = seconds + between(8, 20);
  }

  function tryContextualVignette(): boolean {
    if (clock - lastVignetteAt < 6.5 || state !== 'running') return false;
    const centre = width * 0.5;
    const minDist = avatarFlankMin();
    const maxDist = avatarFlankMax();

    for (const walker of walkers) {
      if (walker.act || walker.rest > 0 || walker.look.roll || walker.look.run) continue;
      const dist = Math.abs(walker.x - centre);
      if (dist < minDist || dist > maxDist) continue;
      const side = walker.x < centre ? 'left' : 'right';

      // 1. Project cast / courier recognition in the flanking lanes.
      if (walker.look.egg && (walker.lane === 2 || walker.lane === 3)) {
        const hasItem = walker.look.hand !== undefined && walker.look.hand !== 'pocket';
        begin(walker, hasItem ? 'look' : 'wave', 1.65);
        walker.hold = Math.max(walker.hold, 1.8);
        if (random() < 0.45) presence.acknowledge(clock, 1.25, 2.1);
        else presence.glance(clock, side, 'near', 1.85);
        lastVignetteAt = clock;
        vignettes += 1;
        return true;
      }

      // 2. Dog or pup companion drawing a gentle downward glance.
      if ((walker.look.with === 'dog' || walker.look.with === 'pup') && walker.lane >= 2) {
        begin(walker, 'look', 1.6);
        presence.glance(clock, side, 'down', 1.85);
        lastVignetteAt = clock;
        vignettes += 1;
        return true;
      }

      // 3. Builder, photographer, or engineer pausing to inspect the site hoarding.
      if (
        (walker.look.id === 'builder' ||
          walker.look.id === 'photographer' ||
          walker.look.id === 'engineer') &&
        (walker.lane === 1 || walker.lane === 2)
      ) {
        begin(walker, 'look', 1.75);
        presence.glance(clock, side, 'up', 1.85);
        lastVignetteAt = clock;
        vignettes += 1;
        return true;
      }
    }
    return false;
  }

  function somethingHappens() {
    const centre = width * 0.5;
    const clearHalf = avatarCoreHalf() * 1.25;
    storyScratch.length = 0;
    for (const walker of walkers) {
      if (
        walker.lane >= 1 &&
        walker.lane <= 3 &&
        !walker.act &&
        walker.rest <= 0 &&
        !walker.look.roll &&
        !walker.look.run &&
        walker.x > width * 0.08 &&
        walker.x < width * 0.92
      ) {
        storyScratch.push(walker);
      }
    }
    if (storyScratch.length === 0) return;
    const walker = storyScratch[Math.floor(random() * storyScratch.length)]!;
    const overAvatar = walker.lane >= 2 && Math.abs(walker.x - centre) < clearHalf;

    // Two people about to pass each other in the same lane may stop briefly to greet.
    let other: Walker | undefined;
    if (!overAvatar) {
      for (const candidate of storyScratch) {
        if (
          candidate !== walker &&
          candidate.lane === walker.lane &&
          candidate.dir !== walker.dir &&
          (candidate.x - walker.x) * walker.dir > 0 &&
          Math.abs(candidate.x - walker.x) < walker.half * 5 &&
          Math.abs(candidate.x - centre) >= clearHalf
        ) {
          other = candidate;
          break;
        }
      }
    }
    const roll = random();
    const busy = walker.look.hand !== undefined && walker.look.hand !== 'pocket';
    if (other && roll < 0.5) {
      begin(walker, 'greet', 2.2);
      begin(other, 'greet', 2.2);
    } else if (!overAvatar && roll < 0.3 && !busy) {
      begin(walker, 'phone', between(2.6, 4.6));
    } else if (!overAvatar && roll < 0.52 && !busy) {
      begin(walker, 'wave', 2.1);
      if (walker.lane >= 2 && Math.abs(walker.x - centre) < width * 0.3) {
        presence.glance(clock, walker.x < centre ? 'left' : 'right', 'near', 2);
      }
    } else if (roll < 0.74 && walker.look.back === 'pack' && !busy) {
      begin(walker, 'shrug', 1.3);
    } else {
      begin(walker, 'look', between(1.2, 2.2));
    }
  }

  // ---------- simulation ----------
  const ease = (from: number, to: number, rate: number, dt: number) =>
    from + (to - from) * Math.min(1, rate * dt);

  function update(dt: number) {
    if (width === 0) return;
    clock += dt;

    for (let lane = 0; lane < LANES.length; lane += 1) {
      let count = 0;
      for (const walker of walkers) if (walker.lane === lane) count += 1;
      if (count < laneTarget(lane) && clock >= nextSpawn[lane]!) {
        spawn(lane);
        const burst = lane < 4 && random() < 0.28;
        nextSpawn[lane] =
          clock + (lane === 4 ? between(7, 16) : burst ? between(0.45, 1.05) : between(1.3, 3.5));
      }
    }

    if (clock >= nextVignetteCheck) {
      tryContextualVignette();
      nextVignetteCheck = clock + between(1.1, 2.1);
    }

    if (clock >= nextEvent) {
      somethingHappens();
      nextEvent = clock + between(2.5, 6);
    }

    const centre = width * 0.5;
    const coreHalf = avatarCoreHalf();
    let hovered = '';
    let dyShifted = false;

    for (let i = walkers.length - 1; i >= 0; i -= 1) {
      const walker = walkers[i]!;
      const pose = walker.pose;
      const lane = LANES[walker.lane]!;
      const ground = lane.y * height + walker.dy;
      walker.rest -= dt;
      walker.targetDy = walker.baseDy;

      const stopped = walker.act === 'phone' || walker.act === 'wave' || walker.act === 'greet';
      let pace = stopped ? 0 : walker.pace;
      if (walker.act === 'look' && walker.look.with) pace *= 0.62;
      if (walker.lane >= 3 && !walker.act && Math.abs(walker.x - centre) < coreHalf) {
        pace *= 1.08;
      }
      let turned = walker.act === 'wave' || walker.act === 'look' ? 1 : 0;

      // The pointer: whoever it is near looks up, and slows a little.
      if (pointer.on && walker.lane >= 1) {
        const near =
          Math.abs(walker.x - pointer.x) < walker.half * 1.5 &&
          pointer.y < ground + 6 &&
          pointer.y > ground - walker.tall;
        if (near) {
          turned = 1;
          if (!walker.look.roll && !walker.look.run) pace *= 0.82;
          if (walker.look.egg) hovered = walker.look.egg;
        }
      }

      // Believable interpersonal spacing & smooth depth-offset overtaking around stopped walkers.
      if (pace > 0) {
        for (const ahead of walkers) {
          if (ahead === walker || ahead.lane !== walker.lane || ahead.dir !== walker.dir) continue;
          const gap = (ahead.x - walker.x) * walker.dir;
          if (gap <= 0) continue;
          const minGap = (walker.half + ahead.half) * 1.15;
          const comfortGap = (walker.half + ahead.half) * 1.78;
          if (gap >= comfortGap) continue;
          if (ahead.v < ahead.pace * 0.35 && !walker.act) {
            const sideShift = ahead.baseDy >= 0 ? -0.015 : 0.015;
            walker.targetDy = sideShift * height * lane.scale;
            if (pace > walker.pace * 0.9) pace = walker.pace * 0.9;
          } else if (ahead.v < pace) {
            const t = Math.max(0, Math.min(1, (gap - minGap) / Math.max(1, comfortGap - minGap)));
            const desired = ahead.v + (pace - ahead.v) * t;
            if (desired < pace) pace = desired;
          }
        }
      }

      if (Math.abs(walker.dy - walker.targetDy) > 0.05) {
        walker.dy = ease(walker.dy, walker.targetDy, 3.5, dt);
        dyShifted = true;
      }

      walker.v = ease(walker.v, pace, stopped ? 5 : 3, dt);
      const moved = walker.v * dt;
      walker.x += walker.dir * moved;
      pose.p = (pose.p + moved / walker.cycle) % 1;
      pose.t += dt;
      pose.stand = ease(pose.stand, walker.v < walker.pace * 0.25 ? 1 : 0, 6, dt);
      pose.turn = ease(pose.turn, turned, 7, dt);
      pose.wave = ease(pose.wave, walker.act === 'wave' || walker.act === 'greet' ? 1 : 0, 8, dt);
      pose.phone = ease(pose.phone, walker.act === 'phone' ? 1 : 0, 6, dt);
      pose.shrug = ease(pose.shrug, walker.act === 'shrug' ? 1 : 0, 8, dt);
      walker.hold -= dt;
      pose.lit = ease(pose.lit, walker.lit > 0 || walker.hold > 0 ? 1 : 0, 6, dt);

      if (walker.act) {
        walker.actLeft -= dt;
        if (walker.actLeft <= 0) walker.act = null;
      }

      const margin = walker.half + height * 0.1;
      if (
        (walker.dir === 1 && walker.x > width + margin) ||
        (walker.dir === -1 && walker.x < -margin)
      ) {
        walkers.splice(i, 1);
        pool.push(walker);
        left += 1;
      }
    }

    // Re-settle painter order in O(N) only when an overtaking shift adjusted a lane y.
    if (dyShifted && walkers.length > 1) {
      for (let i = 1; i < walkers.length; i += 1) {
        const cur = walkers[i]!;
        const curOrder = order(cur);
        let j = i - 1;
        while (j >= 0 && order(walkers[j]!) > curOrder) {
          walkers[j + 1] = walkers[j]!;
          j -= 1;
        }
        walkers[j + 1] = cur;
      }
    }

    heldEggs.clear();
    for (const walker of walkers) {
      if (walker.look.egg) {
        walker.lit = walker.look.egg === hovered ? 1 : 0;
        if (walker.hold > 0) heldEggs.add(walker.look.egg);
      }
    }
    for (const [slug, label] of labels) {
      const lit = slug === hovered || heldEggs.has(slug);
      if (lit !== (label.dataset['lit'] !== undefined)) {
        if (lit) label.dataset['lit'] = '';
        else delete label.dataset['lit'];
      }
    }

    standing();

    if (counter && left !== shown) {
      shown = left;
      counter.textContent = String(left).padStart(3, '0');
    }
  }

  // ---------- drawing ----------
  function draw() {
    for (let layer = 0; layer < 2; layer += 1) {
      const g = contexts[layer];
      if (!g) continue;
      const box = dirty[layer]!;
      let hasVisible = false;
      for (const walker of walkers) {
        const lane = LANES[walker.lane]!;
        if (lane.front !== (layer === 1)) continue;
        if (walker.x >= -walker.half * 2 && walker.x <= width + walker.half * 2) {
          hasVisible = true;
          break;
        }
      }
      if (!hasVisible && !box.active) continue;

      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (box.active) {
        const cx = Math.max(0, Math.floor(box.minX - 6));
        const cy = Math.max(0, Math.floor(box.minY - 6));
        const cw = Math.min(width, Math.ceil(box.maxX + 6)) - cx;
        const ch = Math.min(height, Math.ceil(box.maxY + 6)) - cy;
        if (cw > 0 && ch > 0) g.clearRect(cx, cy, cw, ch);
      }

      if (!hasVisible) {
        box.active = false;
        continue;
      }

      let minX = width;
      let minY = height;
      let maxX = 0;
      let maxY = 0;

      for (const walker of walkers) {
        const lane = LANES[walker.lane]!;
        if (lane.front !== (layer === 1)) continue;
        if (walker.x < -walker.half * 2 || walker.x > width + walker.half * 2) continue;
        const ground = lane.y * height + walker.dy;
        const u = unit(lane) * walker.look.h;
        const lit = walker.pose.lit;
        const padX = Math.max(walker.half * 1.5, u * 40);
        const topY = ground - walker.tall - 20 * lane.scale - u * 14;
        const botY = ground + u * 10 + 6;
        if (walker.x - padX < minX) minX = walker.x - padX;
        if (walker.x + padX > maxX) maxX = walker.x + padX;
        if (topY < minY) minY = topY;
        if (botY > maxY) maxY = botY;

        // Ground contact shadows coupled to stride width and companion position.
        if (ground < height + 4) {
          const strideSpread =
            1 + 0.14 * Math.abs(Math.cos(Math.PI * 2 * walker.pose.p)) * (1 - walker.pose.stand);
          g.drawImage(
            shadow,
            walker.x - u * 21 * strideSpread,
            ground - u * 3.4,
            u * 42 * strideSpread,
            u * 9,
          );
          if (walker.look.with === 'dog' || walker.look.with === 'pup') {
            const big = walker.look.with === 'dog';
            const compX =
              walker.x + walker.dir * u * ((big ? 36 : 28) + Math.sin(walker.pose.t * 1.3) * 2);
            const compW = u * (big ? 24 : 17);
            g.drawImage(shadow, compX - compW * 0.5, ground - u * 2.5, compW, u * 6);
          } else if (walker.look.with === 'robot') {
            const compX = walker.x - walker.dir * u * (27 + Math.sin(walker.pose.t * 0.9) * 2);
            g.drawImage(shadow, compX - u * 8.5, ground - u * 2.4, u * 17, u * 5.6);
          }
          if (lit > 0.02) {
            g.beginPath();
            g.ellipse(walker.x, ground + u * 0.6, u * 15, u * 2.6, 0, 0, Math.PI * 2);
            g.globalAlpha = lit * 0.55;
            g.fillStyle = walker.paint.accent;
            g.fill();
            g.globalAlpha = 1;
          }
        }
        g.save();
        g.translate(walker.x, ground);
        g.scale(walker.dir * u, u);
        drawFigure(
          g,
          walker.look,
          walker.paint,
          walker.pose,
          walker.lane >= (quality === 'low' ? 2 : 1),
        );
        g.restore();
        if (lit > 0.02) {
          // A drafting tick over the head, in the project's colour.
          const top = ground - walker.tall - 8 * lane.scale;
          g.globalAlpha = lit;
          g.fillStyle = walker.paint.accent;
          g.beginPath();
          g.moveTo(walker.x - 4, top - 6);
          g.lineTo(walker.x + 4, top - 6);
          g.lineTo(walker.x, top);
          g.closePath();
          g.fill();
          g.globalAlpha = 1;
        }
      }
      box.active = maxX > minX && maxY > minY;
      box.minX = minX;
      box.minY = minY;
      box.maxX = maxX;
      box.maxY = maxY;
    }
  }

  function frame(now: number) {
    if (state !== 'running') return;
    const minInterval = quality === 'low' ? 30 : quality === 'balanced' && cost > 6 ? 24 : 0;
    if (minInterval && now - last < minInterval) return;
    // A long gap is a tab that was away, not a long step.
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    const start = performance.now();
    update(dt);
    draw();
    const spent = performance.now() - start;
    frames += 1;
    cost += (spent - cost) * 0.05;
    // A device that cannot keep up gets a quieter street, once, not a slideshow.
    slowFor = cost > 9 ? slowFor + dt : 0;
    if (slowFor > 2 && budget > 0.6) {
      budget = Math.max(0.6, budget - 0.2);
      slowFor = 0;
    }
  }

  function setState(next: StreetStats['state']) {
    state = next;
    stage.dataset['state'] = next;
    if (avatar) avatar.dataset['state'] = next;
  }

  function sync() {
    if (destroyed) return;
    if (reduce) {
      stopClock?.();
      stopClock = undefined;
      presence.reset();
      if (state !== 'static') {
        setState('static');
        draw();
      }
      return;
    }
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

  // ---------- input ----------
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const reduceMedia = window.matchMedia('(prefers-reduced-motion: reduce)');
  const onReduceChange = (event: MediaQueryListEvent) => {
    reduce = event.matches;
    sync();
  };

  function at(event: PointerEvent) {
    const rect = stage.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function under(x: number, y: number): Walker | null {
    for (let i = walkers.length - 1; i >= 0; i -= 1) {
      const walker = walkers[i]!;
      const ground = LANES[walker.lane]!.y * height + walker.dy;
      if (Math.abs(walker.x - x) < walker.half && y < ground + 6 && y > ground - walker.tall)
        return walker;
    }
    return null;
  }

  function onMove(event: PointerEvent) {
    if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
    const point = at(event);
    pointer.x = point.x;
    pointer.y = point.y;
    pointer.on = true;
  }
  function onLeave() {
    pointer.on = false;
  }
  /** A click or a tap: a project figure names itself, anyone else waves back. */
  function onClick(event: MouseEvent) {
    if (state !== 'running') return;
    if (event.target instanceof Element && event.target.closest('button, a')) return;
    const rect = stage.getBoundingClientRect();
    const walker = under(event.clientX - rect.left, event.clientY - rect.top);
    if (!walker) return;
    if (walker.look.egg) {
      walker.hold = 4;
      presence.glance(clock, walker.x < width * 0.5 ? 'left' : 'right', 'near', 1.8, true);
    } else if (!walker.act && !walker.look.roll && !walker.look.run) {
      begin(walker, 'wave', 1.9);
      presence.acknowledge(clock, 1.1, 1.8);
    }
  }

  function summon(slug: string): boolean {
    const look = CAST.find((candidate) => candidate.egg === slug);
    if (!look || width === 0) return false;
    let walker = walkers.find((candidate) => candidate.look === look) ?? null;
    if (!walker && state !== 'static') {
      // Focus can arrive before the visibility observer resumes the street.
      walker = spawn(3, look, random() < 0.5 ? 1 : -1);
      if (walker) walker.x = walker.dir === 1 ? -walker.half : width + walker.half;
    }
    if (walker) {
      walker.hold = 6;
      if (state === 'running') {
        presence.glance(clock, walker.x < width * 0.5 ? 'left' : 'right', 'near', 2.0, true);
      }
    }
    return !!walker;
  }

  const enter = (event: Event) => {
    const slug = (event.currentTarget as HTMLElement).dataset['cast'];
    if (slug) summon(slug);
  };
  const greet = () => {
    if (state === 'running') presence.acknowledge(clock, 1.3, 2.2);
  };

  if (fine) {
    stage.addEventListener('pointermove', onMove);
    stage.addEventListener('pointerleave', onLeave);
  }
  stage.addEventListener('click', onClick);
  for (const label of options.cast) {
    label.addEventListener('pointerenter', enter);
    label.addEventListener('focus', enter);
  }
  avatar?.addEventListener('pointerenter', greet);
  avatar?.addEventListener('focus', greet);
  avatar?.addEventListener('click', greet);

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
  reduceMedia.addEventListener('change', onReduceChange);

  // Peoples the street as soon as it has a size (now, unless the stage is collapsed).
  resize();
  setState(state);
  draw();

  return {
    step(seconds, dt = 1 / 30) {
      for (let t = 0; t < seconds; t += dt) update(dt);
      draw();
    },
    stats: () => {
      let frontCount = 0;
      let backCount = 0;
      for (const walker of walkers) {
        if (LANES[walker.lane]!.front) frontCount += 1;
        else backCount += 1;
      }
      return {
        state,
        active: walkers.length,
        target: population(),
        spawned,
        left,
        pooled: pool.length,
        frames,
        cost,
        front: frontCount,
        back: backCount,
        vignettes,
      };
    },
    summon,
    walkers: () =>
      walkers.map((walker) => ({
        id: walker.look.id,
        lane: walker.lane,
        x: walker.x,
        dir: walker.dir,
        front: LANES[walker.lane]!.front,
        act: walker.act,
      })),
    avatar: () => presence.snapshot(),
    destroy() {
      destroyed = true;
      stopClock?.();
      stopClock = undefined;
      presence.reset();
      resizer.disconnect();
      watcher.disconnect();
      unobserveQuality();
      document.removeEventListener('visibilitychange', sync);
      reduceMedia.removeEventListener('change', onReduceChange);
      stage.removeEventListener('pointermove', onMove);
      stage.removeEventListener('pointerleave', onLeave);
      stage.removeEventListener('click', onClick);
      for (const label of options.cast) {
        label.removeEventListener('pointerenter', enter);
        label.removeEventListener('focus', enter);
      }
      avatar?.removeEventListener('pointerenter', greet);
      avatar?.removeEventListener('focus', greet);
      avatar?.removeEventListener('click', greet);
      walkers.length = 0;
      pool.length = 0;
      storyScratch.length = 0;
    },
  };
}
