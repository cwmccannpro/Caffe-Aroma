"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import { haloTexture, latteArtTexture, woodTexture } from "./textures";
import { keyboardTexture, laptopScreenTexture } from "./exteriorTextures";
import { easeOutBack, getTod } from "./tod";
import { useQuality } from "./quality";
import Steam from "./Steam";

const V = (pts: [number, number][]) => pts.map(([x, y]) => new THREE.Vector2(x, y));
const lathe = (pts: [number, number][], seg = 56) => new THREE.LatheGeometry(V(pts), seg);

/** Props "settle" onto the table as their moment of day arrives and shrink away when it passes. */
function Pop({ which, children, ...rest }: { which: "dayProps" | "nightProps" | "breakfast" | "laptop" | "wine"; children: ReactNode; position?: [number, number, number]; rotation?: [number, number, number] }) {
  const g = useRef<THREE.Group>(null);
  useFrame(() => {
    if (!g.current) return;
    const v = getTod()[which];
    const on = v > 0.005;
    g.current.visible = on;
    if (on) {
      const s = Math.max(0.0001, easeOutBack(Math.min(1, v)));
      g.current.scale.setScalar(s);
      g.current.position.y = (1 - Math.min(1, v)) * 0.08 + (rest.position?.[1] ?? 0);
    }
  });
  return (
    <group ref={g} position={rest.position} rotation={rest.rotation}>
      {children}
    </group>
  );
}

const glassProps = {
  color: "#ffffff",
  transparent: true,
  opacity: 0.2,
  roughness: 0.03,
  metalness: 0,
  clearcoat: 1,
  clearcoatRoughness: 0.02,
  envMapIntensity: 1.6,
  side: THREE.DoubleSide,
  depthWrite: false,
} as const;

/* ───────────── Espresso cup + saucer, latte art, steam ───────────── */
function EspressoCup() {
  const latte = useMemo(() => latteArtTexture(), []);
  const cup = useMemo(() => lathe([[0, 0], [0.024, 0], [0.03, 0.004], [0.04, 0.018], [0.047, 0.04], [0.051, 0.062], [0.0495, 0.0645], [0.046, 0.063], [0.043, 0.04], [0.035, 0.018], [0.022, 0.009], [0, 0.008]]), []);
  const saucer = useMemo(() => lathe([[0, 0], [0.045, 0], [0.062, 0.006], [0.08, 0.014], [0.083, 0.0165], [0.079, 0.017], [0.06, 0.0095], [0.04, 0.0055], [0, 0.0055]], 64), []);
  useEffect(
    () => () => {
      latte.dispose();
      cup.dispose();
      saucer.dispose();
    },
    [latte, cup, saucer],
  );
  return (
    <group>
      <mesh geometry={saucer} castShadow receiveShadow>
        <meshPhysicalMaterial color="#f6f0e4" roughness={0.22} clearcoat={0.9} clearcoatRoughness={0.1} />
      </mesh>
      <group position={[0, 0.0145, 0]}>
        <mesh geometry={cup} castShadow receiveShadow>
          <meshPhysicalMaterial color="#f6f0e4" roughness={0.2} clearcoat={0.9} clearcoatRoughness={0.08} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0.05, 0.037, 0]} rotation={[0, 0, -Math.PI / 2]} castShadow>
          <torusGeometry args={[0.016, 0.0046, 12, 24, Math.PI]} />
          <meshPhysicalMaterial color="#f6f0e4" roughness={0.2} clearcoat={0.9} />
        </mesh>
        <mesh rotation-x={-Math.PI / 2} position={[0, 0.053, 0]} rotation-z={0.4}>
          <circleGeometry args={[0.0445, 48]} />
          <meshStandardMaterial map={latte} roughness={0.28} />
        </mesh>
      </group>
      <Steam position={[0, 0.085, 0]} size={1.15} strength={0.75} />
    </group>
  );
}

