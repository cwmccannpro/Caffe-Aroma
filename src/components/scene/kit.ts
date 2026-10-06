import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

type V3 = [number, number, number];

const M = new THREE.Matrix4();
const Q = new THREE.Quaternion();
const E = new THREE.Euler();
const P = new THREE.Vector3();
const S = new THREE.Vector3();

/**
 * Collects many small primitives (boxes, cylinders, spheres, ...) with a colour each and merges them into ONE geometry,
 * so a whole facade or patio is a single draw call. Colours live in vertex colours; use with a `vertexColors` material.
 */
export class Kit {
  private parts: THREE.BufferGeometry[] = [];
  private base: THREE.Matrix4 | null = null;

  /** Everything added inside `fn` is placed relative to `matrix` (for a rotated door leaf, a chair at a table, a wall run...). */
  within(matrix: THREE.Matrix4, fn: () => void) {
    const prev = this.base;
    this.base = prev ? prev.clone().multiply(matrix) : matrix.clone();
    fn();
    this.base = prev;
  }

  add(geo: THREE.BufferGeometry, color: string, pos: V3 = [0, 0, 0], rot: V3 = [0, 0, 0], scale: V3 | number = 1) {
    const g = geo.index ? geo.toNonIndexed() : geo;
    if (g !== geo) geo.dispose();
    E.set(rot[0], rot[1], rot[2]);
    Q.setFromEuler(E);
    if (typeof scale === "number") S.set(scale, scale, scale);
    else S.set(scale[0], scale[1], scale[2]);
    M.compose(P.set(pos[0], pos[1], pos[2]), Q, S);
    if (this.base) M.premultiply(this.base);
    g.applyMatrix4(M);
    g.deleteAttribute("uv");
    const c = new THREE.Color(color);
    const n = g.attributes.position.count;
    const col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    this.parts.push(g);
    return this;
  }

  box(size: V3, pos: V3, color: string, rot?: V3) {
    return this.add(new THREE.BoxGeometry(size[0], size[1], size[2]), color, pos, rot);
  }

  cyl(rTop: number, rBottom: number, h: number, pos: V3, color: string, rot?: V3, seg = 10) {
    return this.add(new THREE.CylinderGeometry(rTop, rBottom, h, seg), color, pos, rot);
  }

  sphere(r: number, pos: V3, color: string, scale: V3 | number = 1, seg = 10) {
    return this.add(new THREE.SphereGeometry(r, seg, Math.max(6, Math.round(seg * 0.7))), color, pos, [0, 0, 0], scale);
  }

  /** A thin rod between two points (iron rails, awning struts, strings). */
  rod(a: V3, b: V3, radius: number, color: string, seg = 6) {
    const from = new THREE.Vector3(...a);
    const to = new THREE.Vector3(...b);
    const len = from.distanceTo(to);
    const mid = from.clone().add(to).multiplyScalar(0.5);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize());
    const e = new THREE.Euler().setFromQuaternion(q);
    return this.add(new THREE.CylinderGeometry(radius, radius, len, seg), color, [mid.x, mid.y, mid.z], [e.x, e.y, e.z]);
  }

  /** Merge another kit's finished geometry in at a transform. */
  geometry(g: THREE.BufferGeometry, pos: V3 = [0, 0, 0], rot: V3 = [0, 0, 0], scale: V3 | number = 1) {
    const copy = g.clone();
    const g2 = copy.index ? copy.toNonIndexed() : copy;
    if (g2 !== copy) copy.dispose();
    E.set(rot[0], rot[1], rot[2]);
    Q.setFromEuler(E);
    if (typeof scale === "number") S.set(scale, scale, scale);
    else S.set(scale[0], scale[1], scale[2]);
    M.compose(P.set(pos[0], pos[1], pos[2]), Q, S);
    if (this.base) M.premultiply(this.base);
    g2.applyMatrix4(M);
    this.parts.push(g2);
    return this;
  }

  build(): THREE.BufferGeometry {
    if (!this.parts.length) return new THREE.BufferGeometry();
    const g = mergeGeometries(this.parts, false) ?? new THREE.BufferGeometry();
    this.parts.forEach((p) => p.dispose());
    this.parts = [];
    return g;
  }
}

/** Matrix for "place this at x,y,z, turned by yaw about Y, scaled by s". */
export function at(x: number, y: number, z: number, yaw = 0, s = 1): THREE.Matrix4 {
  return new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw), new THREE.Vector3(s, s, s));
}

/**
 * Many textured quads (each `w` x `h`, facing +z before its matrix is applied) merged into one geometry that keeps its UVs,
 * so every shop window sharing one texture is a single draw call.
 */
export function mergePlanes(items: { matrix: THREE.Matrix4; w: number; h: number }[]): THREE.BufferGeometry {
  const parts = items.map(({ matrix, w, h }) => {
    const g = new THREE.PlaneGeometry(w, h).toNonIndexed();
    g.applyMatrix4(matrix);
    return g;
  });
  const merged = mergeGeometries(parts, false) ?? new THREE.BufferGeometry();
  parts.forEach((p) => p.dispose());
  return merged;
}

/** Stand-in material every kit shares: painted/iron look, colours from the vertices. */
export function kitMaterial(opts: { roughness?: number; metalness?: number; flat?: boolean } = {}) {
  return new THREE.MeshStandardMaterial({ vertexColors: true, roughness: opts.roughness ?? 0.62, metalness: opts.metalness ?? 0.12, flatShading: opts.flat ?? false });
}
