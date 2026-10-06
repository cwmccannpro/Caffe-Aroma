import * as THREE from "three";

/**
 * The building is a brick corner building where Elmwood Ave (running along world +x, street at -z) meets Bidwell Pkwy
 * (running along world +z, street at -x). Its footprint is three wall "runs": the Elmwood face, a 45 degree chamfered
 * corner with the front door in it, and the Bidwell face.
 *
 * Every run uses the same local frame, so one set of facade code dresses all three:
 *   local +x runs along the wall, local -z points out to the street, the brick skin's outer face is at local z = FACADE_Z,
 *   and the plaster slab behind it runs from local z = -1.74 to wallFront (-1.5, the room's inside face).
 */

/** The arched window in the Elmwood wall. x is its centre line (world and Elmwood-local are the same). */
export const WINDOW = { x: 0.5, sill: 0.85, spring: 2.15, r: 0.95, wallFront: -1.5 };

/** Wall slab thickness (the room's plaster runs from wallFront - WALL_T to wallFront). */
export const WALL_T = 0.24;
/** Outer face of the brick skin, in each run's local frame. */
export const FACADE_Z = WINDOW.wallFront - WALL_T - 0.06;

export type RunId = "elmwood" | "corner" | "bidwell";

export interface Run {
  id: RunId;
  /** World position and yaw (about +Y) of the run's local frame. */
  pos: [number, number, number];
  yaw: number;
  /** Extent along the wall, local x. */
  x0: number;
  x1: number;
}

/**
 * Elmwood: local = world. Corner: the chamfer, whose outward normal is (-1, 0, -1)/sqrt2; its outer face runs from
 * E1 = (-3.8, -1.8) to E2 = (-5.4, -0.2). Bidwell: local x runs toward the corner, i.e. along world -z, with the outer
 * face at world x = -5.4.
 */
export const RUNS: Record<RunId, Run> = {
  elmwood: { id: "elmwood", pos: [0, 0, 0], yaw: 0, x0: -3.8, x1: 8.4 },
  corner: { id: "corner", pos: [-3.327, 0, 0.273], yaw: Math.PI / 4, x0: -1.131, x1: 1.131 },
  bidwell: { id: "bidwell", pos: [-3.6, 0, 0], yaw: Math.PI / 2, x0: -14.7, x1: 0.2 },
};

export function runMatrix(run: Run): THREE.Matrix4 {
  return new THREE.Matrix4().compose(new THREE.Vector3(...run.pos), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), run.yaw), new THREE.Vector3(1, 1, 1));
}

/** A point in a run's local frame, in world coordinates. */
export function toWorld(run: Run, lx: number, ly: number, lz: number): THREE.Vector3 {
  return new THREE.Vector3(lx, ly, lz).applyMatrix4(runMatrix(run));
}

/** The front door, in the corner run: a pair of glass doors centred on the chamfer. */
export const DOOR = { w: 1.3, h: 2.35 };
/** World position of the middle of the doorway (half-way through the wall) and the unit direction going out to the street. */
export const DOOR_WORLD = toWorld(RUNS.corner, 0, 0, -1.62);
export const DOOR_OUT = new THREE.Vector3(-Math.SQRT1_2, 0, -Math.SQRT1_2);

/** Inner faces of the room (where the plaster meets the room): the corner's inner chamfer joins these two. */
export const ROOM = {
  /** Where the Elmwood inner face (z = -1.5) meets the inner chamfer. */
  elmwoodEnd: -3.676,
  /** Where the Bidwell inner face (x = -5.1) meets the inner chamfer. */
  bidwellStartZ: -0.076,
  bidwellX: -5.1,
  rightX: 8,
  backZ: 14.5,
};

/** Outline of a wall run with an optional arch and/or door cut through it. */
export function wallShape(top: number, x0: number, x1: number, cut: { arch?: boolean; door?: boolean } = {}): THREE.Shape {
  const shape = new THREE.Shape();
  shape.moveTo(x0, 0);
  shape.lineTo(x1, 0);
  shape.lineTo(x1, top);
  shape.lineTo(x0, top);
  shape.lineTo(x0, 0);

  if (cut.arch) {
    const { x: wx, sill, spring, r } = WINDOW;
    const arch = new THREE.Path();
    arch.moveTo(wx - r, sill);
    arch.lineTo(wx + r, sill);
    arch.lineTo(wx + r, spring);
    arch.absarc(wx, spring, r, 0, Math.PI, false);
    arch.lineTo(wx - r, sill);
    shape.holes.push(arch);
  }
  if (cut.door) {
    const door = new THREE.Path();
    door.moveTo(-DOOR.w / 2, 0);
    door.lineTo(DOOR.w / 2, 0);
    door.lineTo(DOOR.w / 2, DOOR.h);
    door.lineTo(-DOOR.w / 2, DOOR.h);
    door.lineTo(-DOOR.w / 2, 0);
    shape.holes.push(door);
  }
  return shape;
}
