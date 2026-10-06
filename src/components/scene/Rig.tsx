"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useTime } from "@/store/time";

interface Station {
  pos: [number, number, number];
  target: [number, number, number];
  fov: number;
  /** On a phone the copy sits below the scene, so the subject should be centred: world x to centre on. */
  portraitX?: number;
}

/** Camera stations for the story once you are inside. */
export const STATIONS: Station[] = [
  { pos: [1.75, 1.78, 3.55], target: [0.5, 1.4, -1.2], fov: 44 }, // 0: wide interior, window + table
  { pos: [1.05, 1.34, 1.75], target: [0.55, 0.98, 0.0], fov: 34 }, // 1: table close-up
  { pos: [0.4, 1.9, 2.4], target: [0.45, 2.15, -1.5], fov: 42 }, // 2: looking up at the neon arch
  { pos: [2.2, 1.5, 1.6], target: [-0.2, 1.7, -1.5], fov: 44 }, // 3: sweeping across the wall and sconces
  // Mirrored framings so the subject always sits opposite the story copy.
  { pos: [1.75, 1.78, 3.55], target: [1.5, 1.4, -1.2], fov: 44, portraitX: 0.6 }, // 4: wide, subject on the left (copy on the right)
  { pos: [1.05, 1.5, 2.35], target: [1.06, 1.0, 0.0], fov: 36, portraitX: 0.5 }, // 5: table close-up, subject on the left
  { pos: [-0.05, 1.5, 2.35], target: [-0.06, 1.0, 0.0], fov: 36, portraitX: 0.5 }, // 6: table close-up, subject on the right
  { pos: [0.5, 1.5, 3.25], target: [0.8, 1.05, -0.2], fov: 46, portraitX: 0.0 }, // 7: golden hour, the music corner and the table on the left
];

/**
 * The opening move: stand out in the intersection looking straight at the corner of Elmwood and Bidwell (both patios in
 * view), glide in along the diagonal to the corner door, step through it and settle at the window table. Control points
 * are evenly spaced in the path parameter, so the door stop is exactly halfway ("Come on in"), and the last point is
 * the 6 AM close-up (STATIONS[6]).
 */
export const FLIGHT: Station[] = [
  { pos: [-11.9, 2.0, -8.7], target: [-3.6, 2.6, -1.6], fov: 48 }, // 0: the corner, both streets and both patios
  { pos: [-8.7, 1.75, -5.5], target: [-4.3, 1.8, -1.0], fov: 46 }, // 1: gliding in along the diagonal
  { pos: [-6.8, 1.6, -3.2], target: [-3.7, 1.45, -0.1], fov: 50 }, // 2: at the door, looking in
  { pos: [-3.6, 1.6, 0.0], target: [-0.9, 1.25, 1.8], fov: 54 }, // 3: through the doorway
  STATIONS[6], // 4: seated at the window table
];

const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));
const sstep = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

