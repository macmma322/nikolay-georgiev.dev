/**
 * The two desktops, inside. Coordinates: the motherboard stands at -x and
 * faces +x (the glass side), y is up, z points to the front. Expansion cards
 * lie flat, out of the board, as they do in a tower.
 *
 * Parts follow published sizes (ATX 30.5 × 24.4 cm, H81M micro-ATX
 * 22.6 × 17.8 cm, a 240 mm radiator, 3.5-inch drives, PSU 15 × 8.6 × 16 cm,
 * the EVGA FTW3 card about 30 × 13.6 cm and 2.75 slots). Board layouts and
 * positions are explanatory, not a service manual; the case models are not
 * recorded, so both cases are neutral.
 */
import * as THREE from 'three';
import {
  box,
  cyl,
  fan,
  ghostify,
  glow,
  grilleTexture,
  group,
  hdd,
  m2,
  place,
  rgbTexture,
  rod,
  ssd25,
  tube,
  type Materials,
  type Vec,
} from './kit';
import { CASE_ENTRY, type SceneDef } from './scene';

const BOARD_X = -9; // board surface plane

// ---------- Shared pieces ----------

/** A DIMM standing out of the board: length along y, height along +x. */
function dimmStick(m: Materials, kind: 'fury' | 'ddr3') {
  const g = new THREE.Group();
  if (kind === 'fury') {
    g.add(box(3.2, 13.3, 0.62, m.satin, 0.1, [1.6, 0, 0]));
    g.add(box(0.4, 13.1, 0.66, m.gunmetal, 0.08, [3.25, 0, 0]));
    g.add(box(1.2, 4.5, 0.64, m.label, 0.05, [1.6, 2, 0.01]));
  } else {
    g.add(box(3, 13.3, 0.13, m.pcbGreen, 0.02, [1.5, 0, 0]));
    for (let i = 0; i < 8; i++) {
      g.add(box(0.9, 1.1, 0.12, m.silicon, 0.03, [1.6, -5.5 + i * 1.55, 0.12]));
      g.add(box(0.9, 1.1, 0.12, m.silicon, 0.03, [1.6, -5.5 + i * 1.55, -0.12]));
    }
  }
  g.add(box(0.3, 13, 0.14, m.gold, 0.02, [0.1, 0, 0]));
  return g;
}

/** A PCIe slot on the board: steel-armoured for x16, plain for x1. */
function pcieSlot(m: Materials, y: number, zFrom: number, length: number, armoured: boolean) {
  return box(0.9, 0.75, length, armoured ? m.chrome : m.plastic, 0.12, [
    BOARD_X + 0.45,
    y,
    zFrom + length / 2,
  ]);
}

/**
 * An expansion card in a tower: PCB in the horizontal plane at the slot,
 * height out of the board (+x), length toward the front (+z), bracket(s) at
 * the rear across the slot line.
 */
function card(
  m: Materials,
  opts: { y: number; rear: number; length: number; height: number; slots?: number },
) {
  const { y, rear, length, height } = opts;
  const g = new THREE.Group();
  g.add(box(height, 0.16, length, m.pcb, 0.02, [BOARD_X + 0.9 + height / 2, y, rear + length / 2]));
  g.add(
    box(0.9, 0.2, Math.min(length - 1, 8.9), m.gold, 0.02, [
      BOARD_X + 0.6,
      y - 0.1,
      rear + 1.8 + 4.5,
    ]),
  );
  for (let i = 0; i < (opts.slots ?? 1); i++) {
    g.add(box(12, 1.85, 0.12, m.steel, 0.02, [BOARD_X + 6.5, y - 0.6 - i * 2.03, rear - 0.1]));
  }
  return g;
}

/** Ports on a bracket, facing the rear (-z). */
function bracketPort(mat: THREE.Material, size: [number, number], at: Vec) {
  return box(size[0], size[1], 0.3, mat, 0.05, at);
}

// =====================================================================
// Main workstation
// =====================================================================

