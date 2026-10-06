"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { facadeTextures, rng, haloTexture } from "./textures";
import { getTod } from "./tod";
import { BlobSet, type Blob } from "./Foliage";
import { Kit } from "./kit";

const TONES = ["#8a4a36", "#6b4a3a", "#9a5a3f", "#7a5c4c", "#8a3a30"];
const STOREY = 3.1;

interface Building {
  x: number;
  w: number;
  z: number;
  tone: number;
  upper: number; // 0 or 1 extra storeys
  awning?: string;
}

/** Dashed centre lines for Elmwood and for Bidwell, as one instanced mesh. */
function LaneMarks() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const spots = useMemo(() => {
    const out: { x: number; z: number; turn: boolean }[] = [];
    for (let i = 0; i < 24; i++) {
      const x = -28 + i * 2.5;
      if (x > -16.5 && x < -8.5) continue; // the mouth of Bidwell
      out.push({ x, z: -10.2, turn: false });
    }
    for (let j = 0; j < 15; j++) out.push({ x: -12.45, z: 3 + j * 2.5, turn: true });
    return out;
  }, []);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const flat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
    const along = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2).multiply(flat);
    const mat = new THREE.Matrix4();
    spots.forEach((p, i) => m.setMatrixAt(i, mat.compose(new THREE.Vector3(p.x, 0, p.z), p.turn ? along : flat, new THREE.Vector3(1, 1, 1))));
    m.instanceMatrix.needsUpdate = true;
  }, [spots]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, spots.length]} frustumCulled={false}>
      <planeGeometry args={[1.1, 0.12]} />
      <meshBasicMaterial color="#d9c28a" />
    </instancedMesh>
  );
}

