/**
 * Shared modelling kit for the /setup scenes: materials, procedural canvas
 * textures and parts that several machines reuse (fans, DIMMs, drives, cards).
 * Units are centimetres. Everything is built in code from public dimensions,
 * so no third-party model or texture is shipped.
 */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export type Vec = [number, number, number];

/** Quality chosen once per stage: segment counts follow it. */
export const quality = { segments: 32 };

const std = (color: number, roughness: number, metalness = 0, extra: object = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });

/** Materials are created once per stage and disposed with it. */
export function makeMaterials() {
  return {
    plastic: std(0x17191c, 0.62),
    plasticSoft: std(0x24272b, 0.55),
    satin: std(0x1c1e21, 0.42, 0.55),
    gunmetal: std(0x3b3f45, 0.32, 0.85),
    aluminium: std(0xa3a8ae, 0.3, 1),
    steel: std(0x6c727a, 0.38, 0.9),
    chrome: std(0xd7dbe0, 0.12, 1),
    rubber: std(0x0d0e0f, 0.92),
    fabric: std(0x202226, 1),
    redAnodised: std(0xa3162b, 0.34, 0.65),
    redPlastic: std(0x9b1424, 0.5),
    gold: std(0xc59a3d, 0.3, 0.9),
    copper: std(0xb8734a, 0.28, 1),
    wood: std(0x5b3d29, 0.68, 0, { map: woodTexture() }),
    pcb: std(0x22262c, 0.55, 0.1, { map: pcbTexture('#22262c') }),
    pcbGreen: std(0x123224, 0.55, 0.1, { map: pcbTexture('#1d4a35') }),
    silicon: std(0x0b0c0d, 0.3, 0.2),
    label: std(0x101113, 0.5),
    fins: std(0x2a2d31, 0.45, 0.7, { map: finsTexture() }),
    glass: new THREE.MeshStandardMaterial({
      color: 0x7f8c99,
      roughness: 0.04,
      metalness: 0.1,
      transparent: true,
      opacity: 0.09,
      depthWrite: false,
    }),
    lens: std(0x05070a, 0.05, 0.6),
    white: std(0xd9d6cf, 0.6),
  };
}
export type Materials = ReturnType<typeof makeMaterials>;

/** Light emitted by the object itself (RGB, LEDs, screens): never shaded. */
export const glow = (color: number | THREE.Texture, opacity = 1) =>
  new THREE.MeshBasicMaterial(
    typeof color === 'number'
      ? { color, toneMapped: false, transparent: opacity < 1, opacity }
      : { map: color, toneMapped: false, transparent: opacity < 1, opacity },
  );

// ---------- Canvas textures (drawn at runtime: nothing is downloaded) ----------

export function canvasTexture(
  w: number,
  h: number,
  draw: (ctx: CanvasRenderingContext2D) => void,
  repeat?: [number, number],
) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  draw(ctx);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  if (repeat) {
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(...repeat);
  }
  return texture;
}

function woodTexture() {
  return canvasTexture(512, 128, (c) => {
    c.fillStyle = '#5b3d29';
    c.fillRect(0, 0, 512, 128);
    for (let i = 0; i < 70; i++) {
      c.strokeStyle = `rgba(${30 + Math.random() * 30},${18 + Math.random() * 14},10,${0.12 + Math.random() * 0.18})`;
      c.lineWidth = 0.6 + Math.random() * 1.6;
      const y = Math.random() * 128;
      c.beginPath();
      c.moveTo(0, y);
      for (let x = 0; x <= 512; x += 32) c.lineTo(x, y + Math.sin(x / 70 + i) * 3);
      c.stroke();
    }
  });
}

function pcbTexture(base = '#15181b') {
  return canvasTexture(
    512,
    512,
    (c) => {
      c.fillStyle = base;
      c.fillRect(0, 0, 512, 512);
      c.strokeStyle = 'rgba(160,170,180,0.09)';
      c.lineWidth = 1.2;
      for (let i = 0; i < 140; i++) {
        let x = Math.random() * 512;
        let y = Math.random() * 512;
        c.beginPath();
        c.moveTo(x, y);
        for (let s = 0; s < 4; s++) {
          if (Math.random() > 0.5) x += (Math.random() - 0.5) * 140;
          else y += (Math.random() - 0.5) * 140;
          c.lineTo(x, y);
        }
        c.stroke();
      }
      c.fillStyle = 'rgba(190,190,190,0.12)';
      for (let i = 0; i < 260; i++) c.fillRect(Math.random() * 512, Math.random() * 512, 3, 2);
    },
    [1, 1],
  );
}

