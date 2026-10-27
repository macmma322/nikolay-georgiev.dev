/**
 * The WebGL stage behind each /setup view. Loaded on demand by
 * src/scripts/explorer.ts, only where WebGL works; the SVG drawing and the
 * parts list stay the accessible, always-available version.
 *
 * It renders on demand (no idle loop), never takes the wheel or one-finger
 * touch (page scrolling keeps working; rotation and zoom have buttons), and
 * releases every GPU resource on dispose.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { makeMaterials, quality, type Materials } from './kit';
import type { Mode, SceneDef } from './scene';

export interface StageHooks {
  pick(id: string): void;
  hover(id: string | null): void;
  /** The stage asks for another display mode (an internal part was chosen). */
  mode(mode: Mode): void;
}

export interface Stage {
  readonly modes: Mode[];
  select(id: string | null): void;
  hover(id: string | null): void;
  setMode(mode: Mode): void;
  setUpgrade(on: boolean): void;
  orbit(step: number): void;
  zoom(step: number): void;
  reset(): void;
  dispose(): void;
}

const builders: Record<string, () => Promise<(m: Materials) => SceneDef>> = {
  desk: () => import('./desk').then((x) => x.buildDesk),
  inside: () => import('./pc').then((x) => x.buildInside),
  secondary: () => import('./pc').then((x) => x.buildSecondary),
  laptop: () => import('./laptop').then((x) => x.buildLaptop),
};

/** The site's signal red (tokens.css --signal), for the selected part. */
const ACCENT = new THREE.Color(0xee5f4b);

/**
 * 'gpu' when WebGL 2 is hardware accelerated, 'software' when the browser
 * would render it on the CPU (SwiftShader, llvmpipe), null without it. The
 * explorers only use 'gpu': a CPU-rendered model would make the page janky,
 * and the drawing serves those visitors better.
 */
