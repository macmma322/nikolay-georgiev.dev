import type * as THREE from 'three';
import type { Vec } from './kit';

export type Mode = 'assembled' | 'cutaway' | 'exploded';

export interface Pose {
  position: Vec;
  target: Vec;
  /** The lens this pose was framed with; another lens keeps the same picture by changing distance. */
  fov?: number;
}

/**
 * The camera just outside the main PC's glass side, in the inside view's own
 * coordinates (centimetres, case floor at y 0). The desk scene places the
 * inside view's origin at its tower (SceneDef.doors), and the two cases share
 * their size and orientation, so this one pose frames the same picture in
 * both scenes: the frame where the desk hands over to the inside of the PC.
 */
export const CASE_ENTRY: Pose = { position: [95, 37, 63], target: [0, 23.5, 0], fov: 30 };

/** What a scene builder hands the stage. */
export interface SceneDef {
  root: THREE.Group;
  /** One object per part id in src/data/setup.ts; picking and lighting use it. */
  parts: Record<string, THREE.Object3D>;
  camera: { position: Vec; target: Vec; fov?: number };
  /**
   * Where the camera looks from with the case open (cutaway and exploded),
   * when the visitor has not turned it themselves. Defaults to `camera`.
   */
  inspect?: Pose;
  /** Modes offered by the toolbar (assembled is always first). */
  modes?: Mode[];
  /** Fades out in cutaway and exploded views (case panels, lids). */
  shell?: THREE.Object3D[];
  /** Exploded offsets per part id, in centimetres. */
  explode?: Record<string, Vec>;
  /** Where a part's number pin sits, when the top of its box would crowd another. */
  anchors?: Record<string, Vec>;
  /** Parts out of sight when assembled: choosing one opens the cutaway. */
  hidden?: string[];
  /** A planned part shown only while its upgrade preview is on or it is selected. */
  upgrade?: string;
  /**
   * Other views that sit inside this scene: the view's origin here, the part
   * the camera travels to, and that view's `entry` (in its own coordinates).
   * The stage flies through it on a view change.
   */
  doors?: Record<string, { at: Vec; part: string; pose: Pose }>;
  /** The doorway into this view; leaving for a view with no door here pulls back to it. */
  entry?: Pose;
}
