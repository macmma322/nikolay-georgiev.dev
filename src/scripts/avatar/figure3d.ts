/**
 * The 3D cameo: the rigged model of the owner and its clips, a few props, and
 * two poses set in code where generated motion could not place the hands:
 * typing (both hands on a keyboard) and leaning (a forearm on a ledge).
 *
 * public/avatar/me.glb was made with Meshy from the master art (image to 3D,
 * T-pose, rig; clips: "Idle 7", the rig's walk, and text-to-motion for phone,
 * headphones, crouch). Each clip came as its own skinned GLB; their animation
 * channels were copied onto one model by node name with @gltf-transform/core,
 * then `gltf-transform optimize --compress quantize --texture-compress webp
 * --texture-size 1024 --simplify-ratio 0.5`. Quantized, not meshopt: the site's
 * CSP has no wasm-unsafe-eval, and meshopt decodes with WebAssembly.
 * Clip names: idle walk phone typing lean listen inspect.
 *
 * It renders into its own WebGL canvas; the avatar runtime copies that onto
 * the cameo canvas, so the page keeps one 2D canvas per cameo as before.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export type FigurePose = 'idle' | 'walk' | 'phone' | 'listen' | 'typing' | 'lean' | 'inspect';
/** The figure's box in the output canvas, in pixels: where the drawing used to stand. */
export type Box = { x0: number; y0: number; x1: number; y1: number };

const CLIP: Record<FigurePose, string> = {
  idle: 'idle',
  walk: 'walk',
  phone: 'phone',
  listen: 'listen',
  inspect: 'inspect',
  // Set in code on top of a body that already sits or stands.
  typing: 'phone',
  lean: 'idle',
};
/** Which way he faces for each pose, about the vertical, in radians (0 faces the viewer). */
const YAW: Record<FigurePose, number> = {
  idle: 0,
  walk: Math.PI / 2,
  phone: 0,
  listen: 0,
  inspect: -0.5,
  typing: Math.PI / 2,
  lean: 0.15,
};

const v = () => new THREE.Vector3();
/** The keyboard, from the seated hips: forward and up, in metres. */
const KEYS = { forward: 0.24, up: 0.13 };
const tmp = { a: v(), b: v(), c: v(), t: v(), d: v(), q: new THREE.Quaternion() };

/** Rotates `bone` (in world terms) so its child at `from` would sit at `to`. */
function aim(bone: THREE.Object3D, from: THREE.Vector3, to: THREE.Vector3) {
  bone.getWorldPosition(tmp.a);
  const cur = tmp.b.subVectors(from, tmp.a).normalize();
  const want = tmp.c.subVectors(to, tmp.a).normalize();
  const delta = tmp.q.setFromUnitVectors(cur, want);
  const world = bone.getWorldQuaternion(new THREE.Quaternion());
  const parent = bone.parent!.getWorldQuaternion(new THREE.Quaternion()).invert();
  bone.quaternion.copy(parent.multiply(delta.multiply(world)));
  bone.updateMatrixWorld(true);
}

/**
 * Two-bone reach: the upper arm and forearm bend so the hand lands on `target`,
 * the elbow pushed toward `pole`. Runs after the clip, every frame.
 */
function reach(
  upper: THREE.Object3D,
  lower: THREE.Object3D,
  hand: THREE.Object3D,
  target: THREE.Vector3,
  pole: THREE.Vector3,
) {
  const a = upper.getWorldPosition(v());
  const b = lower.getWorldPosition(v());
  const c = hand.getWorldPosition(v());
  const ab = a.distanceTo(b);
  const bc = b.distanceTo(c);
  const toT = v().subVectors(target, a);
  const dist = Math.min(toT.length(), (ab + bc) * 0.999);
  const dir = toT.normalize();
  // Elbow: along the reach by the law of cosines, then out toward the pole.
  const along = (ab * ab - bc * bc + dist * dist) / (2 * dist);
  const out = Math.sqrt(Math.max(0, ab * ab - along * along));
  const side = v().subVectors(pole, a);
  side.sub(dir.clone().multiplyScalar(side.dot(dir))).normalize();
  const elbow = a.clone().addScaledVector(dir, along).addScaledVector(side, out);
  aim(upper, b, elbow);
  aim(lower, hand.getWorldPosition(v()), a.clone().addScaledVector(dir, dist));
}

const dark = (color: string, roughness = 0.6, metalness = 0.2) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness });

function phone() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.078, 0.16, 0.01),
    dark('#7a8090', 0.35, 0.05),
  );
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.07, 0.148),
    new THREE.MeshBasicMaterial({ color: '#8fb0ff' }),
  );
  screen.position.z = 0.0047;
  g.add(body, screen);
  return g;
}

