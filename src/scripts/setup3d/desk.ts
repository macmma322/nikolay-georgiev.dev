/**
 * The desk, as an illustrative layout: the kit is real, its positions are an
 * idealised arrangement, not a measured room. Dimensions follow the makers'
 * published sizes where they exist (desk 160 × 76 cm, 27-inch 16:9 panels,
 * Stream Deck 5 × 3, printer 42 × 36.5 × 25.4 cm, router 30 × 18.8 × 6 cm).
 */
import * as THREE from 'three';
import {
  box,
  canvasTexture,
  cyl,
  fan,
  ghostify,
  glow,
  grilleTexture,
  group,
  place,
  rgbTexture,
  rod,
  tube,
  type Materials,
  type Vec,
} from './kit';
import { CASE_ENTRY, type SceneDef } from './scene';

const TOP = 75.5; // desk surface height

export function buildDesk(m: Materials): SceneDef {
  const parts: Record<string, THREE.Object3D> = {
    desk: desk(m),
    chair: place(chair(m), [34, 0, 78], [0, Math.PI - 0.55, 0]),
    monitors: monitors(m),
    arm: arm(m),
    webcam: place(webcam(m), [-14, TOP + 49.6, -21.6], [0, 0.17, 0]),
    mic: mic(m),
    micarm: micArm(m),
    interface: place(scarlett(m), [63, TOP, -10], [0, -0.35, 0]),
    streamdeck: place(streamDeck(m), [58, TOP, 15], [0, -0.3, 0]),
    keyboard: place(keyboard(m), [-6, TOP + 0.3, 16]),
    mouse: mouseAndMat(m),
    tower: place(tower(m), [104, 0, -6]),
    camera: place(ghostify(camera(m)), [-64, TOP, 24], [0, 0.5, 0]),
    printer: place(printer(m), [-112, 0, -12], [0, 0.25, 0]),
    router: place(ghostify(router(m)), [-112, 0, 34], [0, 0.4, 0]),
  };
  const root = group(...Object.values(parts));
  return {
    root,
    parts,
    camera: { position: [110, 150, 250], target: [-4, 62, 6], fov: 32 },
    // The inside view's case is this tower: same size, glass on the same side.
    doors: { inside: { at: [104, 0, -6], part: 'tower', pose: CASE_ENTRY } },
    anchors: {
      desk: [74, TOP, 36],
      monitors: [58, TOP + 49, -16],
      arm: [0, TOP + 45, -34],
      micarm: [-62, TOP + 46, -14],
      keyboard: [-34, TOP + 3, 14],
      mouse: [34, TOP + 5, 17],
      tower: [104, 47, 10],
    },
  };
}

// ---------- Desk: electric frame, two lifting columns ----------
function desk(m: Materials) {
  const g = group(box(160, 2.5, 76, m.wood, 0.4, [0, TOP - 1.25, 0]));
  for (const x of [-66, 66]) {
    g.add(box(7, 2.2, 72, m.satin, 0.3, [x, 1.1, 0])); // foot
    for (const z of [-33, 33]) g.add(cyl(1.2, 1.4, 0.8, m.rubber, [x, 0.4, z], 16));
    g.add(box(8.2, 34, 6.2, m.satin, 0.4, [x, 19, 0])); // outer stage
    g.add(box(7, 34, 5.2, m.satin, 0.35, [x, 49, 0])); // inner stage
    g.add(box(9, 4, 9, m.satin, 0.5, [x, 69.5, 0])); // motor housing
    g.add(box(5, 3, 66, m.satin, 0.3, [x, 72.5, 0])); // side rail
  }
  g.add(box(124, 3, 4, m.satin, 0.3, [0, 71.5, -4])); // crossbar
  // Control panel with a height read-out, front right under the top.
  const panel = group(box(14, 2.2, 5, m.plastic, 0.4));
  panel.add(box(3.4, 0.9, 0.1, glow(0x3a1110), 0.05, [-3.5, 0.2, 2.5]));
  panel.add(
    place(
      new THREE.Mesh(
        new THREE.PlaneGeometry(3, 0.8),
        glow(
          canvasTexture(96, 24, (c) => {
            c.fillStyle = '#100403';
            c.fillRect(0, 0, 96, 24);
            c.fillStyle = '#ff5a3c';
            c.font = 'bold 20px monospace';
            c.fillText('75.5', 18, 19);
          }),
        ),
      ),
      [-3.5, 0.2, 2.56],
    ),
  );
  for (let i = 0; i < 4; i++)
    panel.add(box(1.6, 0.5, 0.4, m.plasticSoft, 0.15, [1 + i * 2.1, 0, 2.6]));
  g.add(place(panel, [52, TOP - 3.6, 36]));
  return g;
}

