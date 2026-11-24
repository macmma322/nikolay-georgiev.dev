/**
 * Who walks the street. Each entry is a person described in parts (figure.ts
 * draws them); none is an image. Most are ordinary passers-by. The last few
 * carry one small thing from a project and are cast rarely, so the street
 * never turns into a parade of mascots.
 */
import type { C3, Look, Paint } from './figure';

// Skin and hair
const S1: C3 = [0.86, 0.035, 70];
const S2: C3 = [0.79, 0.055, 62];
const S3: C3 = [0.7, 0.075, 58];
const S4: C3 = [0.58, 0.08, 52];
const S5: C3 = [0.45, 0.07, 48];
const S6: C3 = [0.36, 0.055, 45];
const BLACK: C3 = [0.2, 0.008, 60];
const BROWN: C3 = [0.33, 0.04, 50];
const CHESTNUT: C3 = [0.42, 0.07, 45];
const BLOND: C3 = [0.76, 0.075, 88];
const GINGER: C3 = [0.56, 0.12, 48];
const GREY: C3 = [0.7, 0.008, 250];
const WHITE: C3 = [0.88, 0.006, 250];

// Cloth: mostly quiet street colours, a few that carry
const CHARCOAL: C3 = [0.25, 0.008, 60];
const INK: C3 = [0.2, 0.01, 255];
const GRAPHITE: C3 = [0.34, 0.012, 255];
const ASH: C3 = [0.56, 0.008, 250];
const NAVY: C3 = [0.31, 0.05, 258];
const DENIM: C3 = [0.47, 0.06, 248];
const PALE_DENIM: C3 = [0.66, 0.045, 245];
const OLIVE: C3 = [0.44, 0.05, 125];
const SAGE: C3 = [0.68, 0.04, 150];
const KHAKI: C3 = [0.72, 0.045, 88];
const SAND: C3 = [0.8, 0.035, 85];
const IVORY: C3 = [0.9, 0.014, 85];
const BONE: C3 = [0.94, 0.008, 85];
const BURGUNDY: C3 = [0.38, 0.09, 18];
const RUST: C3 = [0.55, 0.11, 45];
const MUSTARD: C3 = [0.74, 0.11, 88];
const TEAL: C3 = [0.5, 0.06, 200];
const LILAC: C3 = [0.7, 0.055, 300];
const ROSE: C3 = [0.72, 0.07, 15];
const LEATHER: C3 = [0.22, 0.012, 40];
const TAN: C3 = [0.6, 0.07, 65];
const HIVIS: C3 = [0.86, 0.15, 100];

// Project accents (tokens.css)
const CAELORA: C3 = [0.81, 0.13, 128];
const ZONE: C3 = [0.7, 0.15, 305];
const JARVIS: C3 = [0.86, 0.085, 205];
const USSX: C3 = [0.78, 0.11, 250];
const KOBAIT: C3 = [0.82, 0.12, 170];
const MALRYNTH: C3 = [0.83, 0.13, 78];
const STEMINI: C3 = [0.8, 0.13, 58];

const base = {
  h: 1,
  build: 1,
  shoe: INK,
  hairStyle: 'short',
  topStyle: 'tee',
  bottomStyle: 'trousers',
  speed: 50,
} as const;