/* ───────────── Coupe with an espresso martini ───────────── */
function Coupe() {
  const glass = useMemo(() => lathe([[0, 0], [0.034, 0], [0.036, 0.003], [0.012, 0.007], [0.0045, 0.012], [0.0042, 0.07], [0.0055, 0.082], [0.02, 0.088], [0.045, 0.102], [0.056, 0.12], [0.058, 0.14], [0.0575, 0.1425], [0.0555, 0.14], [0.053, 0.12], [0.04, 0.103], [0.018, 0.092], [0, 0.09]]), []);
  const drink = useMemo(() => lathe([[0, 0.092], [0.017, 0.0935], [0.038, 0.105], [0.05, 0.118], [0.0545, 0.1275], [0, 0.1275]]), []);
  useEffect(
    () => () => {
      glass.dispose();
      drink.dispose();
    },
    [glass, drink],
  );
  return (
    <group>
      <mesh geometry={glass} renderOrder={3}>
        <meshPhysicalMaterial {...glassProps} />
      </mesh>
      <mesh geometry={drink} renderOrder={2}>
        <meshPhysicalMaterial color="#1c0e08" roughness={0.12} clearcoat={1} />
      </mesh>
      {/* crema foam */}
      <mesh position={[0, 0.1285, 0]} rotation-x={-Math.PI / 2} renderOrder={2}>
        <circleGeometry args={[0.0545, 40]} />
        <meshStandardMaterial color="#b98a5e" roughness={0.55} />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[Math.cos((i * 2 * Math.PI) / 3 + 0.5) * 0.012, 0.1305, Math.sin((i * 2 * Math.PI) / 3 + 0.5) * 0.012]} rotation={[0, (i * 2 * Math.PI) / 3, 0.3]} scale={[1, 0.55, 0.72]}>
          <sphereGeometry args={[0.0062, 14, 10]} />
          <meshStandardMaterial color="#2a140a" roughness={0.45} />
        </mesh>
      ))}
    </group>
  );
}

/* ───────────── Red wine glass ───────────── */
function WineGlass() {
  const glass = useMemo(() => lathe([[0, 0], [0.04, 0], [0.042, 0.003], [0.015, 0.008], [0.004, 0.015], [0.0035, 0.085], [0.006, 0.095], [0.025, 0.105], [0.038, 0.125], [0.042, 0.15], [0.038, 0.178], [0.03, 0.2], [0.027, 0.205], [0.0262, 0.2], [0.0295, 0.178], [0.0335, 0.15], [0.0295, 0.125], [0.02, 0.108], [0, 0.1]]), []);
  const wine = useMemo(() => lathe([[0, 0.104], [0.022, 0.108], [0.0335, 0.125], [0.036, 0.142], [0, 0.142]]), []);
  useEffect(
    () => () => {
      glass.dispose();
      wine.dispose();
    },
    [glass, wine],
  );
  return (
    <group>
      <mesh geometry={glass} renderOrder={3}>
        <meshPhysicalMaterial {...glassProps} />
      </mesh>
      <mesh geometry={wine} renderOrder={2}>
        <meshPhysicalMaterial color="#5a0f20" roughness={0.1} clearcoat={1} />
      </mesh>
    </group>
  );
}