// ---------- Chair: mesh back, headrest, armrests, footrest ----------
function chair(m: Materials) {
  const g = new THREE.Group();
  // Five-star base with casters.
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const spoke = box(30, 3, 4.5, m.satin, 0.8, [Math.cos(a) * 15, 7, Math.sin(a) * 15]);
    spoke.rotation.y = -a;
    spoke.rotation.z = Math.sin(0.08);
    g.add(spoke);
    const caster = group(
      cyl(2.6, 2.6, 2.2, m.plastic, [0, 0, 0], 20),
      box(2, 3, 2.8, m.plasticSoft, 0.4, [0, 2.6, -1]),
    );
    caster.children[0]!.rotation.x = Math.PI / 2;
    g.add(place(caster, [Math.cos(a) * 29, 2.6, Math.sin(a) * 29], [0, -a, 0]));
  }
  g.add(cyl(3.6, 3.6, 4, m.satin, [0, 9, 0]));
  g.add(cyl(2.4, 2.4, 22, m.chrome, [0, 20, 0])); // gas lift
  g.add(box(22, 4, 24, m.satin, 0.6, [0, 31, -2])); // tilt mechanism
  g.add(rod([8, 30, -4], [16, 30, 4], 0.5, m.satin)); // lever

  // Seat cushion.
  g.add(box(52, 7, 50, m.fabric, 2.6, [0, 38, 0]));

  // Backrest: a curved mesh panel in a frame, lumbar pad behind it.
  const backTexture = canvasTexture(
    64,
    64,
    (c) => {
      // White strokes: the alpha map reads brightness; colour is the material's.
      c.clearRect(0, 0, 64, 64);
      c.strokeStyle = '#ffffff';
      c.lineWidth = 7;
      for (let i = -64; i < 128; i += 10) {
        c.beginPath();
        c.moveTo(i, 0);
        c.lineTo(i + 64, 64);
        c.stroke();
        c.beginPath();
        c.moveTo(i + 64, 0);
        c.lineTo(i, 64);
        c.stroke();
      }
    },
    [9, 11],
  );
  const meshMat = new THREE.MeshStandardMaterial({
    color: 0x2a2d31,
    roughness: 0.9,
    alphaMap: backTexture,
    alphaTest: 0.2,
    side: THREE.DoubleSide,
  });
  const curved = (w: number, h: number, bend: number, lumbar: number) => {
    const geo = new THREE.PlaneGeometry(w, h, 24, 24);
    const p = geo.getAttribute('position');
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i) / (w / 2);
      const y = p.getY(i) / (h / 2);
      p.setZ(i, -bend * x * x + lumbar * Math.exp(-((y + 0.35) ** 2) * 6));
    }
    geo.computeVertexNormals();
    return geo;
  };
  const back = new THREE.Group();
  back.add(new THREE.Mesh(curved(48, 58, 5, 2.2), meshMat));
  const frame: Vec[] = [];
  for (let i = 0; i <= 40; i++) {
    const t = (i / 40) * Math.PI * 2;
    // A squircle, so the frame follows the mesh panel's corners.
    const c = Math.cos(t);
    const sn = Math.sin(t);
    const x = Math.sign(c) * Math.abs(c) ** 0.35 * 25;
    const y = Math.sign(sn) * Math.abs(sn) ** 0.35 * 30;
    frame.push([x, y, -5 * (x / 24) ** 2]);
  }
  back.add(tube(frame, 1.1, m.plastic));
  back.add(box(4, 30, 3, m.satin, 0.8, [0, -38, -3.5])); // spine to the seat
  back.add(box(34, 9, 3, m.plasticSoft, 1.2, [0, -13, -2.4])); // lumbar
  back.position.set(0, 76, -26);
  back.rotation.x = -0.14;
  g.add(back);

  // Headrest on its stalk.
  const head = new THREE.Group();
  head.add(new THREE.Mesh(curved(30, 12, 3, 0), meshMat));
  const headFrame: Vec[] = [];
  for (let i = 0; i <= 30; i++) {
    const t = (i / 30) * Math.PI * 2;
    const x = Math.cos(t) * 15.5;
    headFrame.push([x, Math.sin(t) * 6.6, -3 * (x / 15) ** 2]);
  }
  head.add(tube(headFrame, 0.9, m.plastic));
  head.add(box(3, 12, 2, m.satin, 0.6, [0, -10, -2.5]));
  head.position.set(0, 117, -32);
  head.rotation.x = -0.1;
  g.add(head);

  // Armrests: post, pad.
  for (const s of [-1, 1]) {
    g.add(box(3, 20, 4, m.satin, 0.8, [s * 27, 48, -2]));
    g.add(box(4, 3, 18, m.satin, 0.8, [s * 25, 40, -2]));
    g.add(box(8, 2.2, 25, m.plasticSoft, 1, [s * 27, 59, 0]));
  }

  // Footrest pulled out from under the seat.
  for (const s of [-1, 1]) g.add(rod([s * 14, 33, 10], [s * 14, 26, 36], 0.9, m.chrome));
  g.add(box(36, 2.5, 14, m.fabric, 1, [0, 25, 40]));
  return g;
}