function finsTexture() {
  return canvasTexture(
    64,
    64,
    (c) => {
      c.fillStyle = '#2a2d31';
      c.fillRect(0, 0, 64, 64);
      c.fillStyle = '#121416';
      for (let x = 0; x < 64; x += 4) c.fillRect(x, 0, 2, 64);
    },
    [8, 1],
  );
}

/** A perforated grille: dots on a dark field (mic heads, PSU and case vents). */
export function grilleTexture(repeat: [number, number], hole = '#050607', field = '#2b2e33') {
  return canvasTexture(
    64,
    64,
    (c) => {
      c.fillStyle = field;
      c.fillRect(0, 0, 64, 64);
      c.fillStyle = hole;
      for (const [x, y] of [
        [16, 16],
        [48, 16],
        [0, 48],
        [32, 48],
        [64, 48],
      ] as const) {
        c.beginPath();
        c.arc(x, y, 9, 0, Math.PI * 2);
        c.fill();
      }
    },
    repeat,
  );
}

/** A spectrum strip for RGB lighting. */
export function rgbTexture(repeat = 1) {
  return canvasTexture(
    256,
    4,
    (c) => {
      const g = c.createLinearGradient(0, 0, 256, 0);
      [
        '#ff3355',
        '#ff9a2e',
        '#f4ff3a',
        '#3dff8a',
        '#2ee6ff',
        '#5b6bff',
        '#d34bff',
        '#ff3355',
      ].forEach((col, i, a) => g.addColorStop(i / (a.length - 1), col));
      c.fillStyle = g;
      c.fillRect(0, 0, 256, 4);
    },
    [repeat, 1],
  );
}

// ---------- Geometry helpers ----------

/** A bevelled box: the default for any housing. */
export function box(w: number, h: number, d: number, mat: THREE.Material, r = 0.15, at?: Vec) {
  const radius = Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001);
  const geometry =
    radius > 0.02 ? new RoundedBoxGeometry(w, h, d, 3, radius) : new THREE.BoxGeometry(w, h, d);
  const mesh = new THREE.Mesh(geometry, mat);
  if (at) mesh.position.set(...at);
  return mesh;
}

export function cyl(
  rTop: number,
  rBottom: number,
  h: number,
  mat: THREE.Material,
  at?: Vec,
  seg = quality.segments,
) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBottom, h, seg), mat);
  if (at) mesh.position.set(...at);
  return mesh;
}

export function group(...children: THREE.Object3D[]) {
  const g = new THREE.Group();
  if (children.length) g.add(...children);
  return g;
}

export const place = <T extends THREE.Object3D>(o: T, at: Vec, rot?: Vec) => {
  o.position.set(...at);
  if (rot) o.rotation.set(...rot);
  return o;
};

/** A tube along points (cables, hoses, gas springs). */
export function tube(points: Vec[], r: number, mat: THREE.Material) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  return new THREE.Mesh(new THREE.TubeGeometry(curve, 48, r, 10, false), mat);
}

/** A rod between two points. */
export function rod(a: Vec, b: Vec, r: number, mat: THREE.Material) {
  const va = new THREE.Vector3(...a);
  const vb = new THREE.Vector3(...b);
  const mesh = cyl(r, r, va.distanceTo(vb), mat, undefined, 16);
  mesh.position.copy(va).add(vb).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), vb.sub(va).normalize());
  return mesh;
}

/**
 * An axial fan facing +z: square frame with a round throat, hub and swept
 * blades. `light` adds an RGB ring to the hub.
 */