/* ───────────── Votive candle with a flickering flame ───────────── */
function Votive() {
  const glass = useMemo(() => lathe([[0, 0], [0.033, 0], [0.034, 0.066], [0.0315, 0.066], [0.031, 0.004], [0, 0.004]], 36), []);
  const halo = useMemo(() => haloTexture(), []);
  const flame = useRef<THREE.Mesh>(null);
  const light = useRef<THREE.PointLight>(null);
  const haloMat = useRef<THREE.SpriteMaterial>(null);
  useEffect(
    () => () => {
      glass.dispose();
      halo.dispose();
    },
    [glass, halo],
  );
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    const lamp = getTod().lamp;
    const flick = 0.85 + Math.sin(t * 13.1) * 0.06 + Math.sin(t * 7.3 + 1.7) * 0.07 + Math.sin(t * 23.0) * 0.03;
    if (flame.current) {
      flame.current.scale.set(1, (0.8 + lamp * 0.5) * flick, 1);
      flame.current.visible = lamp > 0.25;
    }
    if (light.current) light.current.intensity = lamp * 1.6 * flick;
    if (haloMat.current) haloMat.current.opacity = lamp * 0.6 * flick;
  });
  return (
    <group>
      <mesh geometry={glass} renderOrder={3}>
        <meshPhysicalMaterial {...glassProps} opacity={0.28} />
      </mesh>
      <mesh position={[0, 0.026, 0]}>
        <cylinderGeometry args={[0.0275, 0.0275, 0.044, 28]} />
        <meshStandardMaterial color="#efe0c0" roughness={0.6} emissive="#ff9a4a" emissiveIntensity={0.15} />
      </mesh>
      <mesh position={[0, 0.054, 0]}>
        <cylinderGeometry args={[0.0015, 0.0015, 0.012, 6]} />
        <meshBasicMaterial color="#1a0f0a" />
      </mesh>
      <mesh ref={flame} position={[0, 0.07, 0]} scale={[1, 1.2, 1]}>
        <sphereGeometry args={[0.0065, 12, 12]} />
        <meshBasicMaterial color="#ffd48a" toneMapped={false} />
      </mesh>
      <sprite position={[0, 0.072, 0]} scale={[0.36, 0.36, 1]}>
        <spriteMaterial ref={haloMat} map={halo} color="#ffb259" transparent depthWrite={false} blending={THREE.AdditiveBlending} opacity={0.4} toneMapped={false} />
      </sprite>
      <pointLight ref={light} position={[0, 0.09, 0]} color="#ffa85a" intensity={1} distance={2.4} decay={2} />
    </group>
  );
}

/* ───────────── Croissant on a small plate ───────────── */
const CROISSANT_TONES = ["#b97a30", "#cf9040", "#d9a050", "#d49846", "#d9a050", "#cf9040", "#b97a30"];

function CroissantPlate() {
  const plate = useMemo(() => lathe([[0, 0], [0.06, 0], [0.076, 0.008], [0.079, 0.011], [0.0755, 0.0115], [0.06, 0.004], [0, 0.004]], 48), []);
  const seg = useMemo(() => new THREE.IcosahedronGeometry(1, 1), []);
  const mesh = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m) return;
    const R = 0.036;
    const taper = [0.5, 0.74, 0.92, 1, 0.92, 0.74, 0.5];
    const q = new THREE.Quaternion();
    const mat = new THREE.Matrix4();
    const col = new THREE.Color();
    taper.forEach((s, i) => {
      // seven overlapping lobes laid along a crescent, fat in the middle and tapering to the horns
      const th = (i - 3) * 0.36;
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -th);
      mat.compose(new THREE.Vector3(Math.sin(th) * R, 0.013 + s * 0.012, -Math.cos(th) * R + R * 0.72), q, new THREE.Vector3(0.027 * (0.7 + 0.3 * s), 0.02 * s + 0.004, 0.023 * s + 0.004));
      m.setMatrixAt(i, mat);
      m.setColorAt(i, col.set(CROISSANT_TONES[i]));
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, []);
  useEffect(
    () => () => {
      plate.dispose();
      seg.dispose();
    },
    [plate, seg],
  );
  return (
    <group>
      <mesh geometry={plate} castShadow receiveShadow>
        <meshPhysicalMaterial color="#efe6d6" roughness={0.25} clearcoat={0.7} />
      </mesh>
      <instancedMesh ref={mesh} args={[seg, undefined, 7]} castShadow frustumCulled={false}>
        <meshStandardMaterial flatShading roughness={0.62} />
      </instancedMesh>
    </group>
  );
}

