// Prepares the footer's standing figure from the approved illustration
// (src/assets/media/street/source/nikolay-standing.webp, kept exactly as received).
//   node scripts/street-avatar.mjs
//
// 1. Cleans the alpha channel without touching a single colour: the faint
//    specks the generator left around the figure go, and the interior, which
//    arrived at 254 of 255, becomes fully opaque.
// 2. Writes a lossless master on the original canvas (source/nikolay-master.webp).
// 3. Writes two web layers on one trimmed canvas, so they stack pixel for pixel:
//      nikolay-body.webp  the figure, with the head removed where only air is
//                         behind it, so a moving head leaves no ghost
//      nikolay-chest.webp the front of the hoodie and tee, feathered wide, so it
//                         can widen by a percent as he breathes
//      nikolay-head.webp  hair, glasses, face and beard, feathered where the
//                         beard meets the hoodie
// The page turns the head layer by under one degree; the artwork itself is
// never redrawn. Coordinates are pixels of the 1024 x 1536 source.
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';

const dir = fileURLToPath(new URL('../src/assets/media/street/', import.meta.url));
const source = `${dir}source/nikolay-standing.webp`;

// The figure's alpha bounds with a little air; the lower sole sits on the bottom edge.
export const CROP = { left: 225, top: 6, width: 528, height: 1520 };
// Hair, glasses, face, ear and beard. Outside the figure the outline runs
// through air; along the bottom it follows the beard over the hoodie.
const HEAD = [
  [385, 0],
  [580, 0],
  [580, 170],
  [582, 225],
  [562, 250],
  [532, 260],
  [500, 256],
  [472, 243],
  [455, 232],
  [445, 214],
  [436, 203],
  [418, 198],
  [385, 187],
];
// The part of the head with nothing but air behind it (above the hood on the
// left, down the side of the beard on the right).
const CLEAR = [
  [385, 0],
  [580, 0],
  [580, 170],
  [582, 222],
  [556, 234],
  [505, 222],
  [470, 206],
  [452, 204],
  [438, 201],
  [422, 196],
  [408, 188],
  [385, 181],
];
// The chest and shoulders, well inside the silhouette: its edge is feathered
// over 26 px, so the moving layer fades into the still one with no seam.
const CHEST = [
  [330, 300],
  [690, 300],
  [720, 470],
  [690, 660],
  [350, 660],
  [300, 470],
];
const FEATHER = 3;

const { data, info } = await sharp(source)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const { width, height } = info;

// ---------- alpha cleanup ----------
const alpha = new Uint8Array(width * height);
for (let i = 0; i < alpha.length; i += 1) {
  const a = data[i * 4 + 3];
  alpha[i] = a < 12 ? 0 : Math.min(255, Math.round((a * 255) / 250));
}
// Keep the figure (the largest connected piece); drop every island beside it.
const label = new Int32Array(width * height);
const sizes = [0];
const stack = [];
for (let start = 0; start < alpha.length; start += 1) {
  if (alpha[start] === 0 || label[start] !== 0) continue;
  const id = sizes.length;
  let count = 0;
  stack.push(start);
  label[start] = id;
  while (stack.length) {
    const at = stack.pop();
    count += 1;
    const x = at % width;
    for (const next of [at - width, at + width, x > 0 ? at - 1 : -1, x < width - 1 ? at + 1 : -1]) {
      if (next < 0 || next >= alpha.length || alpha[next] === 0 || label[next] !== 0) continue;
      label[next] = id;
      stack.push(next);
    }
  }
  sizes.push(count);
}
const figure = sizes.indexOf(Math.max(...sizes));
let dropped = 0;
for (let i = 0; i < alpha.length; i += 1) {
  if (alpha[i] !== 0 && label[i] !== figure) {
    alpha[i] = 0;
    dropped += 1;
  }
}
const clean = Buffer.from(data);
for (let i = 0; i < alpha.length; i += 1) clean[i * 4 + 3] = alpha[i];

const raw = { raw: { width, height, channels: 4 } };
await sharp(clean, raw)
  .webp({ lossless: true, effort: 6 })
  .toFile(`${dir}source/nikolay-master.webp`);

// ---------- layers ----------
const svg = (body) =>
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${body}</svg>`,
  );
const mask = (points, feather = FEATHER) =>
  sharp(svg(`<polygon points="${points.map((p) => p.join(',')).join(' ')}" fill="#fff"/>`))
    .blur(feather)
    .extractChannel('alpha')
    .raw()
    .toBuffer();
const [headMask, clearMask, chestMask] = await Promise.all([
  mask(HEAD),
  mask(CLEAR),
  mask(CHEST, 26),
]);

const head = Buffer.from(clean);
const body = Buffer.from(clean);
const chest = Buffer.from(clean);
for (let i = 0, p = 3; i < headMask.length; i += 1, p += 4) {
  head[p] = Math.round((clean[p] * headMask[i]) / 255);
  chest[p] = Math.round((clean[p] * chestMask[i] * (255 - headMask[i])) / 65025);
  body[p] = Math.round((clean[p] * (255 - clearMask[i])) / 255);
}
const write = (pixels, name) =>
  sharp(pixels, raw)
    .extract(CROP)
    .webp({ quality: 92, alphaQuality: 100, effort: 6 })
    .toFile(`${dir}${name}`);
const [b, h, ch] = await Promise.all([
  write(body, 'nikolay-body.webp'),
  write(head, 'nikolay-head.webp'),
  write(chest, 'nikolay-chest.webp'),
]);

// Where the eyelids close: the lens-tinted skin just under each eye.
const sample = (x0, y0) => {
  const sum = [0, 0, 0];
  for (let y = y0; y < y0 + 3; y += 1)
    for (let x = x0; x < x0 + 7; x += 1)
      for (let c = 0; c < 3; c += 1) sum[c] += data[(y * width + x) * 4 + c];
  return sum.map((v) => Math.round(v / 21));
};
let lowest = 0;
for (let i = alpha.length - 1; i >= 0 && !lowest; i -= 1)
  if (alpha[i] > 128) lowest = Math.floor(i / width);
console.log(
  `figure ${sizes[figure]} px, ${sizes.length - 2} stray island(s) removed (${dropped} px)`,
);
console.log(
  `body ${b.size} B, chest ${ch.size} B, head ${h.size} B, canvas ${CROP.width} x ${CROP.height}`,
);
console.log(`lowest opaque row ${lowest}; canvas ends at row ${CROP.top + CROP.height - 1}`);
console.log('eyelid rgb', sample(474, 130), sample(529, 122));
