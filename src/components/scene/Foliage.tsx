"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { rng } from "./textures";

type V3 = [number, number, number];

// ───────────── building blocks ─────────────

/** A pointed leaf, base at the origin and tip at +Y, with a gentle droop so it doesn't read as a flat card. */
function leafGeometry(): THREE.ShapeGeometry {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.bezierCurveTo(0.55, 0.12, 0.6, 0.72, 0, 1);
  s.bezierCurveTo(-0.6, 0.72, -0.55, 0.12, 0, 0);
  const g = new THREE.ShapeGeometry(s, 8);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i);
    const x = p.getX(i);
    p.setZ(i, -0.28 * y * y - 0.18 * Math.abs(x) * y); // arch along the length, fold across the width
  }
  g.computeVertexNormals();
  return g;
}

export interface Leaf {
  p: V3;
  /** direction the leaf tip points */
  d: V3;
  roll: number;
  w: number;
  l: number;
  c: string;
}

/** Many leaves in one draw call. */
export function LeafSet({ leaves, roughness = 0.55 }: { leaves: Leaf[]; roughness?: number }) {
  const geo = useMemo(() => leafGeometry(), []);
  const mesh = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m) return;
    const q = new THREE.Quaternion();
    const q2 = new THREE.Quaternion();
    const mat = new THREE.Matrix4();
    const up = new THREE.Vector3(0, 1, 0);
    const d = new THREE.Vector3();
    const pos = new THREE.Vector3();
    const scl = new THREE.Vector3();
    const col = new THREE.Color();
    leaves.forEach((lf, i) => {
      d.set(...lf.d).normalize();
      q.setFromUnitVectors(up, d);
      q2.setFromAxisAngle(d, lf.roll);
      q.premultiply(q2);
      pos.set(...lf.p);
      scl.set(lf.w, lf.l, 1);
      m.setMatrixAt(i, mat.compose(pos, q, scl));
      m.setColorAt(i, col.set(lf.c));
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [leaves]);
  useEffect(() => () => geo.dispose(), [geo]);
  return (
    <instancedMesh ref={mesh} args={[geo, undefined, leaves.length]} frustumCulled={false}>
      <meshStandardMaterial side={THREE.DoubleSide} roughness={roughness} />
    </instancedMesh>
  );
}

export interface Blob {
  p: V3;
  r: number;
  c: string;
}

/** Faceted foliage clumps / flower heads in one draw call. */
export function BlobSet({ blobs, detail = 1, roughness = 0.85 }: { blobs: Blob[]; detail?: number; roughness?: number }) {
  const geo = useMemo(() => new THREE.IcosahedronGeometry(1, detail), [detail]);
  const mesh = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m) return;
    const mat = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const col = new THREE.Color();
    blobs.forEach((b, i) => {
      m.setMatrixAt(i, mat.compose(new THREE.Vector3(...b.p), q, new THREE.Vector3(b.r, b.r * 0.9, b.r)));
      m.setColorAt(i, col.set(b.c));
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [blobs]);
  useEffect(() => () => geo.dispose(), [geo]);
  return (
    <instancedMesh ref={mesh} args={[geo, undefined, blobs.length]} frustumCulled={false}>
      <meshStandardMaterial flatShading roughness={roughness} />
    </instancedMesh>
  );
}

const lathe = (pts: [number, number][], seg = 28) => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg);

/** Terracotta pot with soil. `r` = rim radius, `h` = height. */
export function Pot({ r = 0.2, h = 0.36, color = "#b5603a", soil = true }: { r?: number; h?: number; color?: string; soil?: boolean }) {
  const geo = useMemo(
    () =>
      lathe([
        [0, 0],
        [r * 0.62, 0],
        [r * 0.7, h * 0.04],
        [r * 0.96, h * 0.9],
        [r * 1.06, h * 0.93],
        [r * 1.06, h],
        [r * 0.98, h],
        [r * 0.9, h * 0.94],
        [r * 0.66, h * 0.1],
        [0, h * 0.08],
      ]),
    [r, h],
  );
  useEffect(() => () => geo.dispose(), [geo]);
  return (
    <group>
      <mesh geometry={geo} castShadow>
        <meshStandardMaterial color={color} roughness={0.85} side={THREE.DoubleSide} />
      </mesh>
      {soil && (
        <mesh position={[0, h * 0.9, 0]} rotation-x={-Math.PI / 2}>
          <circleGeometry args={[r * 0.9, 20]} />
          <meshStandardMaterial color="#2a1a12" roughness={1} />
        </mesh>
      )}
    </group>
  );
}

// ───────────── plants ─────────────

const GREENS = ["#274f30", "#2f5d37", "#356b3d", "#3d7a45"];