export function buildInside(m: Materials): SceneDef {
  const rear = -21.5;
  const front = 22;

  // ---------- Case: neutral mid-tower, glass on the +x side ----------
  const glass = box(0.4, 45, 43, m.glass, 0.05, [10.6, 23.5, 0]);
  const top = box(
    21,
    1,
    45,
    new THREE.MeshStandardMaterial({
      color: 0x1d1f22,
      roughness: 0.7,
      metalness: 0.4,
      map: grilleTexture([12, 26]),
    }),
    0.2,
    [0, 46.5, 0],
  );
  const frontPanel = box(
    21,
    46,
    1.2,
    new THREE.MeshStandardMaterial({
      color: 0x22252a,
      roughness: 0.85,
      map: grilleTexture([12, 26]),
    }),
    0.3,
    [0, 23.5, front + 0.6],
  );
  const shroud = box(19.6, 0.6, 30, m.satin, 0.1, [0, 10.2, -7]);
  const shroudFace = box(0.4, 10, 30, m.satin, 0.1, [9.6, 5.2, -7]);
  const caseFixed = group(
    box(0.8, 47, 45, m.satin, 0.3, [-10.6, 23.5, 0]), // board side
    box(21, 1, 45, m.satin, 0.3, [0, 0.5, 0]), // floor
    box(21, 47, 0.8, m.satin, 0.2, [0, 23.5, rear - 0.6]), // rear
  );
  for (let i = 0; i < 7; i++)
    caseFixed.add(box(12, 1.6, 0.2, m.steel, 0.02, [-2.2, 24.6 - i * 2.03, rear - 0.2]));
  for (const x of [-8, 8])
    for (const z of [-19, 19]) caseFixed.add(cyl(1.4, 1.4, 1, m.rubber, [x, -0.4, z], 12));

  // ---------- Motherboard: MSI MPG X570 GAMING PLUS (ATX) ----------
  const boardY = 28.75;
  const boardZ = rear + 12.2 + 0.4;
  const board = group(box(0.16, 30.5, 24.4, m.pcb, 0.02, [BOARD_X, boardY, boardZ]));
  const redLine = glow(0x9b1424);
  const heatsink = (w: number, h: number, d: number, at: Vec) =>
    group(
      box(w, h, d, m.satin, 0.25, at),
      box(w + 0.02, 0.18, d * 0.85, redLine, 0.02, [at[0], at[1] + h / 2 - 0.4, at[2]]),
    );
  board.add(heatsink(3.4, 2.2, 10, [BOARD_X + 1.8, 42.4, -12.5])); // top VRM
  board.add(heatsink(3.4, 11, 2.2, [BOARD_X + 1.8, 35.5, -18.5])); // side VRM
  board.add(box(4.2, 18, 4, m.satin, 0.4, [BOARD_X + 2.1, 34, rear + 2.2])); // I/O cover
  board.add(box(4.25, 0.2, 3.5, redLine, 0.02, [BOARD_X + 2.1, 40, rear + 2.3]));
  // AM4 socket.
  board.add(box(0.6, 6, 6, m.white, 0.15, [BOARD_X + 0.3, 36, -9]));
  // Four DIMM slots to the right of the socket.
  for (const z of [-3.4, -2.3, -1.2, -0.1])
    board.add(box(0.9, 14, 0.75, m.plastic, 0.1, [BOARD_X + 0.45, 34.6, z]));
  // 24-pin power and six SATA ports on the front edge.
  board.add(box(1.8, 5.6, 1.4, m.plastic, 0.15, [BOARD_X + 0.9, 33, 2.6]));
  for (let i = 0; i < 6; i++)
    board.add(
      box(1.2, 0.9, 0.9, m.plastic, 0.1, [
        BOARD_X + 0.6,
        15 + (i % 3) * 1.2,
        2.3 - Math.floor(i / 3) * 1,
      ]),
    );
  // PCIe slots: x16 (armoured), x1, x1, x16 (armoured), x1, x16.
  const slotYs = [27.5, 25.2, 22.9, 20.6, 18.3, 16];
  slotYs.forEach((y, i) =>
    board.add(
      pcieSlot(m, y, rear + 2, i === 0 || i === 3 || i === 5 ? 8.9 : 2.5, i === 0 || i === 3),
    ),
  );
  // M.2 shields and the chipset heatsink with its fan.
  board.add(heatsink(0.7, 2.8, 9.2, [BOARD_X + 0.5, 29.6, -12]));
  board.add(heatsink(0.7, 2.8, 9.2, [BOARD_X + 0.5, 19.4, -12]));
  board.add(heatsink(1.3, 6, 6, [BOARD_X + 0.7, 15, -3]));
  board.add(place(fan(4.4, m, { depth: 0.6 }), [BOARD_X + 1.4, 15, -3], [0, Math.PI / 2, 0]));
  // Capacitors around the socket.
  for (let i = 0; i < 9; i++) {
    const cap = cyl(0.35, 0.35, 0.9, m.steel, [BOARD_X + 0.5, 40.4, -15.5 + i * 1.1], 12);
    cap.rotation.z = Math.PI / 2;
    board.add(cap);
  }

  // ---------- CPU: Ryzen 9 5900X under the pump ----------
  const cpu = group(box(0.5, 4, 4, m.aluminium, 0.2, [BOARD_X + 0.85, 36, -9]));
  cpu.add(box(0.52, 3, 3, m.chrome, 0.1, [BOARD_X + 0.86, 36, -9]));

  // ---------- Corsair H100i RGB Platinum: pump, hoses, 240 mm radiator, two fans ----------
  const pumpX = BOARD_X + 3.4;
  const cooler = group(
    box(4.4, 7, 7, m.plastic, 1.2, [pumpX, 36, -9]),
    place(
      new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.22, 10, 40), glow(rgbTexture(2))),
      [pumpX + 2.25, 36, -9],
      [0, Math.PI / 2, 0],
    ),
    place(
      new THREE.Mesh(new THREE.CircleGeometry(2.3, 32), m.gunmetal),
      [pumpX + 2.21, 36, -9],
      [0, Math.PI / 2, 0],
    ),
  );
  const radY = 44.7;
  cooler.add(box(12.2, 2.7, 27.7, m.fins, 0.2, [2.6, radY, -3]));
  cooler.add(
    box(12.4, 2.8, 1.6, m.satin, 0.2, [2.6, radY, -17.6]),
    box(12.4, 2.8, 1.6, m.satin, 0.2, [2.6, radY, 11.6]),
  );
  for (const z of [-9.2, 3.2])
    cooler.add(place(fan(12, m, { light: true }), [2.6, radY - 2.7, z], [Math.PI / 2, 0, 0]));
  for (const off of [-1.2, 1.2]) {
    cooler.add(
      tube(
        [
          [pumpX + 2, 38.5, -9 + off],
          [pumpX + 5, 41, -4 + off],
          [6, 41.5, 6 + off],
          [6.5, 44, 11.6 + off * 0.6],
        ],
        0.55,
        m.rubber,
      ),
    );
  }

  // ---------- Kingston FURY: four 16 GB DIMMs ----------
  const ram = group(
    ...[-3.4, -2.3, -1.2, -0.1].map((z) => place(dimmStick(m, 'fury'), [BOARD_X + 0.9, 34.6, z])),
  );

  // ---------- EVGA GeForce RTX 3080 FTW3 Ultra Gaming ----------
  const gpuY = slotYs[0]!;
  const gpu = card(m, { y: gpuY, rear: rear + 0.3, length: 30, height: 13.6, slots: 3 });
  const gpuX = BOARD_X + 0.9 + 6.8;
  const gpuZ = rear + 0.3 + 15;
  gpu.add(box(13.6, 0.4, 30, m.gunmetal, 0.15, [gpuX, gpuY + 0.35, gpuZ])); // backplate
  gpu.add(box(13, 3.6, 29, m.fins, 0.2, [gpuX, gpuY - 2, gpuZ])); // heatsink
  // Shroud: a dark angular frame below the fins, three fans facing down.
  const shroud3 = new THREE.Shape();
  shroud3.moveTo(-15, -6.8);
  shroud3.lineTo(15, -6.8);
  shroud3.lineTo(15, 5.6);
  shroud3.lineTo(13.4, 6.8);
  shroud3.lineTo(-13.4, 6.8);
  shroud3.lineTo(-15, 5.6);
  shroud3.lineTo(-15, -6.8);
  for (const zc of [-9.8, 0, 9.8]) {
    const hole = new THREE.Path();
    hole.absarc(zc, 0, 4.55, 0, Math.PI * 2, true);
    shroud3.holes.push(hole);
  }
  const shroudMesh = new THREE.Mesh(
    new THREE.ExtrudeGeometry(shroud3, {
      depth: 1.2,
      bevelEnabled: true,
      bevelSize: 0.25,
      bevelThickness: 0.2,
      curveSegments: 28,
    }),
    new THREE.MeshStandardMaterial({ color: 0x232629, roughness: 0.42, metalness: 0.55 }),
  );
  shroudMesh.rotation.set(Math.PI / 2, 0, Math.PI / 2);
  shroudMesh.position.set(gpuX, gpuY - 3.8, gpuZ);
  gpu.add(shroudMesh);
  for (const zc of [-9.8, 0, 9.8])
    gpu.add(place(fan(9.6, m, { depth: 1.2 }), [gpuX, gpuY - 4.3, gpuZ + zc], [Math.PI / 2, 0, 0]));
  // Glass-facing edge: the ARGB bar and three 8-pin power sockets.
  gpu.add(box(0.3, 1.1, 22, glow(rgbTexture(2)), 0.1, [gpuX + 6.85, gpuY - 1.6, gpuZ - 1]));
  for (let i = 0; i < 3; i++)
    gpu.add(box(0.9, 1.1, 2.2, m.plastic, 0.1, [gpuX + 6.9, gpuY - 0.4, gpuZ + 6 + i * 2.5]));
  for (let i = 0; i < 4; i++)
    gpu.add(bracketPort(m.label, [1.6, 0.8], [BOARD_X + 3 + i * 2.4, gpuY - 1.4, rear]));

  // ---------- GIGABYTE GC-WIFI7: x1 card with heatsink, antenna base on the case ----------
  const wifiY = slotYs[4]!;
  const wifi = card(m, { y: wifiY, rear: rear + 0.3, length: 9, height: 6.5 });
  wifi.add(
    box(
      4.6,
      1,
      6,
      new THREE.MeshStandardMaterial({
        color: 0x2a2d31,
        roughness: 0.4,
        metalness: 0.7,
        map: grilleTexture([3, 3]),
      }),
      0.2,
      [BOARD_X + 4.2, wifiY - 0.6, rear + 5],
    ),
  );
  for (const x of [-5.6, -2.8]) {
    const sma = cyl(0.35, 0.35, 1.2, m.gold, [x, wifiY - 0.6, rear - 0.7], 12);
    sma.rotation.x = Math.PI / 2;
    wifi.add(sma);
  }
  const antennaBase = group(box(7, 1.4, 5.5, m.plastic, 0.6, [0, 0.7, 0]));
  for (const x of [-2, 2])
    antennaBase.add(place(box(1.4, 14, 0.7, m.plastic, 0.35), [x, 8.5, 0], [0, 0, x * 0.04]));
  wifi.add(place(antennaBase, [2, 47, rear + 6]));
  wifi.add(
    tube(
      [
        [-5.6, wifiY - 0.6, rear - 1.2],
        [-4, wifiY + 6, rear - 3],
        [-2, 40, rear - 3],
        [2, 47.5, rear + 3],
      ],
      0.18,
      m.rubber,
    ),
  );

  // ---------- JESWO USB card: controller, hub chip, seven ports ----------
  const usbY = slotYs[5]!;
  const usb = card(m, { y: usbY, rear: rear + 0.3, length: 11, height: 9 });
  usb.add(box(1.4, 0.2, 1.4, m.silicon, 0.05, [BOARD_X + 4, usbY + 0.18, rear + 5]));
  usb.add(box(1.1, 0.2, 1.1, m.silicon, 0.05, [BOARD_X + 6.4, usbY + 0.18, rear + 7.5]));
  usb.add(box(2.2, 1.1, 1.1, m.white, 0.1, [BOARD_X + 8.6, usbY + 0.6, rear + 9])); // power connector
  for (let i = 0; i < 7; i++) {
    usb.add(
      bracketPort(m.steel, [1.35, 0.55], [BOARD_X + 1.6 + i * 1.55, usbY - 0.6, rear - 0.05]),
    );
    usb.add(
      bracketPort(glow(0x2952ff), [1.1, 0.18], [BOARD_X + 1.6 + i * 1.55, usbY - 0.6, rear - 0.15]),
    );
  }

  // ---------- Samsung 990 EVO Plus and 990 PRO under the M.2 shields ----------
  const ssd = group(
    place(m2(m, 0x1a3a6b), [BOARD_X + 0.3, 29.6, -12], [0, 0, Math.PI / 2]),
    place(m2(m), [BOARD_X + 0.3, 19.4, -12], [0, 0, Math.PI / 2]),
  );

  // ---------- Three 3.5-inch drives in the cage under the shroud ----------
  const drives = group(...[2.2, 5.1, 8].map((y) => place(hdd(m), [0, y, 15], [0, Math.PI / 2, 0])));
  drives.add(box(15.6, 0.3, 11, m.steel, 0.02, [0, 0.9, 15]));

  // ---------- Super Flower Leadex III Gold 850 W ----------
  const psu = group(box(15, 8.6, 16, m.satin, 0.4, [0, 5.1, rear + 8.3]));
  psu.add(
    place(
      new THREE.Mesh(
        new THREE.CircleGeometry(6.6, 40),
        new THREE.MeshStandardMaterial({
          color: 0x2b2e33,
          metalness: 0.6,
          roughness: 0.4,
          map: grilleTexture([7, 7]),
        }),
      ),
      [0, 0.78, rear + 8.3],
      [-Math.PI / 2, 0, 0],
    ),
  );
  psu.add(box(6, 3.2, 0.1, m.gold, 0.05, [3.5, 5.6, rear + 8.3 + 8.01]));
  for (let i = 0; i < 6; i++)
    psu.add(box(1.6, 1.2, 0.3, m.plastic, 0.1, [-6 + i * 2, 3.5, rear + 16.4]));
  psu.add(box(0.1, 4, 8, m.gunmetal, 0.05, [7.55, 5.5, rear + 8]));

  const parts = { cpu, cooler, ram, gpu, board, ssd, hdd: drives, psu, wifi, usb };
  const root = group(
    caseFixed,
    glass,
    top,
    frontPanel,
    shroud,
    shroudFace,
    ...Object.values(parts),
  );
  return {
    root,
    parts,
    camera: { position: [76, 34, 50], target: [0, 23, -1], fov: 30 },
    // Open, the view swings toward the glass side to show the board face-on.
    inspect: { position: [84, 31, 34], target: [0, 24, -1] },
    entry: CASE_ENTRY,
    modes: ['assembled', 'cutaway', 'exploded'],
    shell: [glass, top, frontPanel, shroud, shroudFace],
    explode: {
      cooler: [11, 5, 0],
      cpu: [5, 0, 0],
      ram: [8, 0, 1],
      gpu: [16, -3, 0],
      ssd: [6, 0, 0],
      wifi: [12, -2, 0],
      usb: [14, -4, 0],
      hdd: [10, 0, 8],
      psu: [8, -3, 0],
    },
    anchors: {
      board: [BOARD_X + 0.5, 17.5, 1.5],
      cpu: [BOARD_X + 1, 38, -13.5],
      cooler: [2.6, 46.2, 11],
      ram: [BOARD_X + 4, 41.6, 0.4],
      gpu: [gpuX + 6, gpuY + 0.5, gpuZ + 10],
      ssd: [BOARD_X + 0.6, 21, -7],
      wifi: [BOARD_X + 7, wifiY + 0.4, rear + 8],
      usb: [BOARD_X + 9, usbY + 0.4, rear + 10],
      hdd: [6, 10, 20],
      psu: [7, 9.6, rear + 2],
    },
  };
}