// One person per row, so the cast reads as the table it is.
// prettier-ignore
export const CAST: readonly Look[] = [
  // ---------- photorealistic city inhabitants (16 sprites total incl. project cast) ----------
  { ...base, id: 'commuter', h: 1.02, skin: S2, hair: BROWN, top: KHAKI, under: IVORY, bottom: CHARCOAL, item: LEATHER, topStyle: 'trench', bottomStyle: 'slim', strap: true, hand: 'coffee', speed: 56, weight: 1.5 },
  { ...base, id: 'student', h: 0.96, build: 0.92, skin: S4, hair: BLACK, top: MUSTARD, bottom: PALE_DENIM, item: NAVY, shoe: BONE, hairStyle: 'curly', back: 'pack', phones: true, hand: 'books', speed: 52, weight: 1.5 },
  { ...base, id: 'manager', h: 0.98, build: 0.92, skin: S2, hair: CHESTNUT, top: CHARCOAL, under: IVORY, bottom: CHARCOAL, item: TAN, topStyle: 'coat', bottomStyle: 'trousers', hairStyle: 'bun', hand: 'case', speed: 55, weight: 1.5 },
  { ...base, id: 'dog-walker', build: 1.0, skin: S2, hair: BROWN, top: OLIVE, bottom: CHARCOAL, item: TAN, topStyle: 'jacket', hairStyle: 'bun', hand: 'leash', with: 'dog', speed: 46, weight: 1.5 },
  { ...base, id: 'pup-walker', h: 1.02, build: 1.04, skin: S2, hair: BLACK, top: LEATHER, bottom: CHARCOAL, item: TAN, topStyle: 'jacket', hairStyle: 'curly', beard: true, phones: true, hand: 'leash', with: 'pup', speed: 44, weight: 1.5 },
  { ...base, id: 'grandfather', h: 0.97, build: 1.06, belly: 1.4, stoop: 0.4, skin: S2, hair: WHITE, top: ASH, under: IVORY, bottom: CHARCOAL, item: GRAPHITE, shoe: LEATHER, topStyle: 'coat', hairStyle: 'cap', hand: 'cane', stride: 22, swing: 0.24, speed: 30, weight: 1.4 },
  { ...base, id: 'cyclist', h: 1.02, build: 0.96, skin: S2, hair: BLACK, top: HIVIS, under: INK, bottom: CHARCOAL, item: GRAPHITE, topStyle: 'jacket', bottomStyle: 'trousers', hairStyle: 'cap', beard: true, back: 'pack', hand: 'bike', speed: 50, weight: 1.5 },
  { ...base, id: 'photographer', h: 1.0, skin: S3, hair: BLACK, top: OLIVE, under: CHARCOAL, bottom: INK, item: TAN, topStyle: 'jacket', hairStyle: 'short', beard: true, strap: true, speed: 40, weight: 1.5 },
  { ...base, id: 'builder', h: 1.02, build: 1.06, skin: S3, hair: BLACK, top: ASH, bottom: INK, item: HIVIS, accent: HIVIS, shoe: TAN, topStyle: 'coat', hairStyle: 'short', beard: true, back: 'pack', speed: 48, weight: 1.5 },

  // ---------- dynamic kinetic variety (background/foreground rhythm) ----------
  { ...base, id: 'developer', skin: S3, hair: BLACK, top: GRAPHITE, bottom: DENIM, item: OLIVE, shoe: BONE, topStyle: 'hoodie', hairStyle: 'curly', back: 'pack', phones: true, hand: 'phone', speed: 44, weight: 0.35 },
  { ...base, id: 'banker', h: 1.04, build: 1.08, skin: S1, hair: GREY, top: NAVY, under: BONE, bottom: NAVY, item: LEATHER, shoe: LEATHER, topStyle: 'suit', hand: 'case', speed: 60, weight: 0.3 },
  { ...base, id: 'tourist', build: 1.1, belly: 2.4, skin: S1, hair: GREY, top: SAGE, bottom: KHAKI, item: SAND, under: ASH, shoe: TAN, topStyle: 'shirt', bottomStyle: 'shorts', hairStyle: 'hat', hand: 'suitcase', speed: 40, weight: 0.3 },
  { ...base, id: 'backpacker', h: 1.03, skin: S2, hair: BLOND, top: RUST, bottom: OLIVE, item: TEAL, shoe: TAN, bottomStyle: 'shorts', hairStyle: 'cap', back: 'pack', hand: 'phone', speed: 42, weight: 0.3 },
  { ...base, id: 'runner', h: 0.98, build: 0.88, skin: S3, hair: BROWN, top: ROSE, bottom: INK, shoe: BONE, bottomStyle: 'shorts', hairStyle: 'pony', run: true, phones: true, speed: 118, weight: 0.35 },
  { ...base, id: 'grandmother', h: 0.9, build: 1.1, belly: 1.4, stoop: 0.3, skin: S1, hair: WHITE, top: BURGUNDY, under: SAND, bottom: CHARCOAL, item: SAND, topStyle: 'coat', bottomStyle: 'skirt', hairStyle: 'bun', scarf: true, hand: 'bags', stride: 21, swing: 0.2, speed: 28, weight: 0.25 },
  { ...base, id: 'scholar', h: 0.96, build: 0.92, skin: S4, hair: BLACK, top: TEAL, bottom: INK, item: SAND, topStyle: 'dress', bottomStyle: 'none', hairStyle: 'hijab', hand: 'tote', speed: 48, weight: 0.25 },
  { ...base, id: 'skater', h: 0.98, build: 0.92, skin: S3, hair: BLACK, top: ASH, bottom: CHARCOAL, item: RUST, shoe: BONE, topStyle: 'hoodie', bottomStyle: 'wide', hairStyle: 'cap', roll: 'board', speed: 104, weight: 0.4 },
  { ...base, id: 'longboarder', h: 1.01, build: 0.9, skin: S2, hair: BLOND, top: BONE, bottom: OLIVE, item: MUSTARD, bottomStyle: 'wide', hairStyle: 'beanie', hand: 'board', speed: 52, weight: 0.25 },
  { ...base, id: 'scooter', build: 0.96, skin: S5, hair: BLACK, top: DENIM, under: BONE, bottom: CHARCOAL, item: INK, topStyle: 'jacket', hairStyle: 'short', back: 'pack', roll: 'scooter', speed: 136, weight: 0.35 },
  { ...base, id: 'parent', h: 0.99, skin: S3, hair: BLACK, top: LILAC, under: BONE, bottom: DENIM, item: GRAPHITE, topStyle: 'coat', bottomStyle: 'slim', hairStyle: 'bun', hand: 'stroller', speed: 40, weight: 0.25 },
  { ...base, id: 'schoolboy', h: 0.62, build: 0.86, skin: S2, hair: BROWN, top: TEAL, bottom: KHAKI, item: RUST, shoe: BONE, bottomStyle: 'shorts', hairStyle: 'cap', back: 'pack', stride: 28, speed: 58, weight: 0.25 },
  { ...base, id: 'schoolgirl', h: 0.66, build: 0.84, skin: S5, hair: BLACK, top: MUSTARD, bottom: INK, item: LILAC, shoe: BONE, topStyle: 'dress', bottomStyle: 'none', hairStyle: 'pony', back: 'pack', stride: 28, speed: 56, weight: 0.25 },
  { ...base, id: 'teenager', h: 0.88, build: 0.86, skin: S1, hair: GINGER, top: INK, bottom: PALE_DENIM, shoe: BONE, topStyle: 'hoodie', bottomStyle: 'wide', hairStyle: 'bob', phones: true, hand: 'phone', speed: 40, weight: 0.25 },
  { ...base, id: 'porter', build: 1.02, skin: S6, hair: BLACK, top: RUST, under: GRAPHITE, bottom: CHARCOAL, item: SAND, topStyle: 'jacket', hairStyle: 'short', hand: 'box', speed: 54, weight: 0.25 },
  { ...base, id: 'guitarist', h: 1.01, build: 0.9, skin: S2, hair: BLACK, top: LEATHER, under: ASH, bottom: INK, item: GRAPHITE, shoe: LEATHER, topStyle: 'leather', bottomStyle: 'slim', hairStyle: 'long', back: 'guitar', speed: 48, weight: 0.25 },
  { ...base, id: 'yogi', h: 0.97, build: 0.86, skin: S3, hair: CHESTNUT, top: BONE, bottom: GRAPHITE, item: SAGE, shoe: BONE, bottomStyle: 'slim', hairStyle: 'pony', back: 'mat', hand: 'coffee', speed: 52, weight: 0.25 },
  { ...base, id: 'broker', h: 1.02, build: 1.12, belly: 2, skin: S2, hair: BROWN, top: GRAPHITE, under: PALE_DENIM, bottom: GRAPHITE, shoe: LEATHER, topStyle: 'suit', hairStyle: 'bald', glasses: true, hand: 'phone', speed: 50, weight: 0.25 },
  { ...base, id: 'barista', h: 0.96, build: 0.98, skin: S5, hair: BLACK, top: SAND, bottom: BURGUNDY, item: BONE, shoe: BONE, topStyle: 'puffer', bottomStyle: 'slim', hairStyle: 'curly', hand: 'coffee', speed: 50, weight: 0.25 },
  { ...base, id: 'shopper', h: 0.98, build: 0.92, skin: S1, hair: BLOND, top: NAVY, bottom: INK, item: SAND, under: ROSE, shoe: TAN, topStyle: 'dress', bottomStyle: 'none', hairStyle: 'long', hand: 'bags', speed: 44, weight: 0.25 },
  { ...base, id: 'professor', build: 1.04, belly: 1.2, skin: S1, hair: GREY, top: OLIVE, under: IVORY, bottom: KHAKI, item: BURGUNDY, shoe: LEATHER, topStyle: 'jacket', hairStyle: 'short', beard: true, glasses: true, scarf: true, hand: 'books', speed: 42, weight: 0.25 },
  { ...base, id: 'stroller', h: 1.07, build: 0.96, skin: S2, hair: BLOND, top: BONE, bottom: KHAKI, shoe: BONE, bottomStyle: 'wide', hairStyle: 'short', hand: 'pocket', speed: 40, weight: 0.25 },
  { ...base, id: 'umbrella', h: 0.98, build: 0.9, skin: S4, hair: BLACK, top: DENIM, under: BONE, bottom: INK, item: BURGUNDY, topStyle: 'trench', bottomStyle: 'slim', hairStyle: 'bob', glasses: true, hand: 'umbrella', speed: 54, weight: 0.25 },
  { ...base, id: 'engineer', h: 1.01, build: 0.96, skin: S5, hair: BLACK, top: PALE_DENIM, bottom: CHARCOAL, item: GRAPHITE, topStyle: 'shirt', bottomStyle: 'slim', hairStyle: 'short', glasses: true, strap: true, hand: 'laptop', speed: 56, weight: 0.25 },
  { ...base, id: 'big-man', h: 1.05, build: 1.24, belly: 4.2, skin: S2, hair: BROWN, top: BURGUNDY, bottom: KHAKI, item: INK, shoe: BONE, bottomStyle: 'shorts', hairStyle: 'cap', beard: true, hand: 'coffee', speed: 40, weight: 0.25 },
  { ...base, id: 'nurse', h: 0.95, build: 0.94, skin: S6, hair: BLACK, top: SAGE, bottom: SAGE, item: BONE, shoe: BONE, topStyle: 'shirt', hairStyle: 'bun', hand: 'tote', speed: 60, weight: 0.25 },
  { ...base, id: 'hiker', h: 1.0, build: 1.02, skin: S2, hair: CHESTNUT, top: TEAL, bottom: GRAPHITE, item: MUSTARD, shoe: TAN, topStyle: 'puffer', hairStyle: 'beanie', beard: true, back: 'pack', speed: 52, weight: 0.25 },

  // ---------- project-related photorealistic identities ----------
  { ...base, id: 'rider', h: 1.02, build: 1.1, skin: S2, hair: BROWN, top: LEATHER, under: CHARCOAL, bottom: INK, item: GRAPHITE, shoe: LEATHER, topStyle: 'leather', bottomStyle: 'slim', hairStyle: 'short', beard: true, hand: 'helmet', speed: 48, weight: 0.35 },
  { ...base, id: 'gamer', h: 0.97, build: 0.96, skin: S3, hair: BLACK, top: CHARCOAL, bottom: DENIM, item: ASH, accent: JARVIS, shoe: BONE, topStyle: 'hoodie', hairStyle: 'curly', phones: true, hand: 'pad', speed: 44, weight: 0.35 },
  { ...base, id: 'traveller', h: 1.0, build: 0.98, skin: S2, hair: BROWN, top: OLIVE, bottom: LEATHER, item: TAN, accent: CAELORA, shoe: LEATHER, topStyle: 'jacket', bottomStyle: 'trousers', hairStyle: 'cap', beard: true, back: 'pack', hand: 'bike', stride: 26, speed: 44, egg: 'caelora', weight: 0.6 },
  { ...base, id: 'companion', h: 1.0, build: 0.98, skin: S2, hair: BLACK, top: ASH, bottom: INK, item: GRAPHITE, accent: JARVIS, shoe: BONE, topStyle: 'jacket', bottomStyle: 'trousers', hairStyle: 'curly', beard: true, phones: true, hand: 'pocket', with: 'robot', speed: 44, egg: 'jarvis', weight: 0.6 },
  { ...base, id: 'angler', h: 1.0, build: 1.04, belly: 0.6, skin: S2, hair: BROWN, top: TEAL, under: BONE, bottom: OLIVE, item: BONE, accent: KOBAIT, shoe: TAN, topStyle: 'vest', hairStyle: 'curly', beard: true, back: 'rod', hand: 'boat', speed: 42, egg: 'kobait', weight: 0.6 },
  { ...base, id: 'kernel', h: 1.0, build: 0.94, skin: S2, hair: BLACK, top: INK, bottom: CHARCOAL, accent: MALRYNTH, topStyle: 'coat', bottomStyle: 'trousers', hairStyle: 'short', beard: true, item: GRAPHITE, hand: 'openlaptop', speed: 38, egg: 'malrynth', weight: 0.6 },
  { ...base, id: 'maker', h: 0.97, build: 0.94, skin: S3, hair: BLACK, top: RUST, under: BONE, bottom: INK, item: GRAPHITE, accent: STEMINI, shoe: BONE, topStyle: 'jacket', hairStyle: 'curly', phones: true, hand: 'spool', speed: 48, egg: 'stemini', weight: 0.6 },
  { ...base, id: 'trainee', h: 0.98, build: 0.94, skin: S2, hair: BROWN, top: NAVY, bottom: DENIM, item: NAVY, under: IVORY, accent: USSX, shoe: BONE, topStyle: 'jacket', hairStyle: 'curly', phones: true, back: 'pack', speed: 52, egg: 'uss-x-academy', weight: 0.6 },
  { ...base, id: 'courier', h: 0.98, build: 0.96, skin: S2, hair: BROWN, top: RUST, under: ASH, bottom: CHARCOAL, item: SAND, accent: ZONE, shoe: BONE, topStyle: 'jacket', hairStyle: 'bun', hand: 'box', speed: 58, egg: 'zone-32-19', weight: 0.6 },
];

