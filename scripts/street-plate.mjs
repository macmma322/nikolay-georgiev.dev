/**
 * Cuts the derived pieces of the street photograph from its master
 * (src/assets/media/street/street-plate.webp, 3840 x 2160):
 *
 *   street-plate-portrait.webp   the middle 45% of the frame, for a phone held upright
 *   street-leaves-left.webp      the two tree canopies, feathered to nothing at
 *   street-leaves-right.webp     their inner edges, so they can sway over the still frame
 *
 * Run it after replacing the master: `node scripts/street-plate.mjs`.
 * The fractions here are the ones Street.astro positions these pieces with.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const DIR = path.join(fileURLToPath(new URL('..', import.meta.url)), 'src/assets/media/street');
const MASTER = path.join(DIR, 'street-plate.webp');
/** The upright crop, as fractions of the master's width. */
export const PORTRAIT = { x: 0.275, w: 0.45 };

const smooth = (lo, hi, v) => {
  const t = Math.min(1, Math.max(0, (v - lo) / (hi - lo)));
  return t * t * (3 - 2 * t);
};

/** A crop of the master whose alpha comes from `keep(u, v)`, both in master fractions. */
async function canopy(file, box, keep, width) {
  const meta = await sharp(MASTER).metadata();
  const left = Math.round(box.x * meta.width);
  const top = Math.round(box.y * meta.height);
  const w = Math.round(box.w * meta.width);
  const h = Math.round(box.h * meta.height);
  const { data, info } = await sharp(MASTER)
    .extract({ left, top, width: w, height: h })
    .resize({ width })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const u = box.x + (x / info.width) * box.w;
      const v = box.y + (y / info.height) * box.h;
      data[(y * info.width + x) * 4 + 3] = Math.round(255 * keep(u, v));
    }
  }
  await sharp(data, { raw: info })
    .webp({ quality: 80, alphaQuality: 80, effort: 6 })
    .toFile(path.join(DIR, file));
}

const meta = await sharp(MASTER).metadata();
await sharp(MASTER)
  .extract({
    left: Math.round(PORTRAIT.x * meta.width),
    top: 0,
    width: Math.round(PORTRAIT.w * meta.width),
    height: meta.height,
  })
  .webp({ quality: 90, effort: 6 })
  .toFile(path.join(DIR, 'street-plate-portrait.webp'));

// Left: the canopy over the promenade, fading out before the lamps under it.
await canopy(
  'street-leaves-left.webp',
  { x: 0, y: 0, w: 0.36, h: 0.34 },
  (u, v) => (1 - smooth(0.24, 0.35, u)) * (1 - smooth(0.17, 0.32, v)),
  960,
);
// Right: the branches over the office, with the lamp and its post left out.
await canopy(
  'street-leaves-right.webp',
  { x: 0.76, y: 0, w: 0.24, h: 0.28 },
  (u, v) =>
    smooth(0.765, 0.83, u) *
    (1 - smooth(0.15, 0.27, v)) *
    smooth(0.03, 0.06, Math.hypot(u - 0.94, (v - 0.155) * 0.5625)) *
    (1 - smooth(0.953, 0.962, u) * (1 - smooth(0.98, 0.99, u))),
  800,
);
console.log('street plate pieces written');
