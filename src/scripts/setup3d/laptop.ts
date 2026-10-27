/**
 * Acer Nitro AN515-52: 15.6-inch, about 39 × 26.6 × 2.7 cm, black with red
 * accents and a red keyboard backlight. The cutaway's internal layout (two
 * fans, shared heat pipes, two SO-DIMMs, an M.2 slot and a 2.5-inch bay) is
 * the general arrangement of this class of laptop, drawn to explain, not a
 * documented teardown.
 */
import * as THREE from 'three';
import { box, canvasTexture, cyl, fan, glow, group, m2, place, tube, type Materials } from './kit';
import type { SceneDef } from './scene';

const W = 39;
const D = 26.6;

function desktopTexture() {
  return canvasTexture(1024, 576, (c) => {
    const g = c.createLinearGradient(0, 0, 1024, 576);
    g.addColorStop(0, '#2c0a24');
    g.addColorStop(0.55, '#77216f');
    g.addColorStop(1, '#e95420');
    c.fillStyle = g;
    c.fillRect(0, 0, 1024, 576);
    c.fillStyle = '#0d0d0d';
    c.fillRect(0, 0, 1024, 22); // top bar
    c.fillStyle = 'rgba(20,20,22,0.82)';
    c.fillRect(0, 22, 62, 554); // dock
    for (let i = 0; i < 7; i++) {
      c.fillStyle = ['#e95420', '#3d8fd6', '#5fb04f', '#f2c14e', '#9a5fd0', '#d6d6d6', '#3fb7c9'][
        i
      ]!;
      c.beginPath();
      c.roundRect(11, 40 + i * 60, 40, 40, 9);
      c.fill();
    }
    // A terminal window.
    c.fillStyle = '#300a24';
    c.fillRect(250, 110, 560, 330);
    c.fillStyle = '#2b2b2b';
    c.fillRect(250, 110, 560, 26);
    for (let y = 160; y < 420; y += 22) {
      c.fillStyle = y % 3 ? '#8ae234' : '#eeeeec';
      c.fillRect(270, y, 40 + ((y * 37) % 380), 9);
    }
  });
}

