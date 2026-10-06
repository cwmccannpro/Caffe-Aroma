"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { canvasTexture, haloTexture, rng } from "./textures";
import { blobShadowTexture, sidewalkTexture } from "./exteriorTextures";
import { getTod } from "./tod";
import { BlobSet, type Blob } from "./Foliage";
import { Kit, at } from "./kit";
import { addChair } from "./furnitureGeo";
import { DOOR_OUT, DOOR_WORLD } from "./wall";

type V3 = [number, number, number];
const IRON = "#15181a";
const MARBLE = "#e6dfd2";
const CERAMIC = "#f3ecdf";

/** A striped market umbrella: red and cream on Elmwood (a nod to the logo), green and cream on Bidwell. */
function Umbrella({ position, colors = ["#b3261e", "#efe5d2"] }: { position: V3; colors?: [string, string] }) {
  const stripes = useMemo(
    () =>
      canvasTexture(
        256,
        16,
        (ctx, w, h) => {
          const n = 16;
          for (let i = 0; i < n; i++) {
            ctx.fillStyle = i % 2 ? colors[1] : colors[0];
            ctx.fillRect((i * w) / n, 0, w / n + 1, h);
          }
        },
        { aniso: 2 },
      ),
    [colors],
  );
  useEffect(() => () => stripes.dispose(), [stripes]);
  return (
    <group position={position} rotation={[0.04, 0, -0.03]}>
      <mesh position={[0, 1.2, 0]}>
        <cylinderGeometry args={[0.018, 0.022, 2.4, 8]} />
        <meshStandardMaterial color="#d8cdb8" roughness={0.6} />
      </mesh>
      <mesh position={[0, 2.46, 0]}>
        <coneGeometry args={[1.18, 0.46, 16, 1, true]} />
        <meshStandardMaterial map={stripes} roughness={0.85} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 2.72, 0]}>
        <sphereGeometry args={[0.035, 10, 8]} />
        <meshStandardMaterial color="#d8cdb8" roughness={0.5} />
      </mesh>
      {/* scalloped valance */}
      <mesh position={[0, 2.235, 0]} rotation-x={Math.PI}>
        <cylinderGeometry args={[1.185, 1.185, 0.08, 16, 1, true]} />
        <meshStandardMaterial map={stripes} roughness={0.85} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/* ───────────── furniture, merged into one mesh ───────────── */

function addTable(k: Kit, x: number, z: number, cup = true) {
  k.within(at(x, 0, z), () => {
    k.cyl(0.4, 0.4, 0.03, [0, 0.745, 0], MARBLE, undefined, 28);
    k.add(new THREE.TorusGeometry(0.4, 0.011, 6, 36), IRON, [0, 0.745, 0], [Math.PI / 2, 0, 0]);
    k.cyl(0.02, 0.03, 0.74, [0, 0.37, 0], IRON, undefined, 8);
    k.cyl(0.22, 0.26, 0.035, [0, 0.018, 0], IRON, undefined, 18);
    if (cup) {
      k.cyl(0.075, 0.062, 0.014, [0.12, 0.767, 0.04], CERAMIC, undefined, 16);
      k.cyl(0.05, 0.036, 0.06, [0.12, 0.804, 0.04], CERAMIC, undefined, 14);
      k.cyl(0.044, 0.044, 0.004, [0.12, 0.834, 0.04], "#3a1c10", undefined, 14);
    }
  });
}

/** Wrought-iron curb rail of length `len`, running along local +x of the matrix it is placed in, with balusters and ball finials. */
function addRail(k: Kit, len: number, at4: THREE.Matrix4) {
  k.within(at4, () => {
    const n = Math.max(1, Math.round(len / 1.0));
    for (let i = 0; i <= n; i++) {
      const x = (i * len) / n;
      k.cyl(0.02, 0.02, 0.94, [x, 0.47, 0], IRON, undefined, 8);
      k.sphere(0.036, [x, 0.96, 0], IRON, 1, 8);
    }
    k.box([len, 0.03, 0.03], [len / 2, 0.9, 0], IRON);
    k.box([len, 0.025, 0.025], [len / 2, 0.5, 0], IRON);
    k.box([len, 0.025, 0.025], [len / 2, 0.1, 0], IRON);
    for (let x = 0.14; x < len - 0.05; x += 0.15) k.cyl(0.007, 0.007, 0.38, [x, 0.7, 0], IRON, undefined, 5);
  });
}

