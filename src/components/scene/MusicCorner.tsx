"use client";

import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Kit } from "./kit";
import { canvasTexture, haloTexture } from "./textures";
import { rugTexture, type Fonts } from "./exteriorTextures";
import { easeOutBack, getTod } from "./tod";
import { useFonts } from "./useFonts";

type V3 = [number, number, number];
const IRON = "#15181a";

/** Things for the live-music corner settle into place around golden hour, like the props on the table do. */
function Appear({ children, position = [0, 0, 0], rotation = [0, 0, 0] }: { children: ReactNode; position?: V3; rotation?: V3 }) {
  const g = useRef<THREE.Group>(null);
  useFrame(() => {
    if (!g.current) return;
    const v = getTod().music;
    const on = v > 0.005;
    g.current.visible = on;
    if (on) g.current.scale.setScalar(Math.max(0.0001, easeOutBack(Math.min(1, v))));
  });
  return (
    <group ref={g} position={position} rotation={rotation}>
      {children}
    </group>
  );
}

/** An acoustic guitar, bottom-centre at the origin, soundboard facing +z, about 1.1 m tall. One merged mesh. */
function useGuitarGeometry() {
  return useMemo(() => {
    const k = new Kit();
    const s = new THREE.Shape();
    s.moveTo(0, 0);
    s.bezierCurveTo(0.12, 0, 0.19, 0.06, 0.19, 0.14);
    s.bezierCurveTo(0.19, 0.21, 0.125, 0.23, 0.125, 0.285);
    s.bezierCurveTo(0.125, 0.33, 0.155, 0.35, 0.155, 0.4);
    s.bezierCurveTo(0.155, 0.47, 0.07, 0.5, 0, 0.5);
    s.bezierCurveTo(-0.07, 0.5, -0.155, 0.47, -0.155, 0.4);
    s.bezierCurveTo(-0.155, 0.35, -0.125, 0.33, -0.125, 0.285);
    s.bezierCurveTo(-0.125, 0.23, -0.19, 0.21, -0.19, 0.14);
    s.bezierCurveTo(-0.19, 0.06, -0.12, 0, 0, 0);
    const body = new THREE.ExtrudeGeometry(s, { depth: 0.07, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.014, bevelSegments: 2, curveSegments: 14 });
    k.add(body, "#c27a36", [0, 0, -0.035]);
    const front = 0.035 + 0.014;
    k.cyl(0.052, 0.052, 0.004, [0, 0.3, front], "#120a06", [Math.PI / 2, 0, 0], 20);
    k.add(new THREE.TorusGeometry(0.058, 0.006, 6, 24), "#4a2a14", [0, 0.3, front + 0.001]);
    k.box([0.11, 0.016, 0.01], [0, 0.095, front + 0.005], "#2a170c");
    // neck, fretboard, headstock and tuners
    k.box([0.045, 0.52, 0.03], [0, 0.76, 0], "#6a4326");
    k.box([0.042, 0.5, 0.008], [0, 0.76, 0.017], "#1a110c");
    k.box([0.064, 0.13, 0.026], [0, 1.08, -0.004], "#2e1b10", [-0.08, 0, 0]);
    for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) k.cyl(0.007, 0.007, 0.02, [sx * 0.04, 1.045 + i * 0.04, -0.004], "#c8c4bb", [0, 0, Math.PI / 2], 8);
    for (let i = 0; i < 6; i++) k.box([0.0018, 0.93, 0.002], [(i - 2.5) * 0.0072, 0.56, front + 0.013], "#d8d4cb");
    return k.build();
  }, []);
}

function GuitarOnStand({ position }: { position: V3 }) {
  const geo = useGuitarGeometry();
  const stand = useMemo(() => {
    const k = new Kit();
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + Math.PI / 2;
      k.rod([0, 0.46, 0], [Math.cos(a) * 0.3, 0.01, Math.sin(a) * 0.3], 0.011, IRON, 6);
    }
    k.cyl(0.012, 0.012, 0.5, [0, 0.45, 0], IRON, undefined, 8);
    k.box([0.24, 0.022, 0.05], [0, 0.42, 0.03], IRON);
    k.box([0.09, 0.02, 0.04], [0, 0.98, -0.015], IRON);
    k.cyl(0.01, 0.01, 0.56, [0, 0.7, -0.015], IRON, undefined, 6);
    return k.build();
  }, []);
  useEffect(
    () => () => {
      geo.dispose();
      stand.dispose();
    },
    [geo, stand],
  );
  return (
    <Appear position={position} rotation={[0, 0.5, 0]}>
      <mesh geometry={stand}>
        <meshStandardMaterial vertexColors roughness={0.5} metalness={0.5} />
      </mesh>
      <mesh geometry={geo} position={[0, 0.43, 0.03]} rotation-x={-0.06} castShadow>
        <meshStandardMaterial vertexColors roughness={0.38} metalness={0.05} />
      </mesh>
    </Appear>
  );
}

