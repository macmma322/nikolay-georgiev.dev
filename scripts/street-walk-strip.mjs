/**
 * Turns one generated walk clip into a strip of sixteen keyed walk frames:
 *
 *   node scripts/street-walk-strip.mjs <id> <clip.mp4> [--wide] [--centre 0.5]
 *
 *   src/assets/media/street/crowd-walk/<id>.webp   16 cells, 380 px tall
 *   src/assets/media/street/crowd-walk/walk.json   stride and still frame per id
 *
 * The clip is a person walking on the spot, in profile, facing right, on a flat
 * green background (a cut-out composited on #16a34a, animated by an
 * image-to-video model). The clips themselves are not kept in the repository;
 * the strips are, and scripts/street-crowd-atlas.mjs builds the atlases from
 * them. Needs ffmpeg on the PATH.
 *
 * A cell is the near tier's cell (scripts/street-crowd-atlas.mjs at 2.5x): the
 * figure 340 px tall, soles on row 365, its centre at `--centre` of the width
 * (0.31 with a dog or robot beside it, 0.49 pushing a bicycle).
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import prettier from 'prettier';
import sharp from 'sharp';

const OUT = path.join(
  fileURLToPath(new URL('..', import.meta.url)),
  'src/assets/media/street/crowd-walk',
);
const FRAMES = 16;
const CELL_H = 380;
const FIGURE_H = 340;
const SOLE_Y = 365;

const [id, clip, ...flags] = process.argv.slice(2);
if (!id || !clip) {
  console.error('usage: node scripts/street-walk-strip.mjs <id> <clip.mp4> [--wide] [--centre n]');
  process.exit(1);
}
const wide = flags.includes('--wide');
const centre = flags.includes('--centre') ? Number(flags[flags.indexOf('--centre') + 1]) : 0.5;
/** The person's share of the first frame's height, when something they carry rises above them (a rod). */
const person = flags.includes('--person') ? Number(flags[flags.indexOf('--person') + 1]) : 1;
const cellW = wide ? 440 : 285;

const smooth = (lo, hi, v) => {
  const t = Math.min(1, Math.max(0, (v - lo) / (hi - lo)));
  return t * t * (3 - 2 * t);
};
const median = (values) => [...values].sort((a, b) => a - b)[values.length >> 1];

/**
 * One frame with the green taken out. The model lets the background fade
 * during a clip, so the key is measured against this frame's own top edge.
 */
