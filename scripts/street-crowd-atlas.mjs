/**
 * Builds the photorealistic nighttime street backdrop and animated crowd sprite atlases
 * for Living World V3.1:
 *   public/street/crowd-near.webp        (the front-lane people again, at 2.5x)
 *   public/street/crowd-core.webp        (8 core characters x 20 articulated frames)
 *   public/street/crowd-city.webp        (8 additional city characters x 20 articulated frames)
 *   src/scripts/street/crowd-atlas.ts    (typed frame & atlas metadata imported at build time)
 *
 * Frame layout (FRAMES = 20):
 *   0..15 : 16-frame anatomical walk cycle (hip + knee hinge + ankle pitch + arm counter-swing)
 *   16..17: 2-frame idle breathing & subtle weight shift
 *   18    : start / stop transition stride
 *   19    : contextual interaction / glance pose
 *
 * Usage: node scripts/street-crowd-atlas.mjs
 */
import sharp from 'sharp';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SRC_DIR = path.join(ROOT, 'src/assets/media/street/crowd-src');
const OUT_DIR = path.join(ROOT, 'public/street');
const META_OUT = path.join(ROOT, 'src/scripts/street/crowd-atlas.ts');
/**
 * People filmed walking (scripts/street-walk-strip.mjs): sixteen walk frames
 * each, in the near tier's cell. Anyone listed here is built from the film and
 * skips the rig below, whatever its spec says.
 */
const WALK_DIR = path.join(ROOT, 'src/assets/media/street/crowd-walk');
const WALK = JSON.parse(await readFile(path.join(WALK_DIR, 'walk.json'), 'utf8').catch(() => '{}'));
const FRAMES = 20;
const CELL_H = 152;
const TAU = Math.PI * 2;

await mkdir(OUT_DIR, { recursive: true });

// ---------- Math & Image Helpers ----------
const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const smoothstep = (e0, e1, x) => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};

async function loadRaw(file) {
  const { data, info } = await sharp(path.join(SRC_DIR, file))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data: new Uint8Array(data), width: info.width, height: info.height };
}

/**
 * Strips baked floor shadow underneath shoes (dark pixels with partial alpha near bottom),
 * while preserving 100% of solid soles and edges.
 */
function cleanCutout(img) {
  const { data, width, height } = img;
  let maxSolidY = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const lum = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
      if (data[i + 3] > 180 && lum > 22) maxSolidY = y;
    }
  }
  for (let y = Math.max(0, maxSolidY - 10); y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const a = data[i + 3];
      const lum = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
      if (a < 155 && lum < 55) {
        data[i + 3] = y > maxSolidY + 2 ? 0 : Math.round(a * smoothstep(32, 155, a));
      } else if (y > maxSolidY + 3) {
        data[i + 3] = 0;
      }
    }
  }
  return img;
}

function measureBounds(img, threshold = 85) {
  const { data, width, height } = img;
  let minX = width;
  let maxX = 0;
  let minY = height;
  let maxY = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > threshold) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  return { minX, minY, maxX, maxY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

/** Finds the horizontal split between rear and front legs near knee/shin height. */
function findLegSplitX(img, bounds, xRange) {
  const { data, width } = img;
  const loX = xRange ? Math.max(bounds.minX, xRange[0]) : bounds.minX;
  const hiX = xRange ? Math.min(bounds.maxX, xRange[1]) : bounds.maxX;
  for (const ratio of [0.8, 0.87, 0.74]) {
    const checkY = Math.round(bounds.minY + bounds.h * ratio);
    const segs = [];
    let inSeg = false;
    let s0 = 0;
    for (let x = loX; x <= hiX; x++) {
      const fg = data[(checkY * width + x) * 4 + 3] > 105;
      if (fg && !inSeg) {
        inSeg = true;
        s0 = x;
      } else if (!fg && inSeg) {
        inSeg = false;
        if (x - s0 > 5) segs.push([s0, x - 1]);
      }
    }
    if (inSeg && hiX - s0 > 5) segs.push([s0, hiX]);
    if (segs.length >= 2) {
      return Math.round((segs[0][1] + segs[1][0]) * 0.5);
    }
    if (segs.length === 1 && ratio === 0.87) {
      return Math.round((segs[0][0] + segs[0][1]) * 0.48);
    }
  }
  return Math.round((loX + hiX) * 0.5);
}

/** Bilinear RGBA sample with bounds guard. */
function sampleBilinear(img, sx, sy, out, outOff) {
  const { data, width, height } = img;
  if (sx < 0 || sy < 0 || sx >= width - 1 || sy >= height - 1) return;
  const x0 = sx | 0;
  const y0 = sy | 0;
  const fx = sx - x0;
  const fy = sy - y0;
  const w00 = (1 - fx) * (1 - fy);
  const w10 = fx * (1 - fy);
  const w01 = (1 - fx) * fy;
  const w11 = fx * fy;
  const i00 = (y0 * width + x0) * 4;
  const i10 = i00 + 4;
  const i01 = i00 + width * 4;
  const i11 = i01 + 4;
  const a = data[i00 + 3] * w00 + data[i10 + 3] * w10 + data[i01 + 3] * w01 + data[i11 + 3] * w11;
  if (a < 1) return;
  const r =
    (data[i00] * data[i00 + 3] * w00 +
      data[i10] * data[i10 + 3] * w10 +
      data[i01] * data[i01 + 3] * w01 +
      data[i11] * data[i11 + 3] * w11) /
    a;
  const g =
    (data[i00 + 1] * data[i00 + 3] * w00 +
      data[i10 + 1] * data[i10 + 3] * w10 +
      data[i01 + 1] * data[i01 + 3] * w01 +
      data[i11 + 1] * data[i11 + 3] * w11) /
    a;
  const b =
    (data[i00 + 2] * data[i00 + 3] * w00 +
      data[i10 + 2] * data[i10 + 3] * w10 +
      data[i01 + 2] * data[i01 + 3] * w01 +
      data[i11 + 2] * data[i11 + 3] * w11) /
    a;
  out[outOff] = r | 0;
  out[outOff + 1] = g | 0;
  out[outOff + 2] = b | 0;
  out[outOff + 3] = a | 0;
}

function blendOver(dst, off, r, g, b, a) {
  if (a <= 0) return;
  const sa = a / 255;
  const da = dst[off + 3] / 255;
  const outA = sa + da * (1 - sa);
  if (outA < 0.001) return;
  dst[off] = Math.round((r * sa + dst[off] * da * (1 - sa)) / outA);
  dst[off + 1] = Math.round((g * sa + dst[off + 1] * da * (1 - sa)) / outA);
  dst[off + 2] = Math.round((b * sa + dst[off + 2] * da * (1 - sa)) / outA);
  dst[off + 3] = Math.round(outA * 255);
}

/** Draw anti-aliased line segment onto an RGBA buffer. */
function drawSegment(buf, w, h, x0, y0, x1, y1, radius, r, g, b, alpha) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy);
  if (len < 0.25) return;
  const steps = Math.max(2, Math.ceil(len * 2));
  const r2 = radius + 0.85;
  for (let s = 0; s <= steps; s++) {
    const px = x0 + (dx * s) / steps;
    const py = y0 + (dy * s) / steps;
    const xMin = Math.max(0, Math.floor(px - r2));
    const xMax = Math.min(w - 1, Math.ceil(px + r2));
    const yMin = Math.max(0, Math.floor(py - r2));
    const yMax = Math.min(h - 1, Math.ceil(py + r2));
    for (let y = yMin; y <= yMax; y++) {
      for (let x = xMin; x <= xMax; x++) {
        const d = Math.hypot(x - px, y - py);
        if (d < r2) {
          const cov = clamp(1 - (d - Math.max(0, radius - 0.5)) / 1.35, 0, 1);
          blendOver(buf, (y * w + x) * 4, r, g, b, Math.round(alpha * cov));
        }
      }
    }
  }
}