// =====================================================================
// Secondary PC: an older micro-ATX tower
// =====================================================================

export function buildSecondary(m: Materials): SceneDef {
  const rear = -19.5;
  const front = 21;
  const silver = new THREE.MeshStandardMaterial({
    color: 0x8d9196,
    roughness: 0.35,
    metalness: 0.85,
  });

  // ---------- Case: steel box, silver front with two 5.25-inch bays ----------
  const side = box(
    0.6,
    39,
    41,
    new THREE.MeshStandardMaterial({ color: 0x1f2124, roughness: 0.6, metalness: 0.5 }),
    0.2,
    [9.3, 19.5, 0],
  );
  const vent = place(
    new THREE.Mesh(
      new THREE.PlaneGeometry(12, 12),
      new THREE.MeshStandardMaterial({
        color: 0x15171a,
        roughness: 0.8,
        map: grilleTexture([8, 8], '#030304', '#2b2e33'),
      }),
    ),
    [9.62, 24, -4],
    [0, Math.PI / 2, 0],
  );
  side.add(vent);
  vent.position.set(0.32, 4.5, -4);
  const topPanel = box(19, 0.8, 41, m.satin, 0.2, [0, 39.4, 0]);
  const frontBezel = group(box(19, 40, 2.4, silver, 0.6, [0, 20, front]));
  for (const y of [35, 30.4]) {
    frontBezel.add(box(15, 4.1, 0.3, m.plasticSoft, 0.2, [0, y, front + 1.3]));
    for (let i = 0; i < 5; i++)
      frontBezel.add(box(14.6, 0.12, 0.32, m.gunmetal, 0.02, [0, y - 1.6 + i * 0.8, front + 1.32]));
  }
  frontBezel.add(cyl(1, 1, 0.4, m.chrome, [0, 22, front + 1.3], 24));
  frontBezel.children.at(-1)!.rotation.x = Math.PI / 2;
  frontBezel.add(box(0.8, 0.3, 0.3, glow(0x3dff8a), 0.05, [2.2, 22, front + 1.32]));
  for (const x of [-2, 2]) frontBezel.add(box(1.4, 0.55, 0.3, m.label, 0.05, [x, 6, front + 1.3]));
  const caseFixed = group(
    box(0.8, 39, 41, m.satin, 0.2, [-9.4, 19.5, 0]),
    box(19, 0.8, 41, m.satin, 0.2, [0, 0.4, 0]),
    box(19, 39, 0.8, m.satin, 0.2, [0, 19.5, rear - 0.6]),
    // Top-mounted power supply of the era (model not recorded).
    box(
      15,
      8.6,
      14,
      new THREE.MeshStandardMaterial({ color: 0x3b3f45, roughness: 0.5, metalness: 0.6 }),
      0.3,
      [1.5, 34.5, rear + 7],
    ),
  );
  for (let i = 0; i < 4; i++)
    caseFixed.add(box(11, 1.6, 0.2, m.steel, 0.02, [-1.5, 22 - i * 2.03, rear - 0.2]));
  for (const x of [-7, 7])
    for (const z of [-17, 17]) caseFixed.add(cyl(1.2, 1.2, 0.8, m.rubber, [x, -0.3, z], 12));

  // ---------- ASRock H81M (micro-ATX, LGA 1150) ----------
  const bx = -8.6;
  const board = group(box(0.16, 22.6, 17.8, m.pcb, 0.02, [bx, 18.3 + 6, rear + 8.9 + 0.5]));
  board.add(box(3.6, 12, 3.4, m.satin, 0.3, [bx + 1.8, 28, rear + 2.3])); // I/O block
  // LGA 1150: steel load plate, retention lever, socket body.
  board.add(box(0.5, 5, 5, m.plasticSoft, 0.1, [bx + 0.3, 29, -12]));
  board.add(box(0.25, 4.6, 4.6, m.steel, 0.05, [bx + 0.6, 29, -12]));
  board.add(rod([bx + 0.75, 26.4, -14.6], [bx + 0.75, 31.6, -14.6], 0.12, m.steel));
  board.add(rod([bx + 0.75, 31.6, -14.6], [bx + 1.8, 31.9, -14.6], 0.12, m.steel));
  // Two DDR3 slots, a PCIe x16 and a PCIe x1, four SATA ports (two 6 Gb/s, two 3 Gb/s).
  for (const z of [-6.2, -5.2]) board.add(box(0.9, 14, 0.75, m.plastic, 0.1, [bx + 0.45, 27, z]));
  board.add(box(0.9, 0.75, 8.9, m.plastic, 0.1, [bx + 0.45, 19.5, rear + 6.5]));
  board.add(box(0.9, 0.75, 2.5, m.plastic, 0.1, [bx + 0.45, 16.6, rear + 3.3]));
  for (let i = 0; i < 4; i++) {
    board.add(
      box(1.2, 0.9, 0.9, i < 2 ? m.white : m.plastic, 0.1, [
        bx + 0.6,
        15 + (i % 2) * 1.2,
        -2.6 - Math.floor(i / 2) * 1,
      ]),
    );
  }
  board.add(heatsink2(m, [bx + 0.8, 15.6, -7.5]));

  // ---------- Intel Core i7-4790K (cooler not recorded) ----------
  const cpu = group(box(0.45, 3.75, 3.75, m.aluminium, 0.15, [bx + 0.95, 29, -12]));
  cpu.add(box(0.47, 2.6, 2.6, m.chrome, 0.08, [bx + 0.96, 29, -12]));

  // ---------- 2 × 8 GB DDR3 ----------
  const ram = group(...[-6.2, -5.2].map((z) => place(dimmStick(m, 'ddr3'), [bx + 0.9, 27, z])));

  // ---------- GTX 1080 Ti: a dual-slot blower-style card (board partner not recorded) ----------
  const gy = 19.5;
  const gpu = card(m, { y: gy, rear: rear + 0.3, length: 26.7, height: 11.1, slots: 2 });
  const gx = bx + 0.9 + 5.55;
  const gz = rear + 0.3 + 13.35;
  const blower = new THREE.Shape();
  blower.moveTo(-13.3, -5.5);
  blower.lineTo(13.3, -5.5);
  blower.lineTo(13.3, 5.5);
  blower.lineTo(-11.5, 5.5);
  blower.lineTo(-13.3, 3.7);
  blower.lineTo(-13.3, -5.5);
  const fanHole = new THREE.Path();
  fanHole.absarc(8.6, 0, 3.3, 0, Math.PI * 2, true);
  blower.holes.push(fanHole);
  const shell = new THREE.Mesh(
    new THREE.ExtrudeGeometry(blower, {
      depth: 3.4,
      bevelEnabled: true,
      bevelSize: 0.2,
      bevelThickness: 0.2,
      curveSegments: 24,
    }),
    silver,
  );
  shell.rotation.set(Math.PI / 2, 0, Math.PI / 2);
  shell.position.set(gx, gy - 0.3, gz);
  gpu.add(shell);
  gpu.add(place(fan(6.6, m, { depth: 1.2 }), [gx, gy - 2, gz + 8.6], [Math.PI / 2, 0, 0]));
  // Facets on the shroud and a clear window over the fin stack.
  gpu.add(place(box(10, 0.15, 6, m.glass, 0.05), [gx, gy - 3.85, gz - 4], [0, 0.4, 0]));
  gpu.add(box(0.2, 0.6, 18, m.gunmetal, 0.05, [gx + 5.6, gy - 2.2, gz - 2]));
  gpu.add(box(0.9, 1.1, 2.2, m.plastic, 0.1, [gx + 5.7, gy - 0.6, gz + 8]));
  gpu.add(box(0.9, 1.1, 1.6, m.plastic, 0.1, [gx + 5.7, gy - 0.6, gz + 10.3]));
  for (let i = 0; i < 4; i++)
    gpu.add(bracketPort(m.label, [1.6, 0.8], [bx + 2.6 + i * 2.3, gy - 1.4, rear]));

  // ---------- Two 3.5-inch drives behind the bays; the planned SSD above them ----------
  const drives = group(place(hdd(m), [0, 8, 9]), place(hdd(m), [0, 11.4, 9]));
  drives.add(box(11, 9, 0.3, m.steel, 0.02, [0, 9.7, 1.4]));
  const plannedSsd = place(ghostify(ssd25(m)), [0, 14.6, 11]);

  const parts = {
    'old-board': board,
    'old-cpu': cpu,
    'old-ram': ram,
    'old-gpu': gpu,
    'old-hdd': drives,
    'old-ssd': plannedSsd,
  };
  const root = group(caseFixed, side, topPanel, frontBezel, ...Object.values(parts));
  return {
    root,
    parts,
    camera: { position: [72, 17, 46], target: [0, 19, -1], fov: 30 },
    inspect: { position: [80, 29, 26], target: [0, 19, -2] },
    modes: ['assembled', 'cutaway', 'exploded'],
    shell: [side, topPanel, frontBezel],
    explode: {
      'old-cpu': [5, 0, 0],
      'old-ram': [7, 0, 1],
      'old-gpu': [14, -3, 0],
      'old-hdd': [0, 0, 14],
      'old-ssd': [0, 2, 18],
    },
    anchors: {
      'old-board': [bx, 35, -2],
      'old-cpu': [bx + 1, 31.4, -12],
      'old-ram': [bx + 4, 34, -5.7],
      'old-gpu': [gx + 5, gy + 0.4, gz + 6],
      'old-hdd': [5, 13, 16],
      'old-ssd': [3, 15.4, 15],
    },
    upgrade: 'old-ssd',
    hidden: ['old-board', 'old-cpu', 'old-ram', 'old-gpu', 'old-hdd', 'old-ssd'],
  };
}

/** The H81 chipset's small passive heatsink. */
function heatsink2(m: Materials, at: Vec) {
  return box(0.8, 3.2, 3.2, m.satin, 0.2, at);
}