async function key(file) {
  const { data, info } = await sharp(file)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info;
  const edge = [];
  for (let y = 0; y < 12; y += 1) {
    for (let x = 0; x < W; x += 8) {
      const i = (y * W + x) * 4;
      edge.push(data[i + 1] - Math.max(data[i], data[i + 2]));
    }
  }
  const bg = Math.max(20, median(edge));
  const alpha = new Uint8Array(W * H);
  for (let i = 0, p = 0; i < data.length; i += 4, p += 1) {
    const k = data[i + 1] - Math.max(data[i], data[i + 2]);
    alpha[p] = Math.round((1 - smooth(0.09 * bg, 0.5 * bg, k)) * 255);
    if (k > 0) data[i + 1] = Math.max(data[i], data[i + 2]); // the spill
  }
  // One pixel in from every edge, where the last of the green hides.
  let minX = W;
  let maxX = 0;
  let minY = H;
  let maxY = 0;
  for (let y = 1; y < H - 1; y += 1) {
    for (let x = 1; x < W - 1; x += 1) {
      const p = y * W + x;
      const a = Math.min(alpha[p], alpha[p - 1], alpha[p + 1], alpha[p - W], alpha[p + W]);
      data[p * 4 + 3] = a;
      if (a > 150) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  // Head and torso carry the figure's position; the legs swing around it.
  const waist = minY + (maxY - minY) * 0.45;
  let sum = 0;
  let n = 0;
  for (let y = minY; y < waist; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      if (data[(y * W + x) * 4 + 3] > 150) {
        sum += x;
        n += 1;
      }
    }
  }
  return { data, W, H, minX, maxX, minY, maxY, cx: n ? sum / n : (minX + maxX) / 2 };
}

/** The lower body as a small mask centred on the torso: what a loop has to repeat. */
function silhouette(f) {
  const out = new Uint8Array(160 * 120);
  const y0 = f.minY + (f.maxY - f.minY) * 0.5;
  const x0 = f.cx - 320;
  for (let y = 0; y < 120; y += 1) {
    for (let x = 0; x < 160; x += 1) {
      const sx = Math.round(x0 + x * 4);
      const sy = Math.round(y0 + (y / 120) * (f.maxY - y0));
      const inside = sx >= 0 && sx < f.W && sy >= 0 && sy < f.H;
      out[y * 160 + x] = inside && f.data[(sy * f.W + sx) * 4 + 3] > 128 ? 1 : 0;
    }
  }
  return out;
}
const differ = (a, b) => {
  let d = 0;
  for (let i = 0; i < a.length; i += 1) d += a[i] ^ b[i];
  return d;
};

/** Where feet (and paws, and a cane) touch the ground line in this frame. */
function contacts(f, ground) {
  const blobs = [];
  let from = -1;
  for (let x = f.minX; x <= f.maxX + 1; x += 1) {
    let on = false;
    if (x <= f.maxX) {
      for (let y = ground - 5; y <= ground; y += 1) {
        if (f.data[(y * f.W + x) * 4 + 3] > 150) on = true;
      }
    }
    if (on && from < 0) from = x;
    if (!on && from >= 0) {
      if (x - from > 8) blobs.push((from + x) / 2);
      from = -1;
    }
  }
  return blobs;
}

/** How far apart the legs are: the width of the figure's own lower third. */
function legSpan(f, x, ground, figure) {
  let lo = Infinity;
  let hi = -Infinity;
  const from = Math.max(0, Math.round(x - figure * 0.3));
  const to = Math.min(f.W - 1, Math.round(x + figure * 0.3));
  for (let y = Math.round(ground - figure * 0.3); y <= ground; y += 1) {
    for (let px = from; px <= to; px += 1) {
      if (f.data[(y * f.W + px) * 4 + 3] > 150) {
        if (px < lo) lo = px;
        if (px > hi) hi = px;
      }
    }
  }
  return hi - lo;
}

const slope = (values) => {
  const n = values.length;
  const mt = (n - 1) / 2;
  const mv = values.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  values.forEach((v, k) => {
    num += (k - mt) * (v - mv);
    den += (k - mt) ** 2;
  });
  return den ? num / den : 0;
};

const tmp = mkdtempSync(path.join(os.tmpdir(), 'street-walk-'));
try {
  execFileSync('ffmpeg', ['-v', 'error', '-i', clip, path.join(tmp, 'f%03d.png')]);
  const files = readdirSync(tmp).sort();
  const frames = [];
  for (const file of files) frames.push(await key(path.join(tmp, file)));

  // The shortest stretch that ends as it began. A walk repeats every step in
  // silhouette, so this is often one step rather than two: twice as smooth
  // for the same sixteen frames. A cane or a dog makes the mask wait for both.
  const masks = frames.map(silhouette);
  const tries = [];
  for (let s = 0; s < Math.min(30, frames.length - 12); s += 1) {
    for (let e = s + 10; e < frames.length - 1; e += 1) {
      tries.push({ s, e, d: differ(masks[s], masks[e]) + differ(masks[s + 1], masks[e + 1]) });
    }
  }
  const least = Math.min(...tries.map((t) => t.d));
  const loop = tries
    .filter((t) => t.d <= least * 1.35 + 60)
    .sort((a, b) => a.e - a.s - (b.e - b.s) || a.d - b.d)[0];
  const length = loop.e - loop.s;

  const ground = Math.round(median(frames.map((f) => f.maxY)));
  // The first frame is the cut-out the clip was made from: its height is the figure's.
  const figure = (frames[0].maxY - frames[0].minY) * person;

  // Ground speed: follow each foot while it is down and fit a line through it.
  let open = [];
  const tracks = [];
  for (const f of frames) {
    const next = [];
    for (const x of contacts(f, ground)) {
      let best = -1;
      open.forEach((track, k) => {
        const d = x - track[track.length - 1];
        if (d > 2 || d <= -30) return;
        if (best < 0 || Math.abs(d) < Math.abs(x - open[best][open[best].length - 1])) best = k;
      });
      if (best >= 0) {
        open[best].push(x);
        next.push(open[best]);
        open.splice(best, 1);
      } else {
        next.push([x]);
      }
    }
    tracks.push(...open);
    open = next;
  }
  tracks.push(...open);
  const speeds = tracks
    .filter((track) => track.length >= 6)
    .map((track) => slope(track.slice(1, -1)))
    .filter((s) => s < -2);
  if (speeds.length === 0)
    throw new Error('no planted foot found: is the figure walking on the spot?');
  // The figure creeps a little on its treadmill; the anchor follows that line,
  // and the ground moves under it at the sum of the two.
  const inLoop = frames.slice(loop.s, loop.e + 1);
  const creep = slope(inLoop.map((f) => f.cx));
  const cx0 = inLoop.reduce((a, f) => a + f.cx, 0) / inLoop.length - (creep * length) / 2;
  const speed = -median(speeds) + creep;

  const scale = FIGURE_H / figure;
  const cells = [];
  const spreads = [];
  for (let i = 0; i < FRAMES; i += 1) {
    const at = (i * length) / FRAMES;
    const f = frames[loop.s + Math.round(at)];
    const pad = 600;
    const boxW = Math.round(cellW / scale);
    const boxH = Math.round(CELL_H / scale);
    const left = Math.round(cx0 + creep * at - (centre * cellW) / scale) + pad;
    const top = Math.round(ground + (CELL_H - SOLE_Y) / scale - boxH) + pad;
    // Padded first, in its own pass: sharp extracts before it extends.
    const padded = await sharp(f.data, { raw: { width: f.W, height: f.H, channels: 4 } })
      .extend({
        top: pad,
        bottom: pad,
        left: pad,
        right: pad,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .raw()
      .toBuffer({ resolveWithObject: true });
    const cell = await sharp(padded.data, { raw: padded.info })
      .extract({ left, top, width: boxW, height: boxH })
      .resize(cellW, CELL_H, { kernel: 'lanczos3' })
      .png()
      .toBuffer();
    cells.push({ input: cell, left: i * cellW, top: 0 });
    spreads.push(legSpan(f, cx0 + creep * at, ground, figure));
  }
  await mkdir(OUT, { recursive: true });
  await sharp({
    create: {
      width: cellW * FRAMES,
      height: CELL_H,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(cells)
    .webp({ quality: 84, alphaQuality: 88, effort: 6 })
    .toFile(path.join(OUT, `${id}.webp`));

  const metaFile = path.join(OUT, 'walk.json');
  let meta = {};
  try {
    meta = JSON.parse(readFileSync(metaFile, 'utf8'));
  } catch {
    // The first strip.
  }
  meta[id] = {
    frames: FRAMES,
    wide,
    centre,
    /** Ground covered in one loop of the strip, in figure heights. */
    stride: +((speed * length) / figure).toFixed(3),
    /** The frame with the feet closest together: who he is when he stops. */
    still: spreads.indexOf(Math.min(...spreads)),
    clip: { frames: frames.length, loop: [loop.s, loop.e], creepPerFrame: +creep.toFixed(2) },
  };
  const sorted = Object.fromEntries(Object.entries(meta).sort(([a], [b]) => a.localeCompare(b)));
  // In the project's own style: CI checks the formatting of every file.
  writeFileSync(
    metaFile,
    await prettier.format(JSON.stringify(sorted), {
      ...(await prettier.resolveConfig(metaFile)),
      filepath: metaFile,
    }),
  );
  console.log(id, JSON.stringify(meta[id]));
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
