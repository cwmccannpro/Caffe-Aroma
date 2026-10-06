"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Sparkles } from "@react-three/drei";
import * as THREE from "three";
import { getTod } from "./tod";
import { WINDOW } from "./Room";
import { useQuality } from "./quality";

const SHEETS = 9;
const LENGTH = 5.5;

const vert = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const frag = /* glsl */ `
  precision mediump float;
  varying vec2 vUv;
  uniform vec3 uColor;
  uniform float uAlpha, uTime, uSeed;
  float hash(float n) { return fract(sin(n) * 43758.5453); }
  void main() {
    float along = vUv.x;                      // 0 at the window, 1 deep in the room
    float across = vUv.y;                     // 0 at the sill, 1 at the top of the sheet
    float fadeIn = smoothstep(0.0, 0.06, along);
    float fadeOut = 1.0 - smoothstep(0.35, 1.0, along);
    float edge = smoothstep(0.0, 0.1, across) * (1.0 - smoothstep(0.88, 1.0, across));
    float shimmer = 0.78 + 0.22 * sin(uTime * 0.5 + uSeed * 6.2831 + along * 5.0);
    gl_FragColor = vec4(uColor, uAlpha * fadeIn * fadeOut * edge * shimmer);
  }
`;

/**
 * Sunbeams through the arched window: a fan of additive light sheets along the sun's travel direction
 * (depth-tested, so the table, floor and wall naturally cut them off), plus drifting dust motes.
 */
export default function Shafts() {
  const quality = useQuality((s) => s.quality);
  const { x: wx, sill, spring, r, wallFront } = WINDOW;
  const sheets = useRef<(THREE.Mesh | null)[]>([]);
  const mats = useRef<(THREE.ShaderMaterial | null)[]>([]);
  const dust = useRef<THREE.Group>(null);
  const last = useRef<unknown>(null);

  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(1, 1);
    g.translate(0.5, 0.5, 0); // origin at the bottom-left corner so the matrix basis can shear it
    return g;
  }, []);
  const tmp = useMemo(() => ({ travel: new THREE.Vector3(), up: new THREE.Vector3(0, 1, 0), nrm: new THREE.Vector3(), pos: new THREE.Vector3(), a: new THREE.Vector3(), b: new THREE.Vector3() }), []);
  const uniformSets = useMemo(
    () => Array.from({ length: SHEETS }, (_, i) => ({ uColor: { value: new THREE.Color("#ffe6b8") }, uAlpha: { value: 0 }, uTime: { value: 0 }, uSeed: { value: i / SHEETS } })),
    [],
  );

  useFrame((s) => {
    const tod = getTod();
    uniformSets.forEach((u) => (u.uTime.value = s.clock.elapsedTime));
    if (tod === last.current) return;
    last.current = tod;

    // direction light travels (from the sun, through the window, into the room)
    const el = THREE.MathUtils.degToRad(Math.max(tod.sunElevation, 2));
    const az = THREE.MathUtils.degToRad(tod.sunAzimuth);
    tmp.travel.set(-Math.sin(az) * Math.cos(el), -Math.sin(el), Math.cos(az) * Math.cos(el)).normalize();
    // beams only while the sun is actually up, strongest when it is low and golden
    const sunUp = THREE.MathUtils.smoothstep(tod.sunElevation, 1, 9);
    const golden = 0.6 + 0.4 * (1 - THREE.MathUtils.smoothstep(tod.sunElevation, 10, 45));
    const strength = sunUp * golden * THREE.MathUtils.clamp(tod.sunIntensity / 2.5, 0, 1.2);

    for (let i = 0; i < SHEETS; i++) {
      const m = sheets.current[i];
      const mat = mats.current[i];
      if (!m || !mat) continue;
      const t = (i + 0.5) / SHEETS;
      const x = wx - r * 0.96 + t * r * 1.92;
      const h = Math.max(0.2, spring + Math.sqrt(Math.max(0, r * r - (x - wx) ** 2)) * 0.98 - sill - 0.04);
      tmp.a.copy(tmp.travel).multiplyScalar(LENGTH); // sheet x-axis: along the beam
      tmp.b.set(0, h, 0); // sheet y-axis: up the window
      tmp.nrm.crossVectors(tmp.a, tmp.b).normalize();
      m.matrix.makeBasis(tmp.a, tmp.b, tmp.nrm);
      m.matrix.setPosition(x, sill + 0.03, wallFront - 0.12);
      m.matrixWorldNeedsUpdate = true;
      mat.uniforms.uColor.value.set(tod.sunColor).lerp(new THREE.Color("#fff3d6"), 0.35);
      mat.uniforms.uAlpha.value = strength * 0.075;
      m.visible = strength > 0.01;
    }
    if (dust.current) {
      dust.current.visible = strength > 0.05;
      dust.current.position.set(wx + tmp.travel.x * 1.6, 1.7 + tmp.travel.y * 1.2, wallFront + tmp.travel.z * 1.6);
    }
  });

  const showDust = quality !== "lite";
  return (
    <group>
      {uniformSets.map((u, i) => (
        <mesh
          key={i}
          ref={(m) => {
            sheets.current[i] = m;
            if (m) m.matrixAutoUpdate = false;
          }}
          geometry={geo}
          frustumCulled={false}
          renderOrder={4}
        >
          <shaderMaterial
            ref={(m) => {
              mats.current[i] = m;
            }}
            uniforms={u}
            vertexShader={vert}
            fragmentShader={frag}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
      {showDust && (
        <group ref={dust}>
          <Sparkles count={quality === "high" ? 70 : 40} scale={[2.2, 2.2, 3.2]} size={2.6} speed={0.18} opacity={0.55} color="#ffe9c4" noise={0.6} />
        </group>
      )}
    </group>
  );
}