interface TableSpec {
  x: number;
  z: number;
  chairs: [number, number, number][];
  umbrella?: [string, string];
}

/**
 * Elmwood patio (A and B are the two you see through the arch from inside, so they keep their original spots).
 * A chair at yaw 0 faces +z, PI faces -z, PI/2 faces +x, -PI/2 faces -x.
 */
const ELMWOOD_TABLES: TableSpec[] = [
  { x: -0.2, z: -3.35, chairs: [[-0.2, -2.85, Math.PI], [-0.7, -3.35, Math.PI / 2], [0.3, -3.35, -Math.PI / 2]], umbrella: ["#b3261e", "#efe5d2"] },
  { x: 1.0, z: -3.95, chairs: [[1.0, -3.45, Math.PI], [1.5, -3.95, -Math.PI / 2]] },
  { x: 3.1, z: -3.25, chairs: [[3.1, -2.75, Math.PI], [2.6, -3.25, Math.PI / 2], [3.6, -3.25, -Math.PI / 2]] },
  { x: 4.75, z: -3.9, chairs: [[4.75, -4.4, 0.25], [5.25, -3.9, -Math.PI / 2], [4.25, -3.9, Math.PI / 2]] },
  { x: -1.9, z: -3.2, chairs: [[-1.9, -2.7, Math.PI], [-1.4, -3.2, -Math.PI / 2]] },
];

/** Bidwell patio: along the side wall, between the building and the curb rail. */
const BIDWELL_TABLES: TableSpec[] = [
  { x: -7.2, z: 2.3, chairs: [[-7.2, 1.8, 0], [-7.2, 2.8, Math.PI], [-7.7, 2.3, Math.PI / 2]] },
  { x: -7.2, z: 5.1, chairs: [[-7.2, 4.6, 0], [-6.7, 5.1, -Math.PI / 2], [-7.2, 5.6, Math.PI]], umbrella: ["#2f6e57", "#efe5d2"] },
  { x: -7.3, z: 8.0, chairs: [[-7.3, 7.5, 0], [-7.8, 8.0, Math.PI / 2], [-6.8, 8.0, -Math.PI / 2]] },
  { x: -7.2, z: 10.8, chairs: [[-7.2, 10.3, 0], [-7.2, 11.3, Math.PI]] },
];

const GREENS = ["#274f30", "#2f5d37", "#356b3d", "#3d7a45"];
const TREES = [
  { x: -9.7, z: 3.9, scale: 0.85, seed: 4 },
  { x: -9.7, z: 9.8, scale: 0.8, seed: 7 },
  { x: 6.3, z: -5.1, scale: 0.92, seed: 9 },
];
const FLOWERS = ["#c0352a", "#d8493a", "#f2e6d4", "#e57b8a"];

/** Planters along each curb rail: boxes plus all their foliage and blooms in three draw calls. */
const PLANTERS: { x: number; z: number; yaw: number }[] = [
  ...[-2.4, -1.2, 0, 1.2, 2.4, 3.6, 4.8, 6.0].map((x) => ({ x, z: -4.55, yaw: 0 })),
  ...[0.5, 1.7, 2.9, 4.1, 5.3, 6.5, 7.7, 8.9, 10.1, 11.3].map((z) => ({ x: -8.75, z, yaw: Math.PI / 2 })),
];

