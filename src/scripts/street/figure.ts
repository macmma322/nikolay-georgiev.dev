/**
 * One pedestrian, drawn in profile from a description (`Look`) and a moment
 * (`Pose`). Nothing here is an image: every figure is a small skeleton with a
 * real walk cycle (feet planted by inverse kinematics, so they never slide)
 * dressed in a few outlined shapes.
 *
 * Units: an adult is 100 tall, the origin is the ground under the hips, +x is
 * the way the figure faces and -y is up. The caller scales and mirrors.
 */

/** A colour as OKLCH lightness, chroma, hue. */
export type C3 = readonly [number, number, number];

export type Hair =
  | 'short'
  | 'quiff'
  | 'long'
  | 'bob'
  | 'pony'
  | 'bun'
  | 'curly'
  | 'bald'
  | 'cap'
  | 'beanie'
  | 'hijab'
  | 'hat'
  | 'hood';
export type Top =
  | 'tee'
  | 'shirt'
  | 'hoodie'
  | 'jacket'
  | 'leather'
  | 'coat'
  | 'trench'
  | 'puffer'
  | 'suit'
  | 'vest'
  | 'dress'
  | 'cloak';
export type Bottom = 'trousers' | 'slim' | 'wide' | 'shorts' | 'skirt' | 'none';
export type Hand =
  | 'phone'
  | 'coffee'
  | 'tote'
  | 'helmet'
  | 'case'
  | 'suitcase'
  | 'bags'
  | 'box'
  | 'board'
  | 'cane'
  | 'staff'
  | 'umbrella'
  | 'laptop'
  | 'openlaptop'
  | 'spool'
  | 'books'
  | 'pad'
  | 'leash'
  | 'boat'
  | 'bike'
  | 'stroller'
  | 'pocket';
export type Back = 'pack' | 'guitar' | 'rod' | 'mat';
export type Companion = 'dog' | 'pup' | 'robot';

export interface Look {
  id: string;
  /** Height, 1 = adult. Children get larger heads automatically. */
  h: number;
  /** Depth of the torso, 1 = average. */
  build: number;
  belly?: number;
  lean?: number;
  stoop?: number;
  skin: C3;
  hair: C3;
  top: C3;
  bottom: C3;
  shoe: C3;
  /** What is carried, the hat, the bag. */
  item?: C3;
  /** A second layer: an open jacket's shirt, a scarf. */
  under?: C3;
  hairStyle: Hair;
  beard?: boolean;
  glasses?: boolean;
  phones?: boolean;
  scarf?: boolean;
  topStyle: Top;
  bottomStyle: Bottom;
  back?: Back;
  hand?: Hand;
  strap?: boolean;
  with?: Companion;
  /** Walking speed in units per second, and how the walk looks. */
  speed: number;
  stride?: number;
  swing?: number;
  run?: boolean;
  roll?: 'board' | 'scooter';
  /** One small coloured detail, for the few figures that carry a project. */
  accent?: C3;
  /** Case-study slug this figure stands for. */
  egg?: string;
  /** How often it is cast, 1 = like anyone else. */
  weight?: number;
}

export interface Pose {
  /** Walk cycle, 0 to 1. */
  p: number;
  /** 0 walking, 1 standing still. */
  stand: number;
  /** 0 to 1: the near arm is raised in a wave. */
  wave: number;
  /** 0 to 1: looking at a phone that was not out before. */
  phone: number;
  /** 0 to 1: the head turns to the viewer. */
  turn: number;
  /** 0 to 1: a hand goes to the backpack strap. */
  shrug: number;
  /** Seconds, for sway and blinking lights. */
  t: number;
  /** 0 to 1: lit by its label. */
  lit: number;
}

/** Colours resolved for one figure at one depth. */
export interface Paint {
  line: string;
  /** Inner lines: seams, folds, a hem. Softer than the outline. */
  soft: string;
  skin: string;
  skinDark: string;
  hair: string;
  hairLight: string;
  sole: string;
  top: string;
  topDark: string;
  bottom: string;
  bottomDark: string;
  shoe: string;
  item: string;
  under: string;
  metal: string;
  accent: string;
  /** Outline width in units. */
  lw: number;
}

const TAU = Math.PI * 2;
const THIGH = 24.5;
const SHIN = 24.5;
const ANKLE = 3;
const TORSO = 33.5;
const UPPER = 16.5;
const FORE = 15;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (t: number) => t * t * (3 - 2 * t);

/** How far one full cycle carries a figure, in units: the engine advances `p` by distance / this. */
export function cycleLength(look: Look): number {
  const stride = look.stride ?? (look.run ? 44 : 30);
  return stride / (look.run ? 0.36 : 0.5);
}

type G = CanvasRenderingContext2D;

/** A closed polygon with rounded corners. `pts` is x, y, radius triples. */
function shape(g: G, pts: readonly number[], pal: Paint, fill: string) {
  const n = pts.length / 3;
  const x0 = (pts[(n - 1) * 3]! + pts[0]!) / 2;
  const y0 = (pts[(n - 1) * 3 + 1]! + pts[1]!) / 2;
  g.beginPath();
  g.moveTo(x0, y0);
  for (let i = 0; i < n; i += 1) {
    const j = ((i + 1) % n) * 3;
    g.arcTo(pts[i * 3]!, pts[i * 3 + 1]!, pts[j]!, pts[j + 1]!, pts[i * 3 + 2]!);
  }
  g.closePath();
  g.fillStyle = fill;
  g.fill();
  g.strokeStyle = pal.line;
  g.lineWidth = pal.lw;
  g.stroke();
}

const HALF = Math.PI / 2;

/** A tapered capsule from A to B, added to the current path. */
function capsule(g: G, ax: number, ay: number, bx: number, by: number, ra: number, rb: number) {
  const a = Math.atan2(by - ay, bx - ax);
  const sinA = Math.sin(a);
  const cosA = Math.cos(a);
  // cos(a + π/2) = -sin(a), sin(a + π/2) = cos(a)
  g.moveTo(ax - sinA * ra, ay + cosA * ra);
  g.arc(ax, ay, ra, a + HALF, a + 3 * HALF);
  g.arc(bx, by, rb, a - HALF, a + HALF);
  g.closePath();
}

/**
 * A limb: two tapered segments sharing a joint, outlined only around their
 * silhouette, with a band of shade down the side away from the light.
 * `w1` and `w2` are the widths at the root and below the joint.
 */
function limb(
  g: G,
  pal: Paint,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
  w1: number,
  w2: number,
  fill1: string,
  fill2: string,
  shade1?: string,
  shade2?: string,
) {
  const r0 = w1 * 0.56;
  const r1 = (w1 + w2) * 0.24;
  const r2 = w2 * 0.39;
  const o = pal.lw;
  g.fillStyle = pal.line;
  g.beginPath();
  capsule(g, ax, ay, bx, by, r0 + o, r1 + o);
  capsule(g, bx, by, cx, cy, r1 + o, r2 + o);
  g.fill();
  g.fillStyle = fill2;
  g.beginPath();
  capsule(g, bx, by, cx, cy, r1, r2);
  g.fill();
  g.fillStyle = fill1;
  g.beginPath();
  capsule(g, ax, ay, bx, by, r0, r1);
  g.fill();
  if (shade2) {
    g.fillStyle = shade2;
    g.beginPath();
    capsule(g, bx - r1 * 0.4, by, cx - r2 * 0.4, cy, r1 * 0.56, r2 * 0.56);
    g.fill();
  }
  if (shade1) {
    g.fillStyle = shade1;
    g.beginPath();
    capsule(g, ax - r0 * 0.4, ay, bx - r1 * 0.4, by, r0 * 0.56, r1 * 0.56);
    g.fill();
  }
}

function disc(g: G, pal: Paint, x: number, y: number, r: number, fill: string) {
  g.beginPath();
  g.arc(x, y, r, 0, TAU);
  g.fillStyle = fill;
  g.fill();
  g.strokeStyle = pal.line;
  g.lineWidth = pal.lw;
  g.stroke();
}