/* ───────────── Laptop: the midday workday ───────────── */
function Laptop() {
  const screen = useMemo(() => laptopScreenTexture(), []);
  const keys = useMemo(() => keyboardTexture(), []);
  const halo = useMemo(() => haloTexture(), []);
  useEffect(
    () => () => {
      screen.dispose();
      keys.dispose();
      halo.dispose();
    },
    [screen, keys, halo],
  );
  const silver = { color: "#cfcbc2", metalness: 0.8, roughness: 0.32 } as const;
  return (
    <group>
      <RoundedBox args={[0.22, 0.008, 0.15]} radius={0.003} smoothness={2} position={[0, 0.004, 0]} castShadow receiveShadow>
        <meshStandardMaterial {...silver} />
      </RoundedBox>
      <mesh position={[0, 0.0084, 0.012]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[0.2, 0.092]} />
        <meshStandardMaterial map={keys} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.0085, 0.062]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[0.07, 0.04]} />
        <meshStandardMaterial color="#bdb9b0" metalness={0.6} roughness={0.4} />
      </mesh>
      {/* the lid, hinged at the back and leaning away from you */}
      <group position={[0, 0.008, -0.074]} rotation-x={-0.26}>
        <RoundedBox args={[0.22, 0.148, 0.006]} radius={0.002} smoothness={2} position={[0, 0.074, -0.003]} castShadow>
          <meshStandardMaterial {...silver} />
        </RoundedBox>
        <mesh position={[0, 0.074, 0.0005]}>
          <boxGeometry args={[0.212, 0.14, 0.002]} />
          <meshStandardMaterial color="#0e0f12" roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.076, 0.0018]}>
          <planeGeometry args={[0.2, 0.125]} />
          <meshBasicMaterial map={screen} toneMapped={false} />
        </mesh>
        <sprite position={[0, 0.08, 0.03]} scale={[0.55, 0.42, 1]}>
          <spriteMaterial map={halo} color="#bcd4ff" transparent depthWrite={false} blending={THREE.AdditiveBlending} opacity={0.22} toneMapped={false} />
        </sprite>
      </group>
    </group>
  );
}