/**
 * Harmonizes garments toward nighttime warm/cool street illumination while leaving
 * skin, hair, and detailed shading intact.
 */
function gradeClothing(img, opts) {
  const { data, width, height } = img;
  const out = { data: new Uint8Array(data), width, height };
  const d = out.data;
  for (let y = 0; y < height; y++) {
    const ny = y / height;
    for (let x = 0; x < width; x++) {
      const nx = x / width;
      const i = (y * width + x) * 4;
      if (d[i + 3] < 8) continue;
      let r = d[i];
      let g = d[i + 1];
      let b = d[i + 2];
      // Evening street warmth harmonization
      r = clamp(r * 0.99 + 4, 0, 255);
      g = clamp(g * 0.97 + 2, 0, 255);
      b = clamp(b * 0.97 + 1, 0, 255);

      if (opts?.coatTint && ny > (opts.topY ?? 0.16) && ny < (opts.botY ?? 0.65)) {
        const lum = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
        const maxC = Math.max(r, g, b);
        const sat = maxC > 0 ? (maxC - Math.min(r, g, b)) / maxC : 0;
        const mixY =
          smoothstep(opts.topY ?? 0.16, (opts.topY ?? 0.16) + 0.05, ny) *
          (1 - smoothstep((opts.botY ?? 0.65) - 0.06, opts.botY ?? 0.65, ny));
        const matchNeutral = opts.onlyNeutral ? sat < 0.36 : true;
        const isSkin = r > g * 1.18 && g > b * 1.15 && lum > 0.38 && sat > 0.22;
        if (mixY > 0.01 && matchNeutral && !isSkin) {
          const [tr, tg, tb, mixBase] = opts.coatTint;
          const mix = mixBase * mixY;
          r = r * (1 - mix) + clamp(tr * (0.44 + lum * 0.98), 0, 255) * mix;
          g = g * (1 - mix) + clamp(tg * (0.44 + lum * 0.98), 0, 255) * mix;
          b = b * (1 - mix) + clamp(tb * (0.44 + lum * 0.98), 0, 255) * mix;
        }
      }
      if (opts?.hivisCoat && ny > 0.18 && ny < 0.52) {
        const lum = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
        const maxC = Math.max(r, g, b);
        const sat = maxC > 0 ? (maxC - Math.min(r, g, b)) / maxC : 0;
        const isSkin = r > g * 1.18 && g > b * 1.15 && lum > 0.38 && sat > 0.22;
        const mixVest =
          smoothstep(0.24, 0.36, nx) *
          (1 - smoothstep(0.66, 0.78, nx)) *
          smoothstep(0.18, 0.24, ny) *
          (1 - smoothstep(0.45, 0.52, ny));
        if (mixVest > 0.02 && !isSkin && lum > 0.06 && sat < 0.48) {
          const isStripe = ny > 0.365 && ny < 0.388;
          const shade = 0.54 + lum * 1.12;
          const tr = isStripe ? 214 * shade : 194 * shade;
          const tg = isStripe ? 220 * shade : 206 * shade;
          const tb = isStripe ? 210 * shade : 46 * shade;
          const mix = 0.78 * mixVest;
          r = r * (1 - mix) + clamp(tr, 0, 255) * mix;
          g = g * (1 - mix) + clamp(tg, 0, 255) * mix;
          b = b * (1 - mix) + clamp(tb, 0, 255) * mix;
        }
      }
      d[i] = clamp(Math.round(r), 0, 255);
      d[i + 1] = clamp(Math.round(g), 0, 255);
      d[i + 2] = clamp(Math.round(b), 0, 255);
    }
  }
  return out;
}