/** A tall rubber plant in a terracotta pot (the cafe's "indoor tree"). */
export function RubberPlant({ position, scale = 1, seed = 42 }: { position: V3; scale?: number; seed?: number }) {
  const leaves = useMemo(() => {
    const r = rng(seed);
    const out: Leaf[] = [];
    const n = 36;
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const h = 0.62 + t * 1.25;
      const phi = i * 2.399963;
      const pitch = THREE.MathUtils.degToRad(18 + (1 - t) * 30 + r() * 14);
      const len = 0.27 + (1 - Math.abs(t - 0.5)) * 0.09 + r() * 0.05;
      out.push({
        p: [Math.cos(phi) * 0.025, h, Math.sin(phi) * 0.025],
        d: [Math.cos(phi) * Math.cos(pitch), Math.sin(pitch), Math.sin(phi) * Math.cos(pitch)],
        roll: r() * Math.PI * 2,
        w: len * 0.7,
        l: len,
        c: r() > 0.82 ? "#4d2b2f" : GREENS[i % GREENS.length],
      });
    }
    // crown
    for (let k = 0; k < 4; k++) {
      const phi = (k / 4) * Math.PI * 2;
      out.push({ p: [0, 1.9, 0], d: [Math.cos(phi) * 0.5, 0.85, Math.sin(phi) * 0.5], roll: 0.4 * k, w: 0.2, l: 0.28, c: "#3d7a45" });
    }
    return out;
  }, [seed]);
  return (
    <group position={position} scale={scale}>
      <Pot r={0.21} h={0.38} />
      <mesh position={[0, 0.38 + 0.78, 0]} castShadow>
        <cylinderGeometry args={[0.028, 0.045, 1.56, 8]} />
        <meshStandardMaterial color="#5a4a35" roughness={0.9} />
      </mesh>
      <group position={[0, 0.0, 0]}>
        <LeafSet leaves={leaves} />
      </group>
    </group>
  );
}

/** Pothos in a small pot with vines trailing over the front of a ledge (+z is the front). */
export function Pothos({ position, seed = 9 }: { position: V3; seed?: number }) {
  const leaves = useMemo(() => {
    const r = rng(seed);
    const out: Leaf[] = [];
    for (let v = 0; v < 5; v++) {
      const bx = (v - 2) * 0.03;
      const len = 0.8 + r() * 0.5;
      const at = (s: number): V3 => {
        const lip = Math.min(1, s / 0.38);
        const drop = Math.max(0, (s - 0.38) / 0.62);
        return [bx + Math.sin(s * 6 + v * 1.7) * 0.025, 0.1 + Math.sin(lip * Math.PI) * 0.035 - Math.pow(drop, 1.35) * 0.62 * len, 0.012 + lip * 0.19 + drop * 0.025];
      };
      for (let s = 0.05; s < 1; s += 0.055 + r() * 0.02) {
        const a = at(s);
        const b = at(Math.min(1, s + 0.04));
        const side = (Math.round(s / 0.055) % 2 ? 1 : -1) * (0.7 + r() * 0.4);
        const tx = b[0] - a[0];
        const ty = b[1] - a[1];
        const tz = b[2] - a[2];
        out.push({ p: a, d: [tx * 2 + side * 0.55, ty * 2 - 0.4, tz * 2 + 0.28], roll: r() * 1.2, w: 0.062 + r() * 0.014, l: 0.07 + r() * 0.03, c: r() > 0.75 ? "#6a9a4a" : GREENS[(v + Math.round(s * 10)) % 4] });
      }
    }
    return out;
  }, [seed]);
  return (
    <group position={position}>
      <Pot r={0.075} h={0.11} color="#e6ded0" />
      <LeafSet leaves={leaves} roughness={0.5} />
    </group>
  );
}

/** A planter box brimming with foliage and red/white blooms (geraniums, in the logo's red). */
export function PlanterBox({ position, length = 0.9, seed = 3, rotationY = 0 }: { position: V3; length?: number; seed?: number; rotationY?: number }) {
  const { blobs, blooms } = useMemo(() => {
    const r = rng(seed);
    const blobs: Blob[] = [];
    const blooms: Blob[] = [];
    const n = Math.round(length * 16);
    for (let i = 0; i < n; i++) {
      blobs.push({ p: [(r() - 0.5) * (length - 0.1), 0.3 + r() * 0.1, (r() - 0.5) * 0.18], r: 0.07 + r() * 0.07, c: GREENS[Math.floor(r() * 4)] });
    }
    const flowers = ["#c0352a", "#d8493a", "#f2e6d4", "#e57b8a"];
    for (let i = 0; i < n; i++) {
      blooms.push({ p: [(r() - 0.5) * (length - 0.08), 0.4 + r() * 0.1, (r() - 0.5) * 0.2], r: 0.032 + r() * 0.018, c: flowers[Math.floor(r() * flowers.length)] });
    }
    return { blobs, blooms };
  }, [length, seed]);
  return (
    <group position={position} rotation-y={rotationY}>
      <mesh position={[0, 0.14, 0]} castShadow>
        <boxGeometry args={[length, 0.28, 0.3]} />
        <meshStandardMaterial color="#1b3a29" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.285, 0]}>
        <boxGeometry args={[length - 0.04, 0.02, 0.26]} />
        <meshStandardMaterial color="#2a1a12" roughness={1} />
      </mesh>
      <BlobSet blobs={blobs} />
      <BlobSet blobs={blooms} detail={0} roughness={0.7} />
    </group>
  );
}

/** A clipped ball of boxwood on a trunk in a terracotta pot. */
export function Topiary({ position, scale = 1 }: { position: V3; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <Pot r={0.17} h={0.3} color="#a9552f" />
      <mesh position={[0, 0.62, 0]} castShadow>
        <cylinderGeometry args={[0.018, 0.026, 0.7, 8]} />
        <meshStandardMaterial color="#5a4a35" roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.1, 0]} scale={[1, 0.92, 1]} castShadow>
        <icosahedronGeometry args={[0.31, 2]} />
        <meshStandardMaterial color="#2f6a3a" roughness={0.85} flatShading />
      </mesh>
    </group>
  );
}
