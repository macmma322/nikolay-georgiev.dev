/**
 * Entertainment Station: reconstructed from a photograph of the real room.
 *
 * Physical dimensions (1 unit = 1 cm):
 *   - Sony PS5 Slim Digital Edition (825 GB): 35.8 × 8.0 × 21.6 cm (vertical)
 *   - Philips 55-inch 4K QLED Ambilight TV (55PUS8450/12, 3-sided Ambilight):
 *     122.6 × 71.5 × 8.8 cm panel, 77.7 cm high on angled feet set 80.2 cm apart
 *   - Sony DualSense Wireless Controller (Midnight Black & White): 16.0 × 6.6 × 10.6 cm
 *   - Sony DualSense Charging Station: 5.2 × 6.2 × 15.9 cm, two USB-C slots in a row
 *   - Light-oak TV cabinet and a smaller light-oak side cabinet to its left,
 *     a plain neutral wall and pleated curtains on the right.
 *
 * Neither the optional PS5 Blu-ray disc drive nor an extra M.2 SSD is included.
 */
import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import {
  box,
  canvasTexture,
  cyl,
  glow,
  grilleTexture,
  group,
  place,
  rod,
  type Materials,
  type Vec,
} from './kit';
import type { SceneDef } from './scene';

const CABINET_X = 14;
const CABINET_TOP = 46;
const PLATFORM_X = -82;
const PLATFORM_Z = -2;
const PLATFORM_TOP = 17;
const WALL_FRONT = -24.1;
const TV_PANEL_BOTTOM = CABINET_TOP + 6.2; // 52.2 cm (77.7 cm total - 71.5 cm panel)
const TV_PANEL_CY = TV_PANEL_BOTTOM + 71.5 / 2; // 87.95 cm

const smooth = (a: number, b: number, x: number) => THREE.MathUtils.smoothstep(x, a, b);
const clamp01 = (x: number) => THREE.MathUtils.clamp(x, 0, 1);

// ---------- Featured game art for the television (Caelora key art atlas) ----------
// Atlas: 1024 × 576 hero image on top, then a strip of 128 px tiles (forest, valley, river, oak).
let art: HTMLImageElement | null = null;

/** Resolves once the screen art has loaded (or failed): the scene then draws its first frame with it. */
export const artReady: Promise<void> = loadArt();

async function loadArt() {
  if (typeof Image === 'undefined') return;
  try {
    const { default: url } = await import('../../assets/setup/caelora-screen.webp?url');
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    const decoded = img.decode().then(
      () => true,
      () => false,
    );
    const timeout = new Promise<boolean>((r) => setTimeout(() => r(false), 5000));
    if (await Promise.race([decoded, timeout])) art = img;
  } catch {
    art = null;
  }
}