/** Bidwell Park across Bidwell Parkway: trees on grass (trunks merged, every canopy in one instanced mesh). */
function ParkTrees() {
  const { trunks, canopy } = useMemo(() => {
    const r = rng(31);
    const k = new Kit();
    const canopy: Blob[] = [];
    for (let i = 0; i < 9; i++) {
      const x = -50 + r() * 30;
      const z = 3 + r() * 34;
      const s = 0.8 + r() * 0.6;
      k.cyl(0.12 * s, 0.2 * s, 3.4 * s, [x, 1.7 * s, z], "#4a3526", undefined, 7);
      for (let j = 0; j < 9; j++) {
        const a = r() * Math.PI * 2;
        const d = Math.sqrt(r()) * 1.3 * s;
        canopy.push({ p: [x + Math.cos(a) * d, (3.6 + r() * 1.5 + (1 - d / (1.3 * s)) * 0.6) * s, z + Math.sin(a) * d], r: (0.7 + r() * 0.5) * s, c: ["#2f5d37", "#356b3d", "#3d7a45", "#2a5130"][Math.floor(r() * 4)] });
      }
    }
    return { trunks: k.build(), canopy };
  }, []);
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

/** Elmwood Avenue as seen through the window: low-rise storefronts, a sidewalk and street lamps. */
export default function Street() {
  const ground = useMemo(() => TONES.map((t, i) => facadeTextures(40 + i, t, "ground")), []);
  const upper = useMemo(() => TONES.map((t, i) => facadeTextures(60 + i, t, "upper")), []);
  const halo = useMemo(() => haloTexture(), []);
  const mats = useRef<THREE.MeshStandardMaterial[]>([]);
  const lamps = useRef<THREE.MeshBasicMaterial[]>([]);
  const haloMats = useRef<THREE.SpriteMaterial[]>([]);
  const last = useRef<unknown>(null);
  const tint = useMemo(() => ({ day: new THREE.Color("#ffffff"), night: new THREE.Color("#8e92b8"), cur: new THREE.Color() }), []);

  const buildings = useMemo<Building[]>(() => {
    const r = rng(77);
    const out: Building[] = [];
    let x = -46;
    while (x < 46) {
      const w = 4.2 + r() * 3.0;
      out.push({
        x: x + w / 2,
        w,
        z: -21 - r() * 2.0,
        tone: Math.floor(r() * TONES.length),
        upper: r() > 0.82 ? 1 : 0,
        awning: r() > 0.4 ? ["#b3261e", "#2f6b3b", "#1d3557", "#c28a2c"][Math.floor(r() * 4)] : undefined,
      });
      x += w + 0.04;
    }
    return out;
  }, []);

  useFrame(() => {
    const tod = getTod();
    if (tod === last.current) return;
    last.current = tod;
    tint.cur.copy(tint.night).lerp(tint.day, tod.daylight);
    mats.current.forEach((m) => {
      if (!m) return;
      m.emissiveIntensity = tod.streetGlow * 1.7;
      m.color.copy(tint.cur);
    });
    lamps.current.forEach((m) => m && m.color.setScalar(0.1 + 1.5 * tod.streetGlow));
    haloMats.current.forEach((m) => m && (m.opacity = tod.streetGlow * 0.85));
  });

  useEffect(
    () => () => {
      [...ground, ...upper].forEach((f) => {
        f.map.dispose();
        f.emissiveMap.dispose();
      });
      halo.dispose();
    },
    [ground, upper, halo],
  );

  let mi = 0;
  return (
    <group>
      {/* ground: a wide base so no sky ever shows below the horizon, then Elmwood, Bidwell and the sidewalks */}
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.06, 0]}>
        <planeGeometry args={[400, 400]} />
        <meshStandardMaterial color="#4b4a44" roughness={1} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.02, -12]}>
        <planeGeometry args={[160, 26]} />
        <meshStandardMaterial color="#1b1b21" roughness={0.9} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[-12.45, -0.02, 21]}>
        <planeGeometry args={[6.1, 40]} />
        <meshStandardMaterial color="#1b1b21" roughness={0.9} />
      </mesh>
      {/* near-side sidewalk: Elmwood east of Bidwell, Elmwood across Bidwell, and Bidwell's own along the building */}
      <mesh rotation-x={-Math.PI / 2} position={[25.3, 0.0, -3.4]}>
        <planeGeometry args={[69.4, 3.6]} />
        <meshStandardMaterial color="#77716a" roughness={0.95} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[-37.75, 0.0, -3.4]}>
        <planeGeometry args={[44.5, 3.6]} />
        <meshStandardMaterial color="#77716a" roughness={0.95} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[-7.4, 0.0, 19.2]}>
        <planeGeometry args={[4, 41.6]} />
        <meshStandardMaterial color="#77716a" roughness={0.95} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.0, -18.6]}>
        <planeGeometry args={[160, 3.2]} />
        <meshStandardMaterial color="#77716a" roughness={0.95} />
      </mesh>
      {/* the park on the far side of Bidwell */}
      <mesh rotation-x={-Math.PI / 2} position={[-37.75, 0.0, 19.2]}>
        <planeGeometry args={[44.5, 41.6]} />
        <meshStandardMaterial color="#4a7640" roughness={1} />
      </mesh>
      <ParkTrees />
      <LaneMarks />

      {/* storefronts across the street */}
      {buildings.map((b, i) => {
        const g = ground[b.tone];
        const u = upper[b.tone];
        const gi = mi++;
        const ui = b.upper ? mi++ : -1;
        return (
          <group key={i} position={[b.x, 0, b.z]}>
            <mesh position={[0, STOREY / 2, 0]}>
              <boxGeometry args={[b.w, STOREY, 2.4]} />
              <meshStandardMaterial
                ref={(m) => {
                  if (m) mats.current[gi] = m;
                }}
                map={g.map}
                emissiveMap={g.emissiveMap}
                emissive="#ffffff"
                emissiveIntensity={0}
                roughness={0.95}
              />
            </mesh>
            {b.upper === 1 && (
              <mesh position={[0, STOREY * 1.5, 0]}>
                <boxGeometry args={[b.w, STOREY, 2.4]} />
                <meshStandardMaterial
                  ref={(m) => {
                    if (m) mats.current[ui] = m;
                  }}
                  map={u.map}
                  emissiveMap={u.emissiveMap}
                  emissive="#ffffff"
                  emissiveIntensity={0}
                  roughness={0.95}
                />
              </mesh>
            )}
            <mesh position={[0, STOREY * (1 + b.upper) + 0.12, 0.05]}>
              <boxGeometry args={[b.w + 0.2, 0.24, 2.5]} />
              <meshStandardMaterial color="#3a2a24" roughness={0.9} />
            </mesh>
            {b.awning && (
              <mesh position={[-b.w * 0.12, 2.35, 1.35]} rotation-x={0.35}>
                <boxGeometry args={[b.w * 0.6, 0.05, 1.0]} />
                <meshStandardMaterial color={b.awning} roughness={0.8} />
              </mesh>
            )}
          </group>
        );
      })}

      {/* street lamps along the near curb (kept off the corner so the view of the entrance stays clear) */}
      {(
        [
          [12, -4.9],
          [24, -4.9],
          [-9.6, 12],
        ] as [number, number][]
      ).map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 2.1, 0]}>
            <cylinderGeometry args={[0.045, 0.06, 4.2, 10]} />
            <meshStandardMaterial color="#14161a" metalness={0.6} roughness={0.5} />
          </mesh>
          <mesh position={[0.45, 4.15, 0]} rotation-z={0.5}>
            <cylinderGeometry args={[0.025, 0.025, 1.0, 8]} />
            <meshStandardMaterial color="#14161a" metalness={0.6} roughness={0.5} />
          </mesh>
          <mesh position={[0.82, 4.28, 0]}>
            <sphereGeometry args={[0.16, 16, 12]} />
            <meshBasicMaterial
              ref={(m) => {
                if (m) lamps.current[i] = m;
              }}
              color="#ffe2a8"
              toneMapped={false}
            />
          </mesh>
          <sprite position={[0.82, 4.28, 0]} scale={[2.6, 2.6, 1]}>
            <spriteMaterial
              ref={(m) => {
                if (m) haloMats.current[i] = m;
              }}
              map={halo}
              color="#ffcf86"
              transparent
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              opacity={0}
              toneMapped={false}
            />
          </sprite>
        </group>
      ))}
    </group>
  );
}