// ---------- Monitors (2 × 27-inch, 16:9) ----------
function screenTexture(kind: 'code' | 'app') {
  return canvasTexture(1024, 576, (c) => {
    c.fillStyle = '#0e1116';
    c.fillRect(0, 0, 1024, 576);
    if (kind === 'code') {
      c.fillStyle = '#151a21';
      c.fillRect(0, 0, 180, 576);
      c.fillStyle = '#1b222b';
      c.fillRect(180, 0, 844, 28);
      const palette = ['#7aa2f7', '#9ece6a', '#e0af68', '#bb9af7', '#7dcfff', '#c0caf5', '#f7768e'];
      for (let y = 46; y < 560; y += 17) {
        let x = 200 + ((y * 7) % 5) * 22;
        const words = 2 + ((y * 13) % 6);
        for (let w = 0; w < words; w++) {
          const len = 30 + ((y * (w + 3)) % 90);
          c.fillStyle = palette[(y + w * 3) % palette.length]!;
          c.globalAlpha = 0.85;
          c.fillRect(x, y, len, 7);
          x += len + 10;
        }
      }
      c.globalAlpha = 1;
      c.fillStyle = '#3b4252';
      for (let y = 40; y < 560; y += 20) c.fillRect(16, y, 60 + ((y * 7) % 90), 6);
    } else {
      c.fillStyle = '#161b22';
      c.fillRect(0, 0, 1024, 40);
      c.fillStyle = '#20262e';
      for (let i = 0; i < 3; i++) c.fillRect(40 + i * 320, 80, 290, 200);
      c.strokeStyle = '#ee5f4b';
      c.lineWidth = 4;
      c.beginPath();
      for (let x = 0; x <= 290; x += 10) c.lineTo(40 + x, 250 - Math.abs(Math.sin(x / 40)) * 120);
      c.stroke();
      c.fillStyle = '#7dcfff';
      for (let i = 0; i < 9; i++)
        c.fillRect(380 + i * 30, 260 - ((i * 37) % 140), 18, (i * 37) % 140);
      c.fillStyle = '#2b323b';
      for (let y = 320; y < 540; y += 36) c.fillRect(40, y, 950, 24);
    }
  });
}

function monitor(m: Materials, kind: 'code' | 'app') {
  const g = new THREE.Group();
  g.add(box(61.4, 36.4, 1.4, m.plastic, 0.3)); // panel shell
  g.add(
    place(
      new THREE.Mesh(new THREE.PlaneGeometry(59.8, 33.6), glow(screenTexture(kind))),
      [0, 0.7, 0.72],
    ),
  );
  g.add(box(61.4, 1.5, 1.6, m.plasticSoft, 0.4, [0, -17.6, 0.1])); // chin
  g.add(box(36, 22, 3.2, m.plastic, 1.2, [0, -1, -2.1])); // rear housing
  g.add(box(46, 0.6, 0.4, glow(0x9b1424, 0.85), 0.1, [0, -7, -3.75])); // rear accent
  g.add(box(10.6, 10.6, 0.6, m.steel, 0.2, [0, 0, -3.9])); // VESA 100 plate
  return g;
}

function monitors(m: Materials) {
  const y = TOP + 31;
  return group(
    place(monitor(m, 'code'), [-31.5, y, -20], [0, 0.17, 0]),
    place(monitor(m, 'app'), [31.5, y, -20], [0, -0.17, 0]),
  );
}

// ---------- StableArm Lifter Duo: pole, clamp, two gas-spring arms ----------
function arm(m: Materials) {
  const g = group(cyl(1.9, 1.9, 44, m.satin, [0, TOP + 22, -34]));
  g.add(cyl(2.4, 2.4, 1.2, m.satin, [0, TOP + 44.6, -34])); // cap
  // C-clamp over the back edge.
  g.add(box(7, 1.5, 9, m.satin, 0.3, [0, TOP + 0.75, -34]));
  g.add(box(7, 12, 1.6, m.satin, 0.3, [0, TOP - 5, -38.6]));
  g.add(box(7, 1.5, 9, m.satin, 0.3, [0, TOP - 10.5, -34]));
  g.add(cyl(0.6, 0.6, 8, m.steel, [0, TOP - 7, -32]));
  g.add(cyl(1.6, 1.6, 0.6, m.plastic, [0, TOP - 3, -32]));
  const collarY = TOP + 25;
  g.add(cyl(2.8, 2.8, 4, m.satin, [0, collarY, -34]));
  for (const s of [-1, 1]) {
    const elbow: Vec = [s * 15, collarY, -33];
    const head: Vec = [s * 29, TOP + 31, -26.5];
    g.add(rod([s * 2.5, collarY, -34], elbow, 1.4, m.satin)); // upper arm
    g.add(cyl(2, 2, 4.4, m.satin, elbow)); // elbow joint
    // Gas-spring forearm: a flat beam with the spring cylinder under it.
    const beam = rod(elbow, head, 1.5, m.satin);
    beam.scale.set(1.25, 1, 0.75);
    g.add(beam);
    g.add(
      rod(
        [elbow[0] + s * 2, elbow[1] - 2.2, elbow[2]],
        [head[0] - s * 4, head[1] - 2.6, head[2] - 1],
        0.55,
        m.chrome,
      ),
    );
    g.add(cyl(1.6, 1.6, 4, m.satin, head));
    g.add(box(3, 5, 3, m.satin, 0.6, [head[0], head[1], head[2] + 1.6])); // tilt head
  }
  return g;
}

