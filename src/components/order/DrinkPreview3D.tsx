"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import { getGroup, type Item, type Selections } from "@/lib/menu";
import { mixHex } from "@/lib/timeOfDay";
import Steam from "@/components/scene/Steam";

const FLAVOR_COLORS: Record<string, string> = {
  vanilla: "#f1e2b8",
  "french-vanilla": "#f1e2b8",
  caramel: "#c9822f",
  hazelnut: "#9a6a3d",
  "pumpkin-spice": "#c9702a",
  lavender: "#a58bd0",
  rose: "#e58aa5",
  peppermint: "#9fe0c0",
  raspberry: "#c2305b",
  strawberry: "#d6546a",
  cherry: "#8a1c35",
  blackberry: "#4a2a5e",
  coconut: "#efe2cc",
  almond: "#d8b98a",
  amaretto: "#b9733a",
  "irish-cream": "#d9bd96",
  lemon: "#f3e06a",
  lime: "#9fcf5a",
  orange: "#f09a2a",
  peach: "#f4a76a",
  ginger: "#d4a54a",
  cinnamon: "#a8501f",
  "green-mint": "#6fd4a0",
  butterscotch: "#d99a2f",
  "maple-pancake": "#b9722a",
};

const MILK_TINT: Record<string, [string, number]> = {
  oat: ["#d9bd8f", 0.2],
  almond: ["#e8d3b2", 0.24],
  coconut: ["#f1e5cf", 0.22],
  skim: ["#dcc6a3", 0.1],
};

export function liquidColor(item: Item, sel: Selections): string {
  let c = item.preview.liquid;
  for (const gid of item.groups) {
    const g = getGroup(gid);
    const picked = sel[gid] ?? [];
    if (g.kind === "milk") for (const id of picked) if (MILK_TINT[id]) c = mixHex(c, MILK_TINT[id][0], MILK_TINT[id][1]);
    if (g.kind === "flavor") for (const id of picked) c = mixHex(c, FLAVOR_COLORS[id] ?? "#c9a070", 0.14);
  }
  return c;
}

export function sizeScale(item: Item, sel: Selections): number {
  for (const gid of item.groups) {
    const g = getGroup(gid);
    if (g.kind !== "size") continue;
    const name = g.options.find((o) => o.id === sel[gid]?.[0])?.name.toLowerCase() ?? "";
    if (name.startsWith("small") || name.startsWith("single") || name.startsWith("16")) return 0.9;
    if (name.startsWith("large") || name.startsWith("double") || name.startsWith("doppio")) return 1.14;
    return 1;
  }
  return 1;
}

export const hasWhip = (item: Item, sel: Selections) => item.preview.whip || item.groups.some((g) => getGroup(g).kind === "topping" && (sel[g] ?? []).includes("whipped-cream"));

const L = (pts: [number, number][], seg = 56) => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg);