function MicAndStool({ stool, mic }: { stool: V3; mic: V3 }) {
  const geo = useMemo(() => {
    const k = new Kit();
    // stool: walnut seat on three iron legs with a foot ring
    k.cyl(0.19, 0.18, 0.045, [0, 0.64, 0], "#6b4328", undefined, 20);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + 0.4;
      k.rod([Math.cos(a) * 0.1, 0.62, Math.sin(a) * 0.1], [Math.cos(a) * 0.2, 0, Math.sin(a) * 0.2], 0.014, IRON, 6);
    }
    k.add(new THREE.TorusGeometry(0.15, 0.008, 6, 20), IRON, [0, 0.26, 0], [Math.PI / 2, 0, 0]);
    return k.build();
  }, []);
  const micGeo = useMemo(() => {
    const k = new Kit();
    k.cyl(0.13, 0.15, 0.025, [0, 0.0125, 0], IRON, undefined, 20);
    k.cyl(0.011, 0.011, 1.38, [0, 0.7, 0], IRON, undefined, 8);
    k.rod([0, 1.38, 0], [0.22, 1.5, 0.1], 0.009, IRON, 6);
    k.cyl(0.02, 0.016, 0.1, [0.25, 1.49, 0.115], "#2a2c30", [0, 0, 1.2], 12);
    k.sphere(0.028, [0.3, 1.5, 0.12], "#8a8d93", 1, 10);
    return k.build();
  }, []);
  useEffect(
    () => () => {
      geo.dispose();
      micGeo.dispose();
    },
    [geo, micGeo],
  );
  return (
    <>
      <Appear position={stool}>
        <mesh geometry={geo} castShadow>
          <meshStandardMaterial vertexColors roughness={0.55} metalness={0.3} />
        </mesh>
      </Appear>
      <Appear position={mic} rotation={[0, 0.9, 0]}>
        <mesh geometry={micGeo} castShadow>
          <meshStandardMaterial vertexColors roughness={0.4} metalness={0.6} />
        </mesh>
      </Appear>
    </>
  );
}

function Rug({ position }: { position: V3 }) {
  const tex = useMemo(() => rugTexture(), []);
  useEffect(() => () => tex.dispose(), [tex]);
  return (
    <Appear position={position}>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.006, 0]} receiveShadow>
        <circleGeometry args={[0.95, 40]} />
        <meshStandardMaterial map={tex} transparent roughness={0.95} />
      </mesh>
    </Appear>
  );
}

function PosterOnWall({ position, fonts }: { position: V3; fonts: Fonts }) {
  const tex = useMemo(
    () =>
      canvasTexture(400, 560, (ctx, w, h) => {
        ctx.fillStyle = "#efe4cb";
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = "#b3261e";
        ctx.fillRect(0, 0, w, 150);
        ctx.fillStyle = "#f6ead2";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = `64px ${fonts.script}`;
        ctx.fillText("caffe aroma", w / 2, 78);
        ctx.fillStyle = "#1b120d";
        ctx.font = `600 96px ${fonts.display}`;
        ctx.fillText("LIVE", w / 2, 250);
        ctx.fillText("MUSIC", w / 2, 340);
        ctx.fillStyle = "#2f6b3b";
        ctx.fillRect(60, 392, w - 120, 6);
        ctx.fillStyle = "#1b120d";
        ctx.font = `500 26px ${fonts.mono}`;
        ctx.fillText("OPEN MIC · POETRY", w / 2, 448);
        ctx.fillText("ACOUSTIC NIGHTS", w / 2, 486);
      }),
    [fonts],
  );
  useEffect(() => () => tex.dispose(), [tex]);
  return (
    <Appear position={position}>
      <mesh>
        <boxGeometry args={[0.56, 0.78, 0.02]} />
        <meshStandardMaterial color="#2a1a10" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0, 0.0115]}>
        <planeGeometry args={[0.5, 0.72]} />
        <meshStandardMaterial map={tex} roughness={0.8} />
      </mesh>
    </Appear>
  );
}

/** A warm glow behind the mic. A sprite, not a light: no extra per-pixel lighting cost and nothing to recompile. */
function StageGlow({ position }: { position: V3 }) {
  const sprite = useRef<THREE.SpriteMaterial>(null);
  const halo = useMemo(() => haloTexture(), []);
  useEffect(() => () => halo.dispose(), [halo]);
  useFrame(() => {
    if (sprite.current) sprite.current.opacity = getTod().music * 0.55;
  });
  return (
    <sprite position={position} scale={[3.2, 3.2, 1]}>
      <spriteMaterial ref={sprite} map={halo} color="#ff9d4a" transparent depthWrite={false} blending={THREE.AdditiveBlending} opacity={0} toneMapped={false} />
    </sprite>
  );
}

/** Golden hour on the left of the window table: a rug, stool, mic and guitar on a stand, a gig poster and a warm glow. */
export default function MusicCorner() {
  const fonts = useFonts();
  return (
    <group>
      <Rug position={[-1.5, 0, 0.05]} />
      <MicAndStool stool={[-1.85, 0, 0.15]} mic={[-1.2, 0, 0.35]} />
      <GuitarOnStand position={[-1.05, 0, -0.75]} />
      {fonts && <PosterOnWall position={[-1.6, 1.5, -1.47]} fonts={fonts} />}
      <StageGlow position={[-1.45, 1.5, -0.9]} />
    </group>
  );
}