function headphones() {
  const g = new THREE.Group();
  const band = new THREE.Mesh(
    new THREE.TorusGeometry(0.11, 0.014, 8, 28, Math.PI),
    dark('#3a3d46', 0.3, 0.6),
  );
  g.add(band);
  for (const x of [-0.105, 0.105]) {
    const cup = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 0.04, 20),
      dark('#2c2e36', 0.35, 0.5),
    );
    cup.rotation.z = Math.PI / 2;
    cup.position.set(x * 1.05, -0.02, 0);
    g.add(cup);
  }
  return g;
}

/** Desk, keyboard, monitor and chair, in metres from the seated hips. */
function workstation() {
  const g = new THREE.Group();
  const steel = dark('#2a2d35', 0.5, 0.5);
  const top = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.03, 1.1), dark('#3a3d45', 0.45, 0.3));
  top.position.set(0.43, KEYS.up - 0.015, 0);
  g.add(top);
  for (const z of [-0.5, 0.5]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.76, 0.04), steel);
    leg.position.set(0.65, KEYS.up - 0.4, z);
    g.add(leg);
  }
  const keys = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.018, 0.42), dark('#15171c', 0.6, 0.2));
  keys.position.set(KEYS.forward, KEYS.up + 0.009, 0);
  g.add(keys);
  const screen = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.34, 0.56), dark('#111317', 0.3, 0.5));
  screen.position.set(0.64, KEYS.up + 0.3, 0);
  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry(0.52, 0.3),
    new THREE.MeshBasicMaterial({ color: '#f0a050' }),
  );
  glow.rotation.y = -Math.PI / 2;
  glow.position.set(0.624, KEYS.up + 0.3, 0);
  const stand = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.14, 0.05), steel);
  stand.position.set(0.66, KEYS.up + 0.08, 0);
  g.add(screen, glow, stand);
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.06, 0.46), dark('#1b1c21', 0.7, 0.1));
  seat.position.set(-0.02, -0.09, 0);
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.62, 0.42), dark('#1b1c21', 0.7, 0.1));
  back.position.set(-0.26, 0.22, 0);
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.36, 10), steel);
  post.position.set(-0.02, -0.3, 0);
  g.add(seat, back, post);
  return g;
}

function board() {
  const g = new THREE.Group();
  const pcb = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.012, 0.14), dark('#1d3b2a', 0.55, 0.2));
  const chip = new THREE.Mesh(
    new THREE.BoxGeometry(0.045, 0.012, 0.045),
    new THREE.MeshBasicMaterial({ color: '#f39a3a' }),
  );
  chip.position.y = 0.008;
  g.add(pcb, chip);
  return g;
}

/** A soft round shadow, so he stands on the page instead of floating. */
function contactShadow() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(0,0,0,0.55)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(0.9, 0.5),
    new THREE.MeshBasicMaterial({
      map: new THREE.CanvasTexture(c),
      transparent: true,
      depthWrite: false,
    }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.002;
  return mesh;
}

export interface Figure {
  readonly canvas: HTMLCanvasElement;
  setPose(pose: FigurePose, facing?: 1 | -1): void;
  /** Size the output in pixels and place the figure in the box; call when the cameo or pose changes. */
  fit(width: number, height: number, box: Box): void;
  /** Walk speed in figure heights a second, so the feet keep pace with the root. */
  setPace(heightsPerSecond: number): void;
  /** Moves the figure sideways by this many output pixels from where fit put it. */
  slide(dx: number): void;
  frame(dt: number, look: { x: number; y: number }): void;
  dispose(): void;
}

let pending: Promise<Figure> | undefined;
/** Loads three, the model and its clips once per page. */
export function loadFigure(url = '/avatar/me.glb'): Promise<Figure> {
  pending ??= build(url);
  return pending;
}