/* ───────────── Journal with a pen ───────────── */
function Journal() {
  return (
    <group>
      <RoundedBox args={[0.155, 0.024, 0.215]} radius={0.004} smoothness={2} position={[0, 0.012, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#2b1810" roughness={0.65} />
      </RoundedBox>
      <mesh position={[0.004, 0.0165, 0.0]}>
        <boxGeometry args={[0.145, 0.015, 0.205]} />
        <meshStandardMaterial color="#efe3c8" roughness={0.95} />
      </mesh>
      <RoundedBox args={[0.153, 0.006, 0.213]} radius={0.003} smoothness={2} position={[0, 0.027, 0]} castShadow>
        <meshStandardMaterial color="#321c12" roughness={0.6} />
      </RoundedBox>
      <mesh position={[0.045, 0.039, -0.02]} rotation={[Math.PI / 2, 0, 0.55]} castShadow>
        <cylinderGeometry args={[0.0042, 0.0042, 0.145, 12]} />
        <meshStandardMaterial color="#14100e" roughness={0.3} metalness={0.4} />
      </mesh>
      <mesh position={[0.058, 0.028, 0.0]} rotation={[0, 0, 0]}>
        <boxGeometry args={[0.004, 0.002, 0.09]} />
        <meshStandardMaterial color="#b3261e" roughness={0.6} />
      </mesh>
    </group>
  );
}

/* ───────────── Bud vase ───────────── */
function Vase() {
  const vase = useMemo(() => lathe([[0, 0], [0.026, 0], [0.034, 0.02], [0.03, 0.05], [0.012, 0.075], [0.011, 0.105], [0.0155, 0.11], [0.0112, 0.1085], [0.0098, 0.1], [0.0098, 0.075], [0.026, 0.05], [0.03, 0.02], [0.0, 0.004]], 32), []);
  useEffect(() => () => vase.dispose(), [vase]);
  const stems = [
    { r: [0.15, 0.1, 0.0], h: 0.2, c: "#d96a4c" },
    { r: [-0.18, -0.05, 0.1], h: 0.17, c: "#f2b8a0" },
    { r: [0.04, 0.0, -0.2], h: 0.22, c: "#c8452f" },
  ];
  return (
    <group>
      <mesh geometry={vase} renderOrder={3}>
        <meshPhysicalMaterial {...glassProps} color="#9bd0b4" opacity={0.3} />
      </mesh>
      {stems.map((s, i) => (
        <group key={i} position={[0, 0.07, 0]} rotation={s.r as [number, number, number]}>
          <mesh position={[0, s.h / 2 + 0.01, 0]}>
            <cylinderGeometry args={[0.0022, 0.0022, s.h, 6]} />
            <meshStandardMaterial color="#3f6b3a" roughness={0.8} />
          </mesh>
          <mesh position={[0, s.h + 0.016, 0]} castShadow>
            <icosahedronGeometry args={[0.02, 1]} />
            <meshStandardMaterial color={s.c} roughness={0.85} flatShading />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* ───────────── The table itself ───────────── */
export const TABLE = { x: 0.5, z: 0.0, top: 0.76, scale: 1.0 };

export default function Table() {
  const wood = useMemo(() => woodTexture(), []);
  const quality = useQuality((s) => s.quality);
  useEffect(() => () => wood.dispose(), [wood]);
  const shadows = quality === "high" || quality === "med";
  const P = 1.75; // props are stylized ~1.75x so they read from across the room

  return (
    <group position={[TABLE.x, 0, TABLE.z]} scale={1.2}>
      {/* top */}
      <mesh position={[0, TABLE.top - 0.02, 0]} castShadow={shadows} receiveShadow>
        <cylinderGeometry args={[0.52, 0.52, 0.04, 64]} />
        <meshStandardMaterial map={wood} roughness={0.42} metalness={0.0} />
      </mesh>
      <mesh position={[0, TABLE.top - 0.02, 0]} rotation-x={Math.PI / 2}>
        <torusGeometry args={[0.52, 0.007, 8, 96]} />
        <meshStandardMaterial color="#1a0f08" roughness={0.5} />
      </mesh>
      {/* cast-iron pedestal */}
      <mesh position={[0, TABLE.top / 2 - 0.02, 0]} castShadow={shadows}>
        <cylinderGeometry args={[0.032, 0.05, TABLE.top - 0.06, 20]} />
        <meshStandardMaterial color="#101012" metalness={0.65} roughness={0.42} />
      </mesh>
      <mesh position={[0, 0.02, 0]} castShadow={shadows} receiveShadow>
        <cylinderGeometry args={[0.2, 0.26, 0.04, 40]} />
        <meshStandardMaterial color="#101012" metalness={0.65} roughness={0.42} />
      </mesh>

      {/* things on the table */}
      <group position={[0, TABLE.top, 0]} scale={P}>
        {/* day */}
        <Pop which="dayProps" position={[-0.06, 0, 0.1]} rotation={[0, 0.5, 0]}>
          <EspressoCup />
        </Pop>
        <Pop which="breakfast" position={[0.17, 0, -0.04]} rotation={[0, -0.4, 0]}>
          <CroissantPlate />
        </Pop>
        <Pop which="laptop" position={[0.13, 0, -0.01]} rotation={[0, -0.22, 0]}>
          <Laptop />
        </Pop>
        {/* golden hour onward: a glass of red on the right of the table, where the croissant and the laptop sat */}
        <Pop which="wine" position={[0.14, 0, -0.04]}>
          <WineGlass />
        </Pop>
        {/* night: the coupe takes the cup's place */}
        <Pop which="nightProps" position={[-0.06, 0, 0.1]}>
          <Coupe />
        </Pop>
        <Pop which="nightProps" position={[-0.03, 0, -0.15]}>
          <Votive />
        </Pop>
        {/* always */}
        <group position={[-0.15, 0, -0.01]} rotation={[0, 0.5, 0]}>
          <Journal />
        </group>
        <group position={[0.08, 0, -0.17]}>
          <Vase />
        </group>
      </group>
    </group>
  );
}