function PlanterRow() {
  const { boxes, leaves, blooms } = useMemo(() => {
    const k = new Kit();
    const leaves: Blob[] = [];
    const blooms: Blob[] = [];
    const length = 0.95;
    PLANTERS.forEach((pl, i) => {
      k.within(at(pl.x, 0, pl.z, pl.yaw), () => {
        k.box([length, 0.28, 0.3], [0, 0.14, 0], "#1b3a29");
        k.box([length - 0.04, 0.02, 0.26], [0, 0.285, 0], "#2a1a12");
      });
      const r = rng(3 + (i % 7));
      const n = Math.round(length * 16);
      const put = (lx: number, ly: number, lz: number): V3 => {
        // rotate the local offset by the planter's yaw (about +Y)
        const c = Math.cos(pl.yaw);
        const s = Math.sin(pl.yaw);
        return [pl.x + lx * c + lz * s, ly, pl.z - lx * s + lz * c];
      };
      for (let j = 0; j < n; j++) leaves.push({ p: put((r() - 0.5) * (length - 0.1), 0.3 + r() * 0.1, (r() - 0.5) * 0.18), r: 0.07 + r() * 0.07, c: GREENS[Math.floor(r() * 4)] });
      for (let j = 0; j < n; j++) blooms.push({ p: put((r() - 0.5) * (length - 0.08), 0.4 + r() * 0.1, (r() - 0.5) * 0.2), r: 0.032 + r() * 0.018, c: FLOWERS[Math.floor(r() * FLOWERS.length)] });
    });
    return { boxes: k.build(), leaves, blooms };
  }, []);
  useEffect(() => () => boxes.dispose(), [boxes]);
  return (
    <group>
      <mesh geometry={boxes}>
        <meshStandardMaterial vertexColors roughness={0.6} />
      </mesh>
      <BlobSet blobs={leaves} />
      <BlobSet blobs={blooms} detail={0} roughness={0.7} />
    </group>
  );
}

/** Leafy street trees in stone surrounds: every trunk and surround in one mesh, every canopy in one instanced mesh. */
function StreetTrees({ trees }: { trees: { x: number; z: number; scale: number; seed: number }[] }) {
  const { trunks, canopy } = useMemo(() => {
    const k = new Kit();
    const canopy: Blob[] = [];
    for (const t of trees) {
      const s = t.scale;
      k.box([0.95 * s, 0.14 * s, 0.95 * s], [t.x, 0.07 * s, t.z], "#8a8274");
      k.cyl(0.09 * s, 0.15 * s, 3.3 * s, [t.x, 1.75 * s, t.z], "#4a3526", undefined, 9);
      const r = rng(t.seed);
      for (let i = 0; i < 22; i++) {
        const a = r() * Math.PI * 2;
        const d = Math.sqrt(r()) * 1.05;
        canopy.push({ p: [t.x + Math.cos(a) * d * s, (3.5 + r() * 1.3 + (1 - d) * 0.5) * s, t.z + Math.sin(a) * d * s], r: (0.5 + r() * 0.35) * s, c: GREENS[Math.floor(r() * 4)] });
      }
    }
    return { trunks: k.build(), canopy };
  }, [trees]);
  useEffect(() => () => trunks.dispose(), [trunks]);
  return (
    <group>
      <mesh geometry={trunks}>
        <meshStandardMaterial vertexColors roughness={0.9} />
      </mesh>
      <BlobSet blobs={canopy} />
    </group>
  );
}

/** Clipped boxwood balls on trunks in terracotta pots: pots and trunks merged, every ball in one instanced mesh. */
function Topiaries({ spots }: { spots: { x: number; z: number; scale: number }[] }) {
  const { pots, balls } = useMemo(() => {
    const k = new Kit();
    const balls: Blob[] = [];
    const potProfile = [0, 0, 0.1, 0, 0.145, 0.27, 0.17, 0.3, 0.17, 0.3, 0.16, 0.29, 0.12, 0.04].reduce<THREE.Vector2[]>((acc, v, i, a) => (i % 2 ? acc : [...acc, new THREE.Vector2(v, a[i + 1])]), []);
    for (const t of spots) {
      const s = t.scale;
      k.add(new THREE.LatheGeometry(potProfile, 14), "#a9552f", [t.x, 0, t.z], [0, 0, 0], s);
      k.add(new THREE.CircleGeometry(0.15 * s, 12), "#2a1a12", [t.x, 0.27 * s, t.z], [-Math.PI / 2, 0, 0]);
      k.cyl(0.018 * s, 0.026 * s, 0.7 * s, [t.x, 0.62 * s, t.z], "#5a4a35", undefined, 6);
      balls.push({ p: [t.x, 1.1 * s, t.z], r: 0.31 * s, c: "#2f6a3a" });
    }
    return { pots: k.build(), balls };
  }, [spots]);
  useEffect(() => () => pots.dispose(), [pots]);
  return (
    <group>
      <mesh geometry={pots}>
        <meshStandardMaterial vertexColors roughness={0.85} side={THREE.DoubleSide} />
      </mesh>
      <BlobSet blobs={balls} detail={2} roughness={0.85} />
    </group>
  );
}