// ---------- ASUS ROG Eye S on a monitor clip ----------
function webcam(m: Materials) {
  const g = group(box(9.6, 2.6, 2.6, m.plastic, 0.9));
  const lens = cyl(0.95, 0.95, 0.4, m.lens, [0, 0, 1.3], 24);
  lens.rotation.x = Math.PI / 2;
  g.add(
    lens,
    place(new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.12, 8, 24), m.gunmetal), [0, 0, 1.4]),
  );
  for (const x of [-3.4, 3.4]) g.add(box(0.8, 0.3, 0.1, m.label, 0.05, [x, 0, 1.31])); // mic slots
  g.add(box(3, 1.4, 3.4, m.plasticSoft, 0.4, [0, -1.7, -0.6])); // clip
  g.add(box(3, 4, 0.8, m.plasticSoft, 0.3, [0, -3.5, -2.1]));
  return g;
}

// ---------- RØDE Procaster in a PSM1 shock mount ----------
const MIC_AT: Vec = [-44, TOP + 27, 16];

function mic(m: Materials) {
  const body = new THREE.Group();
  body.add(cyl(2.65, 2.65, 14.5, m.satin, [0, -2.7, 0])); // body, XLR end down
  const head = cyl(
    2.7,
    2.7,
    5.5,
    new THREE.MeshStandardMaterial({
      color: 0x2b2e33,
      metalness: 0.7,
      roughness: 0.45,
      map: grilleTexture([10, 3]),
    }),
    [0, 7.4, 0],
  );
  body.add(head);
  body.add(cyl(2.4, 2.7, 0.6, m.satin, [0, 10.4, 0]));
  for (const y of [4.6, -9.8])
    body.add(
      new THREE.Mesh(new THREE.TorusGeometry(2.66, 0.15, 8, 40), m.gunmetal)
        .rotateX(Math.PI / 2)
        .translateZ(-y),
    );
  body.add(cyl(1.4, 1.4, 1, m.steel, [0, -10.4, 0])); // XLR socket
  // Aim the head at the seated user's mouth.
  const g = group(body);
  g.position.set(...MIC_AT);
  g.lookAt(new THREE.Vector3(4, TOP + 46, 64));
  body.rotation.x = Math.PI / 2;
  return g;
}

function micArm(m: Materials) {
  const g = new THREE.Group();
  // Desk clamp, back left.
  const base: Vec = [-74, TOP, -34];
  g.add(box(6, 1.6, 8, m.satin, 0.3, [base[0], TOP + 0.8, base[2]]));
  g.add(box(6, 11, 1.6, m.satin, 0.3, [base[0], TOP - 4.5, base[2] - 4.6]));
  g.add(box(6, 1.6, 8, m.satin, 0.3, [base[0], TOP - 10, base[2]]));
  g.add(cyl(2, 2, 9, m.satin, [base[0], TOP + 5.5, base[2]]));
  // Two segments of twin rods with spring housings, joined by a knuckle.
  const shoulder: Vec = [-74, TOP + 10, -34];
  const elbow: Vec = [-62, TOP + 44, -14];
  const wrist: Vec = [-44, TOP + 37, 6];
  for (const [a, b] of [
    [shoulder, elbow],
    [elbow, wrist],
  ] as [Vec, Vec][]) {
    for (const off of [-1, 1]) {
      g.add(
        rod(
          [a[0] + off, a[1], a[2] - off * 0.6],
          [b[0] + off, b[1], b[2] - off * 0.6],
          0.55,
          m.satin,
        ),
      );
    }
    const mid: Vec = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
    const housing = rod(
      [mid[0] - (b[0] - a[0]) * 0.18, mid[1] - (b[1] - a[1]) * 0.18, mid[2] - (b[2] - a[2]) * 0.18],
      [mid[0] + (b[0] - a[0]) * 0.18, mid[1] + (b[1] - a[1]) * 0.18, mid[2] + (b[2] - a[2]) * 0.18],
      1.25,
      m.plastic,
    );
    g.add(housing);
  }
  g.add(cyl(2.2, 2.2, 3.8, m.satin, shoulder), cyl(2.2, 2.2, 4, m.satin, elbow));
  const knuckle = cyl(1.8, 1.8, 3.6, m.satin, wrist);
  knuckle.rotation.z = Math.PI / 2;
  g.add(knuckle);
  // Cable channel along the arm.
  g.add(
    tube(
      [shoulder, [-67, TOP + 30, -22], elbow, [-52, TOP + 42, -4], wrist, MIC_AT],
      0.25,
      m.rubber,
    ),
  );
  // PSM1: two cradle rings around the mic on elastic lines, yoke from the knuckle.
  const mount = new THREE.Group();
  mount.position.set(...MIC_AT);
  mount.lookAt(new THREE.Vector3(4, TOP + 46, 64));
  for (const z of [-3, 3.5]) {
    const inner = new THREE.Mesh(new THREE.TorusGeometry(3.05, 0.25, 8, 36), m.plastic);
    const outer = new THREE.Mesh(new THREE.TorusGeometry(4.6, 0.35, 8, 36), m.plastic);
    inner.position.z = outer.position.z = z;
    mount.add(inner, outer);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      mount.add(
        rod(
          [Math.cos(a) * 3.1, Math.sin(a) * 3.1, z - 0.8],
          [Math.cos(a) * 4.5, Math.sin(a) * 4.5, z + 0.8],
          0.09,
          m.rubber,
        ),
      );
    }
  }
  mount.add(rod([0, -4.6, -3], [0, -4.6, 3.5], 0.5, m.plastic));
  g.add(mount);
  return g;
}