export function buildEntertainment(m: Materials): SceneDef {
  // ---------- Materials tuned to the real hardware & furniture ----------
  const lightOak = new THREE.MeshStandardMaterial({
    color: 0xd4b68e,
    roughness: 0.62,
    metalness: 0.02,
    map: lightOakTexture(),
  });
  const darkRecess = new THREE.MeshStandardMaterial({ color: 0x261d16, roughness: 0.85 });
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x232730,
    roughness: 0.92,
    metalness: 0.02,
    transparent: true,
    opacity: 1,
  });
  const baseboardMat = new THREE.MeshStandardMaterial({
    color: 0x1f232b,
    roughness: 0.8,
    transparent: true,
    opacity: 1,
  });
  const curtainMat = new THREE.MeshStandardMaterial({
    color: 0x3b404b,
    roughness: 0.94,
    metalness: 0.02,
    map: curtainWeaveTexture(),
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 1,
  });

  // PS5 Slim: gloss-white upper covers, fine-matte lower covers, matte-black core, piano-black fascia
  const ps5WhiteUpper = new THREE.MeshStandardMaterial({
    color: 0xf3f2ee,
    roughness: 0.18,
    metalness: 0.04,
  });
  const ps5WhiteLower = new THREE.MeshStandardMaterial({
    color: 0xe9e7e1,
    roughness: 0.58,
    metalness: 0.02,
  });
  const ps5PianoBlack = new THREE.MeshStandardMaterial({
    color: 0x090a0d,
    roughness: 0.1,
    metalness: 0.2,
  });

  // ---------- Screen, Ambilight & indicator materials (marked selfLit) ----------
  const screenCanvas = document.createElement('canvas');
  screenCanvas.width = 1024;
  screenCanvas.height = 576;
  const screenCtx = screenCanvas.getContext('2d')!;
  drawHomeScreen(screenCtx, 0);
  const screenTex = new THREE.CanvasTexture(screenCanvas);
  screenTex.colorSpace = THREE.SRGBColorSpace;
  screenTex.anisotropy = 4;

  const screenGlowMat = new THREE.MeshBasicMaterial({
    map: screenTex,
    toneMapped: false,
    transparent: true,
    opacity: 1,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const ambilightStripMat = new THREE.MeshBasicMaterial({
    color: 0x6282ff,
    toneMapped: false,
    transparent: true,
    opacity: 0.88,
  });
  const tvStandbyLedMat = new THREE.MeshBasicMaterial({
    color: 0xd93829,
    toneMapped: false,
    transparent: true,
    opacity: 0,
  });
  const ps5LedMat = new THREE.MeshBasicMaterial({ color: 0xeaf2ff, toneMapped: false });
  const padLedWhiteMat = new THREE.MeshBasicMaterial({
    color: 0x5c8eff,
    toneMapped: false,
    transparent: true,
    opacity: 0.9,
  });
  const padLedBlackMat = new THREE.MeshBasicMaterial({
    color: 0x5c8eff,
    toneMapped: false,
    transparent: true,
    opacity: 0.72,
  });

  // ---------- Environment ----------
  const ambilight = ambilightWash();
  const backdrop = buildBackdrop(wallMat, baseboardMat, curtainMat, m);
  backdrop.add(ambilight.mesh);
  backdrop.userData.noFit = true;
  const furniture = group(
    buildLightOakCabinet(lightOak, darkRecess, m),
    buildSideCabinet(lightOak, m),
  );

  // ---------- Hardware ----------
  // Upright, turned ~12.5° toward the room so the curved covers read in three-quarter view.
  const ps5 = place(
    buildPs5SlimDigital(m, ps5WhiteUpper, ps5WhiteLower, ps5PianoBlack, ps5LedMat),
    [-70, PLATFORM_TOP, -5],
    [0, 0.22, 0],
  );

  const tv = buildPhilipsTv(m, screenGlowMat, ambilightStripMat, tvStandbyLedMat);

  // One charging station for both controllers: Midnight Black in the front slot,
  // White in the rear slot. Both pads share a single geometry set.
  const padGeo = makeDualSenseGeometries();
  const dock = place(new THREE.Group(), [-92, PLATFORM_TOP, -3], [0, 0.9, 0]);
  dock.add(buildChargingStation(m, ps5WhiteUpper, ps5PianoBlack));
  const black = dockController(
    dock,
    buildDualSense(padGeo, m, 'black', padLedBlackMat),
    DOCK_SLOT_Z,
  );
  const white = dockController(
    dock,
    buildDualSense(padGeo, m, 'white', padLedWhiteMat),
    -DOCK_SLOT_Z,
  );

  // ---------- Light: one forward screen bounce + window daylight ----------
  // The Ambilight wall wash is a single additive shader plane, not real-time lights.
  const screenLight = new THREE.PointLight(0x527dff, 18, 165, 1.45);
  screenLight.position.set(CABINET_X, TV_PANEL_CY - 8, 18);
  const windowLight = new THREE.DirectionalLight(0xfff4e4, 0);
  windowLight.position.set(145, 125, 65);
  windowLight.target.position.set(0, 48, 0);
  const lightsGroup = group(screenLight, windowLight, windowLight.target);
  lightsGroup.userData.noFit = true;

  const parts: Record<string, THREE.Object3D> = {
    ps5,
    tv,
    'dualsense-white': white,
    'dualsense-black': black,
    charger: dock,
  };

  const root = group(backdrop, furniture, lightsGroup, ...Object.values(parts));

  // ---------- Ambilight colour follows the screen (sampled, never per frame) ----------
  const sampler = document.createElement('canvas');
  sampler.width = 32;
  sampler.height = 18;
  const sampleCtx = sampler.getContext('2d', { willReadFrequently: true });
  const target = {
    l: new THREE.Color(0x4a7a3a),
    t: new THREE.Color(0x7aa6d8),
    r: new THREE.Color(0x4a7a3a),
  };
  const current = { l: target.l.clone(), t: target.t.clone(), r: target.r.clone() };
  const hsl = { h: 0, s: 0, l: 0 };
  const vivid = (c: THREE.Color) => {
    // Ambilight LEDs saturate and lift the edge colour of the picture
    c.getHSL(hsl);
    c.setHSL(
      hsl.h,
      Math.min(1, hsl.s * 1.35 + 0.1),
      THREE.MathUtils.clamp(hsl.l * 1.3, 0.34, 0.62),
    );
  };
  const sampleScreen = () => {
    if (!sampleCtx) return;
    sampleCtx.drawImage(screenCanvas, 0, 0, 32, 18);
    const data = sampleCtx.getImageData?.(0, 0, 32, 18)?.data;
    if (!data) return;
    const avg = (x0: number, x1: number, y0: number, y1: number, out: THREE.Color) => {
      let r = 0;
      let g = 0;
      let b = 0;
      let n = 0;
      for (let y = y0; y < y1; y++)
        for (let x = x0; x < x1; x++) {
          const i = (y * 32 + x) * 4;
          r += data[i]!;
          g += data[i + 1]!;
          b += data[i + 2]!;
          n++;
        }
      out.setRGB(r / n / 255, g / n / 255, b / n / 255, THREE.SRGBColorSpace);
      vivid(out);
    };
    avg(0, 4, 2, 18, target.l);
    avg(28, 32, 2, 18, target.r);
    avg(0, 32, 0, 5, target.t);
  };
  sampleScreen();
  current.l.copy(target.l);
  current.t.copy(target.t);
  current.r.copy(target.r);
  let lastSample = 0;

  // ---------- Interactive state coupling (TV power + day/night lighting) ----------
  let currentPower = 1;
  let currentLight = 0; // 0 = night, 1 = day
  let wallFade = 1;
  const nightWall = new THREE.Color(0x232730);
  const dayWall = new THREE.Color(0x3a404c);
  const nightCurtain = new THREE.Color(0x3b404b);
  const dayCurtain = new THREE.Color(0x565d6b);
  const nightBaseboard = new THREE.Color(0x1f232b);
  const dayBaseboard = new THREE.Color(0x323843);
  const activePs5Led = new THREE.Color(0xeaf2ff);
  const standbyPs5Led = new THREE.Color(0xff8c1a);
  const mix = new THREE.Color();

  const applyAmbilight = () => {
    ambilight.set(current.l, current.t, current.r);
    // Daylight washes the wall out; at night the glow carries the room
    ambilight.strength(currentPower * (1 - currentLight * 0.66) * wallFade);
    mix
      .copy(current.l)
      .add(current.t)
      .add(current.r)
      .multiplyScalar(1 / 3);
    ambilightStripMat.color.copy(mix);
    screenLight.color.copy(mix).lerp(new THREE.Color(0xffffff), 0.25);
  };

  const syncEnvironment = () => {
    const roomDimFactor = 1 - currentLight * 0.5;
    screenGlowMat.opacity = currentPower;
    screenGlowMat.visible = currentPower > 0.015;
    ambilightStripMat.opacity = currentPower * (0.9 - currentLight * 0.35);
    ambilightStripMat.visible = currentPower > 0.015;
    tvStandbyLedMat.opacity = (1 - currentPower) * 0.85;
    tvStandbyLedMat.visible = currentPower < 0.98;

    screenLight.intensity = 18 * currentPower * roomDimFactor;
    windowLight.intensity = 1.9 * currentLight;

    ps5LedMat.color.copy(standbyPs5Led).lerp(activePs5Led, currentPower);
    padLedWhiteMat.opacity = 0.2 + 0.75 * currentPower;
    padLedBlackMat.opacity = 0.15 + 0.65 * currentPower;

    wallMat.color.copy(nightWall).lerp(dayWall, currentLight);
    curtainMat.color.copy(nightCurtain).lerp(dayCurtain, currentLight);
    baseboardMat.color.copy(nightBaseboard).lerp(dayBaseboard, currentLight);
    applyAmbilight();
  };
  syncEnvironment();

  return {
    root,
    parts,
    camera: { position: [-6, 68, 252], target: [-6, 60, 0], fov: 32 },
    minDistance: 20,
    focusPoses: {
      ps5: { position: [-42, 44, 60], target: [-70, 34, -5], fov: 32 },
      tv: { position: [14, 86, 176], target: [14, 84, 0], fov: 32 },
      'dualsense-white': { position: [-102, 42, 34], target: [-95, 26, -5.5], fov: 32 },
      'dualsense-black': { position: [-56, 36, 28], target: [-88.8, 25, -0.5], fov: 32 },
      charger: { position: [-64, 34, 30], target: [-91, 22, -2], fov: 32 },
    },
    anchors: {
      ps5: [-70, 57, -5],
      tv: [74, 124.5, 1],
      'dualsense-white': [-104, 35, -8],
      'dualsense-black': [-80, 34, 3],
      charger: [-85.5, 22, 4],
    },
    setPower(k) {
      currentPower = k;
      syncEnvironment();
    },
    setLighting(k) {
      currentLight = k;
      syncEnvironment();
    },
    tickScreen(timeSec) {
      drawHomeScreen(screenCtx, timeSec);
      screenTex.needsUpdate = true;
      // A 32 × 18 readback every 1.2 s; colours then glide toward it each tick.
      if (timeSec - lastSample > 1.2) {
        lastSample = timeSec;
        sampleScreen();
      }
      current.l.lerp(target.l, 0.08);
      current.t.lerp(target.t, 0.08);
      current.r.lerp(target.r, 0.08);
      applyAmbilight();
      return true;
    },
    onCameraMove(camera) {
      // Yield wall and curtains when orbiting into the rear hemisphere (-z)
      // so rear ports, exhaust and the Ambilight strips stay visible.
      const rearFade = THREE.MathUtils.clamp((camera.position.z + 18) / 26, 0.08, 1);
      if (Math.abs(wallMat.opacity - rearFade) > 0.005) {
        wallMat.opacity = rearFade;
        baseboardMat.opacity = rearFade;
        curtainMat.opacity = rearFade;
        wallMat.depthWrite = rearFade > 0.95;
        curtainMat.depthWrite = rearFade > 0.95;
        wallFade = rearFade;
        applyAmbilight();
      }
    },
  };
}

// =====================================================================
// Procedural textures (canvas-authored, zero external downloads)
// =====================================================================

function lightOakTexture() {
  return canvasTexture(512, 512, (c) => {
    c.fillStyle = '#c8aa82';
    c.fillRect(0, 0, 512, 512);
    // Deterministic PRNG so wood grain is identical across runs and screenshots
    let seed = 4219;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    for (let i = 0; i < 120; i++) {
      const shade = rand() > 0.5 ? '138,102,62' : '222,196,158';
      c.strokeStyle = `rgba(${shade},${0.08 + rand() * 0.14})`;
      c.lineWidth = 0.7 + rand() * 2.1;
      const x0 = rand() * 512;
      const freq = 0.01 + rand() * 0.015;
      const amp = 3 + rand() * 8;
      c.beginPath();
      c.moveTo(x0, 0);
      for (let y = 0; y <= 512; y += 24) {
        c.lineTo(x0 + Math.sin(y * freq + i) * amp, y);
      }
      c.stroke();
    }
  });
}

function curtainWeaveTexture() {
  return canvasTexture(
    128,
    128,
    (c) => {
      c.fillStyle = '#d4d8e0';
      c.fillRect(0, 0, 128, 128);
      c.fillStyle = 'rgba(20,24,32,0.09)';
      for (let x = 0; x < 128; x += 4) c.fillRect(x, 0, 1, 128);
      c.fillStyle = 'rgba(255,255,255,0.05)';
      for (let y = 0; y < 128; y += 6) c.fillRect(0, y, 128, 1);
    },
    [6, 8],
  );
}

function philipsBadgeTexture() {
  return canvasTexture(256, 48, (c) => {
    c.fillStyle = '#181a1f';
    c.fillRect(0, 0, 256, 48);
    c.fillStyle = '#aeb5c2';
    c.font = '700 24px sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.letterSpacing = '5px';
    c.fillText('PHILIPS', 128, 25);
  });
}

const symbolTextures = new Map<string, THREE.Texture>();
function psSymbolTexture(symbol: 'triangle' | 'circle' | 'cross' | 'square', dark: boolean) {
  const key = `${symbol}:${dark}`;
  const cached = symbolTextures.get(key);
  if (cached) return cached;
  const tex = canvasTexture(64, 64, (c) => {
    c.fillStyle = dark ? '#1f2228' : '#e6e8ee';
    c.fillRect(0, 0, 64, 64);
    c.strokeStyle = dark ? '#8d94a3' : '#6c7382';
    c.lineWidth = 5;
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.beginPath();
    if (symbol === 'triangle') {
      c.moveTo(32, 16);
      c.lineTo(48, 44);
      c.lineTo(16, 44);
      c.closePath();
    } else if (symbol === 'circle') {
      c.arc(32, 32, 14, 0, Math.PI * 2);
    } else if (symbol === 'cross') {
      c.moveTo(19, 19);
      c.lineTo(45, 45);
      c.moveTo(45, 19);
      c.lineTo(19, 45);
    } else {
      c.rect(19, 19, 26, 26);
    }
    c.stroke();
  });
  symbolTextures.set(key, tex);
  return tex;
}

/**
 * An illustrative, console-style home screen (original artwork and icons):
 * Games / Media tabs, a row of game tiles with the selected one enlarged,
 * full-bleed key art for the selected game, its title and a Play Game button.
 */
function drawHomeScreen(c: CanvasRenderingContext2D, t: number) {
  const W = 1024;
  const H = 576;
  const font = (weight: number, size: number) =>
    `${weight} ${size}px system-ui, "Segoe UI", sans-serif`;

  // Full-bleed key art with a slow drift (Caelora), or a painted fallback
  if (art) {
    const zoom = 1.05 + 0.025 * Math.sin(t * 0.06);
    const sw = W / zoom;
    const sh = H / zoom;
    const sx = (W - sw) * (0.5 + 0.4 * Math.sin(t * 0.045));
    c.drawImage(art, sx, (H - sh) * 0.5, sw, sh, 0, 0, W, H);
  } else {
    const sky = c.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#8fb6dc');
    sky.addColorStop(0.42, '#b9d2e6');
    sky.addColorStop(0.43, '#5f9a3c');
    sky.addColorStop(1, '#2f5a22');
    c.fillStyle = sky;
    c.fillRect(0, 0, W, H);
  }

  // Legibility scrims: top for the bar and tiles, left and bottom for the title
  const scrim = (g: CanvasGradient, a: number) => {
    g.addColorStop(0, `rgba(5,9,20,${a})`);
    g.addColorStop(1, 'rgba(5,9,20,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, W, H);
  };
  scrim(c.createLinearGradient(0, 0, 0, 230), 0.66);
  scrim(c.createLinearGradient(0, 0, 660, 0), 0.62);
  scrim(c.createLinearGradient(0, H, 0, H - 250), 0.72);

  // Tabs
  c.textAlign = 'left';
  c.textBaseline = 'alphabetic';
  c.fillStyle = '#ffffff';
  c.font = font(700, 22);
  c.fillText('Games', 48, 46);
  c.fillStyle = 'rgba(255,255,255,0.55)';
  c.font = font(500, 22);
  c.fillText('Media', 134, 46);

  // Search, settings, profile and clock
  c.strokeStyle = 'rgba(255,255,255,0.88)';
  c.lineWidth = 2.4;
  c.beginPath();
  c.arc(W - 236, 37, 8, 0, Math.PI * 2);
  c.moveTo(W - 230, 43);
  c.lineTo(W - 223, 50);
  c.stroke();
  c.beginPath();
  c.arc(W - 190, 39, 8.5, 0, Math.PI * 2);
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    c.moveTo(W - 190 + Math.cos(a) * 9, 39 + Math.sin(a) * 9);
    c.lineTo(W - 190 + Math.cos(a) * 12.5, 39 + Math.sin(a) * 12.5);
  }
  c.stroke();
  c.beginPath();
  c.arc(W - 190, 39, 3, 0, Math.PI * 2);
  c.stroke();
  const avatar = c.createLinearGradient(W - 156, 24, W - 126, 54);
  avatar.addColorStop(0, '#ff8a5c');
  avatar.addColorStop(1, '#7a4dff');
  c.fillStyle = avatar;
  c.beginPath();
  c.arc(W - 141, 39, 15, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#ffffff';
  c.textAlign = 'right';
  c.font = font(500, 21);
  c.fillText('21:40', W - 48, 46);

  // Game tiles: the selected one is larger, with its name beside it
  const y0 = 76;
  const big = 96;
  const small = 70;
  const gap = 12;
  const tileAt = (x: number, size: number, draw: () => void) => {
    c.save();
    c.beginPath();
    c.roundRect(x, y0, size, size, 12);
    c.clip();
    draw();
    c.restore();
  };
  let x = 48;
  tileAt(x, big, () => {
    if (art) c.drawImage(art, 0, 576, 128, 128, x, y0, big, big);
    else {
      c.fillStyle = '#4f8a32';
      c.fillRect(x, y0, big, big);
    }
  });
  c.strokeStyle = `rgba(255,255,255,${0.86 + 0.14 * Math.sin(t * 2.2)})`;
  c.lineWidth = 3;
  c.beginPath();
  c.roundRect(x - 2, y0 - 2, big + 4, big + 4, 14);
  c.stroke();
  c.fillStyle = '#ffffff';
  c.textAlign = 'left';
  c.font = font(600, 20);
  c.fillText('Caelora', x + big + 16, y0 + big / 2 + 7);
  x += big + 16 + (c.measureText('Caelora')?.width ?? 76) + 24;

  const palette: [string, string][] = [
    ['#e0833a', '#5a2a12'],
    ['#3a8fe0', '#0f2d5a'],
    ['#9b5de5', '#2d1458'],
    ['#2ec4b6', '#0d3b37'],
    ['#e63946', '#4a0d14'],
  ];
  palette.forEach(([a, b], i) => {
    const tx = x + i * (small + gap);
    tileAt(tx, small, () => {
      const g = c.createLinearGradient(tx, y0, tx + small, y0 + small);
      g.addColorStop(0, a);
      g.addColorStop(1, b);
      c.fillStyle = g;
      c.fillRect(tx, y0, small, small);
      c.fillStyle = 'rgba(255,255,255,0.32)';
      c.strokeStyle = 'rgba(255,255,255,0.4)';
      c.lineWidth = 4;
      const cx = tx + small / 2;
      const cy = y0 + small / 2;
      c.beginPath();
      if (i % 3 === 0) c.arc(cx, cy, 15, 0, Math.PI * 2);
      else if (i % 3 === 1) {
        c.moveTo(cx - 18, cy + 13);
        c.lineTo(cx, cy - 15);
        c.lineTo(cx + 18, cy + 13);
        c.closePath();
      } else c.rect(cx - 13, cy - 13, 26, 26);
      if (i % 2) c.fill();
      else c.stroke();
    });
  });
  // Library: a plain grid glyph
  const lx = x + palette.length * (small + gap);
  c.fillStyle = 'rgba(255,255,255,0.14)';
  c.beginPath();
  c.roundRect(lx, y0, small, small, 12);
  c.fill();
  c.fillStyle = 'rgba(255,255,255,0.85)';
  for (let r = 0; r < 3; r++)
    for (let q = 0; q < 3; q++) c.fillRect(lx + 20 + q * 11, y0 + 20 + r * 11, 8, 8);

  // Selected game: title, genre line, Play Game and an options button
  c.fillStyle = '#ffffff';
  c.font = font(800, 66);
  c.letterSpacing = '6px';
  c.fillText('CAELORA', 46, 398);
  c.letterSpacing = '0px';
  c.fillStyle = 'rgba(232,238,250,0.86)';
  c.font = font(500, 19);
  c.fillText('Voxel fantasy sandbox · Unity 6', 50, 432);
  c.fillStyle = '#f4f6fb';
  c.beginPath();
  c.roundRect(48, 458, 180, 52, 26);
  c.fill();
  c.fillStyle = '#11141b';
  c.textAlign = 'center';
  c.font = font(600, 20);
  c.fillText('Play Game', 138, 491);
  c.fillStyle = 'rgba(255,255,255,0.16)';
  c.strokeStyle = 'rgba(255,255,255,0.4)';
  c.lineWidth = 2;
  c.beginPath();
  c.arc(268, 484, 26, 0, Math.PI * 2);
  c.fill();
  c.stroke();
  c.fillStyle = '#ffffff';
  for (const dx of [-8, 0, 8]) {
    c.beginPath();
    c.arc(268 + dx, 484, 2.6, 0, Math.PI * 2);
    c.fill();
  }
}

// =====================================================================
// Ambilight: a soft 3-sided wall wash behind the TV (one additive plane)
// =====================================================================

function ambilightWash() {
  const halfSize = new THREE.Vector2(57, 32);
  const uniforms = {
    cL: { value: new THREE.Color() },
    cT: { value: new THREE.Color() },
    cR: { value: new THREE.Color() },
    strength: { value: 1 },
    halfSize: { value: halfSize },
  };
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: /* glsl */ `
      varying vec2 vP;
      void main() {
        vP = position.xy;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 cL;
      uniform vec3 cT;
      uniform vec3 cR;
      uniform float strength;
      uniform vec2 halfSize;
      varying vec2 vP;
      void main() {
        vec2 d2 = abs(vP) - halfSize;
        float d = length(max(d2, 0.0)) + min(max(d2.x, d2.y), 0.0);
        float g = exp(-max(d, 0.0) / 24.0) * smoothstep(-26.0, 3.0, d);
        vec2 q = vP / halfSize;
        g *= smoothstep(-1.6, -0.55, q.y); // no LEDs along the bottom edge
        g *= 1.0 - smoothstep(0.7, 0.98, max(abs(vP.x) / 125.0, abs(vP.y) / 90.0)); // no plane edge
        float wl = max(-q.x, 0.0);
        float wr = max(q.x, 0.0);
        float wt = max(q.y, 0.0) * 1.15;
        vec3 col = (cL * wl + cR * wr + cT * wt) / max(wl + wr + wt, 1e-3);
        gl_FragColor = vec4(col, clamp(g * strength, 0.0, 1.0));
        #include <colorspace_fragment>
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(250, 180), material);
  mesh.position.set(CABINET_X, TV_PANEL_CY + 4, WALL_FRONT + 0.15);
  mesh.renderOrder = 1;
  return {
    mesh,
    set(l: THREE.Color, t: THREE.Color, r: THREE.Color) {
      uniforms.cL.value.copy(l);
      uniforms.cT.value.copy(t);
      uniforms.cR.value.copy(r);
    },
    strength(k: number) {
      uniforms.strength.value = k * 0.95;
      mesh.visible = k > 0.01;
    },
  };
}

// =====================================================================
// Environment: continuous neutral wall, skirting, right pleated curtains & furniture
// =====================================================================

function buildBackdrop(
  wallMat: THREE.Material,
  baseboardMat: THREE.Material,
  curtainMat: THREE.Material,
  m: Materials,
) {
  const g = new THREE.Group();

  // One plain wall wide and tall enough for every orbit: no openings or recesses
  const wall = box(460, 230, 1.8, wallMat, 0.1, [0, 115, WALL_FRONT - 0.9]);
  const skirting = box(460, 7.5, 0.9, baseboardMat, 0.1, [0, 3.75, WALL_FRONT + 0.3]);
  g.add(wall, skirting);

  // Pleated floor-to-ceiling curtains on the right side (x = +88 .. +156 cm)
  const cw = 68;
  const ch = 170;
  const curtainGeo = new THREE.PlaneGeometry(cw, ch, 64, 18);
  const pos = curtainGeo.getAttribute('position');
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const normY = (ch / 2 - y) / ch; // 0 at top rail, 1 at hem
    const pleat =
      Math.sin((x / cw) * Math.PI * 12) * (2.3 + normY * 0.65) +
      Math.cos((x / cw) * Math.PI * 6) * 0.45;
    pos.setZ(i, pleat);
  }
  curtainGeo.computeVertexNormals();
  const curtain = new THREE.Mesh(curtainGeo, curtainMat);
  curtain.position.set(122, 86, -19.5);
  curtain.receiveShadow = true;
  g.add(curtain);

  // Discreet dark curtain track along top right
  g.add(box(72, 1.6, 4.2, m.satin, 0.2, [122, 171.6, -19.5]));
  return g;
}

/**
 * Light-oak TV cabinet: overhanging top slab, open two-shelf storage bay on the
 * left, and two closed doors on the middle and right with symmetric black
 * horizontal handles near the top meeting edge.
 */
function buildLightOakCabinet(lightOak: THREE.Material, darkRecess: THREE.Material, m: Materials) {
  const g = new THREE.Group();
  const w = 136;
  const d = 40;
  const plinthH = 3.6;
  const bodyH = CABINET_TOP - 2.8 - plinthH; // 39.6 cm
  const bodyCy = plinthH + bodyH / 2;

  // Overhanging top slab (140 × 2.8 × 42 cm) & bottom plinth + base board
  g.add(box(140, 2.8, 42, lightOak, 0.28, [0, CABINET_TOP - 1.4, 0.4]));
  g.add(box(w - 2, plinthH, d - 2.5, m.plasticSoft, 0.1, [0, plinthH / 2, -0.4]));
  g.add(box(w, 2.0, d, lightOak, 0.16, [0, plinthH + 1.0, 0]));

  // Outer left/right side panels & two internal vertical dividers (3 equal bays)
  const wallT = 2.0;
  const bayW = (w - wallT * 4) / 3; // 42.67 cm per bay
  const xLeft = -w / 2 + wallT / 2;
  const xDiv1 = xLeft + wallT / 2 + bayW + wallT / 2;
  const xDiv2 = xDiv1 + wallT + bayW;
  const xRight = w / 2 - wallT / 2;

  for (const x of [xLeft, xDiv1, xDiv2, xRight]) {
    g.add(box(wallT, bodyH, d, lightOak, 0.12, [x, bodyCy, 0]));
  }
  // Rear panel
  g.add(box(w - 1, bodyH, 1.0, darkRecess, 0.05, [0, bodyCy, -d / 2 + 0.6]));

  // Left bay: open storage compartment with recessed dark interior & oak middle shelf
  const openCx = (xLeft + xDiv1) / 2;
  g.add(
    box(bayW - 0.1, 0.5, d - 1.5, darkRecess, 0.02, [openCx, CABINET_TOP - 3.1, -0.2]),
    box(bayW - 0.1, 0.5, d - 1.5, darkRecess, 0.02, [openCx, plinthH + 2.25, -0.2]),
    box(0.3, bodyH - 2.4, d - 1.6, darkRecess, 0.02, [
      xLeft + wallT / 2 + 0.16,
      bodyCy + 0.3,
      -0.2,
    ]),
    box(0.3, bodyH - 2.4, d - 1.6, darkRecess, 0.02, [
      xDiv1 - wallT / 2 - 0.16,
      bodyCy + 0.3,
      -0.2,
    ]),
    box(bayW, 1.85, d - 1.4, lightOak, 0.14, [openCx, bodyCy + 0.3, 0.2]),
  );

  // Middle and right bays: two closed light-oak doors, proud of the carcass front
  const doorH = bodyH - 2.2;
  const doorCy = plinthH + 2.0 + doorH / 2;
  const doorZ = d / 2 + 0.85;
  const midCx = (xDiv1 + xDiv2) / 2;
  const rightCx = (xDiv2 + xRight) / 2;

  g.add(box(bayW + 0.8, doorH, 1.7, lightOak, 0.18, [midCx, doorCy, doorZ]));
  g.add(box(bayW + 0.8, doorH, 1.7, lightOak, 0.18, [rightCx, doorCy, doorZ]));

  // Black horizontal cabinet handles: top-right of middle door & top-left of right door
  const handleY = doorCy + doorH / 2 - 4.4;
  const makeHandle = (hx: number) =>
    group(
      box(10.8, 1.05, 0.8, m.plastic, 0.22, [hx, handleY, doorZ + 1.55]),
      box(1.1, 1.0, 1.0, m.plastic, 0.12, [hx - 4.1, handleY, doorZ + 1.0]),
      box(1.1, 1.0, 1.0, m.plastic, 0.12, [hx + 4.1, handleY, doorZ + 1.0]),
    );
  g.add(makeHandle(midCx + bayW / 2 - 8.2), makeHandle(rightCx - bayW / 2 + 8.2));

  return place(g, [CABINET_X, 0, 0]);
}

/**
 * The smaller side cabinet left of the TV cabinet, in the same light oak as the
 * main cabinet (the planned repaint): same footprint and height as before.
 */
function buildSideCabinet(lightOak: THREE.Material, m: Materials) {
  const g = group(
    box(43, PLATFORM_TOP - 2.4, 33, lightOak, 0.18, [0, (PLATFORM_TOP - 2.4) / 2, 0]),
    box(46, 2.4, 35.5, lightOak, 0.28, [0, PLATFORM_TOP - 1.2, 0]),
  );
  for (const x of [-18, 18]) {
    for (const z of [-13, 13]) {
      g.add(cyl(1.2, 1.2, 0.5, m.rubber, [x, 0.25, z], 12));
    }
  }
  return place(g, [PLATFORM_X, 0, PLATFORM_Z]);
}

// =====================================================================
// Hardware 1: Sony PlayStation 5 Slim Digital Edition (825 GB)
// =====================================================================

const PS5_H = 35.8;
const PS5_CORE = 1.65; // half-width of the black core
const PS5_ZH = 10.5;
const PS5_SPLIT = 21.6; // gloss upper covers above, matte lower covers below

/** Outer half-width of the white covers: slim waist, flaring toward the top. */
const ps5HalfWidth = (y: number) => {
  const h = y / PS5_H;
  return 3.45 + 0.6 * smooth(0.4, 1, h) - 0.1 * (1 - h);
};

/**
 * One of the four curved covers. The surface is lofted over depth (u) and
 * height (v): convex across its face, curling in toward the core at the front
 * and rear edges, with the wing tip rising toward the front-top. The inner skin
 * meets the outer one at the perimeter, so edges come out rounded and the
 * shading stays smooth (no stitched rim).
 */
function ps5CoverGeo(side: -1 | 1, tier: 'upper' | 'lower') {
  const uSeg = 28;
  const vSeg = tier === 'upper' ? 14 : 18;
  const thickness = 0.36;
  const ramp = (t: number) => smooth(0, 0.08, t) * smooth(0, 0.08, 1 - t);

  const sample = (u: number, v: number, inner: boolean): Vec => {
    const top = tier === 'upper' ? 34.3 + 1.5 * Math.pow(u, 1.6) : PS5_SPLIT - 0.17;
    const bottom = tier === 'upper' ? PS5_SPLIT + 0.17 : 0.55;
    const y = bottom + v * (top - bottom);
    const h = y / PS5_H;
    const zFront = PS5_ZH + 0.5 * smooth(0.6, 1, h);
    const z = -PS5_ZH + u * (zFront + PS5_ZH);
    const s = Math.abs(2 * u - 1);
    const profile = 1 - 0.6 * Math.pow(s, 4.5) + 0.18 * Math.sin(Math.PI * u);
    const reach = ps5HalfWidth(y) - PS5_CORE - 0.3;
    let x = PS5_CORE + 0.3 + reach * profile;
    if (inner) x -= thickness * ramp(u) * ramp(v);
    return [side * x, y, z];
  };

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const stride = uSeg + 1;
  const layer = stride * (vSeg + 1);
  for (const inner of [false, true]) {
    for (let iv = 0; iv <= vSeg; iv++)
      for (let iu = 0; iu <= uSeg; iu++) {
        positions.push(...sample(iu / uSeg, iv / vSeg, inner));
        uvs.push(iu / uSeg, iv / vSeg);
      }
  }
  // Outer faces point away from the core (+x on the right cover)
  const flipOuter = side > 0;
  for (let iv = 0; iv < vSeg; iv++)
    for (let iu = 0; iu < uSeg; iu++) {
      const a = iv * stride + iu;
      const b = a + 1;
      const c = a + stride + 1;
      const d = a + stride;
      for (const [off, flip] of [
        [0, flipOuter],
        [layer, !flipOuter],
      ] as const) {
        if (flip) indices.push(off + a, off + c, off + b, off + a, off + d, off + c);
        else indices.push(off + a, off + b, off + c, off + a, off + c, off + d);
      }
    }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function buildPs5SlimDigital(
  m: Materials,
  whiteUpper: THREE.Material,
  whiteLower: THREE.Material,
  pianoBlack: THREE.Material,
  ledMat: THREE.Material,
) {
  const g = new THREE.Group();

  // Round vertical stand under the console
  g.add(cyl(6.2, 6.4, 0.5, m.plasticSoft, [0, 0.25, 0], 36));

  // Black core: side profile with a rounded front-top shoulder and a gently arched top
  const p = new THREE.Shape();
  p.moveTo(-10.2, 0.6);
  p.lineTo(10.0, 0.6);
  p.lineTo(10.2, 28);
  p.quadraticCurveTo(10.3, 34.2, 6.0, 34.5);
  p.quadraticCurveTo(0, 34.9, -6.0, 34.3);
  p.quadraticCurveTo(-10.3, 33.9, -10.3, 28);
  p.lineTo(-10.2, 0.6);
  const bevel = 0.25;
  const coreGeo = new THREE.ExtrudeGeometry(p, {
    depth: PS5_CORE * 2 - bevel * 2,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 3,
    curveSegments: 16,
  });
  coreGeo.rotateY(-Math.PI / 2); // profile x → depth (z), extrusion → width (x)
  coreGeo.translate(PS5_CORE - bevel, 0, 0);
  g.add(new THREE.Mesh(coreGeo, m.plastic));

  // Gloss-black front fascia on the core
  g.add(box(PS5_CORE * 2 - 0.5, 27, 0.3, pianoBlack, 0.12, [0, 16, 10.45]));

  // Four covers: two gloss upper, two matte lower, split by a dark seam
  for (const s of [-1, 1] as const) {
    g.add(
      new THREE.Mesh(ps5CoverGeo(s, 'upper'), whiteUpper),
      new THREE.Mesh(ps5CoverGeo(s, 'lower'), whiteLower),
    );
  }

  // Intake louvres in the front channels between covers and core (one InstancedMesh)
  const louvreGeo = new THREE.BoxGeometry(0.24, 0.1, 0.9);
  const louvres = new THREE.InstancedMesh(louvreGeo, m.rubber, 64);
  const mat4 = new THREE.Matrix4();
  const tilt = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.2, 0, 0));
  const one = new THREE.Vector3(1, 1, 1);
  let i = 0;
  for (const s of [-1, 1] as const)
    for (let k = 0; k < 32; k++) {
      mat4.compose(new THREE.Vector3(s * (PS5_CORE + 0.22), 3 + k * 0.95, 9.1), tilt, one);
      louvres.setMatrixAt(i++, mat4);
    }
  g.add(louvres);

  // Power light along both front edges of the core
  for (const s of [-1, 1] as const) {
    const led = box(0.14, 10, 0.2, ledMat, 0.05, [s * (PS5_CORE - 0.25), 26, 10.62]);
    led.userData.selfLit = true;
    g.add(led);
  }

  // Front I/O of the Digital Edition: two USB-C ports and the power button (no disc slot)
  for (const y of [5.2, 6.8]) {
    g.add(box(0.95, 0.36, 0.22, m.steel, 0.12, [0, y, 10.62]));
    g.add(box(0.66, 0.14, 0.24, m.label, 0.04, [0, y, 10.66]));
  }
  g.add(box(0.36, 1.6, 0.22, m.gunmetal, 0.1, [0, 9.4, 10.62]));

  // Rear exhaust grille & ports (2 × USB-A, LAN, HDMI 2.1, AC inlet)
  g.add(
    box(
      2.9,
      20,
      0.3,
      new THREE.MeshStandardMaterial({
        color: 0x181a1e,
        roughness: 0.8,
        map: grilleTexture([3, 18], '#050608', '#25282e'),
      }),
      0.05,
      [0, 22, -10.45],
    ),
  );
  g.add(box(1.3, 0.6, 0.25, glow(0x2952ff), 0.04, [0, 10.2, -10.5]));
  g.add(box(1.3, 0.6, 0.25, glow(0x2952ff), 0.04, [0, 8.9, -10.5]));
  g.add(box(1.4, 1.2, 0.25, m.steel, 0.05, [0, 7.2, -10.5]));
  g.add(box(1.4, 0.55, 0.25, m.gold, 0.05, [0, 5.5, -10.5]));
  g.add(box(1.7, 1.0, 0.25, m.label, 0.2, [0, 3.3, -10.5]));

  return g;
}

// =====================================================================
// Hardware 2: Philips 55-inch QLED 4K Ambilight TV (55PUS8450/12)
// =====================================================================

function buildPhilipsTv(
  m: Materials,
  screenGlowMat: THREE.Material,
  ambilightMat: THREE.Material,
  standbyLedMat: THREE.Material,
) {
  const g = new THREE.Group();
  const w = 122.6;
  const h = 71.5;

  // Ultra-slim outer frame & thin bezels (recessed behind the display plane)
  g.add(box(w, h, 1.1, m.satin, 0.22, [0, TV_PANEL_CY, -0.62]));
  g.add(
    box(w, 0.72, 0.45, m.satin, 0.12, [0, TV_PANEL_BOTTOM + h - 0.36, 0.16]),
    box(0.72, h, 0.45, m.satin, 0.12, [-w / 2 + 0.36, TV_PANEL_CY, 0.16]),
    box(0.72, h, 0.45, m.satin, 0.12, [w / 2 - 0.36, TV_PANEL_CY, 0.16]),
  );
  // Slightly taller dark-gunmetal bottom chin with PHILIPS branding
  g.add(box(w, 1.55, 0.65, m.gunmetal, 0.18, [0, TV_PANEL_BOTTOM + 0.78, 0.24]));
  const badge = new THREE.Mesh(
    new THREE.PlaneGeometry(7.2, 1.1),
    new THREE.MeshBasicMaterial({ map: philipsBadgeTexture() }),
  );
  badge.position.set(0, TV_PANEL_BOTTOM + 0.78, 0.62);
  g.add(badge);

  // IR / light-sensor pod beneath the chin + standby LED
  g.add(box(3.8, 0.65, 1.2, m.plastic, 0.15, [16, TV_PANEL_BOTTOM - 0.25, -0.1]));
  const standbyDot = new THREE.Mesh(new THREE.CircleGeometry(0.18, 12), standbyLedMat);
  standbyDot.position.set(17.1, TV_PANEL_BOTTOM - 0.25, 0.56);
  standbyDot.userData.selfLit = true;
  g.add(standbyDot);

  // Powered-off deep-black glass + the active home-screen layer
  const screenW = w - 1.44;
  const screenH = h - 2.27;
  const screenCy = TV_PANEL_CY + 0.41;
  const qledGlass = new THREE.Mesh(
    new THREE.PlaneGeometry(screenW, screenH),
    new THREE.MeshStandardMaterial({ color: 0x05060a, roughness: 0.07, metalness: 0.3 }),
  );
  qledGlass.position.set(0, screenCy, 0.08);
  const activeScreen = new THREE.Mesh(new THREE.PlaneGeometry(screenW, screenH), screenGlowMat);
  activeScreen.position.set(0, screenCy, 0.34);
  activeScreen.userData.selfLit = true;
  g.add(qledGlass, activeScreen);

  // Stepped rear electronics enclosure (VESA 200 × 100 mm)
  g.add(box(84, 42, 3.6, m.plastic, 0.6, [0, TV_PANEL_CY - 8, -2.4]));
  g.add(box(52, 24, 1.8, m.plasticSoft, 0.4, [0, TV_PANEL_CY - 12, -5.0]));
  for (const vx of [-10, 10]) {
    for (const vy of [-5, 5]) {
      const bolt = cyl(0.45, 0.45, 0.3, m.steel, [vx, TV_PANEL_CY - 2 + vy, -4.3], 14);
      bolt.rotation.x = Math.PI / 2;
      g.add(bolt);
    }
  }
  // Rear I/O pocket
  g.add(box(9, 16, 0.6, m.label, 0.1, [-34, TV_PANEL_CY - 10, -4.1]));
  for (let i = 0; i < 4; i++) {
    g.add(box(0.5, 1.5, 0.4, m.gold, 0.05, [-37.5, TV_PANEL_CY - 5 - i * 2.8, -4.2]));
  }

  // 3-sided Ambilight LED strips along the rear left, top and right edges
  const ambiTop = box(w - 10, 0.7, 0.5, ambilightMat, 0.1, [0, TV_PANEL_BOTTOM + h - 2.2, -1.45]);
  const ambiL = box(0.7, h - 8, 0.5, ambilightMat, 0.1, [-w / 2 + 2.2, TV_PANEL_CY, -1.45]);
  const ambiR = box(0.7, h - 8, 0.5, ambilightMat, 0.1, [w / 2 - 2.2, TV_PANEL_CY, -1.45]);
  for (const strip of [ambiTop, ambiL, ambiR]) strip.userData.selfLit = true;
  g.add(ambiTop, ambiL, ambiR);

  // Angled matte-black stick feet: 80.2 cm apart, 29.7 cm foot depth
  for (const s of [-1, 1] as const) {
    const fx = s * 40.1;
    g.add(
      rod(
        [fx, CABINET_TOP + 1.1, -0.5],
        [fx - s * 1.4, TV_PANEL_BOTTOM + 1.5, -0.8],
        0.95,
        m.satin,
      ),
      rod(
        [fx - s * 0.3, CABINET_TOP + 1.2, -0.5],
        [fx + s * 2.1, CABINET_TOP + 0.55, 14.2],
        0.82,
        m.satin,
      ),
      rod(
        [fx - s * 0.3, CABINET_TOP + 1.2, -0.5],
        [fx + s * 1.1, CABINET_TOP + 0.55, -14.8],
        0.78,
        m.satin,
      ),
      cyl(0.85, 0.95, 0.4, m.rubber, [fx + s * 2.1, CABINET_TOP + 0.2, 14.2], 12),
      cyl(0.85, 0.95, 0.4, m.rubber, [fx + s * 1.1, CABINET_TOP + 0.2, -14.8], 12),
    );
  }

  return place(g, [CABINET_X, 0, 0]);
}

// =====================================================================
// Hardware 3 & 4: Sony DualSense Wireless Controller (shared geometry)
// =====================================================================

/** Body is 3.6 cm thick at the centre; grips droop and swell below it. */
const PAD_MID = 1.8;
const PAD_TOP = 3.6;
/** Rear (trigger-side) edge of the body, in the pad's local z. */
const PAD_EDGE_Z = -4.38;

const padGripness = (x: number, z: number) => smooth(3.3, 5.6, Math.abs(x)) * smooth(-0.8, 5.4, z);
/** Height of the flat top deck: it rises slightly toward the touchpad. */
const padTopY = (z: number) => PAD_TOP + 0.38 * clamp01(-z / 4.4);

interface DualSenseGeoSet {
  shellTop: THREE.BufferGeometry;
  shellBottom: THREE.BufferGeometry;
  centrePanel: THREE.BufferGeometry;
  touchpad: THREE.BufferGeometry;
  lightBar: THREE.BufferGeometry;
  dpadBtn: THREE.BufferGeometry;
  faceBtn: THREE.BufferGeometry;
  faceCap: THREE.BufferGeometry;
  pillBtn: THREE.BufferGeometry;
  psBtn: THREE.BufferGeometry;
  bumper: THREE.BufferGeometry;
  trigger: THREE.BufferGeometry;
  stickWell: THREE.BufferGeometry;
  stickBase: THREE.BufferGeometry;
  stickStem: THREE.BufferGeometry;
  stickCap: THREE.BufferGeometry;
  stickRim: THREE.BufferGeometry;
}

/**
 * The whole DualSense body as one smooth shell: the top-view silhouette is
 * extruded with a deep round bevel, welded, then bent so the grips droop and
 * swell into handles and the deck rises toward the touchpad. Triangles above
 * the waist form the top shell, those below form the underside (black on the
 * White model), sharing one vertex buffer.
 */
function dualSenseShell() {
  const half: [number, number][] = [
    [0, -4.35],
    [2.6, -4.45],
    [4.6, -4.55],
    [6.2, -4.2],
    [7.2, -3.2],
    [7.75, -1.2],
    [7.95, 1.2],
    [7.85, 3.6],
    [7.35, 5.4],
    [6.5, 6.05],
    [5.5, 5.9],
    [4.85, 4.9],
    [4.4, 3.6],
    [3.9, 2.9],
    [2.6, 2.3],
    [0, 2.4],
  ];
  const loop = [
    ...half,
    ...half
      .slice(1, -1)
      .reverse()
      .map(([x, z]) => [-x, z] as [number, number]),
  ];
  // The bevel grows the outline by 0.85 cm: shrink the path so the outer silhouette is 16 × 10.6 cm.
  const curve = new THREE.CatmullRomCurve3(
    loop.map(([x, z]) => new THREE.Vector3(x * 0.9, (z - 0.75) * 0.84 + 0.75, 0)),
    true,
    'centripetal',
  );
  const outline = curve
    .getPoints(132)
    .slice(0, -1)
    .map((p) => new THREE.Vector2(p.x, p.y));
  const extruded = new THREE.ExtrudeGeometry(new THREE.Shape(outline), {
    depth: PAD_MID,
    steps: 2,
    bevelEnabled: true,
    bevelThickness: 0.9,
    bevelSize: 0.85,
    bevelSegments: 5,
  });
  extruded.rotateX(Math.PI / 2); // outline → top view, extrusion → height
  extruded.translate(0, PAD_TOP - 0.9, 0);
  extruded.deleteAttribute('normal');
  extruded.deleteAttribute('uv');
  const geo = mergeVertices(extruded, 1e-3);
  extruded.dispose();

  const pos = geo.getAttribute('position');
  const rest = Float32Array.from(pos.array as Float32Array);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const s = padGripness(x, z);
    let ny = PAD_MID + (y - PAD_MID) * (1 + 0.35 * s);
    ny -= 1.9 * s * Math.pow(clamp01((z + 0.8) / 6.2), 1.5);
    ny += 0.38 * clamp01(-z / 4.4) * clamp01((y - PAD_MID) / PAD_MID);
    pos.setY(i, ny);
  }
  geo.computeVertexNormals();

  const index = geo.index!.array;
  const top: number[] = [];
  const bottom: number[] = [];
  for (let t = 0; t < index.length; t += 3) {
    const a = index[t]!;
    const b = index[t + 1]!;
    const c = index[t + 2]!;
    const restY = (rest[a * 3 + 1]! + rest[b * 3 + 1]! + rest[c * 3 + 1]!) / 3;
    (restY > PAD_MID ? top : bottom).push(a, b, c);
  }
  const part = (list: number[]) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', geo.getAttribute('position'));
    g.setAttribute('normal', geo.getAttribute('normal'));
    g.setIndex(list);
    return g;
  };
  return { shellTop: part(top), shellBottom: part(bottom) };
}

/** A flat plate in top view (x, z), `depth` thick, bottom face at y = 0. */
function plate(shape: THREE.Shape, depth: number, bevel = 0) {
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 3,
    curveSegments: 12,
  });
  geo.rotateX(Math.PI / 2);
  geo.translate(0, depth + bevel, 0);
  return geo;
}

function makeDualSenseGeometries(): DualSenseGeoSet {
  const { shellTop, shellBottom } = dualSenseShell();

  // Black centre panel between the grips that carries the sticks and PS button
  const cp = new THREE.Shape();
  cp.moveTo(-3.95, -0.55);
  cp.lineTo(3.95, -0.55);
  cp.quadraticCurveTo(4.2, 0.7, 3.55, 1.75);
  cp.quadraticCurveTo(2.4, 2.05, 0, 2.0);
  cp.quadraticCurveTo(-2.4, 2.05, -3.55, 1.75);
  cp.quadraticCurveTo(-4.2, 0.7, -3.95, -0.55);
  const centrePanel = plate(cp, 0.1);

  // Touchpad: wider at the top edge, rounded corners (centred on its own origin)
  const tp = new THREE.Shape();
  tp.moveTo(-2.45, -1.32);
  tp.lineTo(2.45, -1.32);
  tp.quadraticCurveTo(2.72, -1.32, 2.68, -1.05);
  tp.lineTo(2.3, 1.05);
  tp.quadraticCurveTo(2.25, 1.3, 2.0, 1.3);
  tp.lineTo(-2.0, 1.3);
  tp.quadraticCurveTo(-2.25, 1.3, -2.3, 1.05);
  tp.lineTo(-2.68, -1.05);
  tp.quadraticCurveTo(-2.72, -1.32, -2.45, -1.32);
  const touchpad = plate(tp, 0.14, 0.06);

  const lightBar = new THREE.BoxGeometry(0.14, 0.12, 2.5);

  // D-pad wedge (rotated four ways)
  const dp = new THREE.Shape();
  dp.moveTo(-0.36, 0.22);
  dp.lineTo(0, -0.14);
  dp.lineTo(0.36, 0.22);
  dp.lineTo(0.36, 0.92);
  dp.quadraticCurveTo(0, 1.02, -0.36, 0.92);
  dp.closePath();
  const dpadBtn = plate(dp, 0.2, 0.06);

  const faceBtn = new THREE.CylinderGeometry(0.46, 0.49, 0.32, 20);
  const faceCap = new THREE.CircleGeometry(0.42, 18);
  faceCap.rotateX(-Math.PI / 2);
  const pillBtn = new THREE.CapsuleGeometry(0.13, 0.42, 4, 10);
  pillBtn.rotateZ(Math.PI / 2);
  const psBtn = new THREE.CylinderGeometry(0.42, 0.45, 0.18, 20);

  // L1 / R1: rounded bars along the rear edge; L2 / R2: curved triggers below them
  const bumper = new THREE.CapsuleGeometry(0.34, 1.7, 4, 10);
  bumper.rotateZ(Math.PI / 2);
  bumper.scale(1, 1, 1.3);
  const tr = new THREE.Shape(); // side profile in (z, y), z toward the rear
  tr.moveTo(0, 0);
  tr.quadraticCurveTo(0.75, 0.1, 0.95, -0.4);
  tr.quadraticCurveTo(1.15, -1.1, 0.75, -1.65);
  tr.lineTo(0.4, -1.55);
  tr.quadraticCurveTo(0.55, -0.8, 0.1, -0.45);
  tr.closePath();
  const trigger = new THREE.ExtrudeGeometry(tr, {
    depth: 1.7,
    bevelEnabled: true,
    bevelThickness: 0.14,
    bevelSize: 0.12,
    bevelSegments: 3,
    curveSegments: 10,
  });
  trigger.rotateY(Math.PI / 2); // profile x → -z (rear), extrusion → x
  trigger.translate(-0.85, 0, 0);

  const stickWell = new THREE.TorusGeometry(1.06, 0.13, 8, 28);
  stickWell.rotateX(Math.PI / 2);
  const stickBase = new THREE.SphereGeometry(0.92, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.5);
  const stickStem = new THREE.CylinderGeometry(0.28, 0.32, 0.6, 14);
  const stickCap = new THREE.CylinderGeometry(0.84, 0.74, 0.26, 24);
  const stickRim = new THREE.TorusGeometry(0.8, 0.1, 8, 24);
  stickRim.rotateX(Math.PI / 2);

  return {
    shellTop,
    shellBottom,
    centrePanel,
    touchpad,
    lightBar,
    dpadBtn,
    faceBtn,
    faceCap,
    pillBtn,
    psBtn,
    bumper,
    trigger,
    stickWell,
    stickBase,
    stickStem,
    stickCap,
    stickRim,
  };
}

function buildDualSense(
  geo: DualSenseGeoSet,
  m: Materials,
  variant: 'white' | 'black',
  ledMat: THREE.Material,
) {
  const isBlack = variant === 'black';
  const std = (color: number, roughness: number, metalness = 0.04) =>
    new THREE.MeshStandardMaterial({ color, roughness, metalness });
  const shellMat = isBlack ? std(0x1d1f25, 0.5, 0.06) : std(0xefeee9, 0.38, 0.03);
  const underMat = isBlack ? std(0x16181d, 0.58) : std(0x17191d, 0.6);
  const panelMat = isBlack ? std(0x101216, 0.66) : std(0x121418, 0.62);
  const padMat = isBlack ? std(0x23262d, 0.42) : std(0xebeae4, 0.32, 0.03);
  const btnMat = isBlack ? std(0x272a32, 0.3, 0.08) : std(0xe3e5ec, 0.18, 0.05);

  const g = new THREE.Group();
  const mesh = (gg: THREE.BufferGeometry, mat: THREE.Material, at: Vec, rot?: Vec) =>
    place(new THREE.Mesh(gg, mat), at, rot);

  g.add(
    new THREE.Mesh(geo.shellTop, shellMat),
    new THREE.Mesh(geo.shellBottom, underMat),
    mesh(geo.centrePanel, panelMat, [0, PAD_TOP + 0.02, 0]),
  );

  // Touchpad on the sloping deck, framed by the two light bars
  const tpZ = -2.05;
  const slope = Math.atan(0.38 / 4.4);
  g.add(mesh(geo.touchpad, padMat, [0, padTopY(tpZ) - 0.08, tpZ], [slope, 0, 0]));
  for (const s of [-1, 1] as const) {
    const bar = mesh(
      geo.lightBar,
      ledMat,
      [s * 2.56, padTopY(tpZ) + 0.02, tpZ],
      [slope, -s * 0.175, 0],
    );
    bar.userData.selfLit = true;
    g.add(bar);
  }

  // Analog sticks in the black panel
  for (const s of [-1, 1] as const) {
    const y = PAD_TOP + 0.1;
    g.add(
      place(
        group(
          mesh(geo.stickWell, m.plasticSoft, [0, 0.02, 0]),
          mesh(geo.stickBase, m.plastic, [0, -0.36, 0]),
          mesh(geo.stickStem, m.plastic, [0, 0.62, 0]),
          mesh(geo.stickCap, m.rubber, [0, 0.98, 0]),
          mesh(geo.stickRim, m.rubber, [0, 1.1, 0]),
        ),
        [s * 2.45, y, 0.8],
      ),
    );
  }

  // D-pad (left) and the four action buttons (right)
  const dpad = new THREE.Group();
  for (let i = 0; i < 4; i++)
    dpad.add(mesh(geo.dpadBtn, btnMat, [0, 0, 0], [0, (i * Math.PI) / 2, 0]));
  g.add(place(dpad, [-4.5, padTopY(-1.35) - 0.04, -1.35]));
  const symbols: readonly ['triangle' | 'circle' | 'cross' | 'square', number, number][] = [
    ['triangle', 0, -0.95],
    ['circle', 0.95, 0],
    ['cross', 0, 0.95],
    ['square', -0.95, 0],
  ];
  for (const [sym, dx, dz] of symbols) {
    const at: Vec = [4.5 + dx, padTopY(-1.35 + dz) + 0.08, -1.35 + dz];
    const capMat = new THREE.MeshStandardMaterial({
      map: psSymbolTexture(sym, isBlack),
      roughness: 0.2,
      metalness: 0.05,
    });
    g.add(mesh(geo.faceBtn, btnMat, at), mesh(geo.faceCap, capMat, [at[0], at[1] + 0.165, at[2]]));
  }

  // Create & Options, PS button and mute
  g.add(
    mesh(geo.pillBtn, btnMat, [-3.42, padTopY(-3.15) + 0.06, -3.15], [slope, 0.35, 0]),
    mesh(geo.pillBtn, btnMat, [3.42, padTopY(-3.15) + 0.06, -3.15], [slope, -0.35, 0]),
    mesh(geo.psBtn, m.gunmetal, [0, PAD_TOP + 0.14, 1.25]),
    mesh(geo.pillBtn, btnMat, [0, PAD_TOP + 0.1, 1.82]),
  );

  // Shoulder buttons and triggers on the rear edge, USB-C port between them
  for (const s of [-1, 1] as const) {
    g.add(
      mesh(geo.bumper, panelMat, [s * 4.55, PAD_TOP - 0.65, -4.5], [0, s * 0.1, 0]),
      mesh(geo.trigger, panelMat, [s * 4.55, PAD_TOP - 1.25, -4.2], [0, s * 0.1, 0]),
    );
  }
  g.add(box(0.95, 0.34, 0.2, m.steel, 0.1, [0, PAD_MID, PAD_EDGE_Z - 0.02]));

  return g;
}

// =====================================================================
// Hardware 5: DualSense Charging Station (both controllers, one dock)
// =====================================================================

/** The two USB-C slots sit along the dock's length: + is the front slot. */
const DOCK_SLOT_Z = 4.1;
/** Height of the deck top where a docked controller's body rests. */
const DOCK_SEAT_Y = 6.3;

function buildChargingStation(m: Materials, whiteMat: THREE.Material, blackMat: THREE.Material) {
  // 5.2 cm wide × 6.2 cm high × 15.9 cm long
  const g = new THREE.Group();
  const p = new THREE.Shape(); // side profile in (z, y)
  p.moveTo(-6.9, 0);
  p.lineTo(6.9, 0);
  p.quadraticCurveTo(7.75, 0, 7.7, 1.1);
  p.lineTo(7.45, 5.0);
  p.quadraticCurveTo(7.3, 5.8, 6.5, 5.8);
  p.lineTo(-6.5, 5.8);
  p.quadraticCurveTo(-7.3, 5.8, -7.45, 5.0);
  p.lineTo(-7.7, 1.1);
  p.quadraticCurveTo(-7.75, 0, -6.9, 0);
  const shell = new THREE.ExtrudeGeometry(p, {
    depth: 4.4,
    bevelEnabled: true,
    bevelThickness: 0.4,
    bevelSize: 0.2,
    bevelSegments: 4,
    curveSegments: 10,
  });
  shell.rotateY(-Math.PI / 2);
  shell.translate(2.2, 0.2, 0);
  g.add(new THREE.Mesh(shell, whiteMat));

  // Black top deck with the two slots, each with its USB-C plug
  g.add(box(3.4, 0.5, 14.4, blackMat, 0.2, [0, 6.05, 0]));
  for (const z of [-DOCK_SLOT_Z, DOCK_SLOT_Z]) {
    g.add(
      box(2.4, 0.3, 4.4, m.rubber, 0.12, [0, 6.22, z]),
      box(0.85, 0.5, 0.26, m.steel, 0.1, [0, 6.45, z]),
    );
  }
  // Charge indicator at the front end
  g.add(box(0.9, 0.18, 0.12, glow(0xf2a33a), 0.05, [0, 1.2, 7.98]));
  return g;
}

/** Lower-centre edge of the body between the grips, in the pad's local z (outline + bevel). */
const PAD_CROTCH_Z = 2.99;

/**
 * Stands a controller upright in a dock slot the way the owner keeps them:
 * touchpad on top, grips down astride the dock, face toward the dock's front,
 * leaning back a few degrees, resting on the deck by the lower centre of its
 * body. The controller stays its own part, so it is placed at the slot's
 * world transform rather than parented to the dock.
 */
function dockController(dock: THREE.Object3D, pad: THREE.Group, slotZ: number) {
  const seat = place(new THREE.Group(), [0, DOCK_SEAT_Y, slotZ], [-0.1, 0, 0]);
  dock.add(seat);
  dock.updateMatrixWorld(true);
  const part = new THREE.Group();
  part.applyMatrix4(seat.matrixWorld);
  dock.remove(seat);
  // local (x, y, z) → (x, -z, y): face (+y) to the front, grips (+z) down
  part.add(place(pad, [0, PAD_CROTCH_Z, -PAD_MID], [Math.PI / 2, 0, 0]));
  return part;
}
