/**
 * The WebGL stage behind each /setup view. Loaded on demand by
 * src/scripts/explorer.ts, only where WebGL works; the SVG drawing and the
 * parts list stay the accessible, always-available version.
 *
 * It renders on demand (no idle loop) and releases every GPU resource on
 * dispose. Page scrolling always wins: the wheel and one finger scroll the
 * page; the model turns with a mouse drag or two fingers, zooms with a pinch
 * (or ctrl + wheel, a trackpad pinch) and has buttons for both.
 *
 * Every movement goes through one Motion (./motion.ts) with a channel per
 * property: the camera, the exploded offsets, the case shell, the desk veil,
 * the highlight. A new request on a channel replaces the running one, so the
 * stage always heads for the latest state and can be interrupted at any point.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { makeMaterials, quality, type Materials, type Vec } from './kit';
import { ease, Motion } from './motion';
import type { Mode, Pose, SceneDef } from './scene';

export interface StageHooks {
  pick(id: string): void;
  hover(id: string | null): void;
  /** The stage asks for another display mode (an internal part was chosen). */
  mode(mode: Mode): void;
  /** The browser dropped the WebGL context; the explorer rebuilds or falls back. */
  lost(): void;
}

export interface Stage {
  readonly modes: Mode[];
  select(id: string | null, animate?: boolean): void;
  hover(id: string | null): void;
  setMode(mode: Mode, animate?: boolean): void;
  setUpgrade(on: boolean): void;
  orbit(step: number): void;
  zoom(step: number): void;
  reset(): void;
  /** Travel toward another view (through a door, or out of this case). */
  leave(view: string): Promise<boolean>;
  /** Start from the frame `view` handed over and travel in, ending in `mode`. */
  arrive(view: string, mode: Mode): Promise<boolean>;
  /** Head back to the resting view (an interrupted leave). */
  settle(): Promise<boolean>;
  /** The current frame on a 2D canvas: the picture held while the next view loads. */
  snapshot(): HTMLCanvasElement;
  dispose(): void;
}

const builders: Record<string, () => Promise<(m: Materials) => SceneDef>> = {
  desk: () => import('./desk').then((x) => x.buildDesk),
  inside: () => import('./pc').then((x) => x.buildInside),
  secondary: () => import('./pc').then((x) => x.buildSecondary),
  laptop: () => import('./laptop').then((x) => x.buildLaptop),
};

/** Fetch a view's scene code ahead of a view change. */
export const prefetch = (view: string) => void builders[view]?.().catch(() => {});

/** The site's signal red (tokens.css --signal), for the selected part. */
const ACCENT = new THREE.Color(0xee5f4b);
/** How far the view leans toward a chosen part (0 none, 1 centred on it). */
const FOCUS = 0.35;
/** What is left of the desk around the tower while the camera goes in. */
const VEIL = 0.06;

/** Timings (ms). Design targets; reduced motion makes them all instant. */
const T = { highlight: 220, focus: 480, mode: 650, door: 580, arrive: 640, settle: 560 };

let support: 'gpu' | 'software' | null | undefined;

/**
 * 'gpu' when WebGL 2 is hardware accelerated, 'software' when the browser
 * would render it on the CPU (SwiftShader, llvmpipe), null without it. The
 * explorers only use 'gpu': a CPU-rendered model would make the page janky,
 * and the drawing serves those visitors better. Probed once per page.
 */
export function webglSupport(): 'gpu' | 'software' | null {
  if (support !== undefined) return support;
  try {
    const probe = (failIfMajorPerformanceCaveat: boolean) => {
      const gl = document
        .createElement('canvas')
        .getContext('webgl2', { failIfMajorPerformanceCaveat });
      if (!gl) return false;
      // Not every browser flags a CPU renderer as a performance caveat
      // (SwiftShader on Linux passes); its name gives it away where exposed.
      const info = gl.getExtension('WEBGL_debug_renderer_info');
      const name = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : '';
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return !(
        failIfMajorPerformanceCaveat && /swiftshader|llvmpipe|softpipe|basic render/i.test(name)
      );
    };
    support = probe(true) ? 'gpu' : probe(false) ? 'software' : null;
  } catch {
    support = null;
  }
  return support;
}

type Group = 'shell' | 'veil' | 'upgrade';