export function webglSupport(): 'gpu' | 'software' | null {
  try {
    const probe = (failIfMajorPerformanceCaveat: boolean) => {
      const gl = document
        .createElement('canvas')
        .getContext('webgl2', { failIfMajorPerformanceCaveat });
      gl?.getExtension('WEBGL_lose_context')?.loseContext();
      return !!gl;
    };
    if (probe(true)) return 'gpu';
    return probe(false) ? 'software' : null;
  } catch {
    return null;
  }
}

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
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(software ? 1 : Math.min(devicePixelRatio, low ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.3;
  renderer.shadowMap.enabled = !low;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  const canvas = renderer.domElement;
  canvas.className = 'stage-gl';
  canvas.setAttribute('aria-hidden', 'true');
  host.append(canvas);
  const tagLayer = document.createElement('div');
  tagLayer.className = 'stage-tags';
  tagLayer.setAttribute('aria-hidden', 'true');
  host.append(tagLayer);

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
        mesh.castShadow = !low && !object.userData.ghost;
        mesh.receiveShadow = !low;
      }
      list.push(mesh);
      meshPart.set(mesh, id);
    });
    partMeshes.set(id, list);
    object.userData.home = object.position.clone();
  }

  // Camera and controls.
  const camera = new THREE.PerspectiveCamera(def.camera.fov ?? 35, 1, 1, span * 12);
  headlight.position.set(0, 0, 1);
  camera.add(headlight);
  scene.add(camera);
  // The scene's direction of view is authored; its distance fits the model's
  // bounding sphere to the current aspect, so phones frame it as well.
  const sphere = bounds.getBoundingSphere(new THREE.Sphere());
  const home = {
    position: new THREE.Vector3(...def.camera.position),
    target: new THREE.Vector3(...def.camera.target),
  };
  const direction = home.position.clone().sub(home.target).normalize();
  // Every piece's box corners: a tighter fit than the scene's one box.
  const corners = [...def.root.children, ...Object.values(def.parts)].flatMap((part) => {
    const b = new THREE.Box3().setFromObject(part);
    return [0, 1, 2, 3, 4, 5, 6, 7].map(
      (i) =>
        new THREE.Vector3(
          i & 1 ? b.max.x : b.min.x,
          i & 2 ? b.max.y : b.min.y,
          i & 4 ? b.max.z : b.min.z,
        ),
    );
  });
  const probe = new THREE.PerspectiveCamera();
  const fit = (aspect: number) => {
    // Find the closest distance at which every corner of the model's box
    // projects inside 88% of the frame.
    probe.fov = camera.fov;
    probe.aspect = aspect;
    probe.updateProjectionMatrix();
    let near = sphere.radius * 0.2;
    let far = sphere.radius * 8;
    const point = new THREE.Vector3();
    for (let i = 0; i < 18; i++) {
      const d = (near + far) / 2;
      probe.position.copy(home.target).addScaledVector(direction, d);
      probe.lookAt(home.target);
      probe.updateMatrixWorld();
      const inside = corners.every((c) => {
        point.copy(c).project(probe);
        return Math.abs(point.x) < 0.88 && Math.abs(point.y) < 0.88 && point.z < 1;
      });
      if (inside) far = d;
      else near = d;
    }
    home.position.copy(home.target).addScaledVector(direction, far);
  };
  fit(host.clientWidth / Math.max(1, host.clientHeight));
  camera.position.copy(home.position);
  const controls = new OrbitControls(camera, canvas);
  controls.target.copy(home.target);
  controls.enableZoom = false; // the wheel scrolls the page; zoom has buttons
  controls.enablePan = false;
  controls.enableDamping = !reduced;
  controls.dampingFactor = 0.12;
  controls.rotateSpeed = 0.6;
  controls.maxPolarAngle = Math.PI * 0.49;
  const homeDistance = home.position.distanceTo(home.target);
  controls.minDistance = homeDistance * 0.35;
  controls.maxDistance = homeDistance * 1.5;
  if (coarse) {
    // One finger scrolls the page; turning is on the buttons.
    controls.enabled = false;
    canvas.style.touchAction = 'pan-y pinch-zoom';
  }
  controls.update();
  let moved = false;
  controls.addEventListener('start', () => (moved = true));

  // ---------- Rendering on demand ----------
  let frame = 0;
  let disposed = false;
  const tweens = new Set<(now: number) => boolean>();
  const schedule = () => {
    if (!frame && !disposed) frame = requestAnimationFrame(render);
  };
  const tween = (ms: number, step: (k: number) => void) => {
    if (reduced || ms === 0) {
      step(1);
      schedule();
      return;
    }
    const start = performance.now();
    tweens.add((now) => {
      const t = Math.min(1, (now - start) / ms);
      step(t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
      return t < 1;
    });
    schedule();
  };

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
      if (!object?.visible || (mode === 'assembled' && def.hidden?.includes(id))) {
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

  function render(now: number) {
    frame = 0;
    let busy = false;
    for (const t of tweens) if (!t(now)) tweens.delete(t);
    if (tweens.size) busy = true;
    if (controls.update()) busy = true;
    renderer.render(scene, camera);
    placeTags();
    if (busy) schedule();
  }
  controls.addEventListener('change', schedule);

  const resize = () => {
    const w = host.clientWidth;
    const h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    if (!moved) {
      fit(camera.aspect);
      camera.position.copy(home.position);
      controls.target.copy(home.target);
    }
    schedule();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(host);
  resize();

  // ---------- Lighting the chosen part ----------
  type Variant = {
    lit: THREE.Material;
    hover: THREE.Material;
    dim: THREE.Material;
    fade: THREE.Material;
  };
  const variants = new Map<THREE.Material, Variant>();
  const variantOf = (base: THREE.Material) => {
    let v = variants.get(base);
    if (v) return v;
    const tint = (amount: number) => {
      const mat = base.clone() as THREE.MeshStandardMaterial;
      if ('emissive' in mat && mat.emissive) {
        mat.emissive = ACCENT.clone();
        mat.emissiveIntensity = amount;
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
    const faded = (opacity: number) => {
      const mat = base.clone();
      mat.transparent = true;
      mat.opacity = Math.min(base.opacity, opacity);
      mat.depthWrite = false;
      return mat;
    };
    v = { lit: tint(0.06), hover: tint(0.045), dim: darker(), fade: faded(0.12) };
    variants.set(base, v);
    return v;
  };

  let selected: string | null = null;
  let hovered: string | null = null;
  let mode: Mode = 'assembled';
  let upgradeOn = false;
  const faded = new Set<THREE.Object3D>();
  for (const o of def.fade ?? []) o.traverse((c) => faded.add(c));

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
    brackets.visible = !!object && object.visible;
    if (!object || !object.visible) return;
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
    for (const [id, meshes] of partMeshes) {
      for (const mesh of meshes) {
        const base = mesh.userData.base as THREE.Material;
        const v = variantOf(base);
        let mat: THREE.Material = base;
        if (mode !== 'assembled' && faded.has(mesh) && id !== selected) mat = v.fade;
        else if (id === selected) mat = v.lit;
        else if (id === hovered) mat = v.hover;
        else if (selected) mat = v.dim;
        mesh.material = mat;
      }
      tags.get(id)?.classList.toggle('is-on', id === selected);
      tags.get(id)?.classList.toggle('is-hover', id === hovered && id !== selected);
    }
    const upgrade = def.upgrade ? def.parts[def.upgrade] : undefined;
    if (upgrade) upgrade.visible = upgradeOn || selected === def.upgrade;
    for (const o of def.shell ?? []) o.visible = mode === 'assembled';
    schedule();
  };

  // ---------- Exploded view ----------
  let explodeK = 0;
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
      const mat = (o as THREE.Mesh).material as THREE.Material;
      if (mat.opacity < 0.2 && mode !== 'assembled') continue;
      while (o && !meshPart.has(o)) o = o.parent;
      if (o) return meshPart.get(o) ?? null;
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
      const id = hit(e);
      canvas.style.cursor = id ? 'pointer' : 'grab';
      if (id !== hovered) hooks.hover(id);
    });
  };
  const onLeave = () => hooks.hover(null);
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerleave', onLeave);

  const moveCamera = (position: THREE.Vector3, target: THREE.Vector3) => {
    const fromP = camera.position.clone();
    const fromT = controls.target.clone();
    tween(650, (k) => {
      camera.position.lerpVectors(fromP, position, k);
      controls.target.lerpVectors(fromT, target, k);
    });
  };

  paint();

  return {
    modes: def.modes ?? [],
    select(id) {
      selected = id && def.parts[id] ? id : null;
      if (selected && mode === 'assembled' && def.hidden?.includes(selected)) hooks.mode('cutaway');
      paint();
    },
    hover(id) {
      hovered = id && def.parts[id] ? id : null;
      paint();
    },
    setMode(next) {
      mode = next;
      const from = explodeK;
      const to = next === 'exploded' ? 1 : 0;
      tween(700, (k) => {
        explodeK = from + (to - from) * k;
        applyExplode();
        outline(selected);
      });
      paint();
    },
    setUpgrade(on) {
      upgradeOn = on;
      paint();
    },
    orbit(step) {
      moved = true;
      const offset = camera.position.clone().sub(controls.target);
      offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), step * 0.45);
      moveCamera(controls.target.clone().add(offset), controls.target.clone());
    },
    zoom(step) {
      moved = true;
      const offset = camera.position.clone().sub(controls.target);
      const d = THREE.MathUtils.clamp(
        offset.length() * (step > 0 ? 0.8 : 1.25),
        controls.minDistance,
        controls.maxDistance,
      );
      moveCamera(controls.target.clone().add(offset.setLength(d)), controls.target.clone());
    },
    reset() {
      moved = false;
      fit(camera.aspect);
      moveCamera(home.position.clone(), home.target.clone());
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(frame);
      ro.disconnect();
      controls.dispose();
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerleave', onLeave);
      const seen = new Set<unknown>();
      const free = (thing: { dispose?: () => void } | undefined) => {
        if (!thing || seen.has(thing)) return;
        seen.add(thing);
        thing.dispose?.();
      };
      scene.traverse((o) => {
        const mesh = o as THREE.Mesh;
        free(mesh.geometry);
        for (const mat of [mesh.material, mesh.userData.base].flat() as THREE.Material[]) {
          if (!mat) continue;
          for (const value of Object.values(mat)) if (value instanceof THREE.Texture) free(value);
          free(mat);
        }
      });
      for (const v of variants.values()) for (const mat of Object.values(v)) free(mat);
      free(brackets.geometry);
      free(bracketMat);
      for (const mat of Object.values(materials)) {
        for (const value of Object.values(mat)) if (value instanceof THREE.Texture) free(value);
        free(mat);
      }
      env.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
      tagLayer.remove();
    },
  };
}
