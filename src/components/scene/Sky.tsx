"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { getTod } from "./tod";

const vert = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const frag = /* glsl */ `
  precision highp float;
  varying vec3 vDir;
  uniform vec3 uTop, uMid, uHorizon, uSunColor, uSunDir;
  uniform float uTime, uSunStrength, uDaylight, uNight;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
  }
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
    return v;
  }

  void main() {
    vec3 d = normalize(vDir);
    float h = d.y;
    float t = clamp(h, 0.0, 1.0);
    vec3 col = mix(uHorizon, uMid, smoothstep(0.0, 0.28, t));
    col = mix(col, uTop, smoothstep(0.18, 0.85, t));
    col = mix(col, uHorizon * 0.55, smoothstep(0.0, -0.25, h));

    // sun / moon glow
    float sd = max(dot(d, normalize(uSunDir)), 0.0);
    col += uSunColor * (pow(sd, 900.0) * 6.0 + pow(sd, 40.0) * 0.55 + pow(sd, 6.0) * 0.18) * uSunStrength;

    // clouds, drifting slowly
    if (h > 0.015) {
      vec2 uv = d.xz / (h + 0.22) * 1.1 + vec2(uTime * 0.008, uTime * 0.003);
      float c = fbm(uv * 1.3);
      c = smoothstep(0.5, 0.82, c);
      float edge = smoothstep(0.015, 0.2, h);
      vec3 lit = mix(uSunColor * 0.9 + vec3(0.25), uMid, 0.35);
      vec3 shade = mix(uMid, uTop, 0.5) * 0.75;
      vec3 cloud = mix(shade, lit, 0.55 + 0.45 * pow(sd, 3.0));
      col = mix(col, cloud, c * edge * mix(0.35, 0.7, uDaylight));
    }

    // stars
    float night = (1.0 - uDaylight) * smoothstep(0.02, 0.35, h);
    vec2 sp = d.xz / (h + 0.4) * 90.0;
    float star = step(0.9965, hash(floor(sp)));
    float tw = 0.6 + 0.4 * sin(uTime * 2.0 + hash(floor(sp)) * 40.0);
    col += vec3(1.0, 0.95, 0.85) * star * tw * night * 0.9;

    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export default function Sky() {
  const mat = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(
    () => ({
      uTop: { value: new THREE.Color() },
      uMid: { value: new THREE.Color() },
      uHorizon: { value: new THREE.Color() },
      uSunColor: { value: new THREE.Color() },
      uSunDir: { value: new THREE.Vector3(0, 1, -1) },
      uTime: { value: 0 },
      uSunStrength: { value: 1 },
      uDaylight: { value: 1 },
      uNight: { value: 0 },
    }),
    [],
  );
  const last = useRef<unknown>(null);

  useFrame((s) => {
    const u = mat.current?.uniforms;
    if (!u) return;
    u.uTime.value = s.clock.elapsedTime;
    const tod = getTod();
    if (tod === last.current) return;
    last.current = tod;
    u.uTop.value.set(tod.skyTop);
    u.uMid.value.set(tod.skyMid);
    u.uHorizon.value.set(tod.skyHorizon);
    u.uSunColor.value.set(tod.sunColor);
    const el = THREE.MathUtils.degToRad(Math.max(tod.sunElevation, -4));
    const az = THREE.MathUtils.degToRad(tod.sunAzimuth);
    // The sun sits out beyond the window (negative z), travelling left to right.
    u.uSunDir.value.set(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el));
    u.uSunStrength.value = THREE.MathUtils.clamp(tod.sunIntensity / 2.6, 0.2, 1.3) * THREE.MathUtils.smoothstep(tod.sunElevation, -6, 4);
    u.uDaylight.value = tod.daylight;
    u.uNight.value = tod.night;
  });

  return (
    <mesh renderOrder={-10} frustumCulled={false}>
      <sphereGeometry args={[60, 48, 32]} />
      <shaderMaterial ref={mat} uniforms={uniforms} vertexShader={vert} fragmentShader={frag} side={THREE.BackSide} depthWrite={false} fog={false} />
    </mesh>
  );
}
