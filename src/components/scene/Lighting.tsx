"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import * as THREE from "three";
import { getTod } from "./tod";
import { useQuality } from "./quality";

const TARGET = new THREE.Vector3(0.5, 0.9, -0.2);
const MOON_DIR = new THREE.Vector3(0.35, 0.55, -0.75).normalize();

/** Sun (or moon) streaming through the window, hemisphere fill and fog, all driven by the time of day. */
export default function Lighting() {
  const sun = useRef<THREE.DirectionalLight>(null);
  const hemi = useRef<THREE.HemisphereLight>(null);
  const { scene, gl } = useThree();
  const quality = useQuality((s) => s.quality);
  const last = useRef<unknown>(null);
  const dir = useMemo(() => new THREE.Vector3(), []);
  const shadows = quality === "high" || quality === "med";

  useEffect(() => {
    scene.fog = new THREE.Fog("#1a1434", 14, 60);
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    return () => {
      scene.fog = null;
    };
  }, [scene, gl]);

  useEffect(() => {
    if (sun.current) {
      sun.current.target.position.copy(TARGET);
      scene.add(sun.current.target);
    }
    const t = sun.current?.target;
    return () => {
      if (t) scene.remove(t);
    };
  }, [scene]);

  useFrame(() => {
    const tod = getTod();
    if (tod === last.current) return;
    last.current = tod;
    const s = sun.current;
    const h = hemi.current;
    if (!s || !h) return;

    const el = THREE.MathUtils.degToRad(Math.max(tod.sunElevation, 1.5));
    const az = THREE.MathUtils.degToRad(tod.sunAzimuth);
    dir.set(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el));
    // after sunset hand the key light to a cool moon
    const toMoon = THREE.MathUtils.smoothstep(tod.hour, 19.0, 20.4);
    dir.lerp(MOON_DIR, toMoon).normalize();
    s.position.copy(TARGET).addScaledVector(dir, 10);
    s.color.set(tod.sunColor);
    s.intensity = tod.sunIntensity * (1 - toMoon * 0.0);

    h.color.set(tod.hemiSky);
    h.groundColor.set(tod.hemiGround);
    h.intensity = tod.hemiIntensity * (1.0 + tod.daylight * 1.3);

    gl.toneMappingExposure = tod.exposure;
    (scene.fog as THREE.Fog).color.set(tod.fog);
    scene.environmentIntensity = 0.2 + tod.daylight * 0.85 + tod.lamp * 0.25;
  });

  return (
    <>
      <directionalLight
        ref={sun}
        castShadow={shadows}
        shadow-mapSize={quality === "high" ? [2048, 2048] : [1024, 1024]}
        shadow-camera-left={-2.6}
        shadow-camera-right={2.6}
        shadow-camera-top={2.6}
        shadow-camera-bottom={-2.6}
        shadow-camera-near={0.5}
        shadow-camera-far={24}
        shadow-bias={-0.0005}
        shadow-normalBias={0.025}
        shadow-radius={4}
      />
      <hemisphereLight ref={hemi} />
      {/* a procedural studio so ceramic, brass and glass have something to reflect (no HDR download) */}
      <Environment resolution={128} frames={1} background={false}>
        <Lightformer form="rect" intensity={5} position={[0.5, 2.2, -4]} scale={[3.2, 4.2, 1]} color="#fff6e8" />
        <Lightformer form="rect" intensity={1.4} position={[0, 4.5, 0]} rotation-x={Math.PI / 2} scale={[8, 8, 1]} color="#ffeccc" />
        <Lightformer form="rect" intensity={1.2} position={[-5, 1.6, 0]} rotation-y={Math.PI / 2} scale={[5, 3, 1]} color="#ffb47a" />
        <Lightformer form="circle" intensity={3} position={[0.4, 2.2, 1.0]} scale={1.4} color="#ffd9a0" />
        <Lightformer form="rect" intensity={0.6} position={[4, 1.5, 2]} rotation-y={-Math.PI / 2} scale={[5, 3, 1]} color="#aeb8ff" />
      </Environment>
    </>
  );
}