export function buildLaptop(m: Materials): SceneDef {
  const red = glow(0xc8102e);
  // ---------- Base: bottom shell and the keyboard deck ----------
  const bottom = box(W, 1.3, D, m.plastic, 0.5, [0, 0.65, 0]);
  const deck = box(W, 1.1, D, m.plasticSoft, 0.45, [0, 1.95, 0]);
  const deckTop = 2.5;
  const keys = new THREE.Group();
  const u = 1.75;
  const rows = [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1],
    [1.5, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.5, 1, 1, 1, 1],
    [1.75, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2.25, 1, 1, 1, 1],
    [2.25, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2.75, 1, 1, 1, 1],
    [1.25, 1, 1.25, 6, 1.25, 1, 1, 1, 1, 1, 1, 1],
  ];
  const capGeo = new THREE.BoxGeometry(1, 1, 1);
  let count = 0;
  for (const row of rows) count += row.length;
  const caps = new THREE.InstancedMesh(capGeo, m.plastic, count);
  const matrix = new THREE.Matrix4();
  let i = 0;
  rows.forEach((row, r) => {
    let x = -W / 2 + 1.6;
    for (const w of row) {
      matrix.compose(
        new THREE.Vector3(x + (w * u) / 2, deckTop + 0.2, -D / 2 + 3.6 + r * u),
        new THREE.Quaternion(),
        new THREE.Vector3(w * u - 0.25, 0.3, u * (r === 0 ? 0.6 : 1) - 0.25),
      );
      caps.setMatrixAt(i++, matrix);
      x += w * u;
    }
  });
  keys.add(caps);
  // Red backlight between the keys, WASD keys outlined.
  const glowPlane = new THREE.Mesh(new THREE.PlaneGeometry(W - 3, rows.length * u), glow(0x7a0b1c));
  glowPlane.rotation.x = -Math.PI / 2;
  glowPlane.position.set(0, deckTop + 0.02, -D / 2 + 3.6 + 2.5 * u);
  keys.add(glowPlane);
  // Touchpad (offset left, with a red trim) and the red-trimmed rear vents.
  const pad = group(box(10.6, 0.06, 7.2, m.satin, 0.3, [-4, deckTop, 8.2]));
  pad.add(
    box(10.9, 0.04, 0.12, red, 0.02, [-4, deckTop + 0.01, 4.55]),
    box(10.9, 0.04, 0.12, red, 0.02, [-4, deckTop + 0.01, 11.85]),
  );
  for (const x of [-15, 15]) {
    const vent = group(box(7, 1.2, 0.3, m.label, 0.1, [x, 1.4, -D / 2 - 0.05]));
    for (let k = 0; k < 6; k++)
      vent.add(box(0.15, 1, 0.32, red, 0.02, [x - 3 + k * 1.2, 1.4, -D / 2 - 0.06]));
    pad.add(vent);
  }
  for (let k = 0; k < 3; k++)
    pad.add(
      box(1.2, 0.5, 0.3, m.label, 0.05, [-W / 2 + 0.05, 1.5, -6 + k * 2.4]).rotateY(Math.PI / 2),
    );

  // ---------- Lid at about 110 degrees, hinged at the back ----------
  const lid = new THREE.Group();
  lid.add(
    box(
      W,
      25,
      0.8,
      new THREE.MeshStandardMaterial({ color: 0x15171a, roughness: 0.45, metalness: 0.35 }),
      0.4,
      [0, 12.5, 0],
    ),
  );
  lid.add(box(W - 0.6, 0.15, 0.82, red, 0.02, [0, 1.2, 0])); // hinge accent
  const screen = place(
    new THREE.Mesh(new THREE.PlaneGeometry(34.5, 19.4), glow(desktopTexture())),
    [0, 13.6, 0.42],
  );
  const lidPivot = group(lid);
  lidPivot.position.set(0, 2.4, -D / 2 + 0.5);
  lidPivot.rotation.x = -0.35;
  const screenPivot = group(screen);
  screenPivot.position.copy(lidPivot.position);
  screenPivot.rotation.copy(lidPivot.rotation);
  for (const x of [-15.5, 15.5]) {
    const hinge = cyl(0.7, 0.7, 4, m.gunmetal, [x, 2.4, -D / 2 + 0.5], 16);
    hinge.rotation.z = Math.PI / 2;
    lidPivot.add(place(hinge, [x, 0, 0]));
  }

  // ---------- Inside (cutaway) ----------
  const board = box(W - 4, 0.16, D - 9, m.pcbGreen, 0.02, [0, 1.35, -3]);
  const cpu = group(box(1.6, 0.25, 2.8, m.silicon, 0.05, [-4, 1.55, -6]));
  const gpu = group(box(2.2, 0.25, 2.2, m.silicon, 0.05, [5, 1.55, -6]));
  const copper = m.copper;
  const pipes = group(
    tube(
      [
        [-13, 1.75, -11],
        [-8, 1.75, -7],
        [-4, 1.75, -6],
        [5, 1.75, -6],
        [13, 1.75, -11],
      ],
      0.28,
      copper,
    ),
    tube(
      [
        [-13, 1.7, -10],
        [-6, 1.7, -5],
        [5, 1.7, -5.2],
        [13, 1.7, -10],
      ],
      0.28,
      copper,
    ),
  );
  pipes.add(
    box(3.4, 0.2, 3.4, copper, 0.05, [-4, 1.7, -6]),
    box(3.6, 0.2, 3.6, copper, 0.05, [5, 1.7, -6]),
  );
  const coolers = group(
    place(fan(7.2, m, { depth: 1 }), [-15, 1.5, -8.6], [-Math.PI / 2, 0, 0]),
    place(fan(7.2, m, { depth: 1 }), [15, 1.5, -8.6], [-Math.PI / 2, 0, 0]),
    box(7, 1, 1.2, m.fins, 0.05, [-15, 1.5, -12.6]),
    box(7, 1, 1.2, m.fins, 0.05, [15, 1.5, -12.6]),
  );
  cpu.add(pipes, coolers);
  const ram = group(
    place(box(6.8, 0.35, 3, m.pcbGreen, 0.05), [3, 1.6, 2.4]),
    place(box(6.8, 0.35, 3, m.pcbGreen, 0.05), [3, 1.95, 2.4]),
  );
  for (const y of [1.8, 2.15])
    for (let k = 0; k < 4; k++) ram.add(box(1, 0.1, 1.2, m.silicon, 0.02, [0.6 + k * 1.6, y, 2.4]));
  const ssd = place(m2(m, 0x101113), [-9, 1.55, 3], [0, Math.PI / 2, 0]);
  const drive = place(
    group(box(7, 0.7, 10, m.aluminium, 0.15), box(6, 0.04, 6, m.label, 0.01, [0, 0.36, 0.6])),
    [-13.5, 1.75, 7.5],
  );
  const battery = box(16, 0.7, 6, m.plastic, 0.2, [5, 1.7, 9.4]);

  const nitro = group(bottom, deck, keys, pad, lidPivot, board, battery);
  const parts = {
    nitro,
    'l-cpu': cpu,
    'l-gpu': gpu,
    'l-ram': ram,
    'l-ssd': ssd,
    'l-hdd': drive,
    'l-os': screenPivot,
  };
  const root = group(...Object.values(parts));
  return {
    root,
    parts,
    camera: { position: [42, 44, 58], target: [0, 7, -1], fov: 30 },
    // Opened, the view looks down into the chassis.
    inspect: { position: [28, 60, 40], target: [0, 4, -1] },
    modes: ['assembled', 'cutaway'],
    shell: [deck, keys, pad],
    hidden: ['l-cpu', 'l-gpu', 'l-ram', 'l-ssd', 'l-hdd'],
    anchors: {
      nitro: [W / 2 - 2, 2.6, 10],
      'l-os': [12, 22, -16],
      'l-cpu': [-4, 2.2, -6],
      'l-gpu': [5, 2.2, -6],
      'l-ram': [3, 2.4, 2.4],
      'l-ssd': [-9, 2, 3],
      'l-hdd': [-13.5, 2.4, 7.5],
    },
  };
}