// ---------- Focusrite Scarlett 2i2 4th Gen ----------
function scarlett(m: Materials) {
  const g = group(box(18, 4.4, 9.5, m.redAnodised, 0.6, [0, 2.4, 0]));
  const front = 4.78;
  g.add(box(17.2, 3.8, 0.2, m.plastic, 0.1, [0, 2.4, front]));
  const combo = (x: number) => {
    const c = group(
      cyl(1.35, 1.35, 0.3, m.steel, [0, 0, 0], 28),
      cyl(1.1, 1.1, 0.32, m.rubber, [0, 0, 0], 28),
      cyl(0.42, 0.42, 0.34, m.steel, [0, 0, 0], 16),
    );
    for (const a of [Math.PI / 2, Math.PI / 2 + 2.3, Math.PI / 2 - 2.3]) {
      c.add(cyl(0.12, 0.12, 0.36, m.label, [Math.cos(a) * 0.75, 0, Math.sin(a) * 0.75], 8));
    }
    c.rotation.x = Math.PI / 2;
    return place(c, [x, 2.4, front + 0.1]);
  };
  const knob = (x: number, r: number, halo: boolean) => {
    const k = group(cyl(r, r * 0.95, 1.2, m.plastic, [0, 0, 0], 28));
    if (halo)
      k.add(
        place(
          new THREE.Mesh(new THREE.TorusGeometry(r + 0.25, 0.12, 8, 32), glow(0x39ff6a)),
          [0, -0.5, 0],
          [Math.PI / 2, 0, 0],
        ),
      );
    k.rotation.x = Math.PI / 2;
    return place(k, [x, 2.5, front + 0.6]);
  };
  g.add(
    combo(-6.5),
    combo(-1.2),
    knob(-4.1, 0.75, true),
    knob(1.4, 0.75, true),
    knob(5.1, 1.25, false),
  );
  for (const [x, y] of [
    [-4.1, 1],
    [1.4, 1],
    [-2.6, 3.6],
    [3.2, 3.6],
  ] as const)
    g.add(box(0.8, 0.45, 0.25, m.plasticSoft, 0.08, [x, y, front + 0.1]));
  const phones = cyl(0.55, 0.55, 0.3, m.steel, [7.6, 2.4, front + 0.1], 20);
  phones.rotation.x = Math.PI / 2;
  g.add(phones);
  for (const x of [-7.5, 7.5])
    for (const z of [-3.6, 3.6]) g.add(cyl(0.7, 0.7, 0.3, m.rubber, [x, 0.15, z], 12));
  return g;
}

// ---------- Elgato Stream Deck MK.2: 15 LCD keys, on its stand ----------
function streamDeck(m: Materials) {
  const icons = ['#ee5f4b', '#7dcfff', '#9ece6a', '#e0af68', '#bb9af7'];
  const keyTexture = (i: number) =>
    canvasTexture(64, 64, (c) => {
      c.fillStyle = '#0b0d10';
      c.fillRect(0, 0, 64, 64);
      c.fillStyle = icons[i % icons.length]!;
      c.strokeStyle = icons[(i + 2) % icons.length]!;
      c.lineWidth = 5;
      if (i % 3 === 0) {
        c.beginPath();
        c.arc(32, 32, 14, 0, Math.PI * 2);
        c.fill();
      } else if (i % 3 === 1) {
        c.fillRect(18, 18, 28, 28);
      } else {
        c.beginPath();
        c.moveTo(22, 16);
        c.lineTo(46, 32);
        c.lineTo(22, 48);
        c.fill();
      }
    });
  const deck = group(box(11.8, 8.4, 2.1, m.plastic, 0.5));
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 5; col++) {
      const i = row * 5 + col;
      const x = (col - 2) * 2.05;
      const y = (1 - row) * 2.05;
      deck.add(box(1.75, 1.75, 0.35, m.plasticSoft, 0.15, [x, y, 1.15]));
      deck.add(
        place(new THREE.Mesh(new THREE.PlaneGeometry(1.45, 1.45), glow(keyTexture(i))), [
          x,
          y,
          1.34,
        ]),
      );
    }
  }
  deck.rotation.x = -0.75;
  deck.position.set(0, 5.4, 0.4);
  const stand = group(
    box(9, 0.8, 8, m.plasticSoft, 0.3, [0, 0.4, 0]),
    box(8, 6, 1, m.plasticSoft, 0.3, [0, 3, -3.2]),
  );
  stand.children[1]!.rotation.x = -0.75;
  return group(stand, deck);
}

