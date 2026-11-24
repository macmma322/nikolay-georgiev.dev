/**
 * Builds the photorealistic nighttime street backdrop and animated crowd sprite atlases
 * for Living World V3:
 *   public/street/street-backdrop.webp   (1920x520 atmospheric urban night backdrop)
 *   public/street/crowd-core.webp        (8 core characters x 10 articulated frames)
 *   public/street/crowd-city.webp        (8 additional city characters x 10 articulated frames)
 *   src/scripts/street/crowd-atlas.ts    (typed frame & atlas metadata imported at build time)
 *
 * Usage: node scripts/street-crowd-atlas.mjs
 */
import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SRC_DIR = path.join(ROOT, 'src/assets/media/street/crowd-src');
const OUT_DIR = path.join(ROOT, 'public/street');
const META_OUT = path.join(ROOT, 'src/scripts/street/crowd-atlas.ts');
const FRAMES = 10; // 0..7 = walk cycle, 8 = idle stance, 9 = interact/glance
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

/** Finds the horizontal air gap between rear and front legs near 78% body height. */
function findLegSplitX(img, bounds, xRange) {
  const { data, width } = img;
  const checkY = Math.round(bounds.minY + bounds.h * 0.78);
  const loX = xRange ? xRange[0] : bounds.minX;
  const hiX = xRange ? xRange[1] : bounds.maxX;
  const segs = [];
  let inSeg = false;
  let s0 = 0;
  for (let x = loX; x <= hiX; x++) {
    const fg = data[(checkY * width + x) * 4 + 3] > 110;
    if (fg && !inSeg) {
      inSeg = true;
      s0 = x;
    } else if (!fg && inSeg) {
      inSeg = false;
      if (x - s0 > 6) segs.push([s0, x - 1]);
    }
  }
  if (inSeg) segs.push([s0, hiX]);
  if (segs.length >= 2) {
    return Math.round((segs[0][1] + segs[1][0]) * 0.5);
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

/**
 * Harmonizes garments toward nighttime warm/cool street illumination while leaving
 * skin, hair, and detailed shading completely intact.
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
      r = clamp(r * 0.98 + 4, 0, 255);
      g = clamp(g * 0.96 + 2, 0, 255);
      b = clamp(b * 0.96, 0, 255);

      if (opts?.coatTint && ny > (opts.topY ?? 0.16) && ny < (opts.botY ?? 0.65)) {
        const lum = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
        const maxC = Math.max(r, g, b);
        const sat = maxC > 0 ? (maxC - Math.min(r, g, b)) / maxC : 0;
        const mixY =
          smoothstep(opts.topY ?? 0.16, (opts.topY ?? 0.16) + 0.05, ny) *
          (1 - smoothstep((opts.botY ?? 0.65) - 0.06, opts.botY ?? 0.65, ny));
        const matchNeutral = opts.onlyNeutral ? sat < 0.36 : true;
        // Skip warm skin highlight on neck/hand when matching jacket
        const isSkin = r > g * 1.18 && g > b * 1.15 && lum > 0.38 && sat > 0.22;
        if (mixY > 0.01 && matchNeutral && !isSkin) {
          const [tr, tg, tb, mixBase] = opts.coatTint;
          const mix = mixBase * mixY;
          const shadedR = tr * (0.42 + lum * 0.98);
          const shadedG = tg * (0.42 + lum * 0.98);
          const shadedB = tb * (0.42 + lum * 0.98);
          r = r * (1 - mix) + clamp(shadedR, 0, 255) * mix;
          g = g * (1 - mix) + clamp(shadedG, 0, 255) * mix;
          b = b * (1 - mix) + clamp(shadedB, 0, 255) * mix;
        }
      }
      if (opts?.hivisCoat && ny > 0.18 && ny < 0.49) {
        const lum = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
        const maxC = Math.max(r, g, b);
        const sat = maxC > 0 ? (maxC - Math.min(r, g, b)) / maxC : 0;
        const isSkin = r > g * 1.18 && g > b * 1.15 && lum > 0.38 && sat > 0.22;
        const mixVest =
          smoothstep(0.3, 0.38, nx) *
          (1 - smoothstep(0.54, 0.6, nx)) *
          smoothstep(0.18, 0.24, ny) *
          (1 - smoothstep(0.43, 0.49, ny));
        if (mixVest > 0.02 && !isSkin && lum > 0.08 && sat < 0.42) {
          const isStripe = ny > 0.365 && ny < 0.388;
          const shade = 0.52 + lum * 1.1;
          const tr = isStripe ? 210 * shade : 192 * shade;
          const tg = isStripe ? 216 * shade : 204 * shade;
          const tb = isStripe ? 206 * shade : 48 * shade;
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

/**
 * Crops/recenters a wide buffer onto a clean portrait canvas preserving exact heights.
 */
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
 * Articulates a segmented human character (+ optional companion/bike/cane/prop) across 10 frames:
 *   0..7: Anatomically grounded crossing 8-phase walk cycle with ZERO thigh/hip notch
 *         (pendulum shear scales continuously from 0.0 at hipY to 1.0 at soleY)
 *   8:    Relaxed standing idle pose
 *   9:    Contextual interact/glance pose (head nod/turn + attentive posture)
 */
async function synthesizeCharacterStrip(spec) {
  const { id, primary, wide, companionType, companionGapX, bikeMode, caneX, modify } = spec;
  let imgA = cleanCutout(await loadRaw(primary));
  if (modify) imgA = await modify(imgA);

  const boundsA = measureBounds(imgA, 110);
  const targetH = 136;
  const soleY = CELL_H - 6;
  const scale = targetH / boundsA.h;
  const cellW = wide ? 176 : 114;

  const srcHumanMaxX = companionGapX ?? boundsA.maxX;
  const srcCenterX = Math.round((boundsA.minX + srcHumanMaxX) * 0.5);
  const dstCenterX = Math.round(cellW * (companionType ? 0.31 : bikeMode ? 0.49 : 0.5));

  const splitX = findLegSplitX(imgA, boundsA, [boundsA.minX, srcHumanMaxX]);
  const hipY = boundsA.minY + boundsA.h * 0.53;
  const kneeY = boundsA.minY + boundsA.h * 0.76;
  const neckY = boundsA.minY + boundsA.h * 0.16;

  // Bounded hip-pivoted swing so limbs stay seamlessly attached without thigh notches
  const maxSwingSrc = bikeMode ? 18 : companionType ? 22 : 25;

  const rawFrames = [];
  const tmpPixel = new Uint8Array(4);

  for (let f = 0; f < FRAMES; f++) {
    const isIdle = f === 8;
    const isInteract = f === 9;
    const phase = isIdle || isInteract ? 0 : f / 8;
    const theta = phase * TAU;

    // 1.0 = original contact stride (+maxSwing front, -maxSwing rear), -1.0 = opposite contact
    const strideFactor = isIdle ? 0.35 : isInteract ? 0.45 : Math.cos(theta);
    const frontShiftX = (strideFactor - 1) * maxSwingSrc;
    const rearShiftX = (1 - strideFactor) * maxSwingSrc;
    const frontLift = !isIdle && !isInteract && Math.sin(theta) > 0 ? Math.sin(theta) * 14 : 0;
    const rearLift =
      !isIdle && !isInteract && Math.sin(theta + Math.PI) > 0 ? Math.sin(theta + Math.PI) * 14 : 0;
    const frontLeads = strideFactor >= 0;

    // Double-frequency vertical gait bob (-5px source ~= -1.4px output bounce)
    const bobSrc = isIdle ? 0.4 : isInteract ? -1.8 : -Math.abs(Math.sin(theta)) * 6.5 + 2.2;

    const frameData = new Uint8Array(cellW * CELL_H * 4);

    for (let dy = 0; dy < CELL_H; dy++) {
      for (let dx = 0; dx < cellW; dx++) {
        const syBase = boundsA.maxY - (soleY - dy) / scale;
        const sxBase = srcCenterX + (dx - dstCenterX) / scale;
        const outOff = (dy * cellW + dx) * 4;

        // 1. Companion region (dog or autonomous quadruped bot on right side)
        if (companionType && sxBase >= srcHumanMaxX - 6) {
          const compBlend = smoothstep(srcHumanMaxX - 6, srcHumanMaxX + 10, sxBase);
          const dogTopY = boundsA.minY + boundsA.h * 0.62;
          const dogPawT = Math.pow(
            clamp((syBase - dogTopY) / Math.max(1, boundsA.maxY - dogTopY), 0, 1),
            1.35,
          );
          const pawOsc = Math.sin(theta + (sxBase > srcHumanMaxX + 140 ? 0 : Math.PI));
          const pawShiftX = isIdle || isInteract ? 0 : pawOsc * 11 * dogPawT * compBlend;
          const pawLiftY =
            !isIdle && !isInteract && Math.cos(theta) > 0
              ? Math.cos(theta) * 6 * dogPawT * compBlend
              : 0;
          const compBob = (isIdle ? 0 : -Math.abs(Math.sin(theta * 2)) * 3.5) * compBlend;
          // Preserve continuous leash from hand to harness without tearing
          const leashHold = syBase < dogTopY ? 0 : 1;

          tmpPixel.fill(0);
          sampleBilinear(
            imgA,
            sxBase - pawShiftX,
            syBase - (compBob - pawLiftY) * (0.4 + 0.6 * leashHold),
            tmpPixel,
            0,
          );
          if (tmpPixel[3] > 8) {
            blendOver(frameData, outOff, tmpPixel[0], tmpPixel[1], tmpPixel[2], tmpPixel[3]);
          }
          continue;
        }

        // 2. Cane stays anchored to hand at hipY and plants smoothly at bottom without hard horizontal line
        if (caneX && sxBase > caneX - 8 && syBase > hipY - 12) {
          const caneYWeight = smoothstep(hipY - 12, hipY + 12, syBase);
          const tCane = clamp((syBase - hipY) / Math.max(1, boundsA.maxY - hipY), 0, 1);
          const caneShift = isIdle
            ? -5 * tCane
            : isInteract
              ? -3
              : frontShiftX * 0.22 * (1 - tCane * 0.6);
          tmpPixel.fill(0);
          sampleBilinear(imgA, sxBase - caneShift, syBase - bobSrc * 0.5, tmpPixel, 0);
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

        // 3. Continuous lower-body pendulum leg evaluation (0 seam at hipY!)
        if (syBase > hipY - 12) {
          const tPend = Math.pow(
            clamp((syBase - (hipY - 12)) / Math.max(1, boundsA.maxY - (hipY - 12)), 0, 1),
            1.08,
          );
          const evalPendulumLeg = (isFront) => {
            const shiftX = isFront ? frontShiftX : rearShiftX;
            const liftY = isFront ? frontLift : rearLift;
            const legX = sxBase - shiftX * tPend;
            const kneeCurve = liftY > 0 ? smoothstep(kneeY - 20, boundsA.maxY, syBase) * liftY : 0;
            const legY = syBase - (bobSrc * (1 - tPend) - kneeCurve);

            // Check source ownership at the rest hip/leg split without cutting the bicycle frame
            if (!bikeMode) {
              if (isFront && legX < splitX - 8) return;
              if (!isFront && legX > splitX + 8) return;
            }
            if (companionType && legX > srcHumanMaxX) return;
            if (caneX && legX > caneX - 8) return;

            tmpPixel.fill(0);
            sampleBilinear(imgA, legX, legY, tmpPixel, 0);
            if (tmpPixel[3] > 10) {
              // Cross-fade into torso layer seamlessly near hipY
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
            // For bicycles, preserve intact bike wheels outside the central rider leg corridor
            if (sxBase < boundsA.minX + 140 || sxBase > boundsA.minX + 315) {
              const bikeBob = isIdle ? 0 : Math.sin(theta * 2) * 1.2;
              tmpPixel.fill(0);
              sampleBilinear(imgA, sxBase, syBase - bikeBob, tmpPixel, 0);
              if (tmpPixel[3] > 10) {
                blendOver(frameData, outOff, tmpPixel[0], tmpPixel[1], tmpPixel[2], tmpPixel[3]);
              }
            } else {
              evalPendulumLeg(false);
              evalPendulumLeg(true);
            }
          } else if (frontLeads) {
            evalPendulumLeg(false);
            evalPendulumLeg(true);
          } else {
            evalPendulumLeg(true);
            evalPendulumLeg(false);
          }
        }

        // 4. Upper Torso, Arms, Pack & Head (anchored continuously at hipY)
        const torsoMask = 1 - smoothstep(hipY - 12, hipY + 12, syBase);
        if (torsoMask > 0.01) {
          const headFactor = 1 - smoothstep(neckY - 6, neckY + 16, syBase);
          const headNodX = isInteract ? -2.8 * headFactor : Math.sin(theta) * 1.1 * headFactor;
          const headNodY = isInteract ? -2.2 * headFactor : 0;
          const leanFactor = clamp((hipY - syBase) / Math.max(1, hipY - boundsA.minY), 0, 1);
          const torsoLean = isIdle ? 0 : Math.sin(theta * 2) * 1.8 * leanFactor;

          tmpPixel.fill(0);
          sampleBilinear(
            imgA,
            sxBase - torsoLean - headNodX,
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

    const buf = await sharp(frameData, { raw: { width: cellW, height: CELL_H, channels: 4 } })
      .png()
      .toBuffer();
    rawFrames.push(buf);
  }

  return {
    id,
    cellW,
    cellH: CELL_H,
    soleY,
    headTopRatio: +(1 - (targetH + 6) / CELL_H).toFixed(3),
    frames: rawFrames,
  };
}

// ---------- Build Derived Prop Overlays (SVG -> Shaded Raster) ----------
async function buildProps() {
  // Fishing rod + tackle bag overlay (KOBAIT) in 512x512 solo canvas
  const fishingRodSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
    <defs>
      <linearGradient id="rod" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#47d4aa"/>
        <stop offset="0.35" stop-color="#22303c"/>
        <stop offset="1" stop-color="#11161c"/>
      </linearGradient>
    </defs>
    <line x1="210" y1="330" x2="352" y2="18" stroke="url(#rod)" stroke-width="5" stroke-linecap="round"/>
    <line x1="210" y1="330" x2="258" y2="225" stroke="#8c6239" stroke-width="7.5" stroke-linecap="round"/>
    <circle cx="248" cy="246" r="9.5" fill="#47d4aa" stroke="#18222a" stroke-width="2"/>
    <rect x="232" y="218" width="44" height="36" rx="5" fill="#23323a" stroke="#10181d" stroke-width="2.5"/>
    <rect x="238" y="224" width="32" height="5" rx="2" fill="#47d4aa" opacity="0.9"/>
  </svg>`;

  // 3D-printer filament spool (Stemini) in 426x512 canvas
  const makerSpoolSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="426" height="512" viewBox="0 0 426 512">
    <g transform="translate(268 232)">
      <ellipse cx="0" cy="0" rx="30" ry="30" fill="#181c22" stroke="#e58958" stroke-width="3.5"/>
      <ellipse cx="0" cy="0" rx="20" ry="20" fill="none" stroke="#c8683a" stroke-width="6.5"/>
      <circle cx="0" cy="0" r="8.5" fill="#0d1014" stroke="#6c7a89" stroke-width="2"/>
      <path d="M-24 14 L-8 -22" stroke="#f2a270" stroke-width="2.5" opacity="0.85"/>
    </g>
  </svg>`;

  // DSLR camera + strap (Photographer) in 468x512 canvas
  const cameraSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="468" height="512" viewBox="0 0 468 512">
    <path d="M236 108 C264 145, 294 170, 316 196" fill="none" stroke="#181a1f" stroke-width="6.5"/>
    <rect x="292" y="182" width="42" height="29" rx="4" fill="#1c2026" stroke="#4f5663" stroke-width="2"/>
    <rect x="331" y="187" width="21" height="19" rx="3" fill="#272c35" stroke="#111317" stroke-width="2"/>
    <circle cx="352" cy="196" r="6.5" fill="#68b6ff" opacity="0.72"/>
  </svg>`;

  // Laptop edge & amber glow (Kernel Author / Malrynth) in 468x512 canvas
  const laptopSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="468" height="512" viewBox="0 0 468 512">
    <polygon points="274,175 335,165 344,218 282,226" fill="#171b22" stroke="#f0b35e" stroke-width="2.5"/>
    <polygon points="279,180 330,171 337,213 286,219" fill="#f0b35e" opacity="0.28"/>
    <rect x="255" y="220" width="76" height="8" rx="3" fill="#232833" stroke="#111317" stroke-width="2"/>
  </svg>`;

  // Autonomous companion quadruped robot (J.A.R.V.I.S.) centered safely inside 769x512 canvas
  const jarvisBotSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="769" height="512" viewBox="0 0 769 512">
    <defs>
      <linearGradient id="botBody" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#364250"/>
        <stop offset="0.55" stop-color="#1d242e"/>
        <stop offset="1" stop-color="#11151b"/>
      </linearGradient>
    </defs>
    <!-- Articulated carbon legs grounded at y=502 matching human soleY -->
    <path d="M402 396 L388 450 L398 502" fill="none" stroke="#182029" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M420 396 L436 452 L424 502" fill="none" stroke="#283340" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M498 394 L488 450 L502 502" fill="none" stroke="#182029" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M514 394 L532 448 L522 502" fill="none" stroke="#283340" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>
    <!-- Chassis -->
    <rect x="386" y="352" width="144" height="48" rx="16" fill="url(#botBody)" stroke="#55d4ff" stroke-width="2.2"/>
    <rect x="404" y="346" width="96" height="9" rx="4.5" fill="#2c3643"/>
    <!-- Optic head & glowing cyan bar -->
    <rect x="520" y="354" width="38" height="28" rx="8" fill="#18202a" stroke="#55d4ff" stroke-width="2"/>
    <rect x="540" y="362" width="16" height="7" rx="3" fill="#63e2ff"/>
    <circle cx="422" cy="374" r="5" fill="#63e2ff" opacity="0.88"/>
    <rect x="448" y="368" width="46" height="4" rx="2" fill="#63e2ff" opacity="0.68"/>
  </svg>`;

  // Leather executive briefcase in 440x512 solo frame
  const briefcaseSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="440" height="512" viewBox="0 0 440 512">
    <path d="M236 270 v-12 c0-5 6-8 14-8 s14 3 14 8 v12" fill="none" stroke="#261c17" stroke-width="4.5"/>
    <rect x="210" y="270" width="74" height="50" rx="6" fill="#261e1a" stroke="#120f0d" stroke-width="3"/>
    <rect x="212" y="272" width="70" height="17" rx="4" fill="#3a2d26"/>
    <rect x="242" y="286" width="11" height="5" rx="1" fill="#c7a05e"/>
  </svg>`;

  // Bike LED headlight cone & red taillight beam for hi-vis cyclist (769x512 matching traveller)
  const bikeLightsSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="769" height="512" viewBox="0 0 769 512">
    <defs>
      <linearGradient id="beam" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#ffe7a6" stop-opacity="0.72"/>
        <stop offset="1" stop-color="#ffe7a6" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <polygon points="484,264 685,244 685,318" fill="url(#beam)"/>
    <circle cx="484" cy="268" r="7" fill="#fff6d1"/>
    <circle cx="242" cy="262" r="6" fill="#ff4d3b" opacity="0.88"/>
  </svg>`;

  // Takeaway coffee cup for commuter (410x512 matching trainee)
  const coffeeSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="410" height="512" viewBox="0 0 410 512">
    <g transform="translate(262 246)">
      <polygon points="0,4 18,4 15,28 3,28" fill="#d9cbb8" stroke="#1e1b18" stroke-width="1.8"/>
      <rect x="-1" y="0" width="20" height="5" rx="1.5" fill="#24201d"/>
      <rect x="2" y="12" width="14" height="8" fill="#7c5636"/>
    </g>
  </svg>`;

  return {
    fishingRod: await renderSvgOverlay(fishingRodSvg, 512, 512),
    makerSpool: await renderSvgOverlay(makerSpoolSvg, 426, 512),
    camera: await renderSvgOverlay(cameraSvg, 468, 512),
    laptop: await renderSvgOverlay(laptopSvg, 468, 512),
    jarvisBot: await renderSvgOverlay(jarvisBotSvg, 769, 512),
    briefcase: await renderSvgOverlay(briefcaseSvg, 440, 512),
    bikeLights: await renderSvgOverlay(bikeLightsSvg, 769, 512),
    coffee: await renderSvgOverlay(coffeeSvg, 410, 512),
  };
}

const props = await buildProps();

// ---------- Define 16 Distinct Photorealistic Identities ----------
const CORE_SPECS = [
  {
    id: 'traveller',
    primary: 'traveller.webp',
    wide: true,
    bikeMode: true,
    modify: (img) =>
      gradeClothing(img, {
        coatTint: [78, 108, 66, 0.42],
        onlyNeutral: true,
        topY: 0.16,
        botY: 0.48,
      }),
  },
  {
    id: 'trainee',
    primary: 'trainee.webp',
    modify: (img) =>
      gradeClothing(img, {
        coatTint: [52, 82, 138, 0.45],
        onlyNeutral: true,
        topY: 0.16,
        botY: 0.52,
      }),
  },
  {
    id: 'companion',
    primary: 'dogwalker-m.webp',
    wide: true,
    companionType: 'robot',
    companionGapX: 356,
    modify: async (img) => {
      const solo = maskRegion(img, (x, y) => x > 362 || (x > 318 && y > 240 && y < 388));
      const graded = gradeClothing(solo, {
        coatTint: [34, 58, 76, 0.58],
        onlyNeutral: true,
        topY: 0.14,
        botY: 0.52,
      });
      return stampOverlay(graded, props.jarvisBot, 0, 0);
    },
  },
  {
    id: 'courier',
    primary: 'courier-a.webp',
    modify: (img) => gradeClothing(img),
  },
  {
    id: 'angler',
    primary: 'dogwalker-m.webp',
    modify: async (img) => {
      const solo = maskRegion(img, (x, y) => x > 362 || (x > 318 && y > 240 && y < 388));
      const framed = reframeCanvas(solo, 44, 512, 60);
      const graded = gradeClothing(framed, {
        coatTint: [44, 94, 86, 0.56],
        topY: 0.16,
        botY: 0.54,
      });
      return stampOverlay(graded, props.fishingRod, 0, -4);
    },
  },
  {
    id: 'kernel',
    primary: 'kernel-a.webp',
    modify: async (img) => {
      const graded = gradeClothing(img);
      return stampOverlay(graded, props.laptop, 2, 10);
    },
  },
  {
    id: 'maker',
    primary: 'student.webp',
    modify: async (img) => {
      const graded = gradeClothing(img, {
        coatTint: [152, 80, 46, 0.58],
        onlyNeutral: true,
        topY: 0.18,
        botY: 0.54,
      });
      return stampOverlay(graded, props.makerSpool, 0, 0);
    },
  },
  {
    id: 'dog-walker',
    primary: 'dogwalker-f.webp',
    wide: true,
    companionType: 'dog',
    companionGapX: 334,
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
    modify: (img) => gradeClothing(img),
  },
  {
    id: 'cyclist',
    primary: 'traveller.webp',
    wide: true,
    bikeMode: true,
    modify: async (img) => {
      const graded = gradeClothing(img, { hivisCoat: true });
      return stampOverlay(graded, props.bikeLights, 0, 0);
    },
  },
  {
    id: 'grandfather',
    primary: 'elderly-a.webp',
    caneX: 335,
  },
  {
    id: 'manager',
    primary: 'dogwalker-f.webp',
    modify: async (img) => {
      const solo = maskRegion(img, (x, y) => x > 338 || (x > 296 && y > 238 && y < 388));
      const framed = reframeCanvas(solo, 40, 440, 48);
      const graded = gradeClothing(framed, {
        coatTint: [42, 52, 68, 0.72],
        onlyNeutral: true,
        topY: 0.14,
        botY: 0.56,
      });
      return stampOverlay(graded, props.briefcase, 20, -4);
    },
  },
  {
    id: 'photographer',
    primary: 'kernel-b.webp',
    modify: async (img) => {
      const graded = gradeClothing(img, { coatTint: [54, 62, 52, 0.48], topY: 0.18, botY: 0.62 });
      return stampOverlay(graded, props.camera, 8, -4);
    },
  },
  {
    id: 'student',
    primary: 'student.webp',
    modify: (img) => gradeClothing(img),
  },
  {
    id: 'commuter',
    primary: 'trainee.webp',
    modify: async (img) => {
      const graded = gradeClothing(img, {
        coatTint: [152, 134, 102, 0.65],
        topY: 0.16,
        botY: 0.55,
      });
      return stampOverlay(graded, props.coffee, 0, 0);
    },
  },
  {
    id: 'builder',
    primary: 'kernel-a.webp',
    modify: (img) => gradeClothing(img, { hivisCoat: true }),
  },
];

async function packAtlas(fileName, specs) {
  const results = [];
  for (const spec of specs) {
    process.stdout.write(`  Rigging 10 frames for ${spec.id}...`);
    const res = await synthesizeCharacterStrip(spec);
    results.push(res);
    console.log(` done (${res.cellW}x${res.cellH})`);
  }

  const atlasW = Math.max(...results.map((r) => r.cellW * FRAMES));
  const atlasH = results.length * CELL_H;
  const overlays = [];
  const entries = {};

  results.forEach((res, rowIdx) => {
    const rowY = rowIdx * CELL_H;
    res.frames.forEach((frameBuf, colIdx) => {
      overlays.push({ input: frameBuf, left: colIdx * res.cellW, top: rowY });
    });
    entries[res.id] = {
      atlas: fileName === 'crowd-core.webp' ? 'core' : 'city',
      y: rowY,
      w: res.cellW,
      h: res.cellH,
      frames: FRAMES,
      soleY: res.soleY,
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
    .webp({ quality: 84, alphaQuality: 92, effort: 6 })
    .toFile(outPath);

  return { entries, width: atlasW, height: atlasH, fileName };
}

// ---------- Build Atmospheric Photorealistic Nighttime Street Backdrop ----------
async function buildBackdrop() {
  const W = 1920;
  const H = 520;
  const BASE = 364;

  let rngState = 20263219;
  const rand = () => {
    rngState = (rngState * 1664525 + 1013904223) >>> 0;
    return rngState / 4294967296;
  };
  const bet = (a, b) => a + rand() * (b - a);

  const farTowers = [];
  for (let x = -20; x < W;) {
    const w = Math.round(bet(68, 165));
    const h = Math.round(bet(175, 325));
    const hasCircuit = rand() < 0.48;
    farTowers.push(`<rect x="${x}" y="${BASE - h}" width="${w}" height="${h}" fill="#0f1622"/>`);
    if (hasCircuit) {
      farTowers.push(
        `<path d="M${x + 12} ${BASE - h + 16}h${Math.round(w * 0.45)}l12 12v48" fill="none" stroke="#42ccff" stroke-opacity="0.18" stroke-width="1.2"/>`,
      );
      farTowers.push(
        `<circle cx="${x + 12 + Math.round(w * 0.45) + 12}" cy="${BASE - h + 28}" r="1.8" fill="#5ce1ff" opacity="0.45"/>`,
      );
    }
    x += w + Math.round(bet(-6, 12));
  }

  const facadeSpecs = [
    { x: -10, w: 250, top: 86, tone: '#141a24', warm: 0.44 },
    { x: 245, w: 265, top: 60, tone: '#181e28', warm: 0.48 },
    { x: 518, w: 238, top: 108, tone: '#131820', warm: 0.36 },
    { x: 756, w: 408, top: 132, tone: '#12171f', warm: 0.25 },
    { x: 1168, w: 255, top: 78, tone: '#161c26', warm: 0.46 },
    { x: 1430, w: 270, top: 54, tone: '#191f2a', warm: 0.52 },
    { x: 1706, w: 230, top: 92, tone: '#141a23', warm: 0.42 },
  ];

  const facadesSvg = facadeSpecs
    .map((b) => {
      const cols = Math.floor((b.w - 36) / 36);
      const rows = Math.floor((BASE - b.top - 58) / 42);
      const wins = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const wx = b.x + 22 + c * 36;
          const wy = b.top + 24 + r * 42;
          const roll = rand();
          const isWarm = roll < b.warm * 0.62;
          const isCool = !isWarm && roll < b.warm;
          const fill = isWarm ? 'url(#winWarm)' : isCool ? 'url(#winCool)' : '#0a0d13';
          if (isWarm) {
            wins.push(
              `<rect x="${wx - 3}" y="${wy - 3}" width="26" height="34" rx="2" fill="#f7b05c" opacity="0.16" filter="url(#softBloom)"/>`,
            );
          }
          wins.push(
            `<rect x="${wx}" y="${wy}" width="20" height="28" rx="1" fill="${fill}" opacity="0.94"/>`,
          );
          wins.push(`<rect x="${wx - 1}" y="${wy + 28}" width="22" height="2.5" fill="#090b10"/>`);
          if (isWarm) {
            wins.push(
              `<line x1="${wx + 10}" y1="${wy}" x2="${wx + 10}" y2="${wy + 28}" stroke="#14161c" stroke-width="1.2"/>`,
            );
          }
        }
      }
      const isCentral = b.x >= 750 && b.x <= 800;
      const shop = isCentral
        ? ''
        : `<rect x="${b.x + 14}" y="${BASE - 44}" width="${b.w - 28}" height="42" fill="#2c2218" stroke="#0c0f14" stroke-width="2"/>
           <rect x="${b.x + 18}" y="${BASE - 40}" width="${b.w - 36}" height="34" fill="url(#shopAmber)" opacity="0.72"/>
           <ellipse cx="${b.x + b.w / 2}" cy="${BASE + 30}" rx="${b.w * 0.45}" ry="28" fill="url(#lampPool)" opacity="0.4"/>`;
      return `
        <rect x="${b.x}" y="${b.top}" width="${b.w}" height="${BASE - b.top}" fill="${b.tone}" stroke="#0b0f15" stroke-width="1.5"/>
        <rect x="${b.x - 3}" y="${b.top - 6}" width="${b.w + 6}" height="7" fill="#0d1118"/>
        ${wins.join('')}
        ${shop}
      `;
    })
    .join('');

  // Rich autumn foliage clusters with warm amber rim glow + dark silhouetted inner depth
  const treePositions = [180, 520, 1340, 1740];
  const treesSvg = treePositions
    .map((tx) => {
      const twigs = `<path d="M${tx} ${BASE + 4} L${tx - 3} ${BASE - 118} M${tx} ${BASE - 72} L${tx - 28} ${BASE - 126} M${tx} ${BASE - 86} L${tx + 28} ${BASE - 134} M${tx - 10} ${BASE - 102} L${tx - 36} ${BASE - 148}" stroke="#120e0b" stroke-width="7" stroke-linecap="round"/>`;
      const puffs = [];
      for (let i = 0; i < 65; i++) {
        const ang = rand() * TAU;
        const rad = bet(6, 72);
        const cx = tx + Math.cos(ang) * rad * 1.18;
        const cy = BASE - 126 + Math.sin(ang) * rad * 0.68;
        const r = bet(4, 11);
        const warmHit = rand() < 0.58;
        const col = warmHit
          ? rand() < 0.45
            ? '#cc782c'
            : '#8d4c1c'
          : rand() < 0.5
            ? '#47341c'
            : '#1d261a';
        puffs.push(
          `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="${col}" opacity="${bet(0.65, 0.92).toFixed(2)}"/>`,
        );
      }
      return `${twigs}<g filter="url(#leafSoft)">${puffs.join('')}</g>`;
    })
    .join('');

  const jointLines = [];
  for (let i = -2; i <= 34; i++) {
    const xTop = i * 60;
    const xBot = 960 + (xTop - 960) * 1.58;
    jointLines.push(
      `<line x1="${xTop}" y1="${BASE + 8}" x2="${xBot.toFixed(1)}" y2="${H}" stroke="#080b10" stroke-opacity="0.52" stroke-width="1.3"/>`,
    );
  }

  const lampXs = [150, 550, 1370, 1760];
  const wetReflections = lampXs
    .map(
      (lx) => `
      <ellipse cx="${lx + 10}" cy="${BASE + 52}" rx="125" ry="40" fill="url(#lampPool)" opacity="0.56"/>
      <rect x="${lx - 20}" y="${BASE + 16}" width="54" height="136" fill="url(#wetStreak)" opacity="0.28" filter="url(#wetBlur)"/>
    `,
    )
    .join('');

  const lampsSvg = lampXs
    .map(
      (lx) => `
      <circle cx="${lx + 18}" cy="${BASE - 148}" r="88" fill="url(#lampHalo)" filter="url(#softBloom)"/>
      <path d="M${lx} ${BASE + 6} V${BASE - 150} h20" fill="none" stroke="#10141c" stroke-width="4.5"/>
      <rect x="${lx + 11}" y="${BASE - 152}" width="22" height="6" rx="2" fill="#ffe4ad"/>
    `,
    )
    .join('');

  const hazardStripes = [];
  for (let hx = 760; hx < 1160; hx += 22) {
    hazardStripes.push(
      `<polygon points="${hx},${BASE - 24} ${hx + 11},${BASE - 24} ${hx + 1},${BASE} ${hx - 10},${BASE}" fill="#d89635" opacity="0.62"/>`,
    );
  }

  const backdropSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <defs>
      <filter id="softBloom" x="-40%" y="-40%" width="180%" height="180%">
        <feGaussianBlur stdDeviation="8"/>
      </filter>
      <filter id="wetBlur" x="-30%" y="-10%" width="160%" height="120%">
        <feGaussianBlur stdDeviation="5 12"/>
      </filter>
      <filter id="leafSoft" x="-10%" y="-10%" width="120%" height="120%">
        <feGaussianBlur stdDeviation="1.4"/>
      </filter>
      <filter id="asphaltGrain" x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.18 0.55" numOctaves="3" seed="17" result="noise"/>
        <feColorMatrix type="matrix" values="0 0 0 0 0.08  0 0 0 0 0.1  0 0 0 0 0.14  0 0 0 0.16 0"/>
      </filter>
      <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#090e16"/>
        <stop offset="0.58" stop-color="#121a28"/>
        <stop offset="1" stop-color="#1d2436"/>
      </linearGradient>
      <linearGradient id="winWarm" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#ffc876"/>
        <stop offset="1" stop-color="#b86c28"/>
      </linearGradient>
      <linearGradient id="winCool" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#84b5e3"/>
        <stop offset="1" stop-color="#354f6c"/>
      </linearGradient>
      <linearGradient id="shopAmber" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#f2ac58"/>
        <stop offset="1" stop-color="#75471c"/>
      </linearGradient>
      <linearGradient id="pavement" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#1a1f28"/>
        <stop offset="0.45" stop-color="#12161f"/>
        <stop offset="1" stop-color="#080b10"/>
      </linearGradient>
      <radialGradient id="lampHalo">
        <stop offset="0" stop-color="#ffd082" stop-opacity="0.62"/>
        <stop offset="0.48" stop-color="#d8863c" stop-opacity="0.22"/>
        <stop offset="1" stop-color="#d8863c" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="lampPool">
        <stop offset="0" stop-color="#f2a956" stop-opacity="0.55"/>
        <stop offset="1" stop-color="#f2a956" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="wetStreak" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#f7b76e" stop-opacity="0.72"/>
        <stop offset="1" stop-color="#0d1118" stop-opacity="0"/>
      </linearGradient>
      <linearGradient id="concrete" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#4e4b45"/>
        <stop offset="0.5" stop-color="#3b3936"/>
        <stop offset="1" stop-color="#2a2927"/>
      </linearGradient>
      <clipPath id="hoardClip">
        <rect x="760" y="${BASE - 24}" width="400" height="24"/>
      </clipPath>
    </defs>

    <rect width="${W}" height="${BASE}" fill="url(#sky)"/>
    ${farTowers.join('')}
    ${facadesSvg}
    ${treesSvg}

    <!-- Central Construction Hoarding Wall -->
    <rect x="760" y="210" width="400" height="${BASE - 210}" fill="url(#concrete)" stroke="#121418" stroke-width="2"/>
    <path d="M860 210v${BASE - 210} M960 210v${BASE - 210} M1060 210v${BASE - 210} M760 232h400" stroke="#16181c" stroke-opacity="0.45" stroke-width="1.2"/>
    <g clip-path="url(#hoardClip)">
      <rect x="760" y="${BASE - 24}" width="400" height="24" fill="#18191c"/>
      ${hazardStripes.join('')}
    </g>
    <polygon points="848,196 760,364 970,364" fill="#ffc978" opacity="0.16" filter="url(#softBloom)"/>
    <polygon points="1072,196 950,364 1160,364" fill="#ffc978" opacity="0.16" filter="url(#softBloom)"/>

    <!-- Wet Asphalt Sidewalk with grain and specular pools -->
    <rect x="0" y="${BASE}" width="${W}" height="${H - BASE}" fill="url(#pavement)"/>
    <rect x="0" y="${BASE}" width="${W}" height="${H - BASE}" filter="url(#asphaltGrain)"/>
    <rect x="0" y="${BASE}" width="${W}" height="8" fill="#323844"/>
    ${jointLines.join('')}
    <ellipse cx="960" cy="${BASE + 36}" rx="340" ry="52" fill="url(#lampPool)" opacity="0.72" filter="url(#wetBlur)"/>
    ${wetReflections}
    ${lampsSvg}
  </svg>`;

  const backOut = path.join(OUT_DIR, 'street-backdrop.webp');
  await sharp(Buffer.from(backdropSvg)).webp({ quality: 86, effort: 6 }).toFile(backOut);
  console.log('Backdrop generated:', backOut);
}

console.log('Generating refined Living World V3 street assets...');
const core = await packAtlas('crowd-core.webp', CORE_SPECS);
const city = await packAtlas('crowd-city.webp', CITY_SPECS);
await buildBackdrop();

const allEntries = { ...core.entries, ...city.entries };
const tsSource = `/**
 * Auto-generated by scripts/street-crowd-atlas.mjs. Do not edit by hand.
 * Contains photorealistic sprite strip coordinates for 16 pedestrian identities.
 */

export type CrowdAtlasTier = 'core' | 'city';

export interface SpriteStripEntry {
  atlas: CrowdAtlasTier;
  y: number;
  w: number;
  h: number;
  frames: number;
  soleY: number;
  headTopRatio: number;
}

export const CROWD_ATLAS_FILES: Record<CrowdAtlasTier, { src: string; width: number; height: number }> = {
  core: { src: '/street/crowd-core.webp', width: ${core.width}, height: ${core.height} },
  city: { src: '/street/crowd-city.webp', width: ${city.width}, height: ${city.height} },
};

export const CROWD_SPRITES: Record<string, SpriteStripEntry> = ${JSON.stringify(allEntries, null, 2)};

export function hasPhotorealSprite(id: string): boolean {
  return id in CROWD_SPRITES;
}
`;

await writeFile(META_OUT, tsSource, 'utf8');
console.log('Metadata written:', META_OUT);
