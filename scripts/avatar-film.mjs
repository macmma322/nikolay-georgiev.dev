/**
 * Cuts a filmed clip of the avatar (on flat green) into a cameo strip.
 *
 * usage: node scripts/avatar-film.mjs <clip> <video.mp4> [--from n] [--to n] [--fps n]
 *
 * The new strip keeps the framing of the drawing it replaces in public/avatar:
 * the first filmed frame is scaled and placed so the figure covers the same box
 * as that drawing's first cell, so the contacts in clips.ts (feet, seat, elbow)
 * still hold. Writes public/avatar/<clip>.webp and prints the frame count and
 * how well the last frame meets the first (for looping).
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import sharp from 'sharp';

const [clip, video, ...flags] = process.argv.slice(2);
if (!clip || !video) {
  console.error(
    'usage: node scripts/avatar-film.mjs <clip> <video.mp4> [--from n] [--to n] [--fps n]',
  );
  process.exit(1);
}
const flag = (name, fallback) =>
  flags.includes(name) ? Number(flags[flags.indexOf(name) + 1]) : fallback;
const fps = flag('--fps', 16);
const RES = 1.3; // the strip is drawn a little larger than the old drawings, for sharp screens
const MAX_W = 16000; // WebP's own limit is 16383

const target = path.join('public/avatar', `${clip}.webp`);
// The drawing being replaced, as committed (the file on disk may already be film).
const original = execFileSync('git', ['show', `HEAD:public/avatar/${clip}.webp`], {
  maxBuffer: 1 << 26,
});
const oldMeta = await sharp(original).metadata();
const OLD = {
  clips: { walk: 8, turn: 4, 'lean-phone': 5, phone: 4, listen: 5, typing: 4, inspect: 4 },
};
const oldFrames = OLD.clips[clip];
const cellW0 = oldMeta.width / oldFrames;
const cellH0 = oldMeta.height;

/** The opaque box of the first cell of the old drawing. */
async function oldBox() {
  const { data, info } = await sharp(original)
    .extract({ left: 0, top: 0, width: Math.floor(cellW0), height: cellH0 })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return box(data, info.width, info.height);
}

function box(data, W, H) {
  let minX = W,
    maxX = -1,
    minY = H,
    maxY = -1;
  for (let y = 0; y < H; y += 1)
    for (let x = 0; x < W; x += 1)
      if (data[(y * W + x) * 4 + 3] > 100) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
  return { minX, maxX, minY, maxY };
}

const smooth = (lo, hi, v) => {
  const t = Math.min(1, Math.max(0, (v - lo) / (hi - lo)));
  return t * t * (3 - 2 * t);
};

/** Keys one frame against its own green, measured along the top edge. */
async function key(file) {
  const { data, info } = await sharp(file)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const W = info.width,
    H = info.height;
  const edge = [];
  for (let y = 0; y < 10; y += 1)
    for (let x = 0; x < W; x += 6) {
      const i = (y * W + x) * 4;
      edge.push(data[i + 1] - Math.max(data[i], data[i + 2]));
    }
  edge.sort((a, b) => a - b);
  const bg = Math.max(20, edge[edge.length >> 1]);
  const alpha = new Uint8Array(W * H);
  for (let p = 0, i = 0; p < W * H; p += 1, i += 4) {
    const k = data[i + 1] - Math.max(data[i], data[i + 2]);
    alpha[p] = Math.round((1 - smooth(0.12 * bg, 0.55 * bg, k)) * 255);
    if (k > 0) data[i + 1] = Math.max(data[i], data[i + 2]);
  }
  // Pull the edge in by a pixel: green fringes read as a halo on dark pages.
  for (let y = 1; y < H - 1; y += 1)
    for (let x = 1; x < W - 1; x += 1) {
      const p = y * W + x;
      data[p * 4 + 3] = Math.min(alpha[p], alpha[p - 1], alpha[p + 1], alpha[p - W], alpha[p + W]);
    }
  // The encoder leaves a line along the frame edges: nothing there is the figure.
  for (let y = 0; y < H; y += 1)
    for (let x = 0; x < W; x += 1)
      if (y < 3 || y >= H - 3 || x < 3 || x >= W - 3) data[(y * W + x) * 4 + 3] = 0;
  return { data, W, H };
}