function Cup({ item, sel, mug = false, demi = false }: { item: Item; sel: Selections; mug?: boolean; demi?: boolean }) {
  const color = liquidColor(item, sel);
  const whip = hasWhip(item, sel);
  const s = sizeScale(item, sel) * (demi ? 0.8 : 1);
  const h = mug ? 1.0 : 0.8;
  const body = useMemo(
    () =>
      mug
        ? L([[0, 0], [0.42, 0], [0.47, 0.04], [0.5, 0.2], [0.5, h], [0.485, h + 0.01], [0.46, h], [0.46, 0.2], [0.42, 0.08], [0, 0.07]])
        : L([[0, 0], [0.3, 0], [0.38, 0.05], [0.5, 0.25], [0.58, 0.55], [0.62, h], [0.605, h + 0.02], [0.575, h], [0.545, 0.55], [0.45, 0.25], [0.28, 0.1], [0, 0.09]]),
    [mug, h],
  );
  const saucer = useMemo(() => L([[0, 0], [0.5, 0], [0.74, 0.07], [0.95, 0.17], [0.98, 0.2], [0.93, 0.205], [0.72, 0.12], [0.48, 0.065], [0, 0.065]], 64), []);
  useEffect(
    () => () => {
      body.dispose();
      saucer.dispose();
    },
    [body, saucer],
  );
  const liquidY = h - 0.06;
  return (
    <group scale={s}>
      {!mug && (
        <mesh geometry={saucer} receiveShadow>
          <meshPhysicalMaterial color="#f6f0e4" roughness={0.2} clearcoat={1} />
        </mesh>
      )}
      <group position={[0, mug ? 0 : 0.17, 0]}>
        <mesh geometry={body} castShadow>
          <meshPhysicalMaterial color={mug ? "#2f6b3b" : "#f6f0e4"} roughness={0.22} clearcoat={1} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[mug ? 0.5 : 0.62, h * 0.5, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <torusGeometry args={[0.2, 0.055, 14, 28, Math.PI]} />
          <meshPhysicalMaterial color={mug ? "#2f6b3b" : "#f6f0e4"} roughness={0.22} clearcoat={1} />
        </mesh>
        <mesh position={[0, liquidY, 0]} rotation-x={-Math.PI / 2}>
          <circleGeometry args={[mug ? 0.455 : 0.54, 48]} />
          <meshPhysicalMaterial color={color} roughness={0.25} clearcoat={0.6} />
        </mesh>
        {item.preview.foam && (
          <mesh position={[0, liquidY + 0.012, 0]} rotation-x={-Math.PI / 2}>
            <ringGeometry args={[0.18, 0.5, 48]} />
            <meshStandardMaterial color="#f4e6cf" roughness={0.9} transparent opacity={0.55} />
          </mesh>
        )}
        {whip && (
          <group position={[0, liquidY + 0.02, 0]}>
            {[0.3, 0.22, 0.14].map((r, i) => (
              <mesh key={i} position={[0, i * 0.11, 0]} scale={[1, 0.8, 1]}>
                <sphereGeometry args={[r, 20, 14]} />
                <meshStandardMaterial color="#fffaf0" roughness={0.9} />
              </mesh>
            ))}
          </group>
        )}
      </group>
      {item.serve === "hot" && (
        <group position={[0, h + 0.2, 0]} scale={8}>
          <Steam strength={1.1} size={5} />
        </group>
      )}
    </group>
  );
}

function Tall({ item, sel }: { item: Item; sel: Selections }) {
  const color = liquidColor(item, sel);
  const whip = hasWhip(item, sel);
  const s = sizeScale(item, sel);
  const glass = useMemo(() => L([[0, 0.02], [0.34, 0.02], [0.4, 0.06], [0.5, 1.45], [0.512, 1.47], [0.49, 1.47], [0.38, 0.1], [0, 0.1]], 48), []);
  const drink = useMemo(() => L([[0, 0.1], [0.372, 0.1], [0.485, 1.18], [0, 1.18]], 48), []);
  useEffect(
    () => () => {
      glass.dispose();
      drink.dispose();
    },
    [glass, drink],
  );
  const cubes = [
    [-0.15, 0.95, 0.05, 0.3],
    [0.14, 0.78, -0.1, 0.5],
    [0.02, 1.1, 0.14, 0.9],
    [-0.12, 0.55, -0.12, 0.2],
    [0.16, 0.42, 0.1, 0.7],
  ];
  return (
    <group scale={s * 0.78} position={[0, -0.1, 0]}>
      <mesh geometry={drink}>
        <meshPhysicalMaterial color={color} roughness={item.preview.blended ? 0.55 : 0.12} clearcoat={0.8} transparent opacity={item.preview.blended ? 0.96 : 0.9} />
      </mesh>
      <mesh geometry={glass} renderOrder={3}>
        <meshPhysicalMaterial color="#ffffff" transparent opacity={0.18} roughness={0.03} clearcoat={1} envMapIntensity={1.6} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      {item.preview.ice &&
        cubes.map(([x, y, z, r], i) => (
          <RoundedBox key={i} args={[0.26, 0.26, 0.26]} radius={0.05} smoothness={2} position={[x, y, z]} rotation={[r, r * 2, r * 0.5]}>
            <meshPhysicalMaterial color="#ffffff" transparent opacity={0.4} roughness={0.08} transmission={0} clearcoat={1} />
          </RoundedBox>
        ))}
      {whip && (
        <group position={[0, 1.18, 0]}>
          {[0.36, 0.27, 0.17].map((r, i) => (
            <mesh key={i} position={[0, i * 0.13, 0]} scale={[1, 0.8, 1]}>
              <sphereGeometry args={[r, 20, 14]} />
              <meshStandardMaterial color="#fffaf0" roughness={0.9} />
            </mesh>
          ))}
        </group>
      )}
      <mesh position={[0.12, 1.5, 0.05]} rotation={[0.1, 0, -0.18]}>
        <cylinderGeometry args={[0.025, 0.025, 1.5, 10]} />
        <meshStandardMaterial color="#b3261e" roughness={0.5} />
      </mesh>
    </group>
  );
}

/** Keep the whole vessel in frame whatever shape the panel is (tall on desktop, wide on phones). */
function Fit({ tall }: { tall: boolean }) {
  const { camera, size } = useThree();
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    const aspect = size.width / Math.max(1, size.height);
    const half = THREE.MathUtils.degToRad(cam.fov / 2);
    const needW = tall ? 1.7 : 2.5;
    const needH = tall ? 2.3 : 2.3;
    const d = Math.max(needW / 2 / (Math.tan(half) * aspect), needH / 2 / Math.tan(half));
    cam.position.set(0, d * 0.3, d * 0.95);
    cam.lookAt(0, tall ? 0.45 : 0.15, 0);
    cam.updateProjectionMatrix();
  }, [camera, size, tall]);
  return null;
}