function stroke(g: G, colour: string, w: number, pts: readonly number[]) {
  g.beginPath();
  g.moveTo(pts[0]!, pts[1]!);
  for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i]!, pts[i + 1]!);
  g.strokeStyle = colour;
  g.lineWidth = w;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.stroke();
}

/** A line with an outline: one path, stroked in the outline colour and then in its own. */
function cord(
  g: G,
  pal: Paint,
  fill: string,
  outer: number,
  inner: number,
  pts: readonly number[],
) {
  stroke(g, pal.line, outer, pts);
  stroke(g, fill, inner, pts);
}

function box(
  g: G,
  pal: Paint,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill: string,
) {
  const x2 = x + w;
  const y2 = y + h;
  g.beginPath();
  g.moveTo(x, (y + y2) * 0.5);
  g.arcTo(x, y, x2, y, r);
  g.arcTo(x2, y, x2, y2, r);
  g.arcTo(x2, y2, x, y2, r);
  g.arcTo(x, y2, x, y, r);
  g.closePath();
  g.fillStyle = fill;
  g.fill();
  g.strokeStyle = pal.line;
  g.lineWidth = pal.lw;
  g.stroke();
}

function wheel(g: G, pal: Paint, x: number, y: number, r: number, turn: number, spokes: boolean) {
  g.beginPath();
  g.arc(x, y, r, 0, TAU);
  g.strokeStyle = pal.line;
  g.lineWidth = pal.lw * 2.4;
  g.stroke();
  g.strokeStyle = pal.metal;
  g.lineWidth = pal.lw * 0.9;
  g.stroke();
  if (!spokes) return;
  g.beginPath();
  for (let i = 0; i < 3; i += 1) {
    const a = turn + (i * Math.PI) / 3;
    g.moveTo(x - Math.cos(a) * r, y - Math.sin(a) * r);
    g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  g.strokeStyle = pal.metal;
  g.lineWidth = pal.lw * 0.5;
  g.stroke();
}

interface Leg {
  kx: number;
  ky: number;
  ax: number;
  ay: number;
  pitch: number;
}

/** Where the ankle is at phase `p`, then the knee by two-bone IK from the hip. */
function leg(
  p: number,
  stride: number,
  duty: number,
  lift: number,
  hipH: number,
  stand: number,
  restX: number,
): Leg {
  let x: number;
  let pitch: number;
  let up = 0;
  if (p < duty) {
    const t = p / duty;
    x = stride / 2 - stride * t;
    pitch = t > 0.68 ? ((t - 0.68) / 0.32) * 0.6 : t < 0.14 ? -(1 - t / 0.14) * 0.26 : 0;
  } else {
    const t = (p - duty) / (1 - duty);
    x = -stride / 2 + stride * smooth(t);
    pitch = 0.6 - 0.86 * smooth(t);
    up = lift * Math.sin(Math.PI * Math.pow(t, 0.85));
  }
  x = lerp(x, restX, stand);
  pitch = lerp(pitch, 0, stand);
  up = lerp(up, 0, stand);
  // Lift the ankle just enough for the lowest point of the tilted shoe to touch the ground.
  const s = Math.sin(pitch);
  const c = Math.cos(pitch);
  const toe = 8.2 * s + ANKLE * c;
  const heel = -3.4 * s + ANKLE * c;
  const ankleH = Math.max(toe, heel) + up;

  const dy = hipH - ankleH;
  const reach = Math.min(Math.hypot(x, dy), THIGH + SHIN - 0.02);
  const base = Math.atan2(x, dy);
  const bend = Math.acos(Math.min(1, Math.max(-1, reach / (THIGH + SHIN))));
  const a = base + bend;
  const kx = Math.sin(a) * THIGH;
  const ky = -hipH + Math.cos(a) * THIGH;
  // The ankle sits where the shin ends: on the target while it is in reach.
  const b = base - bend;
  return { kx, ky, ax: kx + Math.sin(b) * SHIN, ay: ky + Math.cos(b) * SHIN, pitch };
}

function shoe(g: G, pal: Paint, l: Leg, k: Look, detail: boolean) {
  const s = Math.sin(l.pitch);
  const c = Math.cos(l.pitch);
  const ax = l.ax;
  const ay = l.ay;
  const boot = k.topStyle === 'leather' || k.topStyle === 'cloak' ? 1.6 : 0;
  const yTop0 = -1.6 - boot;
  const yTop1 = -2.2 - boot;
  const x0 = ax + -3.4 * c - yTop0 * s;
  const y0 = ay + -3.4 * s + yTop0 * c;
  const x1 = ax + 3 * c - yTop1 * s;
  const y1 = ay + 3 * s + yTop1 * c;
  const x2 = ax + 8.4 * c - s;
  const y2 = ay + 8.4 * s + c;
  const x3 = ax + 8.2 * c - ANKLE * s;
  const y3 = ay + 8.2 * s + ANKLE * c;
  const x4 = ax + -3.4 * c - ANKLE * s;
  const y4 = ay + -3.4 * s + ANKLE * c;

  g.beginPath();
  g.moveTo((x4 + x0) * 0.5, (y4 + y0) * 0.5);
  g.arcTo(x0, y0, x1, y1, 1);
  g.arcTo(x1, y1, x2, y2, 1.2);
  g.arcTo(x2, y2, x3, y3, 1.4);
  g.arcTo(x3, y3, x4, y4, 0.6);
  g.arcTo(x4, y4, x0, y0, 0.9);
  g.closePath();
  g.fillStyle = pal.shoe;
  g.fill();
  g.strokeStyle = pal.line;
  g.lineWidth = pal.lw;
  g.stroke();

  if (detail && boot === 0) {
    const sy = ANKLE - 0.75;
    g.beginPath();
    g.moveTo(ax + -3 * c - sy * s, ay + -3 * s + sy * c);
    g.lineTo(ax + 7.9 * c - sy * s, ay + 7.9 * s + sy * c);
    g.strokeStyle = pal.sole;
    g.lineWidth = 1.1;
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.stroke();
  }
}

const HEM: Record<Top, number> = {
  tee: 2,
  shirt: 4.5,
  hoodie: 5,
  jacket: 3.5,
  leather: 1.5,
  coat: 21,
  trench: 33,
  puffer: 4,
  suit: 6.5,
  vest: 3,
  dress: -8,
  cloak: 2,
};

const LONG_SLEEVES: Record<Top, boolean> = {
  tee: false,
  shirt: true,
  hoodie: true,
  jacket: true,
  leather: true,
  coat: true,
  trench: true,
  puffer: true,
  suit: true,
  vest: false,
  dress: false,
  cloak: true,
};

interface Arm {
  /** Upper arm from straight down, positive forward. */
  a: number;
  /** Elbow bend, positive forward. */
  b: number;
  hand: boolean;
}

const HANG = new Set<Hand>(['tote', 'helmet', 'case', 'bags', 'spool', 'pad', 'umbrella', 'books']);

/**
 * Draws one figure. The context is already at the figure's ground point,
 * scaled to units and mirrored for its direction.
 */
export function drawFigure(g: G, k: Look, pal: Paint, s: Pose, detail = true): void {
  const run = !!k.run;
  const duty = run ? 0.36 : 0.5;
  const rolling = k.roll !== undefined;
  const stand = rolling ? 1 : s.stand;
  const stride = k.stride ?? (run ? 44 : 30);
  const lift = run ? 10 : 3.4;
  const p = s.p;
  const child = k.h < 0.78;
  const headK = child ? 1.28 : 1;
  const build = k.build;

  // ----- hips and legs -----
  const reach = (THIGH + SHIN) * 0.992;
  const hipLow = Math.sqrt(Math.max(1, reach * reach - (stride / 2) * (stride / 2))) + ANKLE;
  const hipHigh = Math.min(THIGH + SHIN + ANKLE - 0.9, hipLow + (run ? 5.5 : 2.2));
  const walkHip = run
    ? lerp(hipLow, hipHigh, Math.abs(Math.sin(TAU * p + 0.6)))
    : hipHigh - ((hipHigh - hipLow) * (1 + Math.cos(2 * TAU * p))) / 2;
  const hipH =
    lerp(walkHip, rolling ? 46.5 : 51.2, stand) + (rolling ? Math.sin(s.t * 2.1) * 0.4 : 0);
  const deck = rolling ? 4.2 : 0;
  const near = leg(p, stride, duty, lift, hipH, stand, rolling ? 5 : 2.2);
  const far = leg((p + 0.5) % 1, stride, duty, lift, hipH, stand, rolling ? -5.5 : -2.6);

  g.save();
  g.translate(0, -deck);

  const lean = (k.lean ?? 0) + (run ? 0.2 : 0.035) * (1 - stand) + (k.stoop ?? 0) * 0.5;
  const cl = Math.cos(lean);
  const sl = Math.sin(lean);
  /** Torso space (x forward, y up the spine from the hips) to figure space. */
  const tx = (x: number, y: number) => x * cl + y * sl;
  const ty = (x: number, y: number) => -hipH + x * sl - y * cl;

  const depth = 7.1 * build;
  const belly = k.belly ?? 0;
  const top = k.topStyle;
  const long = LONG_SLEEVES[top];
  const bulk =
    top === 'puffer' ? 1.28 : top === 'hoodie' || top === 'coat' || top === 'leather' ? 1.1 : 1;

  // ----- arms: the walk's own swing, then whatever the hands are doing -----
  const swing = (k.swing ?? (run ? 0.85 : 0.5)) * (1 - stand);
  const hand = k.hand;
  const armAt = (phase: number): Arm => {
    const c = Math.cos(TAU * phase);
    return run
      ? { a: -swing * c, b: 1.35 + 0.25 * c, hand: true }
      : { a: -swing * c + 0.03, b: 0.16 + 0.42 * (1 - c) * 0.5, hand: true };
  };
  let nearArm = armAt(p);
  let farArm = armAt((p + 0.5) % 1);
  const set = (arm: Arm, a: number, b: number, amount = 1, showHand = true): Arm => ({
    a: lerp(arm.a, a, amount),
    b: lerp(arm.b, b, amount),
    hand: showHand,
  });
  if (hand) {
    if (HANG.has(hand)) nearArm = { a: nearArm.a * 0.3, b: 0.12, hand: true };
    else if (hand === 'phone') nearArm = set(nearArm, 0.42, 1.78);
    else if (hand === 'coffee') nearArm = set(nearArm, 0.18, 1.42);
    else if (hand === 'laptop' || hand === 'board' || hand === 'boat')
      nearArm = set(nearArm, -0.12, 0.85);
    else if (hand === 'suitcase') nearArm = set(nearArm, -0.5, 0.08);
    else if (hand === 'cane' || hand === 'staff')
      nearArm = set(nearArm, 0.34 + 0.2 * Math.sin(TAU * p) * (1 - stand), 0.72);
    else if (hand === 'leash') nearArm = set(nearArm, 0.42 + 0.06 * Math.sin(s.t * 3.1), 0.42);
    else if (hand === 'pocket') nearArm = set(nearArm, -0.04, 0.42, 1, false);
    else if (hand === 'box' || hand === 'openlaptop') {
      nearArm = set(nearArm, 0.38, 1.36);
      farArm = set(farArm, 0.5, 1.3);
    } else if (hand === 'bike' || hand === 'stroller') {
      nearArm = set(nearArm, 0.62, 0.62);
      farArm = set(farArm, 0.7, 0.55);
    }
  }
  if (k.roll === 'scooter') {
    nearArm = set(nearArm, 0.72, 0.5);
    farArm = set(farArm, 0.78, 0.45);
  }
  if (s.phone > 0) nearArm = set(nearArm, 0.42, 1.78, s.phone);
  if (s.shrug > 0) nearArm = set(nearArm, 0.5, 2.25, s.shrug);
  if (s.wave > 0) nearArm = set(nearArm, 2.55 + Math.sin(s.t * 9) * 0.16 * s.wave, 0.55, s.wave);

  const shX = tx(0.6, TORSO - 2.6);
  const shY = ty(0.6, TORSO - 2.6);
  const armW = (child ? 4.6 : 5.7) * Math.sqrt(build) * (bulk > 1.2 ? 1.25 : bulk > 1 ? 1.1 : 1);
  const joint = (arm: Arm, ox: number) => {
    const ex = shX + ox + Math.sin(arm.a + lean) * UPPER;
    const ey = shY + Math.cos(arm.a + lean) * UPPER;
    const fa = arm.a + lean + arm.b;
    return [ex, ey, ex + Math.sin(fa) * FORE, ey + Math.cos(fa) * FORE] as const;
  };
  const drawArm = (arm: Arm, ox: number, shade: boolean) => {
    const [ex, ey, wx, wy] = joint(arm, ox);
    const sleeve = shade ? pal.topDark : pal.top;
    const skin = shade ? pal.skinDark : pal.skin;
    const band = shade ? undefined : long ? pal.topDark : pal.skinDark;
    limb(
      g,
      pal,
      shX + ox,
      shY,
      ex,
      ey,
      wx,
      wy,
      armW,
      armW * 0.8,
      long ? sleeve : skin,
      long ? sleeve : skin,
      band,
      band,
    );
    if (!long) {
      // A short sleeve: cloth to the middle of the upper arm.
      const mx = shX + ox + (ex - shX - ox) * 0.58;
      const my = shY + (ey - shY) * 0.58;
      g.fillStyle = pal.line;
      g.beginPath();
      capsule(g, shX + ox, shY, mx, my, armW * 0.6 + pal.lw, armW * 0.56 + pal.lw);
      g.fill();
      g.fillStyle = sleeve;
      g.beginPath();
      capsule(g, shX + ox, shY, mx, my, armW * 0.6, armW * 0.56);
      g.fill();
    } else if (
      detail &&
      (top === 'hoodie' || top === 'puffer' || top === 'jacket' || top === 'leather')
    ) {
      // A cuff.
      const qx = ex + (wx - ex) * 0.86;
      const qy = ey + (wy - ey) * 0.86;
      const nx = -(wy - ey) / FORE;
      const ny = (wx - ex) / FORE;
      const half = armW * 0.36;
      stroke(g, pal.soft, pal.lw * 0.8, [
        qx - nx * half,
        qy - ny * half,
        qx + nx * half,
        qy + ny * half,
      ]);
    }
    if (arm.hand) {
      const fa = arm.a + lean + arm.b;
      const tipX = wx + Math.sin(fa) * 3;
      const tipY = wy + Math.cos(fa) * 3;
      g.fillStyle = pal.line;
      g.beginPath();
      capsule(g, wx, wy, tipX, tipY, 2 + pal.lw, 1.6 + pal.lw);
      g.fill();
      g.fillStyle = skin;
      g.beginPath();
      capsule(g, wx, wy, tipX, tipY, 2, 1.6);
      g.fill();
    }
    return [wx, wy] as const;
  };

  // ----- behind the body -----
  const legW = k.bottomStyle === 'wide' ? 11.4 : k.bottomStyle === 'slim' ? 8 : 9.6;
  const bare = k.bottomStyle === 'shorts' || k.bottomStyle === 'skirt' || top === 'dress';
  const drawLeg = (l: Leg, shade: boolean, ox: number) => {
    const cloth = shade ? pal.bottomDark : pal.bottom;
    const skin = shade ? pal.skinDark : pal.skin;
    const thighBare = k.bottomStyle === 'none' || k.bottomStyle === 'skirt' || top === 'dress';
    limb(
      g,
      pal,
      ox,
      -hipH,
      l.kx + ox,
      l.ky,
      l.ax + ox,
      l.ay,
      legW * build ** 0.4,
      (legW - 2.2) * (bare ? 0.72 : 1),
      thighBare ? skin : cloth,
      bare ? skin : cloth,
      shade ? undefined : thighBare ? pal.skinDark : pal.bottomDark,
      shade ? undefined : bare ? pal.skinDark : pal.bottomDark,
    );
    if (detail && !bare) {
      // The hem above the shoe.
      const qx = l.kx + ox + (l.ax - l.kx) * 0.9;
      const qy = l.ky + (l.ay - l.ky) * 0.9;
      const nx = -(l.ay - l.ky) / SHIN;
      const ny = (l.ax - l.kx) / SHIN;
      const half = (legW - 2.2) * 0.4;
      stroke(g, pal.soft, pal.lw * 0.8, [
        qx - nx * half,
        qy - ny * half,
        qx + nx * half,
        qy + ny * half,
      ]);
    }
    g.save();
    g.translate(ox, 0);
    shoe(g, pal, l, k, detail);
    g.restore();
  };

  if (k.roll === 'scooter') {
    // Deck, stem and bar; the rider stands on the deck.
    wheel(g, pal, 15, deck - 3.2, 3.2, s.t * 9, false);
    wheel(g, pal, -11, deck - 3.2, 3.2, s.t * 9, false);
    cord(g, pal, pal.metal, pal.lw * 3.2, pal.lw * 1.6, [-11, deck - 4.4, 12, deck - 4.4, 17, -44]);
    stroke(g, pal.line, pal.lw * 2.6, [14, -44.5, 20, -43.5]);
  } else if (k.roll === 'board') {
    wheel(g, pal, 9, deck - 1.6, 1.6, 0, false);
    wheel(g, pal, -9, deck - 1.6, 1.6, 0, false);
    cord(g, pal, pal.item, pal.lw * 3.4, pal.lw * 1.8, [
      -14,
      deck - 4.6,
      -11,
      deck - 3.6,
      11,
      deck - 3.6,
      14,
      deck - 4.6,
    ]);
  }

  if (hand === 'bike') {
    const turn = (p * cycleLength(k)) / 13;
    wheel(g, pal, 31, -13.4, 13, turn, true);
    wheel(g, pal, -5, -13.4, 13, turn, true);
    const frame = [
      -5, -13.4, 9, -13.4, 4, -36, -5, -13.4, 4, -36, 25, -33, 9, -13.4, 25, -33, 31, -13.4,
    ];
    stroke(g, pal.line, pal.lw * 2.8, frame);
    stroke(g, pal.item, pal.lw * 1.3, frame);
    stroke(g, pal.line, pal.lw * 2.4, [25, -33, 23.5, -42, 19, -43.5]);
    stroke(g, pal.line, pal.lw * 3, [0.5, -38.5, 7, -38.5]);
  }

  drawArm(farArm, -1.2, true);
  if (k.back === 'guitar') {
    const gx = tx(-depth * 1.3, 10);
    const gy = ty(-depth * 1.3, 10);
    g.save();
    g.translate(gx, gy);
    g.rotate(lean - 0.12);
    shape(
      g,
      [
        -5.5, 12, 5, 5.5, 12, 5, 4.4, -8, 3, 2.2, -12, 1.5, 2, -34, 1.2, -2, -34, 1.2, -2.2, -12,
        1.5, -4.4, -8, 3,
      ],
      pal,
      pal.item,
    );
    g.restore();
  }
  drawLeg(far, true, -1.4);

  // ----- cloak, skirt and long coats hang from the body and trail the walk -----
  const sway = Math.sin(2 * TAU * p) * 1.3 * (1 - stand);
  const trail = (1 - stand) * (run ? 5 : 2.2);
  const hem = HEM[top];
  const kneeFront = Math.max(near.kx, far.kx);
  const kneeBack = Math.min(near.kx, far.kx);
  if (top === 'cloak') {
    const sx = tx(-2.5, TORSO - 1);
    const sy = ty(-2.5, TORSO - 1);
    shape(
      g,
      [
        sx + 1,
        sy,
        2,
        sx + 6.5,
        sy + 4,
        3,
        4 + sway * 0.4,
        -52,
        6,
        3 - trail * 0.5,
        -14,
        2,
        -16 - trail * 2 + sway,
        -11,
        2.5,
        -13 - trail,
        -46,
        8,
        sx - 5.5,
        sy + 6,
        5,
      ],
      pal,
      pal.topDark,
    );
  }

  drawLeg(near, false, 1.4);

  if (k.bottomStyle === 'skirt' || top === 'dress') {
    const hy = top === 'dress' ? -23 : -27;
    const wy = top === 'dress' ? ty(0, 13) : -hipH - 7;
    shape(
      g,
      [
        -depth * 0.72,
        wy,
        2,
        depth * 0.72 + belly,
        wy,
        2,
        kneeFront + 5.2,
        hy + (near.ky + 26) * 0.2,
        1.6,
        kneeBack - 5.6,
        hy,
        1.6,
      ],
      pal,
      top === 'dress' ? pal.top : pal.bottom,
    );
  }

  // ----- backpack sits behind the shoulders, under the near arm -----
  if (k.back === 'pack') {
    const bx = tx(-depth * 0.86, 8);
    const by = ty(-depth * 0.86, 8);
    g.save();
    g.translate(bx, by);
    g.rotate(lean);
    box(g, pal, -8.4, -19, 9.2, 21, 3.2, pal.item);
    stroke(g, pal.line, pal.lw, [-7.2, -8, 0, -8]);
    g.restore();
  } else if (k.back === 'mat') {
    const bx = tx(-depth * 0.95, 20);
    const by = ty(-depth * 0.95, 20);
    g.save();
    g.translate(bx, by);
    g.rotate(lean + 0.5);
    box(g, pal, -3, -13, 6, 26, 3, pal.item);
    g.restore();
  } else if (k.back === 'rod') {
    stroke(g, pal.line, pal.lw * 1.6, [
      tx(4, 12),
      ty(4, 12),
      tx(-6, TORSO),
      ty(-6, TORSO),
      tx(-26, TORSO + 46),
      ty(-26, TORSO + 46),
    ]);
    stroke(g, pal.metal, pal.lw * 0.6, [
      tx(-26, TORSO + 46),
      ty(-26, TORSO + 46),
      tx(-30, TORSO + 30) + sway,
      ty(-30, TORSO + 30),
    ]);
  }

  // ----- torso -----
  const d = depth * bulk;
  const stoop = (k.stoop ?? 0) * 6;
  const longCoat = top === 'coat' || top === 'trench';
  const body: number[] = [
    tx(-2.6, TORSO + 0.5),
    ty(-2.6, TORSO + 0.5),
    1.6,
    tx(-d * 0.98 - stoop, TORSO - 6),
    ty(-d * 0.98 - stoop, TORSO - 6),
    4.6,
    tx(-d * 0.9, TORSO * 0.45),
    ty(-d * 0.9, TORSO * 0.45),
    6,
  ];
  if (longCoat) {
    // The skirt of a coat hangs straight down, whatever the lean.
    body.push(
      -d * 0.92 - trail * 0.5 + sway * 0.5,
      -hipH + hem,
      1.4,
      d * 0.86 + belly * 0.5 - trail * 0.3 + sway,
      -hipH + hem,
      1.4,
    );
  } else {
    body.push(
      tx(-d * 0.84, -hem),
      ty(-d * 0.84, -hem),
      2.2,
      tx(d * 0.8 + belly * 0.7, -hem),
      ty(d * 0.8 + belly * 0.7, -hem),
      2.2,
    );
  }
  body.push(
    tx(d * 0.92 + belly, 10),
    ty(d * 0.92 + belly, 10),
    6,
    tx(d * 1.02, TORSO - 11),
    ty(d * 1.02, TORSO - 11),
    5.2,
    tx(2.9, TORSO + 0.2),
    ty(2.9, TORSO + 0.2),
    1.6,
  );
  if (top !== 'dress') shape(g, body, pal, pal.top);
  else {
    // A dress's bodice: the same back and chest, closed at the waist.
    shape(
      g,
      [
        tx(-2.6, TORSO + 0.5),
        ty(-2.6, TORSO + 0.5),
        1.6,
        tx(-d * 0.9, TORSO - 6),
        ty(-d * 0.9, TORSO - 6),
        4.6,
        tx(-d * 0.74, 12),
        ty(-d * 0.74, 12),
        2,
        tx(d * 0.74 + belly, 12),
        ty(d * 0.74 + belly, 12),
        2,
        tx(d, TORSO - 11),
        ty(d, TORSO - 11),
        5.2,
        tx(2.9, TORSO + 0.2),
        ty(2.9, TORSO + 0.2),
        1.6,
      ],
      pal,
      pal.top,
    );
  }

  // The side away from the light.
  if (top !== 'cloak') {
    const low = top === 'dress' ? 12 : -hem;
    const hbx = longCoat ? -d * 0.92 - trail * 0.5 + sway * 0.5 : tx(-d * 0.84, low);
    const hby = longCoat ? -hipH + hem : ty(-d * 0.84, low);
    g.beginPath();
    g.moveTo(tx(-2.4, TORSO - 0.6), ty(-2.4, TORSO - 0.6));
    g.quadraticCurveTo(
      tx(-d * 1.02 - stoop, TORSO - 4),
      ty(-d * 1.02 - stoop, TORSO - 4),
      tx(-d * 0.9, TORSO * 0.45),
      ty(-d * 0.9, TORSO * 0.45),
    );
    g.lineTo(hbx + pal.lw, hby - pal.lw);
    g.lineTo(hbx + d * 0.62, hby - pal.lw);
    g.quadraticCurveTo(
      tx(-d * 0.2, 14),
      ty(-d * 0.2, 14),
      tx(-d * 0.36, TORSO - 7),
      ty(-d * 0.36, TORSO - 7),
    );
    g.closePath();
    g.fillStyle = pal.topDark;
    g.fill();
  }

  // What the garment shows: an open front, a hem band, quilting, a tie of light.
  if (
    top === 'jacket' ||
    top === 'leather' ||
    top === 'suit' ||
    top === 'coat' ||
    top === 'trench' ||
    top === 'vest'
  ) {
    const open = top === 'suit' ? 0.5 : 0.62;
    g.beginPath();
    g.moveTo(tx(2.6, TORSO), ty(2.6, TORSO));
    g.lineTo(tx(d * open, TORSO - 12), ty(d * open, TORSO - 12));
    g.lineTo(
      tx(d * (open + 0.16) + belly * 0.6, top === 'suit' ? 6 : -hem + 1),
      ty(d * (open + 0.16) + belly * 0.6, top === 'suit' ? 6 : -hem + 1),
    );
    g.lineTo(tx(d * 0.98 + belly, 8), ty(d * 0.98 + belly, 8));
    g.lineTo(tx(d * 1.0, TORSO - 11), ty(d * 1.0, TORSO - 11));
    g.closePath();
    g.fillStyle = pal.under;
    g.fill();
    stroke(g, pal.line, pal.lw * 0.8, [
      tx(2.6, TORSO),
      ty(2.6, TORSO),
      tx(d * open, TORSO - 12),
      ty(d * open, TORSO - 12),
      tx(d * (open + 0.16) + belly * 0.6, top === 'suit' ? 6 : -hem + 1),
      ty(d * (open + 0.16) + belly * 0.6, top === 'suit' ? 6 : -hem + 1),
    ]);
  }
  if (top === 'hoodie') {
    stroke(g, pal.line, pal.lw * 0.8, [
      tx(-d * 0.8, -hem + 3),
      ty(-d * 0.8, -hem + 3),
      tx(d * 0.8 + belly * 0.7, -hem + 3),
      ty(d * 0.8 + belly * 0.7, -hem + 3),
    ]);
    if (k.hairStyle !== 'hood') {
      const hx = tx(-4.4, TORSO - 1.5);
      const hy = ty(-4.4, TORSO - 1.5);
      shape(
        g,
        [
          hx + 5.5,
          hy - 3.2,
          1.5,
          hx + 2,
          hy + 4.5,
          2.4,
          hx - 4.6,
          hy + 3.4,
          3,
          hx - 2.4,
          hy - 3.6,
          2.6,
        ],
        pal,
        pal.top,
      );
    }
  }
  if (top === 'puffer') {
    for (const y of [7, 15, 23]) {
      stroke(g, pal.line, pal.lw * 0.7, [
        tx(-d * 0.88, y),
        ty(-d * 0.88, y),
        tx(d * 0.94 + belly * (y < 12 ? 1 : 0.4), y),
        ty(d * 0.94 + belly * (y < 12 ? 1 : 0.4), y),
      ]);
    }
  }
  if (top === 'vest') {
    for (const y of [9, 17]) {
      stroke(g, pal.accent, pal.lw * 2, [
        tx(-d * 0.84, y),
        ty(-d * 0.84, y),
        tx(d * 0.55, y),
        ty(d * 0.55, y),
      ]);
    }
  }
  if (top === 'hoodie') {
    // Kangaroo pocket.
    stroke(g, pal.soft, pal.lw * 0.8, [
      tx(d * 0.86 + belly * 0.8, 3),
      ty(d * 0.86 + belly * 0.8, 3),
      tx(d * 0.3, 9),
      ty(d * 0.3, 9),
      tx(d * 0.2, 2),
      ty(d * 0.2, 2),
    ]);
  } else if (
    top === 'shirt' ||
    top === 'jacket' ||
    top === 'suit' ||
    top === 'coat' ||
    top === 'trench' ||
    top === 'leather'
  ) {
    // A collar.
    shape(
      g,
      [
        tx(-3, TORSO + 1.2),
        ty(-3, TORSO + 1.2),
        0.8,
        tx(3.4, TORSO + 0.9),
        ty(3.4, TORSO + 0.9),
        0.8,
        tx(4.6, TORSO - 4.2),
        ty(4.6, TORSO - 4.2),
        0.6,
        tx(1, TORSO - 2.2),
        ty(1, TORSO - 2.2),
        0.8,
      ],
      pal,
      top === 'shirt' ? pal.top : pal.topDark,
    );
    if (top !== 'shirt')
      stroke(g, pal.soft, pal.lw * 0.8, [
        tx(d * 0.08, 5),
        ty(d * 0.08, 5),
        tx(d * 0.62, 5.6),
        ty(d * 0.62, 5.6),
      ]);
  } else if (top === 'tee') {
    stroke(g, pal.soft, pal.lw * 0.8, [
      tx(-1.6, TORSO),
      ty(-1.6, TORSO),
      tx(1.6, TORSO - 2.2),
      ty(1.6, TORSO - 2.2),
      tx(3.2, TORSO - 0.4),
      ty(3.2, TORSO - 0.4),
    ]);
  }
  if (k.strap) {
    cord(g, pal, pal.item, pal.lw * 2.2, pal.lw, [
      tx(-d * 0.7, TORSO - 3),
      ty(-d * 0.7, TORSO - 3),
      tx(d * 0.86, 5),
      ty(d * 0.86, 5),
    ]);
    const mx = tx(-d * 0.2, 1);
    const my = ty(-d * 0.2, 1);
    box(g, pal, mx - 6.5, my - 4, 13, 10.5, 2.4, pal.item);
  }
  if (k.back === 'pack') {
    cord(g, pal, pal.item, pal.lw * 2.4, pal.lw * 1.1, [
      tx(-d * 0.5, TORSO - 2),
      ty(-d * 0.5, TORSO - 2),
      tx(d * 0.2, TORSO - 14),
      ty(d * 0.2, TORSO - 14),
      tx(-d * 0.78, 13),
      ty(-d * 0.78, 13),
    ]);
  }
  if (k.accent && (top === 'tee' || top === 'hoodie') && !k.hand) {
    // A small mark on the chest or the back of a hoodie.
    const ax = tx(top === 'hoodie' ? -d * 0.52 : d * 0.5, TORSO - 14);
    const ay = ty(top === 'hoodie' ? -d * 0.52 : d * 0.5, TORSO - 14);
    g.beginPath();
    g.moveTo(ax, ay - 2.4);
    g.lineTo(ax + 2.3, ay + 1.9);
    g.lineTo(ax - 2.3, ay + 1.9);
    g.closePath();
    g.fillStyle = pal.accent;
    g.fill();
  }

  // ----- neck and head -----
  const tilt =
    (hand === 'phone' ? 0.22 : hand === 'openlaptop' ? 0.26 : 0) +
    s.phone * 0.24 +
    (k.stoop ?? 0) * 0.4;
  const nx = tx(0.4, TORSO + 0.6);
  const ny = ty(0.4, TORSO + 0.6);
  const r = 6.2 * headK;
  const hx = nx + 1.2 + tilt * 3.2 - s.turn * 0.6;
  const hy = ny - r - 2.6 + tilt * 1.2;
  cord(g, pal, pal.skinDark, 4 * headK + pal.lw * 2, 4 * headK, [nx, ny - 0.2, hx - 1.2, hy + 3]);
  if (k.scarf) {
    box(g, pal, nx - 4.6, ny - 3.4, 9.4, 4.4, 2, pal.item);
    box(g, pal, nx - 5.4 - trail * 0.5, ny, 3.6, 10, 1.5, pal.item);
  }

  g.save();
  g.translate(hx, hy);
  g.rotate(tilt);
  g.scale(headK, headK);
  const hs = k.hairStyle;
  const turn = s.turn;
  const fall = trail / headK;
  // Whatever hangs behind the head goes down first.
  if (hs === 'long' || hs === 'bob') {
    const len = hs === 'long' ? 15.5 : 7.5;
    shape(
      g,
      [
        -0.5,
        -7.2,
        3,
        -6.6,
        -3.4,
        4,
        -7.2 - fall * 0.6,
        len,
        2.6,
        -2 - fall * 0.4,
        len + 1,
        2.6,
        -1.2,
        2,
        2,
      ],
      pal,
      pal.hair,
    );
  } else if (hs === 'pony') {
    const sw = Math.sin(TAU * p * 2) * 1.6 * (1 - stand);
    limb(
      g,
      pal,
      -5.2,
      -2.6,
      -8.6 - fall * 0.5,
      1.6,
      -8.2 - fall + sw,
      11,
      3.4,
      3,
      pal.hair,
      pal.hair,
    );
  } else if (hs === 'bun') disc(g, pal, -5.4, -5.6, 3, pal.hair);
  else if (hs === 'hijab')
    shape(
      g,
      [-1, -7.8, 4, -7, -3.6, 5, -6.8, 6, 3, -8.6, 14.5, 2.5, 5, 13.5, 2.5, 3.2, 6, 2],
      pal,
      pal.item,
    );
  else if (hs === 'hood')
    shape(g, [1, -8.6, 5, -7.6, -4, 6, -8, 5, 4, -3, 11, 3, 3.8, 8.8, 2.4], pal, pal.topDark);

  // A face in profile. The nose and lips flatten as it turns to the viewer.
  const n = 1 - turn * 0.75;
  shape(
    g,
    [
      0.2,
      -6.5,
      5,
      -5.7,
      -3.2,
      5,
      -5.2,
      2.6,
      3,
      -2.2,
      5,
      1.6,
      2.6,
      6.7,
      1.8,
      4.3 + 0.4 * n,
      5.9,
      1.3,
      4.5 + 0.3 * n,
      3.9,
      0.5,
      3.9,
      3.3,
      0.2,
      4.6 + 0.5 * n,
      2.7,
      0.5,
      4.4,
      1.8,
      0.3,
      4.6 + 1.9 * n,
      1.1,
      0.6,
      4.9,
      -1.5,
      0.9,
      5.2,
      -2.6,
      0.8,
      4.7,
      -4.9,
      2.2,
    ],
    pal,
    pal.skin,
  );
  // Shade under the jaw and behind the cheek.
  g.beginPath();
  g.moveTo(-2.2, 4.8);
  g.quadraticCurveTo(1, 6.4, 3.6, 6.2);
  g.quadraticCurveTo(0.6, 4.4, -1.6, 1.6);
  g.closePath();
  g.fillStyle = pal.skinDark;
  g.fill();
  if (k.beard) {
    shape(
      g,
      [
        4.4 + 0.3 * n,
        5.9,
        1,
        2.6,
        7.7,
        1.6,
        -1.6,
        6.4,
        2,
        -2.6,
        2.2,
        1.2,
        0.2,
        1.9,
        1,
        2.2,
        3.5,
        1,
        4.2,
        3.3,
        0.6,
      ],
      pal,
      pal.hair,
    );
  }
  // Brow and eye; a second eye appears as the face turns.
  const eyeX = 3.4 - turn * 1.3;
  stroke(g, pal.hair, 0.75, [eyeX - 1, -2.5, eyeX + 1.3, -2.75]);
  stroke(g, pal.line, 0.95, [eyeX - 0.5, -1.2, eyeX + 0.7, -1.25]);
  if (turn > 0.3) {
    g.globalAlpha = (turn - 0.3) / 0.7;
    stroke(g, pal.hair, 0.75, [eyeX - 4, -2.6, eyeX - 2, -2.7]);
    stroke(g, pal.line, 0.95, [eyeX - 3.5, -1.2, eyeX - 2.4, -1.2]);
    g.globalAlpha = 1;
  }
  if (k.glasses) {
    stroke(g, pal.line, pal.lw * 0.9, [-0.9, -1.5, eyeX - 1, -1.6]);
    g.strokeStyle = pal.line;
    g.lineWidth = pal.lw * 0.9;
    g.strokeRect(eyeX - 1, -2.7, 3, 2.5);
  }

  const ear = () => {
    g.beginPath();
    g.ellipse(-0.9, 0.7, 1.15, 1.7, 0.15, 0, TAU);
    g.fillStyle = pal.skin;
    g.fill();
    g.strokeStyle = pal.line;
    g.lineWidth = pal.lw * 0.8;
    g.stroke();
  };
  const sheen = () => stroke(g, pal.hairLight, 0.7, [1.8, -6.5, -2.6, -6.9]);
  const backHair = () =>
    shape(
      g,
      [-6.2, -2.6, 1, -6, 1.6, 2.2, -4.2, 4.2, 1, -2.4, 1.6, 0.8, -1.4, -2.6, 0.8],
      pal,
      pal.hair,
    );
  if (hs === 'short' || hs === 'pony' || hs === 'bun') {
    shape(
      g,
      [
        4.8, -4.4, 0.8, 4, -7.2, 2.2, -1.4, -7.7, 3.4, -6.4, -4.2, 3.6, -6, 1.6, 2.2, -4.2, 4.2, 1,
        -2.4, 1.6, 0.8, 0.2, 1.9, 0.6, 1.2, -2.4, 1.4, 3.6, -3.5, 0.8,
      ],
      pal,
      pal.hair,
    );
    sheen();
    ear();
  } else if (hs === 'quiff') {
    shape(
      g,
      [
        5.2, -4.6, 0.8, 6, -8.4, 2, 1, -9.6, 3, -5.4, -6.6, 3.6, -6.4, -2.4, 3, -6, 1.6, 2.2, -4.2,
        4.2, 1, -2.4, 1.6, 0.8, 0.2, 1.9, 0.6, 1.2, -2.4, 1.4, 3.6, -3.5, 0.8,
      ],
      pal,
      pal.hair,
    );
    stroke(g, pal.hairLight, 0.7, [3.6, -8, -1.6, -8.4]);
    ear();
  } else if (hs === 'long' || hs === 'bob') {
    shape(
      g,
      [
        4.8, -4.4, 0.8, 4, -7.3, 2.2, -1.4, -7.8, 3.4, -6.6, -4, 3.6, -6.2, 2, 2, -1.2, 2.6, 1.4,
        0.6, -1.8, 1.6, 3.4, -3.4, 0.8,
      ],
      pal,
      pal.hair,
    );
    sheen();
  } else if (hs === 'curly') {
    const curls = [3.8, -6, 0.8, -8, -2.8, -7.8, -5.8, -5.4, -7, -2, -6.2, 1.4, -3.8, 3.4];
    g.fillStyle = pal.line;
    g.beginPath();
    for (let i = 0; i < curls.length; i += 2) {
      g.moveTo(curls[i]! + 3 + pal.lw, curls[i + 1]!);
      g.arc(curls[i]!, curls[i + 1]!, 3 + pal.lw, 0, TAU);
    }
    g.fill();
    g.fillStyle = pal.hair;
    g.beginPath();
    for (let i = 0; i < curls.length; i += 2) {
      g.moveTo(curls[i]! + 3, curls[i + 1]!);
      g.arc(curls[i]!, curls[i + 1]!, 3, 0, TAU);
    }
    g.moveTo(3.6, -3.6);
    g.lineTo(1.2, -2.4);
    g.lineTo(0.2, 1.9);
    g.lineTo(-4.4, 2.6);
    g.lineTo(-5, -5);
    g.lineTo(2, -7);
    g.closePath();
    g.fill();
    stroke(g, pal.hairLight, 0.7, [1.6, -9.4, -1.8, -9.6]);
    ear();
  } else if (hs === 'bald') ear();
  else if (hs === 'cap') {
    backHair();
    shape(
      g,
      [5.2, -3.3, 0.6, 4.6, -7.2, 2.4, -1.6, -8, 3.4, -6.6, -4.6, 3.2, -6.5, -2.5, 0.8],
      pal,
      pal.item,
    );
    shape(g, [4.8, -4.2, 0.5, 9.8, -3.3, 0.8, 9.6, -2.5, 0.4, 5, -2.9, 0.3], pal, pal.item);
    ear();
  } else if (hs === 'beanie') {
    backHair();
    shape(
      g,
      [5.4, -3.4, 0.8, 4.8, -8, 2.6, -1.4, -9, 3.6, -6.8, -5.2, 3.4, -6.8, -2.3, 0.8],
      pal,
      pal.item,
    );
    stroke(g, pal.soft, pal.lw * 0.8, [5.2, -4.8, -6.8, -3.8]);
    ear();
  } else if (hs === 'hat') {
    backHair();
    shape(g, [4.6, -4.2, 0.6, 3.8, -8.2, 1.6, -4.8, -8.2, 1.6, -5.8, -4, 0.6], pal, pal.item);
    shape(g, [8.4, -3.4, 0.7, -8.8, -3, 0.7, -8.4, -4.5, 0.5, 8, -4.9, 0.5], pal, pal.item);
    ear();
  } else if (hs === 'hijab' || hs === 'hood') {
    shape(
      g,
      [
        4.9, -4.6, 0.8, 3.8, -7.4, 2.2, -2, -7.8, 3.4, -6.6, -4, 3.6, -6.4, 4, 2.4, -2.5, 8.5, 2,
        1.6, 7.6, 1.4, -0.4, 3, 1.4, 1, -2.2, 1.4, 3.6, -3.8, 0.8,
      ],
      pal,
      hs === 'hijab' ? pal.item : pal.topDark,
    );
  }
  if (k.phones) {
    g.beginPath();
    g.arc(-0.4, -0.6, 7.6, -HALF - 0.75, -HALF + 0.2);
    g.strokeStyle = pal.line;
    g.lineWidth = 1.5 + pal.lw;
    g.stroke();
    g.strokeStyle = pal.metal;
    g.lineWidth = 1;
    g.stroke();
    box(g, pal, -2.8, -1.4, 3.8, 4.8, 1.6, pal.metal);
  }
  g.restore();

  // ----- the near arm, and what it holds -----
  const [wx, wy] = drawArm(nearArm, 1.2, false);
  const glow = 0.7 + 0.3 * Math.sin(s.t * 2.3);
  if (s.phone > 0.4 || hand === 'phone') {
    g.save();
    g.translate(wx + 1.6, wy - 2.6);
    g.rotate(-0.5);
    box(g, pal, -1.3, -3.6, 2.6, 6.4, 0.8, pal.metal);
    g.restore();
  }
  if (hand === 'coffee') box(g, pal, wx - 0.4, wy - 5.6, 4, 6, 1, pal.item);
  else if (hand === 'tote') {
    stroke(g, pal.line, pal.lw, [wx, wy, wx - 2 - sway, wy + 5, wx + 3 - sway, wy + 5, wx + 1, wy]);
    box(g, pal, wx - 6 - sway, wy + 5, 13, 13, 1.6, pal.item);
  } else if (hand === 'bags') {
    box(g, pal, wx - 7 - sway, wy + 4, 9, 12, 1.2, pal.item);
    box(g, pal, wx - 1 - sway * 0.6, wy + 5, 9.5, 13, 1.2, pal.under);
    stroke(g, pal.line, pal.lw, [
      wx,
      wy,
      wx - 2.5 - sway,
      wy + 4.5,
      wx,
      wy,
      wx + 3.5 - sway * 0.6,
      wy + 5,
    ]);
  } else if (hand === 'case') {
    box(g, pal, wx - 8, wy + 2.4, 17, 12, 2, pal.item);
    stroke(g, pal.line, pal.lw, [
      wx - 2.4,
      wy + 2.4,
      wx - 2.4,
      wy,
      wx + 2.6,
      wy,
      wx + 2.6,
      wy + 2.4,
    ]);
  } else if (hand === 'helmet') {
    disc(g, pal, wx + 1, wy + 6.8, 6.6, pal.item);
    g.beginPath();
    g.moveTo(wx + 2.4, wy + 4.2);
    g.lineTo(wx + 7.4, wy + 5.4);
    g.lineTo(wx + 7, wy + 9);
    g.lineTo(wx + 2.2, wy + 8.6);
    g.closePath();
    g.fillStyle = pal.metal;
    g.fill();
    g.strokeStyle = pal.line;
    g.lineWidth = pal.lw * 0.8;
    g.stroke();
  } else if (hand === 'suitcase') {
    stroke(g, pal.line, pal.lw * 1.6, [wx, wy, wx - 7, -24]);
    box(g, pal, wx - 17, -25, 12.5, 22, 2.2, pal.item);
    stroke(
      g,
      pal.line,
      pal.lw * 0.7,
      [wx - 13.6, -22, wx - 13.6, -6, wx - 8, -22, wx - 8, -6].slice(0, 4),
    );
    wheel(g, pal, wx - 14.5, -1.6, 1.6, 0, false);
    wheel(g, pal, wx - 7, -1.6, 1.6, 0, false);
  } else if (hand === 'box') {
    box(g, pal, wx - 5, wy - 11, 15, 12.5, 1, pal.item);
    stroke(g, pal.line, pal.lw * 0.7, [wx - 5, wy - 6.5, wx + 10, wy - 6.5]);
    if (k.accent) {
      g.beginPath();
      g.moveTo(wx + 2.5, wy - 4.6);
      g.lineTo(wx + 5.3, wy - 0.2);
      g.lineTo(wx - 0.3, wy - 0.2);
      g.closePath();
      g.fillStyle = pal.accent;
      g.fill();
    }
  } else if (hand === 'laptop') {
    g.save();
    g.translate(wx - 4, wy - 3);
    g.rotate(-0.38);
    box(g, pal, -8, -1.4, 17, 2.8, 0.8, pal.metal);
    g.restore();
  } else if (hand === 'openlaptop') {
    box(g, pal, wx - 4, wy - 1.4, 13, 2, 0.6, pal.metal);
    g.save();
    g.translate(wx + 9, wy - 1);
    g.rotate(0.24);
    box(g, pal, -1, -11, 1.8, 11, 0.5, pal.metal);
    g.globalAlpha = glow;
    g.fillStyle = pal.accent;
    g.fillRect(-2.4, -10, 1.3, 9);
    g.globalAlpha = 1;
    g.restore();
  } else if (hand === 'board') {
    g.save();
    g.translate(wx - 3, wy - 2);
    g.rotate(-0.3);
    box(g, pal, -15, -1.5, 30, 3, 1.5, pal.item);
    wheel(g, pal, -9, 3, 1.5, 0, false);
    wheel(g, pal, 9, 3, 1.5, 0, false);
    g.restore();
  } else if (hand === 'boat') {
    g.save();
    g.translate(wx - 3, wy - 2.4);
    g.rotate(-0.2);
    shape(g, [-15, -3.6, 1, 13, -3.6, 1, 17.5, -0.6, 1.6, 12, 4, 3, -13, 4, 3], pal, pal.item);
    stroke(g, pal.accent, pal.lw * 1.6, [-12.6, 1, 13.6, 1]);
    g.restore();
  } else if (hand === 'cane') {
    stroke(g, pal.line, pal.lw * 2.2, [
      wx - 2,
      wy - 1.5,
      wx + 0.5,
      wy - 2.4,
      wx + 3 + (wy + 0) * 0.02,
      -0.4,
    ]);
    stroke(g, pal.metal, pal.lw, [wx - 2, wy - 1.5, wx + 0.5, wy - 2.4, wx + 3, -0.4]);
  } else if (hand === 'staff') {
    const topX = wx - 2.2;
    const topY = wy - 44;
    cord(g, pal, pal.item, pal.lw * 2.6, pal.lw * 1.2, [wx + 4, -0.4, topX, topY]);
    // A lantern on the staff, the one light this figure carries.
    stroke(g, pal.line, pal.lw, [topX, topY + 2, topX + 5, topY + 3, topX + 5, topY + 6]);
    g.globalAlpha = 0.16 * glow + 0.2 * s.lit;
    g.fillStyle = pal.accent;
    g.beginPath();
    g.arc(topX + 5, topY + 9.4, 8.5, 0, TAU);
    g.fill();
    g.globalAlpha = 1;
    box(g, pal, topX + 2.8, topY + 6, 4.4, 6.6, 1, pal.accent);
  } else if (hand === 'umbrella') {
    cord(g, pal, pal.item, pal.lw * 3.4, pal.lw * 1.8, [wx, wy - 2, wx + 1.5, wy + 22]);
  } else if (hand === 'spool') {
    disc(g, pal, wx + 0.5, wy + 7.6, 7.2, pal.metal);
    g.beginPath();
    g.arc(wx + 0.5, wy + 7.6, 4.9, 0, TAU);
    g.strokeStyle = pal.accent;
    g.lineWidth = 2.6;
    g.stroke();
    disc(g, pal, wx + 0.5, wy + 7.6, 1.5, pal.metal);
  } else if (hand === 'books') {
    box(g, pal, wx - 3.4, wy + 0.6, 9, 3, 0.5, pal.item);
    box(g, pal, wx - 2.6, wy + 3.6, 8.4, 2.8, 0.5, pal.under);
    stroke(g, pal.accent, pal.lw * 1.6, [wx - 3.2, wy + 2.1, wx + 5.4, wy + 2.1]);
  } else if (hand === 'pad') {
    box(g, pal, wx - 4.5, wy + 1.6, 10.5, 5.6, 2.4, pal.item);
    g.fillStyle = pal.accent;
    g.fillRect(wx + 2.2, wy + 3.4, 1.5, 1.5);
  } else if (hand === 'stroller') {
    wheel(g, pal, wx + 6, -3.6, 3.6, s.t * 6, true);
    wheel(g, pal, wx + 23, -3.6, 3.6, s.t * 6, true);
    stroke(g, pal.line, pal.lw * 2.4, [
      wx,
      wy,
      wx + 8,
      -15,
      wx + 22,
      -4.5,
      wx + 8,
      -15,
      wx + 6,
      -4.5,
    ]);
    stroke(g, pal.metal, pal.lw, [wx, wy, wx + 8, -15, wx + 22, -4.5]);
    shape(g, [wx + 5, -27, 4, wx + 26, -27, 3, wx + 25, -15, 5, wx + 8, -14, 4], pal, pal.item);
    g.beginPath();
    g.arc(wx + 11, -27, 9, Math.PI, Math.PI * 1.62);
    g.lineTo(wx + 11, -27);
    g.closePath();
    g.fillStyle = pal.under;
    g.fill();
    g.strokeStyle = pal.line;
    g.lineWidth = pal.lw;
    g.stroke();
  }
  if (k.with === 'dog' || k.with === 'pup') {
    const big = k.with === 'dog';
    const dx = wx + (big ? 28 : 21) + Math.sin(s.t * 1.3) * 2;
    drawDog(g, pal, dx, big ? 1 : 0.68, p, stand, s.t);
    stroke(g, pal.line, pal.lw * 0.9, [wx + 1, wy + 1, dx - (big ? 2 : 1), big ? -20 : -13.5]);
  }

  g.restore();

  if (k.with === 'robot') drawRobot(g, pal, -27 - Math.sin(s.t * 0.9) * 2, s);
}

/** A small dog trotting ahead on its lead. */
function drawDog(g: G, pal: Paint, x: number, size: number, p: number, stand: number, t: number) {
  g.save();
  g.translate(x, 0);
  g.scale(size, size);
  const trot = (phase: number) => Math.sin(TAU * (p * 2 + phase)) * 0.55 * (1 - stand);
  const paw = (ox: number, phase: number, shade: boolean) => {
    const a = trot(phase);
    limb(
      g,
      pal,
      ox,
      -13,
      ox + Math.sin(a) * 6,
      -7,
      ox + Math.sin(a) * 6 + Math.sin(a * 0.4) * 4,
      -0.8,
      3,
      2.4,
      pal.item,
      pal.item,
      // The far pair is in the dog's own shadow, never in its owner's coat colour.
      shade ? pal.soft : undefined,
      shade ? pal.soft : undefined,
    );
  };
  paw(-7, 0.5, true);
  paw(7.5, 0, true);
  const wag = Math.sin(t * 11) * 0.35;
  cord(g, pal, pal.item, 2.4 + pal.lw * 2, 2.4, [-10, -16, -15 - wag * 2, -22 - Math.abs(wag) * 2]);
  shape(g, [-11, -19, 4, 9, -20, 4, 11, -11.5, 4, -10, -11, 4], pal, pal.item);
  paw(-8.5, 0, false);
  paw(6, 0.5, false);
  shape(g, [7, -26, 3, 15, -25.5, 3, 19.6, -20.6, 1.8, 15, -17, 3, 8, -17.5, 3], pal, pal.item);
  shape(g, [8.4, -26.6, 1.2, 11.6, -26.4, 1.2, 9.4, -20.6, 1.4], pal, pal.item);
  g.fillStyle = pal.line;
  g.beginPath();
  g.arc(14.2, -22.6, 0.7, 0, TAU);
  g.arc(19.2, -20.8, 0.8, 0, TAU);
  g.fill();
  g.restore();
}

/** A small companion that rolls along behind its person. */
function drawRobot(g: G, pal: Paint, x: number, s: Pose) {
  const bob = Math.sin(s.t * 3.4) * 0.7;
  g.save();
  g.translate(x, 0);
  wheel(g, pal, 0, -4.4, 4.4, s.t * 7, true);
  stroke(g, pal.line, pal.lw * 2.6, [0, -8.4, 0, -12 + bob]);
  box(g, pal, -6.4, -24 + bob, 12.8, 12.4, 3.4, pal.metal);
  box(g, pal, -4.6, -32.6 + bob, 10.4, 7.6, 3, pal.metal);
  // One eye, looking where it is going.
  g.globalAlpha = 0.75 + 0.25 * Math.sin(s.t * 2.2) + 0;
  g.fillStyle = pal.accent;
  g.beginPath();
  g.arc(2.6, -28.8 + bob, 1.7 + s.lit * 0.5, 0, TAU);
  g.fill();
  g.globalAlpha = 1;
  stroke(g, pal.line, pal.lw, [-1.6, -32.6 + bob, -3.4 - Math.sin(s.t * 3.4) * 1.2, -38.6 + bob]);
  disc(g, pal, -3.4 - Math.sin(s.t * 3.4) * 1.2, -39.4 + bob, 1, pal.accent);
  stroke(g, pal.line, pal.lw * 1.8, [6.4, -18 + bob, 9.6, -15 + bob * 2]);
  g.restore();
}