async function build(url: string): Promise<Figure> {
  const canvas = document.createElement('canvas');
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    premultipliedAlpha: true,
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.45;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 20);
  // Frustum bounds are in world metres: the camera stays at the origin.
  camera.position.set(0, 0, 6);
  // The page's light: warm from above like the street's lamps, a cool fill, a cold rim.
  scene.add(new THREE.HemisphereLight('#6b7aa0', '#2a1c10', 1.25));
  const key = new THREE.DirectionalLight('#ffc48a', 2.6);
  key.position.set(1.5, 3, 2.5);
  const rim = new THREE.DirectionalLight('#9dbcff', 1.6);
  rim.position.set(-2, 2, -2.5);
  scene.add(key, rim);

  const gltf = await new GLTFLoader().loadAsync(url);
  const model = gltf.scene;
  const holder = new THREE.Group();
  holder.add(model);
  scene.add(holder);
  const bone = (name: string) => model.getObjectByName(name)!;
  const B = {
    hips: bone('Hips'),
    spine: bone('Spine'),
    mid: bone('Spine01'),
    head: bone('Head'),
    top: bone('head_end'),
    lArm: bone('LeftArm'),
    lFore: bone('LeftForeArm'),
    lHand: bone('LeftHand'),
    rArm: bone('RightArm'),
    rFore: bone('RightForeArm'),
    rHand: bone('RightHand'),
    lToe: bone('LeftToeBase'),
    rToe: bone('RightToeBase'),
    lFoot: bone('LeftFoot'),
    rFoot: bone('RightFoot'),
  };

  const props = {
    phone: phone(),
    headphones: headphones(),
    desk: workstation(),
    board: board(),
    shadow: contactShadow(),
  };
  // The skeleton is built in centimetres under a 0.01 scale: props attached to
  // a bone undo it, so their sizes and offsets stay in metres.
  model.updateMatrixWorld(true);
  const attach = (to: THREE.Object3D, prop: THREE.Object3D, at: [number, number, number]) => {
    const k = 1 / to.getWorldScale(v()).x;
    to.add(prop);
    prop.scale.setScalar(k);
    prop.position.set(at[0] * k, at[1] * k, at[2] * k);
  };
  attach(B.head, props.headphones, [0, 0.11, 0]);
  props.board.position.set(0.05, 0.006, 0.38);
  holder.add(props.desk, props.board, props.shadow);
  scene.add(props.phone);

  const mixer = new THREE.AnimationMixer(model);
  const clips = new Map(gltf.animations.map((c) => [c.name, c]));
  // The walk plays on the spot: the root's own travel is the page's to give.
  const walkClip = clips.get('walk');
  if (walkClip)
    walkClip.tracks = walkClip.tracks.filter(
      (t) => !(t.name.startsWith('Hips.') && t.name.endsWith('.position')),
    );
  const walkCycle = walkClip?.duration ?? 1;

  let pose: FigurePose = 'idle';
  let action: THREE.AnimationAction | undefined;
  let time = 0;
  let pace = 0;
  const look = { x: 0, y: 0 };

  function show() {
    props.phone.visible = pose === 'phone' || pose === 'lean';
    props.headphones.visible = pose === 'listen';
    props.desk.visible = pose === 'typing';
    props.board.visible = pose === 'inspect';
    if (pose === 'typing') {
      // The desk sits around the seated hips, turned to face where he faces.
      mixer.update(0);
      model.updateMatrixWorld(true);
      const hips = holder.worldToLocal(B.hips.getWorldPosition(v()));
      props.desk.position.set(hips.x, hips.y, hips.z);
      props.desk.rotation.y = -Math.PI / 2;
    }
  }

  /** Bends the arms where generated motion could not, after the clip each frame. */
  function setByHand(t: number) {
    if (pose !== 'typing' && pose !== 'lean') return;
    model.updateMatrixWorld(true);
    const hips = B.hips.getWorldPosition(v());
    const fwd = v().set(Math.sin(holder.rotation.y), 0, Math.cos(holder.rotation.y));
    const left = v().set(fwd.z, 0, -fwd.x);
    if (pose === 'typing') {
      // Sit up to the desk: the seated clip leans back, out of reach of the keys.
      B.mid.rotation.x += 0.32;
      model.updateMatrixWorld(true);
      // Both hands on the keys at seated elbow height, wrists tapping out of step.
      for (const [arm, fore, hand, s, ph] of [
        [B.lArm, B.lFore, B.lHand, 1, 0],
        [B.rArm, B.rFore, B.rHand, -1, 1.7],
      ] as const) {
        const tap = Math.max(0, Math.sin(t * 15 + ph)) * 0.01;
        const target = hips
          .clone()
          .addScaledVector(fwd, KEYS.forward)
          .addScaledVector(left, 0.1 * s)
          .add(v().set(0, KEYS.up + 0.012 + tap, 0));
        const pole = hips
          .clone()
          .addScaledVector(left, 0.5 * s)
          .add(v().set(0, -0.1, 0));
        reach(arm, fore, hand, target, pole);
      }
      return;
    }
    // Leaning: the left elbow rests on a ledge below the shoulder, the forearm
    // lying flat and pointing forward; the body tips toward it; the right hand
    // holds the phone in front of the chest and the head bows to it.
    B.mid.rotation.z += 0.12;
    model.updateMatrixWorld(true);
    const shoulder = B.lArm.getWorldPosition(v());
    const onLedge = shoulder
      .clone()
      .addScaledVector(left, 0.12)
      .addScaledVector(fwd, 0.22)
      .add(v().set(0, -0.2, 0));
    const elbowOut = shoulder
      .clone()
      .addScaledVector(left, 0.4)
      .addScaledVector(fwd, -0.3)
      .add(v().set(0, -0.3, 0));
    reach(B.lArm, B.lFore, B.lHand, onLedge, elbowOut);
    const chest = B.spine.getWorldPosition(v());
    const held = chest
      .clone()
      .addScaledVector(fwd, 0.24)
      .addScaledVector(left, -0.05)
      .add(v().set(0, -0.04 + Math.sin(t * 0.8) * 0.008, 0));
    reach(
      B.rArm,
      B.rFore,
      B.rHand,
      held,
      chest
        .clone()
        .addScaledVector(left, -0.4)
        .add(v().set(0, -0.5, 0)),
    );
    B.head.rotation.x += 0.35;
  }

  let yaw = 0;
  let wantYaw = 0;
  /** Pixels per metre and the camera's resting left edge, from the last fit. */
  let scale = 1;
  let left0 = 0;
  let span = 1;

  return {
    canvas,
    setPose(next, facing = 1) {
      const clip = clips.get(CLIP[next]);
      const changed = next !== pose || !action;
      pose = next;
      wantYaw = YAW[next] * (next === 'walk' || next === 'typing' ? facing : 1);
      if (changed && next !== 'idle') yaw = wantYaw; // a new pose starts facing its way
      holder.rotation.y = yaw;
      if (clip && changed) {
        const a = mixer.clipAction(clip);
        a.reset().play();
        if (action && action !== a) action.crossFadeTo(a, 0.35, false);
        action = a;
      }
      // After the clip is set: the desk is placed from the seated hips.
      show();
    },
    fit(width, height, box) {
      renderer.setPixelRatio(1);
      renderer.setSize(width, height, false);
      // Measure the posed figure from its bones (skinned bounds are not updated),
      // with whatever props stand with him, as the drawings included them.
      holder.rotation.y = wantYaw;
      mixer.update(0);
      setByHand(time);
      model.updateMatrixWorld(true);
      const bounds = new THREE.Box3();
      const p = v();
      for (const o of Object.values(B)) bounds.expandByPoint(o.getWorldPosition(p));
      bounds.max.y += 0.06; // hair above the head's end bone
      bounds.expandByScalar(0.04);
      bounds.min.y = Math.min(bounds.min.y, 0);
      for (const prop of [props.desk, props.board])
        if (prop.visible) bounds.union(new THREE.Box3().setFromObject(prop));
      holder.rotation.y = yaw;
      scale = (box.y1 - box.y0) / (bounds.max.y - bounds.min.y);
      const cx = (bounds.min.x + bounds.max.x) / 2;
      const tcx = (box.x0 + box.x1) / 2;
      left0 = cx - tcx / scale;
      span = width / scale;
      camera.left = left0;
      camera.right = left0 + span;
      camera.top = bounds.min.y + box.y1 / scale;
      camera.bottom = bounds.min.y - (height - box.y1) / scale;
      camera.updateProjectionMatrix();
    },
    slide(dx) {
      // The walk moves the figure across the cameo: the camera moves the other way.
      camera.left = left0 - dx / scale;
      camera.right = camera.left + span;
      camera.updateProjectionMatrix();
    },
    setPace(hps) {
      pace = hps;
    },
    frame(dt, want) {
      time += dt;
      // Turning between side-on and facing the page takes a moment, not a frame.
      yaw += (wantYaw - yaw) * (1 - Math.exp(-dt * 6));
      holder.rotation.y = yaw;
      if (action && pose === 'walk') {
        // A walk cycle covers about 0.8 of his height: match the clip to the root.
        action.timeScale = pace > 0 ? (pace / 0.8) * walkCycle : 1;
      } else if (action) action.timeScale = 1;
      mixer.update(dt);
      setByHand(time);
      const k = 1 - Math.exp(-dt * 3.5);
      look.x += (want.x - look.x) * k;
      look.y += (want.y - look.y) * k;
      B.head.rotation.y += look.x * 0.4;
      B.head.rotation.x += look.y * 0.18;
      if (props.phone.visible) {
        // In the right hand, above the fingers, its screen turned to his face.
        model.updateMatrixWorld(true);
        const hand = B.rHand.getWorldPosition(v());
        const face = B.head.getWorldPosition(v());
        const toFace = v().subVectors(face, hand).normalize();
        const out = v().set(Math.sin(yaw), 0, Math.cos(yaw));
        props.phone.position
          .copy(hand)
          .addScaledVector(toFace, 0.02)
          .addScaledVector(out, 0.07)
          .add(v().set(0, 0.07, 0));
        props.phone.lookAt(face);
      }
      renderer.render(scene, camera);
    },
    dispose() {
      renderer.dispose();
      pending = undefined;
    },
  };
}