function maskRegion(img, predicate) {
  const { data, width, height } = img;
  const out = { data: new Uint8Array(data), width, height };
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const m = predicate(x, y, x / width, y / height);
      if (m > 0) {
        const i = (y * width + x) * 4;
        out.data[i + 3] = Math.round(out.data[i + 3] * clamp(1 - m, 0, 1));
      }
    }
  }
  return out;
}

function reframeCanvas(img, cropLeft, targetW, padLeft = 0) {
  const out = new Uint8Array(targetW * img.height * 4);
  for (let y = 0; y < img.height; y++) {
    for (let dx = 0; dx < targetW; dx++) {
      const sx = dx - padLeft + cropLeft;
      if (sx < 0 || sx >= img.width) continue;
      const si = (y * img.width + sx) * 4;
      const di = (y * targetW + dx) * 4;
      out[di] = img.data[si];
      out[di + 1] = img.data[si + 1];
      out[di + 2] = img.data[si + 2];
      out[di + 3] = img.data[si + 3];
    }
  }
  return { data: out, width: targetW, height: img.height };
}

async function renderSvgOverlay(svgString, width, height) {
  const { data, info } = await sharp(Buffer.from(svgString))
    .resize(width, height, { fit: 'fill' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data: new Uint8Array(data), width: info.width, height: info.height };
}

function stampOverlay(base, overlay, offsetX = 0, offsetY = 0) {
  for (let y = 0; y < overlay.height; y++) {
    const dy = y + offsetY;
    if (dy < 0 || dy >= base.height) continue;
    for (let x = 0; x < overlay.width; x++) {
      const dx = x + offsetX;
      if (dx < 0 || dx >= base.width) continue;
      const si = (y * overlay.width + x) * 4;
      const di = (dy * base.width + dx) * 4;
      blendOver(
        base.data,
        di,
        overlay.data[si],
        overlay.data[si + 1],
        overlay.data[si + 2],
        overlay.data[si + 3],
      );
    }
  }
  return base;
}

/**
 * Articulates a segmented human (+ optional dog/robot companion, bicycle wheels, cane, arm swing)
 * across 20 distinct frames:
 *   0..15 : 16-frame anatomical walk cycle with knee flexion, ankle pitch & arm swing
 *   16..17: 2-frame idle breathing & subtle posture shift
 *   18    : start / stop transition stride
 *   19    : contextual interaction / glance pose
 */
/**
 * Rigs one character. `K` scales the cell: the rig works in the source image,
 * so a larger cell is simply sampled finer. `pick` keeps only some frames.
 */
async function synthesizeCharacterStrip(spec, K = 1, pick = null) {
  if (WALK[spec.id]) return fromWalkStrip(spec.id, WALK[spec.id], K, pick);
  const {
    id,
    primary,
    wide,
    companionType,
    companionGapX,
    companionMaxX,
    bikeMode,
    bikeCorridor,
    wheels,
    caneX,
    hipRatio,
    swingPx,
    modify,
  } = spec;
  let imgA = cleanCutout(await loadRaw(primary));
  if (modify) imgA = await modify(imgA);

  const boundsA = measureBounds(imgA, 95);
  const cellH = CELL_H * K;
  const targetH = 136 * K;
  const soleY = cellH - 6 * K;
  const scale = targetH / boundsA.h;
  const cellW = (wide ? 176 : 114) * K;

  const srcHumanMaxX = companionGapX ?? boundsA.maxX;
  const srcHumanBoundsMax = Math.min(boundsA.maxX, srcHumanMaxX);
  const srcCenterX = Math.round((boundsA.minX + srcHumanBoundsMax) * 0.5);
  const dstCenterX = Math.round(cellW * (companionType ? 0.31 : bikeMode ? 0.49 : 0.5));

  const splitX = findLegSplitX(imgA, boundsA, [boundsA.minX, srcHumanBoundsMax]);
  const hipY = boundsA.minY + boundsA.h * (hipRatio ?? 0.52);
  const kneeY = boundsA.minY + boundsA.h * Math.max(0.75, (hipRatio ?? 0.52) + 0.14);
  const ankleY = boundsA.minY + boundsA.h * 0.9;
  const shoulderY = boundsA.minY + boundsA.h * 0.25;
  const elbowY = boundsA.minY + boundsA.h * 0.42;
  const neckY = boundsA.minY + boundsA.h * 0.16;

  // Compute companion span for 4-beat paw segmentation
  const compMinX = companionGapX ? companionGapX + 4 : srcHumanMaxX;
  const compMaxX = companionMaxX ?? boundsA.maxX;
  const compSpan = Math.max(40, compMaxX - compMinX);
  const compTopY = boundsA.minY + boundsA.h * (companionType === 'robot' ? 0.68 : 0.62);
  const leashHandY = boundsA.minY + boundsA.h * 0.51;

  const maxSwingSrc = swingPx ?? (bikeMode ? 14 : companionType ? 19 : 23);
  const rawFrames = [];
  const tmpPixel = new Uint8Array(4);

  for (let f = 0; f < FRAMES; f++) {
    if (pick && !pick.includes(f)) continue;
    const isIdleA = f === 16;
    const isIdleB = f === 17;
    const isIdle = isIdleA || isIdleB;
    const isTransition = f === 18;
    const isInteract = f === 19;
    const isWalk = f < 16;

    const theta = isWalk ? (f / 16) * TAU : isTransition ? 0.35 : 0;
    const cosT = Math.cos(theta);
    const sinT = Math.sin(theta);

    // Biomechanical COM bounce: dips at double-support (theta = 0, pi), peaks at mid-stance (pi/2)
    const bobSrc = isIdleA
      ? 0.5
      : isIdleB
        ? -0.7
        : isInteract
          ? -1.8
          : isTransition
            ? -1.2
            : -Math.cos(theta * 2) * 3.8 + 1.2;

    const frontLeads = isIdle || isTransition || isInteract ? true : cosT >= 0;
    const frameData = new Uint8Array(cellW * cellH * 4);

    const toDstX = (sx) => (sx - srcCenterX) * scale + dstCenterX;
    const toDstY = (sy) => (sy - boundsA.maxY) * scale + soleY;

    for (let dy = 0; dy < cellH; dy++) {
      for (let dx = 0; dx < cellW; dx++) {
        const syBase = boundsA.maxY - (soleY - dy) / scale;
        const sxBase = srcCenterX + (dx - dstCenterX) / scale;
        const outOff = (dy * cellW + dx) * 4;

        // 1. Companion region (dog with 4-beat gait + tail wag, or J.A.R.V.I.S. quadruped bot)
        if (companionType && sxBase >= srcHumanMaxX - 6) {
          const compBlend = smoothstep(srcHumanMaxX - 6, srcHumanMaxX + 8, sxBase);
          const normX = clamp((sxBase - compMinX) / compSpan, 0, 1);
          const dogPawT = Math.pow(
            clamp((syBase - compTopY) / Math.max(1, boundsA.maxY - compTopY), 0, 1),
            1.25,
          );

          // 4-beat lateral gait phases across rear & front paw zones
          let zonePhase = theta;
          if (normX < 0.23)
            zonePhase = theta; // hind rear
          else if (normX < 0.48)
            zonePhase = theta + Math.PI; // hind front
          else if (normX < 0.74)
            zonePhase = theta + Math.PI * 0.5; // fore rear
          else zonePhase = theta + Math.PI * 1.5; // fore front

          const pawCos = Math.cos(zonePhase);
          const pawSin = Math.sin(zonePhase);
          const strideMul = isIdle ? 0 : isInteract ? 0.15 : isTransition ? 0.45 : 1;
          const pawShiftX = pawCos * 12 * dogPawT * compBlend * strideMul;
          const pawLiftY =
            !isIdle && pawSin > 0 ? Math.pow(pawSin, 0.9) * 8 * dogPawT * compBlend * strideMul : 0;

          // Subtle tail wag on idle/walk/interact & attentive head lift on interact
          const tailMask =
            (1 - smoothstep(compMinX + compSpan * 0.05, compMinX + compSpan * 0.24, sxBase)) *
            smoothstep(compTopY - 25, compTopY + 18, syBase);
          const tailWagY =
            Math.sin(isIdle ? (isIdleA ? 0.8 : 2.9) : isInteract ? 2.6 : theta * 2) *
            4.2 *
            tailMask;
          const headLift =
            isInteract && normX > 0.65 && syBase < compTopY + 25 ? -3.5 * compBlend : 0;
          const compBob =
            (isIdle ? (isIdleB ? -0.6 : 0.4) : -Math.cos(theta * 2) * 2.8) * compBlend;

          // Catenary leash preservation: interpolate hand pull to dog harness cleanly above compTopY
          const leashT = smoothstep(leashHandY - 6, compTopY + 6, syBase);
          tmpPixel.fill(0);
          sampleBilinear(
            imgA,
            sxBase - pawShiftX,
            syBase - (compBob - pawLiftY) * (0.35 + 0.65 * leashT) - tailWagY - headLift,
            tmpPixel,
            0,
          );
          if (tmpPixel[3] > 8) {
            blendOver(frameData, outOff, tmpPixel[0], tmpPixel[1], tmpPixel[2], tmpPixel[3]);
          }
          continue;
        }

        // 2. Grounded walking cane (pivots around ground contact tip during stance)
        if (caneX && sxBase > caneX - 10 && syBase > hipY - 12) {
          const caneYWeight = smoothstep(hipY - 12, hipY + 12, syBase);
          const tCane = clamp((syBase - hipY) / Math.max(1, boundsA.maxY - hipY), 0, 1);
          const stanceActive = cosT >= 0;
          const tipLift =
            isIdle || isInteract ? 0 : stanceActive ? 0 : Math.max(0, sinT) * 3.8 * tCane;
          const caneShift = isIdle
            ? -2.5 * tCane
            : isInteract
              ? -1.5
              : (cosT * 7 * (0.2 + 0.8 * tCane) - 4 * tCane) * (isTransition ? 0.5 : 1);
          tmpPixel.fill(0);
          sampleBilinear(imgA, sxBase - caneShift, syBase - bobSrc * 0.5 + tipLift, tmpPixel, 0);
          if (tmpPixel[3] > 8) {
            blendOver(
              frameData,
              outOff,
              tmpPixel[0],
              tmpPixel[1],
              tmpPixel[2],
              Math.round(tmpPixel[3] * caneYWeight),
            );
          }
        }

        // 3. Two-segment articulated leg evaluation (hip -> knee hinge -> ankle/foot pitch)
        if (syBase > hipY - 12) {
          const evalArticulatedLeg = (isFront) => {
            const legPhase = isFront ? theta : theta + Math.PI;
            const cL = Math.cos(legPhase);
            const sL = Math.sin(legPhase);

            const tHipKnee = smoothstep(hipY - 12, kneeY + 14, syBase);
            const tKneeSole = smoothstep(kneeY - 10, boundsA.maxY, syBase);
            const tFoot = smoothstep(ankleY - 6, boundsA.maxY, syBase);

            let thighTarget = cL;
            let kneeFlex = 0;
            let lift = 0;
            let footPitch = 0;

            if (isIdleA) {
              thighTarget = isFront ? 0.24 : -0.24;
            } else if (isIdleB) {
              thighTarget = isFront ? 0.2 : -0.2;
            } else if (isTransition) {
              thighTarget = isFront ? 0.54 : -0.54;
              kneeFlex = isFront ? 0 : -2.5;
            } else if (isInteract) {
              thighTarget = isFront ? 0.3 : -0.3;
            } else {
              // Walk cycle kinematics:
              thighTarget = cL;
              // Knee bends backward during swing/recovery (sL > 0) and reaches at heel strike (cL > 0.5)
              kneeFlex =
                sL > 0
                  ? -Math.pow(sL, 0.88) * (bikeMode ? 5.0 : 9.2)
                  : Math.max(0, cL - 0.45) * 3.8;
              lift = sL > 0 ? Math.pow(sL, 0.85) * (bikeMode ? 9.5 : 15.5) : 0;
              // Heel-strike dorsiflexion when reaching forward; toe-off push when trailing
              footPitch = cL > 0.35 ? -2.2 * (cL - 0.35) : cL < -0.4 ? -2.4 * (-cL - 0.4) : 0;
            }

            const baseOff = isFront ? 1 : -1;
            const shiftX = (thighTarget - baseOff) * maxSwingSrc * tHipKnee + kneeFlex * tKneeSole;
            const legX = sxBase - shiftX;
            const legY = syBase - (bobSrc * (1 - tHipKnee) - lift * tKneeSole - footPitch * tFoot);

            if (!bikeMode) {
              if (isFront && legX < splitX - 9) return;
              if (!isFront && legX > splitX + 9) return;
            }
            if (companionType && legX > srcHumanMaxX) return;
            if (caneX && legX > caneX - 8) return;

            tmpPixel.fill(0);
            sampleBilinear(imgA, legX, legY, tmpPixel, 0);
            if (tmpPixel[3] > 10) {
              const weight = smoothstep(hipY - 12, hipY + 12, syBase);
              blendOver(
                frameData,
                outOff,
                tmpPixel[0],
                tmpPixel[1],
                tmpPixel[2],
                Math.round(tmpPixel[3] * weight),
              );
            }
          };

          if (bikeMode) {
            const minCorr = boundsA.minX + (bikeCorridor ? bikeCorridor[0] : 138);
            const maxCorr = boundsA.minX + (bikeCorridor ? bikeCorridor[1] : 315);
            if (sxBase < minCorr || sxBase > maxCorr) {
              const bikeBob = isIdle ? 0 : Math.sin(theta * 2) * 1.1;
              tmpPixel.fill(0);
              sampleBilinear(imgA, sxBase, syBase - bikeBob, tmpPixel, 0);
              if (tmpPixel[3] > 10) {
                blendOver(frameData, outOff, tmpPixel[0], tmpPixel[1], tmpPixel[2], tmpPixel[3]);
              }
            } else {
              evalArticulatedLeg(false);
              evalArticulatedLeg(true);
            }
          } else if (frontLeads) {
            evalArticulatedLeg(false);
            evalArticulatedLeg(true);
          } else {
            evalArticulatedLeg(true);
            evalArticulatedLeg(false);
          }
        }

        // 4. Upper Torso, Counter-Phase Arm Swing, Head & Props
        const torsoMask = 1 - smoothstep(hipY - 12, hipY + 12, syBase);
        if (torsoMask > 0.01) {
          const headFactor = 1 - smoothstep(neckY - 6, neckY + 16, syBase);
          const headNodX = isInteract
            ? -2.8 * headFactor
            : isIdleB
              ? 1.0 * headFactor
              : isIdleA
                ? -0.4 * headFactor
                : Math.sin(theta) * 1.2 * headFactor;
          const headNodY = isInteract ? -2.2 * headFactor : isIdleB ? -0.9 * headFactor : 0;
          const leanFactor = clamp((hipY - syBase) / Math.max(1, hipY - boundsA.minY), 0, 1);
          const torsoLean = isIdle
            ? (isIdleB ? -0.6 : 0.4) * leanFactor
            : isTransition
              ? 1.8 * leanFactor
              : Math.sin(theta * 2) * 1.8 * leanFactor;

          // Localized subtle counter-phase arm swing across mid-torso sleeve region
          let armSwingX = 0;
          if (!bikeMode && isWalk) {
            const armBandY =
              smoothstep(shoulderY, elbowY, syBase) * (1 - smoothstep(hipY - 18, hipY + 6, syBase));
            const nearCenter = smoothstep(
              srcCenterX - boundsA.w * 0.06,
              srcCenterX + boundsA.w * 0.22,
              sxBase,
            );
            armSwingX = -cosT * 4.5 * armBandY * nearCenter;
          }

          tmpPixel.fill(0);
          sampleBilinear(
            imgA,
            sxBase - torsoLean - headNodX - armSwingX,
            syBase - bobSrc * (1 - 0.1 * leanFactor) - headNodY,
            tmpPixel,
            0,
          );
          if (tmpPixel[3] > 8) {
            blendOver(
              frameData,
              outOff,
              tmpPixel[0],
              tmpPixel[1],
              tmpPixel[2],
              Math.round(tmpPixel[3] * torsoMask),
            );
          }
        }
      }
    }

    // 5. Subtle distance-consistent spoked bicycle wheel rotation overlay on walk frames
    if (bikeMode && wheels) {
      const rotAngle = isIdleA || isIdleB || isInteract ? 0 : isTransition ? 0.22 : (f / 16) * TAU;
      const minCorrDst = toDstX(boundsA.minX + (bikeCorridor ? bikeCorridor[0] : 138));
      const maxCorrDst = toDstX(boundsA.minX + (bikeCorridor ? bikeCorridor[1] : 315));
      for (const wh of wheels) {
        const cx = toDstX(boundsA.minX + boundsA.w * wh.rx);
        const cy = toDstY(boundsA.maxY - boundsA.h * wh.ry);
        const rad = boundsA.h * wh.rr * scale * 0.82;
        const spokeCount = 8;
        for (let s = 0; s < spokeCount; s++) {
          const ang = rotAngle + (s * TAU) / spokeCount;
          const x1 = cx + Math.cos(ang) * rad;
          const y1 = cy + Math.sin(ang) * rad;
          // Draw spoke slightly behind rider's lower leg corridor
          const sxMid = (cx + x1) * 0.5;
          if (sxMid > minCorrDst && sxMid < maxCorrDst) continue;
          const isPrimary = s % 2 === 0;
          const col = isPrimary ? 158 : 122;
          const alp = isPrimary ? 88 : 54;
          drawSegment(
            frameData,
            cellW,
            cellH,
            cx,
            cy,
            x1,
            y1,
            0.34 * K,
            col,
            col + 6,
            col + 12,
            alp,
          );
        }
        // Subtle rotating rim reflector glint showing exact angular travel
        const glintAng = rotAngle + 0.4;
        const gx0 = cx + Math.cos(glintAng) * (rad * 0.74);
        const gy0 = cy + Math.sin(glintAng) * (rad * 0.74);
        const gx1 = cx + Math.cos(glintAng) * (rad * 0.94);
        const gy1 = cy + Math.sin(glintAng) * (rad * 0.94);
        if (!(gx1 > minCorrDst && gx1 < maxCorrDst)) {
          drawSegment(frameData, cellW, cellH, gx0, gy0, gx1, gy1, 0.65 * K, 245, 198, 122, 165);
        }
      }
    }

    const buf = await sharp(frameData, { raw: { width: cellW, height: cellH, channels: 4 } })
      .png()
      .toBuffer();
    rawFrames.push(buf);
  }

  return {
    id,
    cellW,
    cellH,
    soleY,
    headTopRatio: +(1 - (targetH + 6 * K) / cellH).toFixed(3),
    frames: rawFrames,
  };
}

// ---------- Build Derived Prop Overlays (SVG -> Shaded Raster) ----------
/**
 * A character from film. Frames 0..15 are the strip; the four still frames are
 * the one where the feet are together, and a moment after it for the
 * transition, so stopping does not jump back to a mid-stride photograph.
 */
async function fromWalkStrip(id, walk, K, pick) {
  const cellH = CELL_H * K;
  const cellW = (walk.wide ? 176 : 114) * K;
  const { data, info } = await sharp(path.join(WALK_DIR, `${id}.webp`))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const strip = gradeClothing({
    data: new Uint8Array(data),
    width: info.width,
    height: info.height,
  });
  const srcW = info.width / walk.frames;
  const frames = [];
  for (let f = 0; f < FRAMES; f++) {
    if (pick && !pick.includes(f)) continue;
    const from = f < 16 ? f : f === 18 ? (walk.still + 2) % 16 : walk.still;
    frames.push(
      await sharp(strip.data, { raw: { width: strip.width, height: strip.height, channels: 4 } })
        .extract({ left: from * srcW, top: 0, width: srcW, height: info.height })
        .resize(cellW, cellH, { kernel: 'lanczos3' })
        .png()
        .toBuffer(),
    );
  }
  return {
    id,
    cellW,
    cellH,
    soleY: cellH - 6 * K,
    headTopRatio: +(1 - (142 * K) / cellH).toFixed(3),
    stride: walk.stride,
    frames,
  };
}

async function buildProps() {
  // Fishing rod top extension & amber tip glow (KOBAIT) in 212x512 canvas
  const anglerRodTipSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="212" height="512" viewBox="0 0 212 512">
    <line x1="173" y1="90" x2="176" y2="6" stroke="#22303c" stroke-width="2.5" stroke-linecap="round"/>
    <circle cx="176" cy="6" r="2.8" fill="#47d4aa"/>
  </svg>`;

  // 3D-printer filament spool held in maker pose (Stemini) in 191x512 canvas
  const makerSpoolSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="191" height="512" viewBox="0 0 191 512">
    <g transform="translate(132 198)">
      <ellipse cx="0" cy="0" rx="18" ry="18" fill="#181c22" stroke="#e58958" stroke-width="2.8"/>
      <ellipse cx="0" cy="0" rx="11" ry="11" fill="none" stroke="#c8683a" stroke-width="4.5"/>
      <circle cx="0" cy="0" r="5" fill="#0d1014" stroke="#6c7a89" stroke-width="1.5"/>
    </g>
  </svg>`;

  // DSLR camera + strap (Photographer) in 410x512 canvas
  const cameraSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="410" height="512" viewBox="0 0 410 512">
    <path d="M210 108 C236 145, 260 170, 280 196" fill="none" stroke="#181a1f" stroke-width="6"/>
    <rect x="256" y="182" width="40" height="27" rx="4" fill="#1c2026" stroke="#4f5663" stroke-width="2"/>
    <rect x="294" y="186" width="20" height="19" rx="3" fill="#272c35" stroke="#111317" stroke-width="2"/>
    <circle cx="314" cy="195" r="6" fill="#68b6ff" opacity="0.72"/>
  </svg>`;

  // Bike LED headlight cone & red taillight beam (382x512 matching concept-cyclist-f)
  const femaleBikeLightsSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="382" height="512" viewBox="0 0 382 512">
    <defs>
      <linearGradient id="beamF" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#ffe7a6" stop-opacity="0.75"/>
        <stop offset="1" stop-color="#ffe7a6" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <polygon points="292,265 382,250 382,306" fill="url(#beamF)"/>
    <circle cx="292" cy="268" r="5" fill="#fff6d1"/>
    <circle cx="62" cy="272" r="4.5" fill="#ff4d3b" opacity="0.88"/>
  </svg>`;

  // Takeaway coffee cup for solo commuter (420x512)
  const coffeeSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="420" height="512" viewBox="0 0 420 512">
    <g transform="translate(274 268)">
      <polygon points="0,4 18,4 15,28 3,28" fill="#d9cbb8" stroke="#1e1b18" stroke-width="1.8"/>
      <rect x="-1" y="0" width="20" height="5" rx="1.5" fill="#24201d"/>
      <rect x="2" y="12" width="14" height="8" fill="#7c5636"/>
    </g>
  </svg>`;

  return {
    anglerRodTip: await renderSvgOverlay(anglerRodTipSvg, 212, 512),
    makerSpool: await renderSvgOverlay(makerSpoolSvg, 191, 512),
    camera: await renderSvgOverlay(cameraSvg, 410, 512),
    femaleBikeLights: await renderSvgOverlay(femaleBikeLightsSvg, 382, 512),
    coffee: await renderSvgOverlay(coffeeSvg, 420, 512),
  };
}

const props = await buildProps();

// ---------- Define 16 Genuinely Distinct Base Human Identities ----------
const CORE_SPECS = [
  {
    id: 'traveller',
    primary: 'traveller.webp',
    wide: true,
    bikeMode: true,
    wheels: [
      { rx: 0.195, ry: 0.195, rr: 0.185 },
      { rx: 0.805, ry: 0.195, rr: 0.185 },
    ],
    modify: (img) =>
      gradeClothing(img, {
        coatTint: [78, 108, 66, 0.36],
        onlyNeutral: true,
        topY: 0.16,
        botY: 0.48,
      }),
  },
  {
    id: 'trainee',
    primary: 'concept-trainee-f.webp',
    modify: (img) => gradeClothing(img),
  },
  {
    id: 'companion',
    primary: 'concept-companion.webp',
    wide: true,
    companionType: 'robot',
    companionGapX: 142,
    companionMaxX: 258,
    swingPx: 14,
    modify: (img) => gradeClothing(img),
  },
  {
    id: 'courier',
    primary: 'courier-a.webp',
    modify: (img) => gradeClothing(img),
  },
  {
    id: 'angler',
    primary: 'concept-angler.webp',
    swingPx: 14,
    modify: async (img) => {
      const graded = gradeClothing(img);
      return stampOverlay(graded, props.anglerRodTip, 0, 0);
    },
  },
  {
    id: 'kernel',
    primary: 'concept-kernel.webp',
    hipRatio: 0.65,
    swingPx: 13,
    modify: (img) => gradeClothing(img),
  },
  {
    id: 'maker',
    primary: 'concept-maker.webp',
    swingPx: 13,
    modify: async (img) => {
      const graded = gradeClothing(img, {
        coatTint: [164, 88, 48, 0.48],
        onlyNeutral: true,
        topY: 0.16,
        botY: 0.56,
      });
      return stampOverlay(graded, props.makerSpool, 0, 0);
    },
  },
  {
    id: 'dog-walker',
    primary: 'concept-walker-f.webp',
    wide: true,
    companionType: 'dog',
    companionGapX: 146,
    companionMaxX: 293,
    hipRatio: 0.66,
    swingPx: 14,
    modify: (img) => gradeClothing(img),
  },
];

const CITY_SPECS = [
  {
    id: 'pup-walker',
    primary: 'dogwalker-m.webp',
    wide: true,
    companionType: 'pup',
    companionGapX: 356,
    companionMaxX: 646,
    modify: (img) => gradeClothing(img),
  },
  {
    id: 'cyclist',
    primary: 'concept-cyclist-f.webp',
    wide: true,
    bikeMode: true,
    bikeCorridor: [110, 260],
    swingPx: 11,
    wheels: [
      { rx: 0.2, ry: 0.185, rr: 0.18 },
      { rx: 0.805, ry: 0.185, rr: 0.18 },
    ],
    modify: async (img) => {
      const graded = gradeClothing(img);
      return stampOverlay(graded, props.femaleBikeLights, 0, 0);
    },
  },
  {
    id: 'grandfather',
    primary: 'elderly-a.webp',
    hipRatio: 0.64,
    swingPx: 16,
    caneX: 335,
  },
  {
    id: 'manager',
    primary: 'concept-professional.webp',
    hipRatio: 0.64,
    swingPx: 14,
    modify: (img) => gradeClothing(img),
  },
  {
    id: 'photographer',
    primary: 'trainee.webp',
    modify: async (img) => {
      const graded = gradeClothing(img, { coatTint: [54, 62, 52, 0.48], topY: 0.18, botY: 0.62 });
      return stampOverlay(graded, props.camera, 0, 0);
    },
  },
  {
    id: 'student',
    primary: 'student.webp',
    modify: (img) => gradeClothing(img),
  },
  {
    id: 'commuter',
    primary: 'dogwalker-f.webp',
    modify: async (img) => {
      // Isolate the woman commuter cleanly without the dog, add coffee cup & burgundy coat grade
      const solo = maskRegion(img, (x, y) => x > 336 || (x > 296 && y > 240 && y < 388));
      const framed = reframeCanvas(solo, 44, 420, 32);
      const graded = gradeClothing(framed, {
        coatTint: [132, 52, 58, 0.7],
        onlyNeutral: true,
        topY: 0.15,
        botY: 0.56,
      });
      return stampOverlay(graded, props.coffee, 0, 0);
    },
  },
  {
    id: 'builder',
    primary: 'concept-hiker.webp',
    modify: (img) => gradeClothing(img, { hivisCoat: true }),
  },
];

async function packAtlas(fileName, specs, tier, K = 1, pick = null) {
  const count = pick ? pick.length : FRAMES;
  const results = [];
  for (const spec of specs) {
    process.stdout.write(`  Rigging ${count} frames for ${spec.id}...`);
    const res = await synthesizeCharacterStrip(spec, K, pick);
    results.push(res);
    console.log(` done (${res.cellW}x${res.cellH})`);
  }

  const atlasW = Math.max(...results.map((r) => r.cellW * count));
  const atlasH = results.length * CELL_H * K;
  const overlays = [];
  const entries = {};

  results.forEach((res, rowIdx) => {
    const rowY = rowIdx * CELL_H * K;
    res.frames.forEach((frameBuf, colIdx) => {
      overlays.push({ input: frameBuf, left: colIdx * res.cellW, top: rowY });
    });
    entries[res.id] = {
      atlas: tier,
      y: rowY,
      w: res.cellW,
      h: res.cellH,
      frames: count,
      soleY: res.soleY,
      ...(res.stride ? { stride: res.stride } : {}),
      headTopRatio: res.headTopRatio,
    };
  });

  const outPath = path.join(OUT_DIR, fileName);
  await sharp({
    create: {
      width: atlasW,
      height: atlasH,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(overlays)
    .webp({ quality: K > 1 ? 76 : 84, alphaQuality: K > 1 ? 84 : 92, effort: 6 })
    .toFile(outPath);

  return { entries, width: atlasW, height: atlasH, fileName };
}

/*
 * The near tier: the people allowed in the two lanes in front of the standing
 * figure, rigged again at 2.5x with every other walk frame, so they are as
 * sharp as he is when they pass close. Wide screens only (scene.ts).
 */
const NEAR_SCALE = 2.5;
const NEAR_FRAMES = [0, 2, 4, 6, 8, 10, 12, 14, 16, 17, 18, 19];
const NEAR_IDS = ['courier', 'kernel', 'traveller', 'dog-walker', 'student', 'grandfather'];

console.log('Generating Living World V3.1 20-frame anatomical street assets...');
const core = await packAtlas('crowd-core.webp', CORE_SPECS, 'core');
const city = await packAtlas('crowd-city.webp', CITY_SPECS, 'city');
const near = await packAtlas(
  'crowd-near.webp',
  [...CORE_SPECS, ...CITY_SPECS].filter((spec) => NEAR_IDS.includes(spec.id)),
  'near',
  NEAR_SCALE,
  NEAR_FRAMES,
);

const allEntries = { ...core.entries, ...city.entries };
const tsSource = `/**
 * Auto-generated by scripts/street-crowd-atlas.mjs. Do not edit by hand.
 * Contains photorealistic sprite strip coordinates for 16 distinct pedestrian identities x 20 frames.
 */

export type CrowdAtlasTier = 'core' | 'city' | 'near';

export interface SpriteStripEntry {
  atlas: CrowdAtlasTier;
  y: number;
  w: number;
  h: number;
  frames: number;
  soleY: number;
  headTopRatio: number;
  /** Ground covered in one loop of the walk frames, in figure heights: set for people built from film. */
  stride?: number;
}

export const ATLAS_FRAMES = ${FRAMES};
export const WALK_FRAMES = 16;
export const IDLE_A_FRAME = 16;
export const IDLE_B_FRAME = 17;
export const TRANSITION_FRAME = 18;
export const INTERACT_FRAME = 19;

export const CROWD_ATLAS_FILES: Record<CrowdAtlasTier, { src: string; width: number; height: number }> = {
  core: { src: '/street/crowd-core.webp', width: ${core.width}, height: ${core.height} },
  city: { src: '/street/crowd-city.webp', width: ${city.width}, height: ${city.height} },
  near: { src: '/street/crowd-near.webp', width: ${near.width}, height: ${near.height} },
};

export const CROWD_SPRITES: Record<string, SpriteStripEntry> = ${JSON.stringify(allEntries, null, 2)};

/**
 * The same people again, larger, for the lanes nearest the camera: every other
 * walk frame (0..7), then idle A, idle B, transition, interact (8..11).
 */
export const CROWD_NEAR: Record<string, SpriteStripEntry> = ${JSON.stringify(near.entries, null, 2)};

export function hasPhotorealSprite(id: string): boolean {
  return id in CROWD_SPRITES;
}
`;

await writeFile(META_OUT, tsSource, 'utf8');
console.log('Metadata written:', META_OUT);