function Spin({ children }: { children: React.ReactNode }) {
  const g = useRef<THREE.Group>(null);
  useFrame((s, dt) => {
    if (!g.current) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) g.current.rotation.y += dt * 0.32;
    g.current.position.y = Math.sin(s.clock.elapsedTime * 0.8) * 0.02;
  });
  return <group ref={g}>{children}</group>;
}

/** Live preview that reacts to size, milk, flavor, whip and ice as the customer builds their drink. */
export default function DrinkPreview3D({ item, sel }: { item: Item; sel: Selections }) {
  const v = item.preview.vessel;
  return (
    <Canvas dpr={[1, 1.6]} camera={{ position: [0, 1.15, 3.6], fov: 32 }} gl={{ antialias: true, alpha: true }} shadows={false}>
      <hemisphereLight args={["#ffffff", "#5a3a28", 0.9]} />
      <directionalLight position={[3, 5, 3]} intensity={2.2} color="#fff1dc" />
      <directionalLight position={[-4, 2, -2]} intensity={0.8} color="#ffb47a" />
      <Environment resolution={64} frames={1}>
        <Lightformer form="rect" intensity={4} position={[0, 3, 3]} scale={[6, 3, 1]} color="#fff6e8" />
        <Lightformer form="rect" intensity={1.5} position={[-4, 1, 0]} rotation-y={Math.PI / 2} scale={[4, 3, 1]} color="#ffb47a" />
      </Environment>
      <Fit tall={v === "tall"} />
      <group position={[0, -0.2, 0]}>
        <Spin>
          {v === "tall" ? <Tall item={item} sel={sel} /> : <Cup item={item} sel={sel} mug={v === "mug"} demi={v === "demi"} />}
        </Spin>
      </group>
    </Canvas>
  );
}

export const PREVIEWABLE = new Set(["cup", "demi", "tall", "mug"]);
