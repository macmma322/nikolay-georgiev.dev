import { makeCircuitBoard, type Trace } from './circuit-board';

export type SceneId =
  | 'processor'
  | 'graphics'
  | 'network'
  | 'inference'
  | 'services'
  | 'embedded'
  | 'firmware'
  | 'architecture'
  | 'prototype'
  | 'transmission';

type PackageKind = 'processor' | 'memory' | 'controller' | 'radio' | 'connector' | 'heatsink';
type PackageSpec = readonly [
  x: number,
  y: number,
  width: number,
  height: number,
  kind: PackageKind,
  label: string,
];

const boards = {
  processor: [
    [774, 72, 242, 162, 'processor', 'U01 · NIKOLAY.RUNTIME'],
    [1058, 95, 126, 61, 'memory', 'U02'],
    [1060, 171, 123, 58, 'memory', 'U03'],
    [622, 119, 85, 69, 'controller', 'PWR'],
  ],
  graphics: [
    [598, 65, 197, 167, 'heatsink', 'U12'],
    [847, 68, 118, 55, 'memory', 'VRAM A'],
    [850, 173, 116, 55, 'memory', 'VRAM B'],
    [448, 116, 86, 64, 'controller', 'PWR'],
  ],
  network: [
    [564, 94, 182, 112, 'controller', 'U20 · PHY'],
    [803, 81, 109, 72, 'connector', 'J21'],
    [803, 161, 109, 72, 'connector', 'J22'],
  ],
  inference: [
    [595, 76, 193, 150, 'processor', 'U31'],
    [849, 112, 130, 73, 'memory', 'U32'],
    [450, 123, 79, 62, 'controller', 'U30'],
  ],
  services: [
    [458, 101, 128, 96, 'controller', 'U41'],
    [650, 101, 128, 96, 'controller', 'U42'],
    [843, 101, 128, 96, 'controller', 'U43'],
  ],
  embedded: [
    [555, 101, 153, 109, 'controller', 'MCU'],
    [762, 68, 140, 101, 'radio', 'RF'],
    [929, 109, 81, 50, 'connector', 'J53'],
    [763, 200, 117, 50, 'memory', 'U52'],
  ],
  firmware: [
    [592, 74, 174, 146, 'processor', 'U61'],
    [823, 122, 116, 61, 'memory', 'FLASH'],
    [447, 122, 89, 60, 'connector', 'J60'],
  ],
  architecture: [
    [489, 114, 122, 71, 'memory', 'U70'],
    [665, 70, 163, 152, 'processor', 'U71'],
    [880, 81, 130, 65, 'memory', 'BANK A'],
    [880, 157, 130, 65, 'memory', 'BANK B'],
  ],
  prototype: [
    [486, 119, 128, 76, 'connector', 'J81'],
    [670, 71, 166, 158, 'controller', 'U82'],
    [895, 99, 103, 63, 'radio', 'RF'],
    [904, 183, 116, 50, 'connector', 'J83'],
  ],
  transmission: [
    [514, 114, 131, 74, 'controller', 'U91'],
    [702, 92, 151, 112, 'connector', 'J92'],
    [908, 115, 110, 68, 'radio', 'LINK'],
  ],
} as const satisfies Record<SceneId, readonly PackageSpec[]>;

export function boardPackages(scene: SceneId): readonly PackageSpec[] {
  return boards[scene];
}

export function machineTraces(scene: SceneId, seed: number): Trace[] {
  const packages = boardPackages(scene);
  const traces = makeCircuitBoard(seed).filter((_, index) => index % 3 !== 0);
  for (const [index, [x, y, width, height]] of packages.entries()) {
    const left = index % 2 === 0;
    const edge = left ? x - 9 : x + width + 9;
    const direction = left ? -1 : 1;
    for (let lane = 0; lane < 7; lane++) {
      const pin = y + ((lane + 1) * height) / 8;
      const straight = edge + (22 + lane * 7) * direction;
      const angle = lane < 3 ? -1 : 1;
      const bevel = 21 + (lane % 3) * 9;
      const reach = straight + (55 + lane * 12) * direction;
      traces.push({
        points: [
          [reach + bevel * direction, pin + bevel * angle],
          [straight + bevel * direction, pin + bevel * angle],
          [straight, pin],
          [edge, pin],
        ],
        tone: lane % 5 === 0 ? 2 : lane % 3 === 0 ? 1 : 0,
      });
    }
    const bus = y + height + 26;
    traces.push({
      points: [
        [x - 125, bus],
        [x - 36, bus],
        [x - 12, bus - 24],
        [x + 20, bus - 24],
      ],
      tone: 1,
    });
  }
  return traces;
}

export const projectScenes: Readonly<Record<string, SceneId>> = {
  caelora: 'graphics',
  'uss-x-academy': 'network',
  jarvis: 'inference',
  'zone-32-19': 'services',
  kobait: 'embedded',
  malrynth: 'firmware',
};