const dir = mkdtempSync(path.join(tmpdir(), 'avatar-film-'));
try {
  execFileSync('ffmpeg', [
    '-v',
    'error',
    '-i',
    video,
    '-vf',
    `fps=${fps}`,
    path.join(dir, 'f%03d.png'),
  ]);
  const all = readdirSync(dir)
    .filter((f) => f.endsWith('.png'))
    .sort();
  const from = flag('--from', 0);
  const to = flag('--to', all.length - 1);
  const files = all.slice(from, to + 1);

  const target0 = await oldBox();
  const first = await key(path.join(dir, files[0]));
  const b0 = box(first.data, first.W, first.H);
  const scale = ((target0.maxY - target0.minY) / (b0.maxY - b0.minY)) * RES;
  // Film is wider than the drawings (arms, elbows): build wide cells, then trim
  // them evenly to the widest frame. The runtime centres a cell, so even padding
  // moves nothing.
  const baseW = cellW0 * RES;
  const cellW = Math.round(baseW * 1.8);
  const cellH = Math.round(cellH0 * RES);
  const pad = (cellW - baseW) / 2;
  // Where the first filmed figure's box lands in the new cell.
  const left = Math.round(
    pad + ((target0.minX + target0.maxX) / 2) * RES - ((b0.minX + b0.maxX) / 2) * scale,
  );
  const top = Math.round(target0.maxY * RES - b0.maxY * scale);

  let frames = files.length;
  const step = 1;
  const picked = files.filter((_, i) => i % step === 0);
  frames = picked.length;

  const cells = [];
  const masks = [];
  for (const file of picked) {
    const f = await key(path.join(dir, file));
    // The part of the frame that lands inside the cell, clamped to the frame.
    const sx = Math.max(0, Math.floor(-left / scale));
    const sy = Math.max(0, Math.floor(-top / scale));
    const ex = Math.min(f.W, Math.ceil((cellW - left) / scale));
    const ey = Math.min(f.H, Math.ceil((cellH - top) / scale));
    const dx = Math.round(left + sx * scale);
    const dy = Math.round(top + sy * scale);
    const w = Math.min(cellW - dx, Math.round((ex - sx) * scale));
    const h = Math.min(cellH - dy, Math.round((ey - sy) * scale));
    const part = await sharp(f.data, { raw: { width: f.W, height: f.H, channels: 4 } })
      .extract({ left: sx, top: sy, width: ex - sx, height: ey - sy })
      .resize({ width: w, height: h, fit: 'fill' })
      .png()
      .toBuffer();
    const cell = await sharp({
      create: {
        width: cellW,
        height: cellH,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([{ input: part, left: dx, top: dy }])
      .png()
      .toBuffer();
    cells.push(cell);
    masks.push(
      await sharp(cell).resize(48, 48, { fit: 'fill' }).extractChannel(3).raw().toBuffer(),
    );
  }

  // The widest any frame reaches from the centre, both ways.
  let reach = baseW / 2;
  for (const cell of cells) {
    const { data } = await sharp(cell).raw().toBuffer({ resolveWithObject: true });
    for (let x = 0; x < cellW; x += 1) {
      // A column belongs to the figure when a few pixels in it are solid, not faint.
      let solid = 0;
      for (let y = 0; y < cellH; y += 1) if (data[(y * cellW + x) * 4 + 3] > 128) solid += 1;
      if (solid >= 4) reach = Math.max(reach, Math.abs(x + 0.5 - cellW / 2) + 2);
    }
  }
  const outW = Math.min(cellW, Math.ceil(reach) * 2);
  const cut = Math.floor((cellW - outW) / 2);
  const trimmed = await Promise.all(
    cells.map((c) =>
      sharp(c).extract({ left: cut, top: 0, width: outW, height: cellH }).png().toBuffer(),
    ),
  );
  if (outW * frames > MAX_W) throw new Error(`strip too wide: ${outW * frames}px; lower --fps`);

  await sharp({
    create: {
      width: outW * frames,
      height: cellH,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(trimmed.map((input, i) => ({ input, left: i * outW, top: 0 })))
    .webp({ quality: 82, alphaQuality: 90, effort: 6 })
    .toFile(target);

  // How far each frame's silhouette is from the first: a good loop end is low.
  const diff = (a, b) => a.reduce((s, v, i) => s + Math.abs(v - b[i]), 0) / a.length / 255;
  const close = masks.map((m) => +diff(m, masks[0]).toFixed(3));
  const best = close
    .slice(Math.floor(frames * 0.5))
    .reduce((acc, v, i) => (v < acc.v ? { v, i: i + Math.floor(frames * 0.5) } : acc), {
      v: Infinity,
      i: frames - 1,
    });
  const { size } = await sharp(target)
    .metadata()
    .then(() => import('node:fs').then((fs) => fs.statSync(target)));
  console.log(
    JSON.stringify({
      clip,
      frames,
      fps: fps / step,
      cell: [outW, cellH],
      kb: Math.round(size / 1024),
      last: close.at(-1),
      bestLoopEnd: best,
    }),
  );
} finally {
  rmSync(dir, { recursive: true, force: true });
}