export function fan(size: number, m: Materials, opts: { light?: boolean; depth?: number } = {}) {
  const depth = opts.depth ?? 2.5;
  const r = size * 0.46;
  const shape = new THREE.Shape();
  const h = size / 2;
  const c = size * 0.08;
  shape.moveTo(-h + c, -h);
  shape.lineTo(h - c, -h);
  shape.quadraticCurveTo(h, -h, h, -h + c);
  shape.lineTo(h, h - c);
  shape.quadraticCurveTo(h, h, h - c, h);
  shape.lineTo(-h + c, h);
  shape.quadraticCurveTo(-h, h, -h, h - c);
  shape.lineTo(-h, -h + c);
  shape.quadraticCurveTo(-h, -h, -h + c, -h);
  const hole = new THREE.Path();
  hole.absarc(0, 0, r, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  const frame = new THREE.Mesh(
    new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 24 }),
    m.plastic,
  );
  frame.position.z = -depth / 2;

  const hub = cyl(r * 0.36, r * 0.36, depth * 0.8, m.plasticSoft);
  hub.rotation.x = Math.PI / 2;

  const blades = new THREE.Group();
  const bladeShape = new THREE.Shape();
  bladeShape.moveTo(0, 0);
  bladeShape.quadraticCurveTo(r * 0.5, r * 0.18, r * 0.95, r * 0.05);
  bladeShape.quadraticCurveTo(r * 0.7, -r * 0.3, 0, -r * 0.22);
  const bladeGeo = new THREE.ExtrudeGeometry(bladeShape, { depth: 0.12, bevelEnabled: false });
  const count = 9;
  for (let i = 0; i < count; i++) {
    const blade = new THREE.Mesh(bladeGeo, m.plasticSoft);
    blade.position.x = r * 0.3;
    const holder = new THREE.Group();
    holder.add(blade);
    blade.rotation.y = 0.35;
    holder.rotation.z = (i / count) * Math.PI * 2;
    blades.add(holder);
  }
  const fanGroup = group(frame, hub, blades);
  if (opts.light) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r * 0.37, 0.14, 8, 40), glow(rgbTexture()));
    ring.position.z = depth * 0.42;
    fanGroup.add(ring);
  }
  return fanGroup;
}

/** A 3.5-inch hard drive lying flat, connectors toward -z. */
export function hdd(m: Materials) {
  const g = group(box(10.2, 2.6, 14.7, m.aluminium, 0.12));
  g.add(box(10, 0.06, 11, m.label, 0.01, [0, 1.31, 1.2]));
  g.add(box(8.5, 0.3, 9, m.pcbGreen, 0.02, [0, -1.36, 0.5]));
  g.add(box(2.2, 0.8, 0.3, m.plastic, 0.02, [-2, -0.6, -7.4]));
  g.add(box(1.4, 0.8, 0.3, m.plastic, 0.02, [1, -0.6, -7.4]));
  return g;
}

/** A 2.5-inch SATA SSD lying flat. */
export function ssd25(m: Materials) {
  const g = group(box(7, 0.7, 10, m.satin, 0.15));
  g.add(box(6, 0.04, 6, m.label, 0.01, [0, 0.36, 0.6]));
  g.add(box(2.2, 0.5, 0.3, m.plastic, 0.02, [-1.4, 0, -5.1]));
  return g;
}

/** An M.2 2280 stick lying flat. */
export function m2(m: Materials, labelColor = 0x101113) {
  const g = group(box(2.2, 0.08, 8, m.pcb, 0.01));
  for (const z of [-2.2, 0.4, 2.8]) g.add(box(1.5, 0.12, 1.5, m.silicon, 0.03, [0, 0.1, z]));
  g.add(box(2.1, 0.02, 6.8, std(labelColor, 0.5), 0.01, [0, 0.17, 0.3]));
  g.add(box(2.2, 0.09, 0.35, m.gold, 0.01, [0, 0, -4]));
  return g;
}

/** Planned kit is drawn as a ghost: translucent steel with dashed edges. */
export function ghostify(root: THREE.Object3D) {
  const fill = new THREE.MeshBasicMaterial({
    color: 0x8fa0b5,
    transparent: true,
    opacity: 0.14,
    depthWrite: false,
  });
  const edgeMat = new THREE.LineDashedMaterial({
    color: 0xb9c6d6,
    dashSize: 1.6,
    gapSize: 1.1,
    transparent: true,
    opacity: 0.85,
  });
  const meshes: THREE.Mesh[] = [];
  root.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) meshes.push(o as THREE.Mesh);
  });
  for (const mesh of meshes) {
    mesh.material = fill;
    mesh.castShadow = false;
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry, 50), edgeMat);
    edges.computeLineDistances();
    edges.userData.ghostEdge = true;
    mesh.add(edges);
  }
  root.userData.ghost = true;
  return root;
}