// ---------- COUGAR Attack X3 RGB: aluminium plate, floating keys, RGB glow ----------
function keyboard(m: Materials) {
  const u = 1.9;
  type Row = (number | [number, 'gap'])[];
  const main: Row[] = [
    [1, [1, 'gap'], 1, 1, 1, 1, [0.5, 'gap'], 1, 1, 1, 1, [0.5, 'gap'], 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2],
    [1.5, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.5],
    [1.75, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2.25],
    [2.25, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2.75],
    [1.25, 1.25, 1.25, 6.25, 1.25, 1.25, 1.25, 1.25],
  ];
  const keys: { x: number; z: number; w: number; d: number }[] = [];
  main.forEach((row, r) => {
    let x = 0;
    const z = r * u + (r > 0 ? 0.35 : 0);
    for (const k of row) {
      if (Array.isArray(k)) {
        x += k[0] * u;
        continue;
      }
      keys.push({ x: x + (k * u) / 2, z, w: k * u, d: u });
      x += k * u;
    }
  });
  const navX = 15.25 * u;
  for (const r of [0, 1, 2])
    for (let c = 0; c < 3; c++)
      keys.push({ x: navX + (c + 0.5) * u, z: r * u + (r > 0 ? 0.35 : 0), w: u, d: u });
  keys.push({ x: navX + 1.5 * u, z: 4 * u + 0.35, w: u, d: u });
  for (let c = 0; c < 3; c++) keys.push({ x: navX + (c + 0.5) * u, z: 5 * u + 0.35, w: u, d: u });
  const padX = 18.5 * u;
  for (let r = 1; r <= 5; r++) {
    for (let c = 0; c < 4; c++) {
      const z = r * u + 0.35;
      if (c === 3 && (r === 3 || r === 5)) continue;
      if (c === 3 && (r === 2 || r === 4)) {
        keys.push({ x: padX + 3.5 * u, z: z + u / 2, w: u, d: 2 * u });
        continue;
      }
      if (r === 5 && c === 1) continue;
      if (r === 5 && c === 0) {
        keys.push({ x: padX + u, z, w: 2 * u, d: u });
        continue;
      }
      keys.push({ x: padX + (c + 0.5) * u, z, w: u, d: u });
    }
  }
  const width = 22.5 * u + 1;
  const depth = 6 * u + 1.6;
  const ox = -width / 2 + 0.5;
  const oz = -depth / 2 + 0.8 + u / 2;
  const g = group(box(width, 1.4, depth, m.gunmetal, 0.4, [0, 0.7, 0]));
  g.add(box(width - 0.6, 0.3, depth - 0.6, m.plastic, 0.1, [0, 0.15, 0]));
  // RGB glow on the plate between the floating keys.
  const glowPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(width - 1.2, depth - 1.2),
    glow(rgbTexture(1), 0.55),
  );
  glowPlane.rotation.x = -Math.PI / 2;
  glowPlane.position.y = 1.43;
  g.add(glowPlane);
  const capGeo = new THREE.BoxGeometry(1, 1, 1);
  const caps = new THREE.InstancedMesh(capGeo, m.plastic, keys.length);
  const mat4 = new THREE.Matrix4();
  keys.forEach((k, i) => {
    mat4.compose(
      new THREE.Vector3(ox + k.x, 2.15, oz + k.z),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0.04 * (2.5 - k.z / u), 0, 0)),
      new THREE.Vector3(k.w - 0.28, 1.1, k.d - 0.28),
    );
    caps.setMatrixAt(i, mat4);
  });
  caps.castShadow = true;
  g.add(caps);
  return g;
}