export async function mountStage(
  software: boolean,
  host: HTMLElement,
  view: string,
  numbers: Map<string, string>,
  hooks: StageHooks,
): Promise<Stage> {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse = matchMedia('(pointer: coarse)').matches;
  const nav = navigator as Navigator & { deviceMemory?: number };
  const low =
    software || coarse || (nav.deviceMemory ?? 8) < 4 || (navigator.hardwareConcurrency ?? 8) <= 4;
  quality.segments = low ? 20 : 32;

  const loader = builders[view];
  if (!loader) throw new Error(`No 3D scene for ${view}`);
  const build = await loader();
  const renderer = new THREE.WebGLRenderer({ antialias: !low, alpha: true });
  renderer.setPixelRatio(software ? 1 : Math.min(devicePixelRatio, low ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.3;
  renderer.shadowMap.enabled = !low;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  // The light never moves: the shadow map is redrawn only when the parts do.
  renderer.shadowMap.autoUpdate = false;
  const canvas = renderer.domElement;
  canvas.className = 'stage-gl';
  canvas.setAttribute('aria-hidden', 'true');
  const tagLayer = document.createElement('div');
  tagLayer.className = 'stage-tags';
  tagLayer.setAttribute('aria-hidden', 'true');

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = env;
  scene.environmentIntensity = 0.8;

  const materials = makeMaterials();
  const def = build(materials);
  scene.add(def.root);

  // Lights: a warm key from the front left, a cool rim from behind.
  const bounds = new THREE.Box3().setFromObject(def.root);
  const size = bounds.getSize(new THREE.Vector3());
  const centre = bounds.getCenter(new THREE.Vector3());
  const span = Math.max(size.x, size.y, size.z);
  scene.add(new THREE.HemisphereLight(0xe3e8f0, 0x202328, 1.1));
  const key = new THREE.DirectionalLight(0xfff0dc, 2.6);
  key.position.set(centre.x - span * 0.5, centre.y + span * 0.9, centre.z + span * 0.7);
  key.target.position.copy(centre);
  key.castShadow = !low;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.02;
  const sc = key.shadow.camera;
  sc.left = sc.bottom = -span * 0.75;
  sc.right = sc.top = span * 0.75;
  sc.near = 1;
  sc.far = span * 3;
  scene.add(key, key.target);
  const rim = new THREE.DirectionalLight(0x9fb6ff, 0.9);
  // A soft headlight rides with the camera, so turning never leaves the
  // facing side in the dark.
  const headlight = new THREE.DirectionalLight(0xffffff, 0.55);
  rim.position.set(centre.x + span, centre.y + span * 0.4, centre.z - span);
  scene.add(rim);

  // Floor: a drafting grid and a shadow catcher.
  const floorY = bounds.min.y;
  const grid = new THREE.GridHelper(span * 1.6, Math.round((span * 1.6) / 10), 0x3a4048, 0x23272c);
  (grid.material as THREE.Material).transparent = true;
  (grid.material as THREE.Material).opacity = 0.45;
  grid.position.set(centre.x, floorY - 0.05, centre.z);
  scene.add(grid);
  const catcher = new THREE.Mesh(
    new THREE.PlaneGeometry(span * 3, span * 3),
    new THREE.ShadowMaterial({ opacity: 0.38 }),
  );
  catcher.rotation.x = -Math.PI / 2;
  catcher.position.set(centre.x, floorY, centre.z);
  catcher.receiveShadow = true;
  scene.add(catcher);

  // Parts: tag meshes with their id, keep base materials for lighting.
  const partMeshes = new Map<string, THREE.Mesh[]>();
  const meshPart = new Map<THREE.Object3D, string>();
  for (const [id, object] of Object.entries(def.parts)) {
    const list: THREE.Mesh[] = [];
    object.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh && !(o as THREE.LineSegments).isLineSegments) return;
      mesh.userData.base = mesh.material;
      if (mesh.isMesh) {
        mesh.userData.cast = !low && !object.userData.ghost;
        mesh.receiveShadow = !low;
      }
      list.push(mesh);
      meshPart.set(mesh, id);
    });
    partMeshes.set(id, list);
    object.userData.home = object.position.clone();
  }
  // Everything else that can fade (case panels outside the parts).
  const looseMeshes: THREE.Mesh[] = [];
  const inGroup = (objects: THREE.Object3D[] | undefined, group: Group) => {
    for (const o of objects ?? [])
      o.traverse((c) => {
        const mesh = c as THREE.Mesh;
        if (!mesh.isMesh && !(c as THREE.LineSegments).isLineSegments) return;
        mesh.userData.alpha = group;
        if (!meshPart.has(mesh)) {
          mesh.userData.base = mesh.material;
          mesh.userData.cast = !low;
          looseMeshes.push(mesh);
        }
      });
  };
  inGroup(def.shell, 'shell');
  const upgradePart = def.upgrade ? def.parts[def.upgrade] : undefined;
  if (upgradePart) inGroup([upgradePart], 'upgrade');

  // ---------- Camera ----------
  const camera = new THREE.PerspectiveCamera(def.camera.fov ?? 35, 1, 1, span * 12);
  headlight.position.set(0, 0, 1);
  camera.add(headlight);
  scene.add(camera);

  // Corners of every piece's box: a tighter fit than the scene's one box.
  const cornersOf = (box: THREE.Box3, shift?: Vec) =>
    [0, 1, 2, 3, 4, 5, 6, 7].map(
      (i) =>
        new THREE.Vector3(
          (i & 1 ? box.max.x : box.min.x) + (shift?.[0] ?? 0),
          (i & 2 ? box.max.y : box.min.y) + (shift?.[1] ?? 0),
          (i & 4 ? box.max.z : box.min.z) + (shift?.[2] ?? 0),
        ),
    );
  const corners = [...def.root.children, ...Object.values(def.parts)].flatMap((part) =>
    cornersOf(new THREE.Box3().setFromObject(part)),
  );
  const explodedCorners = [
    ...corners,
    ...Object.entries(def.explode ?? {}).flatMap(([id, offset]) =>
      def.parts[id] ? cornersOf(new THREE.Box3().setFromObject(def.parts[id]), offset) : [],
    ),
  ];
  const sphere = bounds.getBoundingSphere(new THREE.Sphere());
  const probe = new THREE.PerspectiveCamera();
  const point = new THREE.Vector3();
  /** The closest distance along `dir` at which every corner fits in 88% of the frame. */
  const fitDistance = (dir: THREE.Vector3, target: THREE.Vector3, points: THREE.Vector3[]) => {
    probe.fov = camera.fov;
    probe.aspect = camera.aspect;
    probe.updateProjectionMatrix();
    let near = sphere.radius * 0.2;
    let far = sphere.radius * 8;
    for (let i = 0; i < 18; i++) {
      const d = (near + far) / 2;
      probe.position.copy(target).addScaledVector(dir, d);
      probe.lookAt(target);
      probe.updateMatrixWorld();
      const inside = points.every((c) => {
        point.copy(c).project(probe);
        return Math.abs(point.x) < 0.88 && Math.abs(point.y) < 0.88 && point.z < 1;
      });
      if (inside) far = d;
      else near = d;
    }
    return far;
  };
  type Rig = { position: THREE.Vector3; target: THREE.Vector3 };
  const rig = (p: Pose, shift?: Vec): Rig => {
    const s = new THREE.Vector3(...(shift ?? [0, 0, 0]));
    return {
      position: new THREE.Vector3(...p.position).add(s),
      target: new THREE.Vector3(...p.target).add(s),
    };
  };
  /** The authored direction of view for a mode, at the distance that fits this frame. */
  const poseFor = (m: Mode): Rig => {
    const authored = m === 'assembled' ? def.camera : (def.inspect ?? def.camera);
    const { position, target } = rig(authored);
    const dir = position.sub(target).normalize();
    const d = fitDistance(dir, target, m === 'exploded' ? explodedCorners : corners);
    return { position: target.clone().addScaledVector(dir, d), target };
  };

  const controls = new OrbitControls(camera, canvas);
  controls.enableZoom = true; // pinch and ctrl + wheel only; see onWheel
  controls.enablePan = false;
  controls.enableDamping = !reduced;
  controls.dampingFactor = 0.12;
  controls.rotateSpeed = 0.6;
  controls.maxPolarAngle = Math.PI * 0.49;
  // One finger scrolls the page; two turn and pinch.
  controls.touches = { ONE: null, TWO: THREE.TOUCH.DOLLY_ROTATE };
  canvas.style.touchAction = 'pan-y';
  let homeDistance = 1;
  const setLimits = () => {
    const home = poseFor('assembled');
    homeDistance = home.position.distanceTo(home.target);
    controls.minDistance = homeDistance * 0.3;
    controls.maxDistance = homeDistance * 2;
  };

  // ---------- Rendering on demand ----------
  let frame = 0;
  let disposed = false;
  let contextLost = false;
  const schedule = () => {
    if (!frame && !disposed) frame = requestAnimationFrame(render);
  };
  const motion = new Motion(schedule, reduced);

  // ---------- Tags: the list's numbers, pinned over each part ----------
  const tags = new Map<string, HTMLElement>();
  for (const id of Object.keys(def.parts)) {
    const n = numbers.get(id);
    if (!n) continue;
    const tag = document.createElement('span');
    tag.className = 'stage-tag';
    tag.textContent = n;
    tag.dataset.tag = id;
    tag.addEventListener('click', () => hooks.pick(id));
    tagLayer.append(tag);
    tags.set(id, tag);
  }
  const anchor = new THREE.Vector3();
  const box3 = new THREE.Box3();
  const placeTags = () => {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    for (const [id, tag] of tags) {
      const object = def.parts[id];
      const shown =
        object?.visible &&
        !(mode === 'assembled' && def.hidden?.includes(id)) &&
        !(id === def.upgrade && alpha.upgrade < 0.5) &&
        !(veiled.has(id) && alpha.veil < 0.5);
      if (!shown) {
        tag.hidden = true;
        continue;
      }
      const authored = def.anchors?.[id];
      if (authored) {
        anchor
          .set(...authored)
          .add(object.position)
          .sub(object.userData.home as THREE.Vector3);
      } else {
        box3.setFromObject(object);
        box3.getCenter(anchor);
        anchor.y = box3.max.y;
      }
      anchor.project(camera);
      tag.hidden = anchor.z > 1;
      tag.style.translate = `${((anchor.x + 1) / 2) * w}px ${((1 - anchor.y) / 2) * h}px`;
    }
  };

  // Frames slower than ~30 fps while moving lower the resolution, one step
  // at a time, down to one device pixel per CSS pixel.
  let slow = 0;
  let last = 0;
  function render(now: number) {
    frame = 0;
    if (contextLost) return;
    const travelling = motion.has('camera');
    let busy = motion.tick(now);
    if (!motion.has('camera') && controls.update()) busy = true;
    else if (travelling) camera.lookAt(controls.target);
    renderer.render(scene, camera);
    placeTags();
    if (busy && last) {
      slow = now - last > 34 ? slow + 1 : Math.max(0, slow - 1);
      if (slow > 12 && renderer.getPixelRatio() > 1) {
        renderer.setPixelRatio(Math.max(1, renderer.getPixelRatio() - 0.5));
        resize();
        slow = 0;
      }
    }
    last = busy ? now : 0;
    host.dataset.motion = busy ? 'moving' : 'idle';
    if (busy) schedule();
  }
  controls.addEventListener('change', schedule);

  // ---------- Camera travel ----------
  // The offset from target to camera turns along a great circle (a quaternion
  // slerp) while its length changes geometrically, so orbits stay round and
  // dollies feel even; the target moves in a straight line.
  const q = new THREE.Quaternion();
  const qk = new THREE.Quaternion();
  const travel = (to: Rig, ms: number, curve = ease.inOut) => {
    const fromT = controls.target.clone();
    const fromOff = camera.position.clone().sub(fromT);
    const toOff = to.position.clone().sub(to.target);
    const r0 = Math.max(fromOff.length(), 1e-3);
    const r1 = Math.max(toOff.length(), 1e-3);
    const dir0 = fromOff.normalize();
    q.setFromUnitVectors(dir0, toOff.normalize());
    const turn = q.clone();
    return motion.play(
      'camera',
      ms,
      (k) => {
        controls.target.lerpVectors(fromT, to.target, k);
        qk.identity().slerp(turn, k);
        camera.position
          .copy(dir0)
          .applyQuaternion(qk)
          .multiplyScalar(r0 * (r1 / r0) ** k)
          .add(controls.target);
        camera.lookAt(controls.target);
      },
      curve,
    );
  };

  // ---------- State ----------
  let selected: string | null = null;
  let hovered: string | null = null;
  let mode: Mode = 'assembled';
  let upgradeOn = false;
  /** The visitor has turned or zoomed: views no longer move the camera for them. */
  let moved = false;
  /** Lean toward the chosen part (cleared by Reset until the next choice). */
  let focus = true;
  let explodeK = 0;
  let glowK = 1;
  const alpha: Record<Group, number> = { shell: 1, veil: 1, upgrade: 0 };
  /** Parts faded around a door while the camera goes through it. */
  const veiled = new Set<string>();

  /** Where a part's centre will be once the explode tween ends. */
  const centreOf = (id: string) => {
    const object = def.parts[id]!;
    const c = new THREE.Box3().setFromObject(object).getCenter(new THREE.Vector3());
    const offset = def.explode?.[id];
    const k = mode === 'exploded' ? 1 : 0;
    if (offset) c.add(new THREE.Vector3(...offset).multiplyScalar(k - explodeK));
    return c;
  };
  /** The resting view: the mode's framing, leaning toward the chosen part. */
  const restPose = (): Rig => {
    const base = poseFor(mode);
    if (!focus || !selected || !def.parts[selected]?.visible) return base;
    const shift = centreOf(selected).sub(base.target).multiplyScalar(FOCUS);
    base.target.add(shift);
    base.position.add(shift);
    return base;
  };

  // ---------- Materials: highlight, dim, fade ----------
  type Variant = { lit: THREE.MeshStandardMaterial; hover: THREE.Material; dim: THREE.Material };
  const variants = new Map<THREE.Material, Variant>();
  const variantOf = (base: THREE.Material) => {
    let v = variants.get(base);
    if (v) return v;
    const tint = (amount: number) => {
      const mat = base.clone() as THREE.MeshStandardMaterial;
      if ('emissive' in mat && mat.emissive) {
        mat.emissive = ACCENT.clone();
        mat.emissiveIntensity = amount;
        mat.userData.glow = amount;
      } else if ('color' in mat && mat.color) {
        mat.color = mat.color.clone().lerp(ACCENT, amount * 1.6);
      }
      return mat;
    };
    const darker = () => {
      const mat = base.clone() as THREE.MeshStandardMaterial;
      if ('color' in mat && mat.color) mat.color = mat.color.clone().multiplyScalar(0.42);
      if ('emissive' in mat && mat.emissive) mat.emissiveIntensity = 0;
      return mat;
    };
    v = { lit: tint(0.06), hover: tint(0.045), dim: darker() };
    variants.set(base, v);
    return v;
  };
  // A see-through copy of a material per fade group; its opacity follows the group.
  const faded = new Map<THREE.Material, Partial<Record<Group, THREE.Material>>>();
  const fadedOf = (mat: THREE.Material, group: Group) => {
    let byGroup = faded.get(mat);
    if (!byGroup) faded.set(mat, (byGroup = {}));
    let copy = byGroup[group];
    if (!copy) {
      copy = mat.clone();
      copy.transparent = true;
      copy.depthWrite = false;
      byGroup[group] = copy;
    }
    copy.opacity = mat.opacity * alpha[group];
    return copy;
  };
  const dress = (mesh: THREE.Mesh, mat: THREE.Material, group: Group | undefined) => {
    const a = group ? alpha[group] : 1;
    const visible = a > 0.01;
    const cast = !!mesh.userData.cast && a > 0.5;
    if (visible !== mesh.visible || cast !== mesh.castShadow) {
      renderer.shadowMap.needsUpdate = true;
      mesh.visible = visible;
      mesh.castShadow = cast;
    }
    mesh.material = a >= 0.999 ? mat : fadedOf(mat, group!);
  };

  // The chosen part gets CAD-style corner brackets in the accent: a drafting
  // mark rather than a flood of colour or a tangle of edges.
  const bracketMat = new THREE.LineBasicMaterial({
    color: ACCENT,
    transparent: true,
    opacity: 0.95,
    depthTest: false,
  });
  const brackets = new THREE.LineSegments(new THREE.BufferGeometry(), bracketMat);
  brackets.renderOrder = 10;
  brackets.raycast = () => {};
  brackets.visible = false;
  scene.add(brackets);
  const outline = (id: string | null) => {
    const object = id ? def.parts[id] : undefined;
    const shown =
      !!object?.visible &&
      !(id === def.upgrade && alpha.upgrade < 0.5) &&
      !(id && veiled.has(id) && alpha.veil < 0.5);
    brackets.visible = shown;
    if (!object || !shown) return;
    const b = new THREE.Box3().setFromObject(object).expandByScalar(span * 0.006);
    const size = b.getSize(new THREE.Vector3()).multiplyScalar(0.22);
    const points: number[] = [];
    for (let i = 0; i < 8; i++) {
      const x = i & 1 ? b.max.x : b.min.x;
      const y = i & 2 ? b.max.y : b.min.y;
      const z = i & 4 ? b.max.z : b.min.z;
      const sx = i & 1 ? -1 : 1;
      const sy = i & 2 ? -1 : 1;
      const sz = i & 4 ? -1 : 1;
      points.push(x, y, z, x + sx * size.x, y, z);
      points.push(x, y, z, x, y + sy * size.y, z);
      points.push(x, y, z, x, y, z + sz * size.z);
    }
    brackets.geometry.dispose();
    brackets.geometry = new THREE.BufferGeometry().setAttribute(
      'position',
      new THREE.Float32BufferAttribute(points, 3),
    );
  };

  const paint = () => {
    outline(selected);
    bracketMat.opacity = 0.95 * glowK;
    for (const v of variants.values()) v.lit.emissiveIntensity = (v.lit.userData.glow ?? 0) * glowK;
    for (const [id, meshes] of partMeshes) {
      const group = veiled.has(id) ? 'veil' : undefined;
      for (const mesh of meshes) {
        const v = variantOf(mesh.userData.base as THREE.Material);
        let mat: THREE.Material = mesh.userData.base;
        if (id === selected) mat = v.lit;
        else if (id === hovered) mat = v.hover;
        else if (selected) mat = v.dim;
        dress(mesh, mat, (mesh.userData.alpha as Group | undefined) ?? group);
      }
      tags.get(id)?.classList.toggle('is-on', id === selected);
      tags.get(id)?.classList.toggle('is-hover', id === hovered && id !== selected);
    }
    for (const mesh of looseMeshes) dress(mesh, mesh.userData.base, mesh.userData.alpha);
    host.dataset.mode = mode;
    schedule();
  };

  /** Tween a fade group to `to`. */
  const fadeTo = (group: Group, to: number, ms: number, curve = ease.out) => {
    const from = alpha[group];
    return motion.play(
      `alpha-${group}`,
      from === to ? 0 : ms,
      (k) => {
        alpha[group] = from + (to - from) * k;
        paint();
      },
      curve,
    );
  };

  // ---------- Exploded view ----------
  const applyExplode = () => {
    for (const [id, offset] of Object.entries(def.explode ?? {})) {
      const object = def.parts[id];
      if (!object) continue;
      const homePos = object.userData.home as THREE.Vector3;
      object.position.set(
        homePos.x + offset[0] * explodeK,
        homePos.y + offset[1] * explodeK,
        homePos.z + offset[2] * explodeK,
      );
    }
    outline(selected);
    renderer.shadowMap.needsUpdate = true;
  };
  const explodeTo = (to: number, ms: number, curve = ease.inOut) => {
    const from = explodeK;
    return motion.play(
      'explode',
      from === to ? 0 : ms,
      (k) => {
        explodeK = from + (to - from) * k;
        applyExplode();
      },
      curve,
    );
  };

  /** Shell, exploded offsets, veil and camera to the resting state of `mode`. */
  const toRest = (ms: number) => {
    const open = mode !== 'assembled';
    void fadeTo('shell', open ? 0 : 1, ms * 0.7);
    // Out of a door, the room comes back once the camera has drawn away from it.
    void fadeTo('veil', 1, ms, ease.after(0.35));
    void explodeTo(mode === 'exploded' ? 1 : 0, ms, open ? ease.after(0.25) : ease.inOut);
    const done = moved ? Promise.resolve(true) : travel(restPose(), ms);
    return done.then((finished) => {
      if (finished) veiled.clear();
      paint();
      return finished;
    });
  };

  // ---------- Pointer: pick and hover ----------
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const hit = (event: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    raycaster.setFromCamera(pointer, camera);
    for (const h of raycaster.intersectObject(def.root, true)) {
      let o: THREE.Object3D | null = h.object;
      if (!o.visible || (o as THREE.LineSegments).isLineSegments) continue;
      const group = o.userData.alpha as Group | undefined;
      if (group && alpha[group] < 0.5) continue;
      while (o && !meshPart.has(o)) o = o.parent;
      if (o) {
        const id = meshPart.get(o)!;
        if (veiled.has(id) && alpha.veil < 0.5) continue;
        return id;
      }
    }
    return null;
  };
  let down: { x: number; y: number } | null = null;
  const onDown = (e: PointerEvent) => (down = { x: e.clientX, y: e.clientY });
  const onUp = (e: PointerEvent) => {
    if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) return;
    down = null;
    const id = hit(e);
    if (id) hooks.pick(id);
  };
  let moveQueued = false;
  const onMove = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse' || e.buttons || moveQueued) return;
    moveQueued = true;
    requestAnimationFrame(() => {
      moveQueued = false;
      if (disposed) return;
      const id = hit(e);
      canvas.style.cursor = id ? 'pointer' : 'grab';
      if (id !== hovered) hooks.hover(id);
    });
  };
  const onLeave = () => hooks.hover(null);
  // The wheel scrolls the page. ctrl + wheel (a trackpad pinch) reaches the
  // controls and zooms; stopping it here, in the capture phase, keeps every
  // other wheel event away from them and leaves the page free to scroll.
  const onWheel = (e: WheelEvent) => {
    if (!e.ctrlKey) e.stopPropagation();
  };
  const onLost = (e: Event) => {
    e.preventDefault();
    contextLost = true;
    hooks.lost();
  };
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerleave', onLeave);
  canvas.addEventListener('webglcontextlost', onLost);
  host.addEventListener('wheel', onWheel, { capture: true });
  // The visitor takes the camera: running camera moves stop where they are.
  controls.addEventListener('start', () => {
    moved = true;
    motion.cancel('camera');
  });

  const resize = () => {
    const w = host.clientWidth;
    const h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    setLimits();
    if (!moved && !motion.has('camera')) {
      const rest = restPose();
      camera.position.copy(rest.position);
      controls.target.copy(rest.target);
    }
    schedule();
  };
  const ro = new ResizeObserver(resize);

  /** A door into another view, or this view's own doorway out. */
  const doorPose = (other: string): Rig | null => {
    const door = def.doors?.[other];
    const pose = door?.pose ?? def.entry;
    if (!pose) return null;
    const r = rig(pose, door?.at);
    // Same picture through this camera's lens: nearer for a wider one.
    if (pose.fov) {
      const half = (fov: number) => Math.tan(THREE.MathUtils.degToRad(fov) / 2);
      r.position
        .sub(r.target)
        .multiplyScalar(half(pose.fov) / half(camera.fov))
        .add(r.target);
    }
    return r;
  };
  /** Fade everything but the door's part. */
  const veilAround = (other: string) => {
    veiled.clear();
    const keep = def.doors?.[other]?.part;
    if (!keep) return;
    for (const id of Object.keys(def.parts)) if (id !== keep) veiled.add(id);
  };
  /** Cinematic moves take the camera (and hide the pins) for their length. */
  let holds = 0;
  const hold = <T>(work: Promise<T>) => {
    holds++;
    controls.enabled = false;
    host.dataset.travel = '';
    return work.finally(() => {
      if (--holds) return;
      controls.enabled = true;
      delete host.dataset.travel;
    });
  };

  // ---------- First frame ----------
  renderer.shadowMap.needsUpdate = true;
  host.append(canvas, tagLayer);
  ro.observe(host);
  resize();
  paint();
  // Compile every shader before the first frame, off the main thread, where
  // the browser can (KHR_parallel_shader_compile); elsewhere the first frame compiles.
  if (renderer.extensions.has('KHR_parallel_shader_compile'))
    await renderer.compileAsync(scene, camera).catch(() => {});

  return {
    modes: def.modes ?? [],
    select(id, animate = true) {
      const next = id && def.parts[id] ? id : null;
      if (next === selected) return;
      selected = next;
      focus = true;
      if (selected && mode === 'assembled' && def.hidden?.includes(selected)) hooks.mode('cutaway');
      glowK = 0;
      void motion.play(
        'glow',
        animate ? T.highlight : 0,
        (k) => {
          glowK = k;
          paint();
        },
        ease.out,
      );
      if (def.upgrade)
        void fadeTo('upgrade', upgradeOn || selected === def.upgrade ? 1 : 0, animate ? T.mode : 0);
      if (moved) return;
      if (animate) void travel(restPose(), T.focus);
      else resize();
    },
    hover(id) {
      hovered = id && def.parts[id] ? id : null;
      paint();
    },
    setMode(next, animate = true) {
      if (next === mode && animate) return;
      mode = next;
      void toRest(animate ? T.mode : 0);
    },
    setUpgrade(on) {
      upgradeOn = on;
      void fadeTo('upgrade', on || selected === def.upgrade ? 1 : 0, T.mode);
    },
    orbit(step) {
      moved = true;
      const offset = camera.position.clone().sub(controls.target);
      offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), step * 0.45);
      void travel(
        { position: controls.target.clone().add(offset), target: controls.target.clone() },
        T.focus,
      );
    },
    zoom(step) {
      moved = true;
      const offset = camera.position.clone().sub(controls.target);
      const d = THREE.MathUtils.clamp(
        offset.length() * (step > 0 ? 0.8 : 1.25),
        controls.minDistance,
        controls.maxDistance,
      );
      void travel(
        {
          position: controls.target.clone().add(offset.setLength(d)),
          target: controls.target.clone(),
        },
        T.focus,
      );
    },
    reset() {
      moved = false;
      focus = false;
      void travel(restPose(), T.settle);
    },
    leave(other) {
      const to = doorPose(other);
      if (!to || disposed) return Promise.resolve(true);
      veilAround(other);
      // Out of a case: close it up first, then pull back to the doorway.
      const closing = !def.doors?.[other];
      if (closing) {
        void explodeTo(0, T.door * 0.6);
        void fadeTo('shell', 1, T.door * 0.7, ease.after(0.35));
      } else {
        void fadeTo('veil', VEIL, T.door * 0.8, ease.after(0.15));
      }
      return hold(travel(to, T.door));
    },
    arrive(other, next) {
      const from = doorPose(other);
      mode = next;
      if (!from || disposed) return toRest(0);
      // Start on the handoff frame: the closed case from outside, or the
      // desk faded around the tower, then travel in.
      veilAround(other);
      alpha.veil = def.doors?.[other] ? VEIL : 1;
      alpha.shell = 1;
      explodeK = 0;
      applyExplode();
      camera.position.copy(from.position);
      controls.target.copy(from.target);
      camera.lookAt(controls.target);
      paint();
      return hold(toRest(T.arrive));
    },
    settle() {
      return hold(toRest(T.settle));
    },
    snapshot() {
      renderer.render(scene, camera);
      const shot = document.createElement('canvas');
      shot.width = canvas.width;
      shot.height = canvas.height;
      shot.getContext('2d')?.drawImage(canvas, 0, 0);
      return shot;
    },
    dispose() {
      disposed = true;
      motion.finish();
      cancelAnimationFrame(frame);
      ro.disconnect();
      controls.dispose();
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerleave', onLeave);
      canvas.removeEventListener('webglcontextlost', onLost);
      host.removeEventListener('wheel', onWheel, { capture: true });
      const seen = new Set<unknown>();
      const free = (thing: { dispose?: () => void } | undefined) => {
        if (!thing || seen.has(thing)) return;
        seen.add(thing);
        thing.dispose?.();
      };
      const freeMaterial = (mat: THREE.Material) => {
        for (const value of Object.values(mat)) if (value instanceof THREE.Texture) free(value);
        free(mat);
      };
      scene.traverse((o) => {
        const mesh = o as THREE.Mesh;
        free(mesh.geometry);
        for (const mat of [mesh.material, mesh.userData.base].flat() as THREE.Material[])
          if (mat) freeMaterial(mat);
      });
      for (const v of variants.values()) for (const mat of Object.values(v)) free(mat);
      for (const byGroup of faded.values()) for (const mat of Object.values(byGroup)) free(mat);
      free(brackets.geometry);
      free(bracketMat);
      for (const mat of Object.values(materials)) freeMaterial(mat);
      env.dispose();
      pmrem.dispose();
      renderer.dispose();
      if (!contextLost) renderer.forceContextLoss();
      canvas.remove();
      tagLayer.remove();
      delete host.dataset.motion;
      delete host.dataset.mode;
      delete host.dataset.travel;
    },
  };
}
