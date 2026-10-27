import type * as THREE from 'three';
import type { Vec } from './kit';

export type Mode = 'assembled' | 'cutaway' | 'exploded';

/** What a scene builder hands the stage. */
export interface SceneDef {
  root: THREE.Group;
  /** One object per part id in src/data/setup.ts; picking and lighting use it. */
  parts: Record<string, THREE.Object3D>;
  camera: { position: Vec; target: Vec; fov?: number };
  /** Modes offered by the toolbar (assembled is always first). */
  modes?: Mode[];
  /** Hidden in cutaway and exploded views (case panels, lids). */
  shell?: THREE.Object3D[];
  /** Made see-through in cutaway and exploded views. */
  fade?: THREE.Object3D[];
  /** Exploded offsets per part id, in centimetres. */
  explode?: Record<string, Vec>;
  /** Where a part's number pin sits, when the top of its box would crowd another. */
  anchors?: Record<string, Vec>;
  /** Parts out of sight when assembled: choosing one opens the cutaway. */
  hidden?: string[];
  /** A planned part shown only while its upgrade preview is on or it is selected. */
  upgrade?: string;
}
