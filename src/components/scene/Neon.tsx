"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { haloTexture, neonTexture } from "./textures";
import { getTod } from "./tod";
import { WINDOW } from "./Room";

function scriptFamily(): string {
  const raw = getComputedStyle(document.documentElement).getPropertyValue("--font-script").trim();
  return raw || '"Kaushan Script", cursive';
}

/** The cafe's cup-and-script sign, hung in the arch of the window. Unlit tubes by day, glowing after dusk. */
export default function Neon() {
  const [tex, setTex] = useState<{ on: THREE.Texture; off: THREE.Texture } | null>(null);
  const halo = useMemo(() => haloTexture(), []);
  const onMat = useRef<THREE.MeshBasicMaterial>(null);
  const onMatOutside = useRef<THREE.MeshBasicMaterial>(null);
  const haloMat = useRef<THREE.SpriteMaterial>(null);
  const light = useRef<THREE.PointLight>(null);
  const last = useRef<unknown>(null);

  useEffect(() => {
    let cancelled = false;
    const family = scriptFamily();
    document.fonts
      .load(`80px ${family}`)
      .catch(() => undefined)
      .finally(() => {
        if (cancelled) return;
        setTex({ on: neonTexture(family, true), off: neonTexture(family, false) });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => () => halo.dispose(), [halo]);

  useEffect(
    () => () => {
      tex?.on.dispose();
      tex?.off.dispose();
    },
    [tex],
  );

  useFrame(() => {
    const tod = getTod();
    if (tod === last.current) return;
    last.current = tod;
    const n = tod.neon;
    for (const m of [onMat.current, onMatOutside.current]) {
      if (!m) continue;
      m.opacity = Math.min(1, n * 1.15);
      m.color.setScalar(1.0 + n * 0.9);
    }
    if (haloMat.current) haloMat.current.opacity = n * 0.55;
    if (light.current) light.current.intensity = n * 3.2;
  });

  if (!tex) return null;
  const { x, spring, wallFront } = WINDOW;
  const pos: [number, number, number] = [x, spring + 0.43, wallFront - 0.16];
  return (
    <group position={pos}>
      <mesh>
        <planeGeometry args={[1.12, 0.7]} />
        <meshBasicMaterial map={tex.off} transparent toneMapped={false} />
      </mesh>
      <mesh position={[0, 0, 0.004]}>
        <planeGeometry args={[1.12, 0.7]} />
        <meshBasicMaterial ref={onMat} map={tex.on} transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
      {/* the same sign read from the street: turned around so the script isn't mirrored */}
      <mesh position={[0, 0, -0.012]} rotation-y={Math.PI}>
        <planeGeometry args={[1.12, 0.7]} />
        <meshBasicMaterial map={tex.off} transparent toneMapped={false} />
      </mesh>
      <mesh position={[0, 0, -0.016]} rotation-y={Math.PI}>
        <planeGeometry args={[1.12, 0.7]} />
        <meshBasicMaterial ref={onMatOutside} map={tex.on} transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
      <sprite position={[0, 0, -0.02]} scale={[2.6, 1.9, 1]}>
        <spriteMaterial ref={haloMat} map={halo} color="#ff4a2e" transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </sprite>
      <pointLight ref={light} position={[0, -0.1, 0.45]} color="#ff5a3c" intensity={0} distance={5} decay={2} />
    </group>
  );
}