// ---------- Logitech G502 HERO on a Razer Goliathus Chroma Extended ----------
function mouseAndMat(m: Materials) {
  const mat = group(box(92, 0.3, 29.4, m.fabric, 0.12, [0, TOP + 0.15, 0]));
  const strip = glow(rgbTexture(4));
  mat.add(
    box(92, 0.32, 0.35, strip, 0.05, [0, TOP + 0.16, 14.6]),
    box(92, 0.32, 0.35, strip, 0.05, [0, TOP + 0.16, -14.6]),
  );
  mat.add(
    box(0.35, 0.32, 29, strip, 0.05, [46, TOP + 0.16, 0]),
    box(0.35, 0.32, 29, strip, 0.05, [-46, TOP + 0.16, 0]),
  );
  mat.position.set(4, 0, 17);

  // Outline from above (x across, y along the length), thumb rest on the left.
  const s = new THREE.Shape();
  s.moveTo(0, -6.6);
  s.bezierCurveTo(2.6, -6.6, 3.3, -4, 3.2, -1);
  s.bezierCurveTo(3.1, 2.5, 2.8, 5.6, 1.6, 6.6);
  s.lineTo(-1.6, 6.6);
  s.bezierCurveTo(-2.9, 5.2, -3, 2.2, -3.4, 0.4);
  s.bezierCurveTo(-4.6, -0.4, -4.4, -3.2, -3.6, -4.4);
  s.bezierCurveTo(-2.8, -6.2, -1.6, -6.6, 0, -6.6);
  const shell = new THREE.Mesh(
    new THREE.ExtrudeGeometry(s, {
      depth: 1.6,
      bevelEnabled: true,
      bevelThickness: 1.9,
      bevelSize: 1.1,
      bevelSegments: 6,
      curveSegments: 24,
    }),
    m.plastic,
  );
  shell.rotation.x = -Math.PI / 2;
  shell.position.y = 0.4;
  const mouse = group(shell);
  for (const x of [-1.3, 1.3])
    mouse.add(
      place(box(2.4, 0.3, 5.2, m.plasticSoft, 0.12), [x, 4.15, -3.6], [-0.18, 0, x * 0.04]),
    );
  const wheel = cyl(0.75, 0.75, 0.7, m.gunmetal, [0, 4.3, -3.7], 24);
  wheel.rotation.z = Math.PI / 2;
  mouse.add(wheel);
  mouse.add(place(box(0.5, 0.25, 1.4, m.gunmetal, 0.08), [-1.9, 4, -1.8]));
  for (const z of [-1.8, 0.2])
    mouse.add(place(box(0.25, 0.6, 1.5, m.plasticSoft, 0.08), [-4.3, 2.4, z]));
  mouse.add(
    place(
      new THREE.Mesh(new THREE.CircleGeometry(0.55, 20), glow(0x3dc8ff)),
      [0.4, 3.75, 3.4],
      [-1.4, 0, 0],
    ),
  );
  mouse.scale.setScalar(1.02);
  mouse.position.set(34, TOP + 0.3, 17);
  return group(mat, mouse);
}

// ---------- Main PC tower (case model not recorded: a neutral mid-tower) ----------
function tower(m: Materials) {
  // A shell of panels (not a solid block), so the window shows the build.
  const g = group(
    box(0.8, 46, 45, m.satin, 0.3, [-10.1, 24, 0]),
    box(21, 1.2, 45, m.satin, 0.4, [0, 46.4, 0]),
    box(21, 2, 45, m.satin, 0.4, [0, 2, 0]),
    box(21, 46, 0.8, m.satin, 0.3, [0, 24, -22.1]),
    box(21, 46, 1.2, m.satin, 0.4, [0, 24, 21.9]),
  );
  g.add(
    box(
      19.6,
      42,
      0.3,
      new THREE.MeshStandardMaterial({
        color: 0x24272b,
        roughness: 0.9,
        map: grilleTexture([14, 30]),
      }),
      0.05,
      [0, 24, 22.6],
    ),
  ); // front mesh
  for (const x of [-8, 8])
    for (const z of [-19, 19]) g.add(cyl(1.4, 1.4, 1, m.rubber, [x, 0.5, z], 12));
  // Glass side, with the build visible behind it.
  g.add(box(0.4, 42, 41, m.glass, 0.05, [10.7, 24.5, 0]));
  const inside = group(
    box(0.4, 30, 24, m.pcb, 0.05, [-8, 31, -7]),
    box(9, 5, 28, m.plastic, 0.3, [-3.5, 26, -5]),
    box(19, 10, 43, m.plasticSoft, 0.3, [0, 6, 0]),
  );
  for (let i = 0; i < 4; i++)
    inside.add(box(0.8, 3.4, 13.3, m.plastic, 0.1, [-6.5, 33, 3 + i * 0.9]));
  inside.add(box(5, 4, 5, m.plasticSoft, 1.2, [-5.2, 33, -8]));
  for (const z of [-14, -5, 4])
    inside.add(
      place(
        new THREE.Mesh(new THREE.TorusGeometry(3.6, 0.25, 6, 28), glow(rgbTexture())),
        [1, 23.4, z],
        [Math.PI / 2, 0, 0],
      ),
    );
  for (const z of [-12, 1])
    inside.add(place(fan(12, m, { light: true }), [0, 43, z], [Math.PI / 2, 0, 0]));
  inside.add(box(3, 0.3, 30, glow(rgbTexture(2)), 0.05, [1, 29, -5]));
  g.add(inside);
  // Front I/O on the top edge.
  g.add(cyl(0.8, 0.8, 0.4, m.steel, [0, 47, 18], 20));
  for (const x of [-4, -2]) g.add(box(1.4, 0.2, 0.6, m.steel, 0.05, [x, 47, 18]));
  return g;
}