export default function Rig() {
  const { camera, size } = useThree();
  const cam = camera as THREE.PerspectiveCamera;
  const tmpPos = useMemo(() => new THREE.Vector3(), []);
  const tmpTarget = useMemo(() => new THREE.Vector3(), []);
  const tmpFov = useMemo(() => new THREE.Vector3(), []);
  const lookAt = useMemo(() => new THREE.Vector3(), []);
  const flown = useRef(0); // the flight position the camera is actually at (chases the scroll position)
  const curves = useMemo(
    () => ({
      pos: new THREE.CatmullRomCurve3(FLIGHT.map((s) => new THREE.Vector3(...s.pos)), false, "centripetal"),
      target: new THREE.CatmullRomCurve3(FLIGHT.map((s) => new THREE.Vector3(...s.target)), false, "centripetal"),
      fov: new THREE.CatmullRomCurve3(FLIGHT.map((s) => new THREE.Vector3(s.fov, 0, 0)), false, "catmullrom"),
    }),
    [],
  );
  const reduce = useMemo(() => (typeof window !== "undefined" ? window.matchMedia("(prefers-reduced-motion: reduce)").matches : false), []);
  // Dev-only framing override: ?cam=px,py,pz,tx,ty,tz,fov
  const debugStation = useMemo<Station | null>(() => {
    if (process.env.NODE_ENV === "production" || typeof window === "undefined") return null;
    const raw = new URLSearchParams(window.location.search).get("cam");
    const n = raw?.split(",").map(Number);
    if (!n || n.length < 7 || n.some(Number.isNaN)) return null;
    return { pos: [n[0], n[1], n[2]], target: [n[3], n[4], n[5]], fov: n[6] };
  }, []);

  useEffect(() => {
    const s = FLIGHT[0];
    cam.position.set(...s.pos);
    lookAt.set(...s.target);
    cam.lookAt(lookAt);
  }, [cam, lookAt]);

  useFrame((state, dt) => {
    const store = useTime.getState();
    const aspect = size.width / size.height;
    // Portrait screens: push the camera back and widen the lens so the whole scene fits.
    const portrait = THREE.MathUtils.clamp((1 - aspect) / 0.6, 0, 1);

    // chase the scroll position so a jump (an anchor link, the Home key) still travels the path instead of cutting through walls
    flown.current += (store.flight - flown.current) * (1 - Math.exp(-dt * (reduce ? 60 : 4.5)));
    if (Math.abs(store.flight - flown.current) < 0.0004) flown.current = store.flight;
    const u = clamp(flown.current, 0, 1);
    const flying = !debugStation && u < 0.9995;

    let fovTarget: number;
    let rate: number;
    if (debugStation) {
      tmpPos.set(...debugStation.pos);
      tmpTarget.set(...debugStation.target);
      fovTarget = debugStation.fov;
      rate = 2.4;
    } else if (flying) {
      curves.pos.getPoint(u, tmpPos);
      curves.target.getPoint(u, tmpTarget);
      curves.fov.getPoint(u, tmpFov);
      fovTarget = tmpFov.x;
      rate = 9;
    } else {
      const st = STATIONS[Math.min(store.station, STATIONS.length - 1)];
      tmpPos.set(...st.pos);
      tmpTarget.set(...st.target);
      fovTarget = st.fov;
      rate = 2.4;
    }

    // Phones: centre the subject (the copy is below the scene, not beside it), and on the street view tilt down and pull
    // back so both patios fit the narrow frame.
    let shiftX = 0;
    const centre = sstep(0.05, 0.35, portrait); // fully on for any phone- or tablet-portrait screen, off for landscape
    const street = flying ? portrait * (1 - sstep(0.05, 0.3, u)) : 0;
    if (!debugStation) {
      if (flying) shiftX = centre * sstep(0.8, 1, u) * ((STATIONS[6].portraitX ?? 0.5) - tmpTarget.x);
      else {
        const st = STATIONS[Math.min(store.station, STATIONS.length - 1)];
        shiftX = st.portraitX === undefined ? 0 : centre * (st.portraitX - tmpTarget.x);
      }
      tmpTarget.y -= street * 0.7;
      tmpPos.y += street * 0.25;
    }
    tmpTarget.x += shiftX;
    tmpPos.x += shiftX;

    // The pull-back is eased off around the doorway, or a phone's camera would slide past the opening and into the wall.
    const door = flying ? sstep(0.3, 0.45, u) * (1 - sstep(0.72, 0.86, u)) : 0;
    const back = 1 + portrait * 0.55 * (1 - door) + street * 0.5;
    tmpPos.sub(tmpTarget).multiplyScalar(back).add(tmpTarget);

    const t = state.clock.elapsedTime;
    const px = reduce ? 0 : state.pointer.x;
    const py = reduce ? 0 : state.pointer.y;
    const calm = 1 - door; // no parallax while threading the door
    tmpPos.x += (px * 0.16 + (reduce ? 0 : Math.sin(t * 0.17) * 0.05)) * calm;
    tmpPos.y += (py * 0.07 + (reduce ? 0 : Math.sin(t * 0.13) * 0.02)) * calm;

    const k = 1 - Math.exp(-dt * rate);
    cam.position.lerp(tmpPos, k);
    lookAt.lerp(tmpTarget, k);
    cam.lookAt(lookAt);
    const fov = fovTarget * (1 + portrait * 0.35);
    cam.fov += (fov - cam.fov) * k;
    cam.updateProjectionMatrix();
  });
  return null;
}
