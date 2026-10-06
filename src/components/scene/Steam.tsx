"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useQuality } from "./quality";
import { rng } from "./textures";

const vert = /* glsl */ `
  attribute float aSeed;
  uniform float uTime, uScale, uStrength, uSize;
  varying float vAlpha;
  void main() {
    float t = fract(uTime * 0.16 + aSeed);
    vec3 p = position;
    p.y += t * 0.26;
    float sway = 0.014 + t * 0.03;
    p.x += sin(t * 7.0 + aSeed * 31.0) * sway + sin(uTime * 0.6 + aSeed * 11.0) * 0.004;
    p.z += cos(t * 6.0 + aSeed * 23.0) * sway;
    vAlpha = smoothstep(0.0, 0.14, t) * (1.0 - smoothstep(0.5, 1.0, t)) * uStrength;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = (0.05 + t * 0.15) * uSize * uScale / -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const frag = /* glsl */ `
  precision mediump float;
  varying float vAlpha;
  uniform vec3 uColor;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    float a = smoothstep(0.5, 0.05, d);
    gl_FragColor = vec4(uColor, a * a * vAlpha * 0.42);
  }
`;

/** Soft rising steam: a few dozen GPU point sprites with noise-ish sway. */
export default function Steam({ position = [0, 0, 0] as [number, number, number], strength = 1, color = "#fff6ea", size = 1 }) {
  const quality = useQuality((s) => s.quality);
  const count = quality === "high" ? 46 : quality === "med" ? 34 : 20;
  const mat = useRef<THREE.ShaderMaterial>(null);

  const { geo, uniforms } = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const seed = new Float32Array(count);
    const rand = rng(1995);
    for (let i = 0; i < count; i++) {
      const a = rand() * Math.PI * 2;
      const r = Math.sqrt(rand()) * 0.02;
      pos.set([Math.cos(a) * r, 0, Math.sin(a) * r], i * 3);
      seed[i] = i / count;
    }
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
    return {
      geo: g,
      uniforms: { uTime: { value: 0 }, uScale: { value: 900 }, uStrength: { value: strength }, uSize: { value: size }, uColor: { value: new THREE.Color(color) } },
    };
  }, [count, strength, color, size]);

  useFrame((s) => {
    if (!mat.current) return;
    const u = mat.current.uniforms;
    u.uTime.value = s.clock.elapsedTime;
    u.uScale.value = (s.size.height * s.gl.getPixelRatio()) / (2 * Math.tan(THREE.MathUtils.degToRad((s.camera as THREE.PerspectiveCamera).fov) / 2));
    u.uStrength.value = strength;
  });

  return (
    <points position={position} geometry={geo} frustumCulled={false} renderOrder={5}>
      <shaderMaterial ref={mat} uniforms={uniforms} vertexShader={vert} fragmentShader={frag} transparent depthWrite={false} />
    </points>
  );
}