/** Soft dark discs under furniture, trees and the umbrellas. Much cheaper than real shadows and reads well on paving. */
function ContactShadows({ spots }: { spots: [number, number, number][] }) {
  const tex = useMemo(() => blobShadowTexture(), []);
  const mesh = useRef<THREE.InstancedMesh>(null);
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  const last = useRef<unknown>(null);
  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m) return;
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
    const mat4 = new THREE.Matrix4();
    spots.forEach(([x, z, r], i) => m.setMatrixAt(i, mat4.compose(new THREE.Vector3(x, 0.014, z), q, new THREE.Vector3(r * 2, r * 2, 1))));
    m.instanceMatrix.needsUpdate = true;
  }, [spots]);
  useFrame(() => {
    const tod = getTod();
    if (tod === last.current) return;
    last.current = tod;
    if (mat.current) mat.current.opacity = 0.3 + tod.daylight * 0.55;
  });
  useEffect(() => () => tex.dispose(), [tex]);
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, spots.length]} frustumCulled={false} renderOrder={1}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial ref={mat} map={tex} transparent depthWrite={false} polygonOffset polygonOffsetFactor={-2} polygonOffsetUnits={-2} toneMapped={false} />
    </instancedMesh>
  );
}

/** A strand of bulbs between two posts, sagging in the middle. */
interface Strand {
  a: [number, number];
  b: [number, number];
  y: number;
  sag: number;
}
const STRANDS: Strand[] = [
  // Elmwood: two strands either side of a row of posts
  { a: [-2.2, -3.1], b: [2.6, -3.1], y: 2.95, sag: 0.5 },
  { a: [-2.2, -4.25], b: [2.6, -4.25], y: 2.7, sag: 0.4 },
  { a: [2.6, -3.1], b: [5.6, -3.1], y: 2.95, sag: 0.45 },
  { a: [2.6, -4.25], b: [5.6, -4.25], y: 2.7, sag: 0.4 },
  // Bidwell: the same idea running along the side wall
  { a: [-6.5, 0.6], b: [-6.5, 6.0], y: 2.95, sag: 0.45 },
  { a: [-7.9, 0.6], b: [-7.9, 6.0], y: 2.7, sag: 0.4 },
  { a: [-6.5, 6.0], b: [-6.5, 11.4], y: 2.95, sag: 0.45 },
  { a: [-7.9, 6.0], b: [-7.9, 11.4], y: 2.7, sag: 0.4 },
];
const POLES: [number, number][] = [
  [-2.2, -3.7],
  [2.6, -3.7],
  [5.6, -3.7],
  [-7.2, 0.6],
  [-7.2, 6.0],
  [-7.2, 11.4],
];