const OUTLINE: C3 = [0.1, 0.012, 40];
const UNDER: C3 = [0.86, 0.012, 85];
const ITEM: C3 = [0.5, 0.03, 60];
const METAL: C3 = [0.66, 0.014, 250];

const css = (c: C3) => `oklch(${c[0].toFixed(3)} ${c[1].toFixed(3)} ${c[2]})`;

/**
 * A figure's colours at one depth. `haze` between 0 and 1 pulls every colour
 * toward the wall behind the street, so far figures sit back; below 0 it
 * pulls toward black, for the silhouettes that pass closest to the viewer.
 */
export function paintFor(look: Look, haze: number, wall: C3, lw: number): Paint {
  const target: C3 = haze >= 0 ? wall : [0.1, 0.004, 255];
  const t = Math.abs(haze);
  // Evening light: everything a little deeper and quieter than its daylight colour.
  const at = (c: C3, k = 1, grade = true): string => {
    const l = grade ? c[0] * 0.84 : c[0];
    const ch = grade ? c[1] * 0.8 : c[1];
    return css([l + (target[0] - l) * t * k, ch + (target[1] - ch) * t * k, c[2]]);
  };
  const dark = (c: C3): C3 => [c[0] * 0.81, c[1] * 1.05, c[2]];
  return {
    line: at(OUTLINE, 0.7),
    soft: `oklch(0.1 0.012 40 / ${(0.5 * (1 - t * 0.5)).toFixed(2)})`,
    skin: at(look.skin),
    skinDark: at([look.skin[0] * 0.82, look.skin[1] * 1.1, look.skin[2] - 6]),
    hair: at(look.hair),
    hairLight: at([Math.min(0.92, look.hair[0] + 0.16), look.hair[1], look.hair[2]]),
    sole: at([0.86, 0.01, 85]),
    top: at(look.top),
    topDark: at(dark(look.top)),
    bottom: at(look.bottom),
    bottomDark: at(dark(look.bottom)),
    shoe: at(look.shoe),
    item: at(look.item ?? ITEM),
    under: at(look.under ?? UNDER),
    metal: at(METAL),
    // The accent keeps its colour at every depth: it is the one thing meant to be found.
    accent: at(look.accent ?? METAL, look.accent ? 0.35 : 1, !look.accent),
    // Subtle warm amber rim from the streetlamps & site hoarding, tying silhouettes to the night stage.
    rim: `oklch(0.84 0.075 78 / ${(haze < 0 ? 0.22 : 0.34 * (1 - t * 0.72)).toFixed(2)})`,
    lw,
  };
}

/** A look by weight, skipping the ones in `taken`. `roll` is a number in [0, 1). */
export function pick(
  roll: number,
  taken: ReadonlySet<string>,
  allow: (look: Look) => boolean,
): Look | null {
  let total = 0;
  for (const look of CAST) if (!taken.has(look.id) && allow(look)) total += look.weight ?? 1;
  if (total === 0) return null;
  let at = roll * total;
  for (const look of CAST) {
    if (taken.has(look.id) || !allow(look)) continue;
    at -= look.weight ?? 1;
    if (at < 0) return look;
  }
  return null;
}
