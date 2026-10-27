import { diagramProblems, type Diagram } from '@/lib/diagram';
import { caeloraWorld } from './caelora';
import { jarvisRequestPath, jarvisTopology } from './jarvis';
import { kobaitSystem } from './kobait';
import { malrynthBoot } from './malrynth';
import { setupEcosystem } from './setup';
import { setupConnections, setupFuture, setupHardware } from './setup-views';
import { steminiPipeline } from './stemini';
import { ussxPlatform, ussxSso } from './ussx';
import { zonePayments, zonePlatform } from './zone';

const all = [
  caeloraWorld,
  jarvisRequestPath,
  jarvisTopology,
  zonePlatform,
  zonePayments,
  ussxPlatform,
  ussxSso,
  kobaitSystem,
  steminiPipeline,
  malrynthBoot,
  setupEcosystem,
  setupHardware,
  setupConnections,
  setupFuture,
];

// SVG text does not wrap: text that would overflow, in any language, fails the build.
const problems = all.flatMap(diagramProblems);
if (problems.length > 0) {
  throw new Error(`Architecture diagrams do not fit:\n  ${problems.join('\n  ')}`);
}

export const diagrams: Record<string, Diagram> = Object.fromEntries(all.map((d) => [d.id, d]));