/** Strands of warm bulbs strung across both patios. They glow once the light goes. */
function StringLights() {
  const halo = useMemo(() => haloTexture(), []);
  const bulbs = useRef<THREE.InstancedMesh>(null);
  const pts = useRef<THREE.PointsMaterial>(null);
  const bulbMat = useRef<THREE.MeshBasicMaterial>(null);
  const light = useRef<THREE.PointLight>(null);
  const last = useRef<unknown>(null);

  const { positions, wire } = useMemo(() => {
    const positions: V3[] = [];
    const verts: number[] = [];
    for (const s of STRANDS) {
      const len = Math.hypot(s.b[0] - s.a[0], s.b[1] - s.a[1]);
      const n = Math.max(4, Math.round((len / 4.8) * 18));
      const pt = (t: number): V3 => [s.a[0] + (s.b[0] - s.a[0]) * t, s.y - s.sag * 4 * t * (1 - t), s.a[1] + (s.b[1] - s.a[1]) * t];
      for (let i = 0; i < 60; i++) verts.push(...pt(i / 60), ...pt((i + 1) / 60)); // line segments, one draw call for every wire
      for (let i = 0; i <= n; i++) {
        const p = pt(i / n);
        positions.push([p[0], p[1] - 0.05, p[2]]);
      }
    }
    const wire = new THREE.BufferGeometry();
    wire.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
    return { positions, wire };
  }, []);

  const haloGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(positions.flat(), 3));
    return g;
  }, [positions]);

  useEffect(() => {
    const m = bulbs.current;
    if (!m) return;
    const mat = new THREE.Matrix4();
    positions.forEach((p, i) => m.setMatrixAt(i, mat.makeTranslation(...p)));
    m.instanceMatrix.needsUpdate = true;
  }, [positions]);

  useEffect(
    () => () => {
      halo.dispose();
      haloGeo.dispose();
      wire.dispose();
    },
    [halo, haloGeo, wire],
  );

  useFrame(() => {
    const tod = getTod();
    if (tod === last.current) return;
    last.current = tod;
    const g = tod.streetGlow;
    if (bulbMat.current) bulbMat.current.color.set("#cfc6b4").lerp(new THREE.Color("#ffd28a").multiplyScalar(1.4), g);
    if (pts.current) pts.current.opacity = g * 0.9;
    if (light.current) light.current.intensity = g * 5;
  });

  return (
    <group>
      {POLES.map(([x, z]) => (
        <mesh key={`${x},${z}`} position={[x, 1.5, z]}>
          <cylinderGeometry args={[0.03, 0.035, 3.0, 8]} />
          <meshStandardMaterial color={IRON} roughness={0.5} metalness={0.4} />
        </mesh>
      ))}
      <lineSegments geometry={wire} frustumCulled={false}>
        <lineBasicMaterial color="#0a0a0a" />
      </lineSegments>
      <instancedMesh ref={bulbs} args={[undefined, undefined, positions.length]} frustumCulled={false}>
        <sphereGeometry args={[0.035, 8, 6]} />
        <meshBasicMaterial ref={bulbMat} color="#cfc6b4" toneMapped={false} />
      </instancedMesh>
      <points geometry={haloGeo} frustumCulled={false}>
        <pointsMaterial ref={pts} map={halo} size={0.6} sizeAttenuation transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} color="#ffc070" toneMapped={false} />
      </points>
      <pointLight ref={light} position={[0.2, 2.3, -3.6]} color="#ffb866" intensity={0} distance={7.5} decay={2} />
    </group>
  );
}

/** Tiny table candles that come on at night (one instanced mesh for every table, one for the flames). */
function Candles({ spots }: { spots: [number, number][] }) {
  const wax = useRef<THREE.InstancedMesh>(null);
  const flame = useRef<THREE.InstancedMesh>(null);
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  const last = useRef<unknown>(null);
  useLayoutEffect(() => {
    const m4 = new THREE.Matrix4();
    spots.forEach(([x, z], i) => {
      wax.current?.setMatrixAt(i, m4.makeTranslation(x, 0.79, z));
      flame.current?.setMatrixAt(i, m4.makeTranslation(x, 0.835, z));
    });
    if (wax.current) wax.current.instanceMatrix.needsUpdate = true;
    if (flame.current) flame.current.instanceMatrix.needsUpdate = true;
  }, [spots]);
  useFrame(() => {
    const tod = getTod();
    if (tod === last.current) return;
    last.current = tod;
    mat.current?.color.set("#fff0d0").multiplyScalar(0.25 + tod.streetGlow * 1.5);
  });
  return (
    <group>
      <instancedMesh ref={wax} args={[undefined, undefined, spots.length]} frustumCulled={false}>
        <cylinderGeometry args={[0.03, 0.03, 0.06, 12]} />
        <meshStandardMaterial color="#efe0c0" roughness={0.6} />
      </instancedMesh>
      <instancedMesh ref={flame} args={[undefined, undefined, spots.length]} frustumCulled={false}>
        <sphereGeometry args={[0.012, 8, 8]} />
        <meshBasicMaterial ref={mat} color="#fff0d0" toneMapped={false} />
      </instancedMesh>
    </group>
  );
}

/**
 * The patios on both sides of the corner: bistro tables and chairs on the Elmwood sidewalk and along Bidwell, striped
 * umbrellas, wrought-iron curb rails (open at the corner so you can walk straight in), planters, topiaries, street
 * trees and string lights overhead. The two tables nearest the arch keep their original spots so they still read
 * through the window from inside.
 */
