import { diagramProblems, type Diagram } from '@/lib/diagram';
import { jarvisRequestPath, jarvisTopology } from './jarvis';
import { malrynthBoot } from './malrynth';
import { steminiPipeline } from './stemini';
import { ussxPlatform, ussxSso } from './ussx';
import { zonePayments, zonePlatform } from './zone';

const all = [
  jarvisRequestPath,
  jarvisTopology,
  zonePlatform,
  zonePayments,
  ussxPlatform,
  ussxSso,
  steminiPipeline,
  malrynthBoot,
];

// SVG text does not wrap: text that would overflow, in any language, fails the build.
const problems = all.flatMap(diagramProblems);
if (problems.length > 0) {
  throw new Error(`Architecture diagrams do not fit:\n  ${problems.join('\n  ')}`);
}

export const diagrams: Record<string, Diagram> = Object.fromEntries(all.map((d) => [d.id, d]));