// ---------- Sony a6400 (planned) on a small tripod ----------
function camera(m: Materials) {
  const body = group(box(12, 6.7, 3.6, m.plastic, 0.5, [0, 3.35, 0]));
  body.add(box(3.4, 6.7, 4.6, m.plastic, 0.8, [-4.3, 3.35, 0.6])); // grip
  body.add(box(4, 1.6, 2.4, m.plastic, 0.3, [-2.5, 7.1, -0.4])); // top plate
  const lens = cyl(3.2, 3.2, 6.5, m.plastic, [1.8, 3.4, 5], 28);
  lens.rotation.x = Math.PI / 2;
  body.add(lens);
  body.position.y = 13;
  const legs = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    legs.add(rod([0, 12, 0], [Math.cos(a) * 9, 0, Math.sin(a) * 9], 0.5, m.plastic));
  }
  return group(body, legs);
}

// ---------- HP LaserJet Pro MFP M125nw (42 × 36.5 × 25.4 cm) ----------
function printer(m: Materials) {
  const g = new THREE.Group();
  g.add(box(42, 18, 31, m.plastic, 0.8, [0, 9, -2.5])); // print engine
  g.add(box(42, 2.4, 33, m.plasticSoft, 0.5, [0, 19.2, -1.5])); // scanner base
  g.add(box(42, 3.4, 36.5, m.plastic, 0.6, [0, 22.1, 0])); // lid
  g.add(box(36, 0.1, 30, m.glass, 0.02, [0, 20.45, -1])); // platen glass
  g.add(box(30, 0.6, 1.4, m.gunmetal, 0.2, [0, 22.3, -17.6])); // hinge
  // Output bay under the scanner with a printed sheet.
  g.add(box(30, 4, 8, m.label, 0.4, [0, 16, 12]));
  g.add(place(box(21, 0.1, 18, m.white, 0.02), [0, 15.2, 6], [-0.12, 0, 0]));
  // Paper tray at the front bottom, with paper.
  g.add(box(30, 2, 12, m.plasticSoft, 0.4, [0, 2.6, 17]));
  g.add(box(21, 1, 20, m.white, 0.02, [0, 3.6, 9]));
  // Control panel on the front left with a small LCD.
  const panel = group(box(12, 1.2, 4.6, m.plasticSoft, 0.4));
  panel.add(
    place(
      new THREE.Mesh(new THREE.PlaneGeometry(4, 1.6), glow(0x6f8fa8)),
      [-2.5, 0.62, 0],
      [-Math.PI / 2, 0, 0],
    ),
  );
  for (let i = 0; i < 4; i++) panel.add(box(0.9, 0.3, 0.9, m.label, 0.2, [1.4 + i * 1.2, 0.7, 0]));
  panel.add(
    place(
      new THREE.Mesh(new THREE.CircleGeometry(0.3, 12), glow(0x3dff8a)),
      [5.4, 0.62, -1.4],
      [-Math.PI / 2, 0, 0],
    ),
  );
  g.add(place(panel, [-13, 20, 17.5], [0.3, 0, 0]));
  return g;
}

// ---------- ASUS RT-BE88U (planned): faceted body, four rear antennas ----------
function router(m: Materials) {
  const side = new THREE.Shape();
  side.moveTo(-9.4, 0);
  side.lineTo(9.4, 0);
  side.lineTo(9.4, 4.4);
  side.lineTo(4, 6);
  side.lineTo(-6, 5.2);
  side.lineTo(-9.4, 2.2);
  side.lineTo(-9.4, 0);
  const body = new THREE.Mesh(
    new THREE.ExtrudeGeometry(side, {
      depth: 30,
      bevelEnabled: true,
      bevelSize: 0.4,
      bevelThickness: 0.4,
    }),
    m.plastic,
  );
  body.rotation.y = -Math.PI / 2;
  body.position.x = 15;
  const g = group(body);
  // Raised spine and vent on top, LED row at the front.
  g.add(place(box(12, 0.8, 9, m.plasticSoft, 0.2), [0, 6, -1], [0.08, 0, 0]));
  g.add(place(box(8, 0.2, 5, m.gold, 0.05), [0, 6.45, -2], [0.08, 0, 0]));
  for (let i = 0; i < 8; i++)
    g.add(box(0.5, 0.2, 0.2, glow(0xffffff), 0.05, [-5 + i * 1.4, 2.2, 9.6]));
  // Ports on the back.
  for (let i = 0; i < 10; i++) g.add(box(1.4, 1.2, 0.3, m.label, 0.05, [-11 + i * 2.2, 2.4, -9.6]));
  for (const x of [-13, -5, 5, 13]) {
    const ant = group(
      box(1.8, 17, 0.9, m.plastic, 0.4, [0, 8.5, 0]),
      cyl(0.9, 0.9, 1.6, m.gold, [0, 0, 0], 16),
    );
    ant.children[1]!.rotation.z = Math.PI / 2;
    g.add(place(ant, [x, 4.8, -9.2], [-0.12, 0, 0]));
  }
  return g;
}