export default function Patio() {
  const elmwoodFloor = useMemo(() => {
    const t = sidewalkTexture();
    t.repeat.set(40 / 3, 3.5 / 3); // 3 m slabs across the 40 x 3.5 m patio floor
    return t;
  }, []);
  const bidwellFloor = useMemo(() => {
    const t = sidewalkTexture();
    t.repeat.set(4 / 3, 20 / 3);
    return t;
  }, []);
  const furniture = useMemo(() => {
    const k = new Kit();
    for (const t of [...ELMWOOD_TABLES, ...BIDWELL_TABLES]) {
      addTable(k, t.x, t.z, true);
      for (const [cx, cz, cy] of t.chairs) addChair(k, cx, cz, cy);
    }
    // curb rails: Elmwood stops short of the corner, Bidwell starts past it, leaving the approach to the door open
    addRail(k, 11.0, at(-3.0, 0, -4.75));
    addRail(k, 13.8, at(-9.0, 0, -0.3, -Math.PI / 2));
    // welcome mat just outside the corner door
    const mat = new THREE.Vector3(DOOR_WORLD.x, 0.012, DOOR_WORLD.z).addScaledVector(DOOR_OUT, 0.95);
    k.within(at(mat.x, 0, mat.z, Math.PI / 4), () => {
      k.box([1.25, 0.02, 0.7], [0, 0.012, 0], "#1c4a32");
      k.box([1.15, 0.022, 0.6], [0, 0.013, 0], "#2a5e42");
    });
    // curbs: along Elmwood from the corner east, and along Bidwell
    k.box([29.4, 0.16, 0.3], [5.3, 0.08, -5.35], "#8f887c");
    k.box([0.3, 0.16, 36], [-9.55, 0.08, 12.6], "#8f887c");
    return k.build();
  }, []);
  useEffect(
    () => () => {
      furniture.dispose();
      elmwoodFloor.dispose();
      bidwellFloor.dispose();
    },
    [furniture, elmwoodFloor, bidwellFloor],
  );

  const shadows = useMemo<[number, number, number][]>(() => {
    const s: [number, number, number][] = [];
    for (const t of [...ELMWOOD_TABLES, ...BIDWELL_TABLES]) {
      s.push([t.x, t.z, 0.62]);
      for (const [cx, cz] of t.chairs) s.push([cx, cz, 0.34]);
      if (t.umbrella) s.push([t.x, t.z, 1.5]);
    }
    s.push([-9.7, 3.6, 1.5], [-9.7, 9.6, 1.5], [6.3, -5.1, 1.5]); // trees
    return s;
  }, []);
  const candles = useMemo<[number, number][]>(() => [...ELMWOOD_TABLES, ...BIDWELL_TABLES].map((t) => [t.x, t.z]), []);

  // topiaries either side of the arched window and either side of the corner door
  const topiarySpots = useMemo(() => {
    const along = new THREE.Vector3(Math.SQRT1_2, 0, -Math.SQRT1_2);
    const door = [-1, 1].map((sg) => new THREE.Vector3(DOOR_WORLD.x, 0, DOOR_WORLD.z).addScaledVector(DOOR_OUT, 0.9).addScaledVector(along, sg * 1.15));
    return [
      { x: -0.55, z: -2.3, scale: 1 },
      { x: 1.3, z: -2.3, scale: 1.05 },
      ...door.map((p) => ({ x: p.x, z: p.z, scale: 0.98 })),
    ];
  }, []);

  return (
    <group>
      {/* slabbed patio floors laid just above the plain street sidewalk */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.003, -3.45]}>
        <planeGeometry args={[40, 3.5]} />
        <meshStandardMaterial map={elmwoodFloor} roughness={0.95} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[-7.4, 0.003, 8.35]}>
        <planeGeometry args={[4, 20]} />
        <meshStandardMaterial map={bidwellFloor} roughness={0.95} />
      </mesh>

      <ContactShadows spots={shadows} />
      <mesh geometry={furniture}>
        <meshStandardMaterial vertexColors roughness={0.55} metalness={0.2} />
      </mesh>

      {/* flanking the arched window and the corner door */}
      <Topiaries spots={topiarySpots} />

      {[...ELMWOOD_TABLES, ...BIDWELL_TABLES].map((t) =>
        t.umbrella ? <Umbrella key={`${t.x},${t.z}`} position={[t.x, 0, t.z]} colors={t.umbrella} /> : null,
      )}

      <PlanterRow />
      <StreetTrees trees={TREES} />

      <Candles spots={candles} />
      <StringLights />
    </group>
  );
}
