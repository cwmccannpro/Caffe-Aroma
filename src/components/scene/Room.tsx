"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { beadboardTexture, haloTexture, plasterTexture, tileTexture } from "./textures";
import { getTod } from "./tod";
import { useQuality } from "./quality";
import { DOOR, ROOM, RUNS, WALL_T, WINDOW, wallShape, type Run } from "./wall";

/** A wall run's local frame (see wall.ts): children are placed in the run's own x-along / z-out coordinates. */
function RunFrame({ run, children }: { run: Run; children: React.ReactNode }) {
  return (
    <group position={run.pos} rotation-y={run.yaw}>
      {children}
    </group>
  );
}

/** Chair rail and baseboard pieces per wall run, in each run's local x. The corner's pieces stop short of the doorway. */
const TRIMS: Record<keyof typeof RUNS, [number, number][]> = {
  elmwood: [[-3.7, 8]],
  corner: [
    [-1.0, -DOOR.w / 2],
    [DOOR.w / 2, 1.0],
  ],
  bidwell: [[-14.5, 0.07]],
};

const GLASS_OFF = new THREE.Color("#d8ccb6");
const PENDANT_ON = new THREE.Color("#ffcf8a").multiplyScalar(1.35);
const SCONCE_OFF = new THREE.Color("#9a8560");
const SCONCE_ON = new THREE.Color("#ffc070").multiplyScalar(1.3);

export { WINDOW };

export default function Room() {
  const quality = useQuality((s) => s.quality);
  const { x: wx, sill, spring, r, wallFront } = WINDOW;

  // the plaster walls: the arched window is cut through the Elmwood wall, the front door through the corner wall
  const slabs = useMemo(
    () => ({
      elmwood: new THREE.ExtrudeGeometry(wallShape(4.6, RUNS.elmwood.x0, RUNS.elmwood.x1, { arch: true }), { depth: WALL_T, bevelEnabled: false, curveSegments: 40 }),
      corner: new THREE.ExtrudeGeometry(wallShape(4.6, RUNS.corner.x0, RUNS.corner.x1, { door: true }), { depth: WALL_T, bevelEnabled: false }),
      bidwell: new THREE.ExtrudeGeometry(wallShape(4.6, RUNS.bidwell.x0, RUNS.bidwell.x1), { depth: WALL_T, bevelEnabled: false }),
    }),
    [],
  );

  const trimGeo = useMemo(() => {
    const t = 0.11;
    const outer = new THREE.Shape();
    outer.moveTo(wx - r - t, sill - 0.02);
    outer.lineTo(wx + r + t, sill - 0.02);
    outer.lineTo(wx + r + t, spring);
    outer.absarc(wx, spring, r + t, 0, Math.PI, false);
    outer.lineTo(wx - r - t, sill - 0.02);
    const hole = new THREE.Path();
    hole.moveTo(wx - r, sill);
    hole.lineTo(wx + r, sill);
    hole.lineTo(wx + r, spring);
    hole.absarc(wx, spring, r, 0, Math.PI, false);
    hole.lineTo(wx - r, sill);
    outer.holes.push(hole);
    return new THREE.ExtrudeGeometry(outer, { depth: 0.07, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 2, curveSegments: 40 });
  }, [wx, r, sill, spring]);

  // wainscot outlines (a ShapeGeometry's UVs are metres, so the texture repeat is per metre); the corner's has a notch for the door
  const wainscot = useMemo(() => {
    const rect = (a: number, b: number, notch = false) => {
      const sh = new THREE.Shape();
      sh.moveTo(a, 0);
      if (notch) {
        sh.lineTo(-DOOR.w / 2, 0);
        sh.lineTo(-DOOR.w / 2, sill);
        sh.lineTo(DOOR.w / 2, sill);
        sh.lineTo(DOOR.w / 2, 0);
      }
      sh.lineTo(b, 0);
      sh.lineTo(b, sill);
      sh.lineTo(a, sill);
      sh.lineTo(a, 0);
      return new THREE.ShapeGeometry(sh);
    };
    return { elmwood: rect(-3.7, 8), corner: rect(-1.0, 1.0, true), bidwell: rect(-14.5, 0.07) };
  }, [sill]);

  // the floor and ceiling follow the room's outline, with the corner cut off for the chamfer
  const outline = useMemo(
    () => [
      [ROOM.elmwoodEnd, -1.5],
      [ROOM.rightX, -1.5],
      [ROOM.rightX, ROOM.backZ],
      [ROOM.bidwellX, ROOM.backZ],
      [ROOM.bidwellX, ROOM.bidwellStartZ],
    ],
    [],
  );
  const floorGeo = useMemo(() => {
    const sh = new THREE.Shape(outline.map(([x, z]) => new THREE.Vector2(x, -z)));
    const g = new THREE.ShapeGeometry(sh);
    // keep the tile pattern exactly where it was when this was a 16 m square
    const pos = g.attributes.position;
    const uv = g.attributes.uv;
    for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) + 8) / 16, (ROOM.backZ + pos.getY(i)) / 16);
    return g;
  }, [outline]);
  const ceilingGeo = useMemo(() => new THREE.ShapeGeometry(new THREE.Shape(outline.map(([x, z]) => new THREE.Vector2(x, z)))), [outline]);
  const plaster = useMemo(() => plasterTexture(), []);
  const bead = useMemo(() => {
    const t = beadboardTexture();
    t.repeat.set(7 / 16, 1 / sill);
    return t;
  }, [sill]);
  const tile = useMemo(() => tileTexture(), []);
  const halo = useMemo(() => haloTexture(), []);
  // the rest of the room, so the doorway opens onto a real interior: back wall, side walls and a ceiling
  const shellMat = useMemo(() => {
    const t = plaster.clone();
    t.repeat.set(26, 2.2);
    t.needsUpdate = true;
    return new THREE.MeshStandardMaterial({ map: t, color: "#ffffff", roughness: 0.96, emissive: new THREE.Color("#7a2a1e"), emissiveMap: t, emissiveIntensity: 0, side: THREE.FrontSide });
  }, [plaster]);
  // one plaster material for all three street-side walls
  const plasterMat = useMemo(() => new THREE.MeshStandardMaterial({ map: plaster, roughness: 0.96, color: "#ffffff", emissive: new THREE.Color("#7a2a1e"), emissiveMap: plaster, emissiveIntensity: 0 }), [plaster]);

  useEffect(
    () => () => {
      shellMat.map?.dispose();
      shellMat.dispose();
      plasterMat.dispose();
      Object.values(slabs).forEach((g) => g.dispose());
      Object.values(wainscot).forEach((g) => g.dispose());
      floorGeo.dispose();
      ceilingGeo.dispose();
      trimGeo.dispose();
      plaster.dispose();
      bead.dispose();
      tile.dispose();
      halo.dispose();
    },
    [shellMat, plasterMat, slabs, wainscot, floorGeo, ceilingGeo, trimGeo, plaster, bead, tile, halo],
  );

  // lamps react to time of day
  const pendantLight = useRef<THREE.PointLight>(null);
  const pendantGlow = useRef<THREE.MeshBasicMaterial>(null);
  const pendantHalo = useRef<THREE.SpriteMaterial>(null);
  const sconceLights = useRef<(THREE.PointLight | null)[]>([]);
  const sconceGlow = useRef<(THREE.MeshBasicMaterial | null)[]>([]);
  const last = useRef<unknown>(null);
  const beadMat = useRef<THREE.MeshStandardMaterial>(null);
  const floorMat = useRef<THREE.MeshStandardMaterial>(null);

  useFrame(() => {
    const tod = getTod();
    if (tod === last.current) return;
    last.current = tod;
    const lamp = tod.lamp;
    // daylight spills into the room: lift the dark interior surfaces so daytime feels airy, not moody
    plasterMat.emissiveIntensity = tod.daylight * 0.55;
    shellMat.emissiveIntensity = tod.daylight * 0.55;
    if (beadMat.current) beadMat.current.emissiveIntensity = tod.daylight * 0.45;
    if (floorMat.current) floorMat.current.emissiveIntensity = tod.daylight * 0.35;
    if (pendantLight.current) pendantLight.current.intensity = 0.2 + lamp * 7.5;
    if (pendantGlow.current) pendantGlow.current.color.copy(GLASS_OFF).lerp(PENDANT_ON, lamp);
    if (pendantHalo.current) pendantHalo.current.opacity = 0.1 + lamp * 0.7;
    sconceLights.current.forEach((l) => l && (l.intensity = 0.1 + lamp * 3.6));
    sconceGlow.current.forEach((m) => m && m.color.copy(SCONCE_OFF).lerp(SCONCE_ON, lamp));
  });

  const green = "#1b3a29";
  const brass = "#b08a3c";
  const shadows = quality === "high" || quality === "med";

  return (
    <group>
      {/* Plaster walls: the arched window on Elmwood, the front door in the chamfered corner, and the Bidwell wall */}
      {(Object.keys(RUNS) as (keyof typeof RUNS)[]).map((id) => (
        <RunFrame key={id} run={RUNS[id]}>
          <mesh geometry={slabs[id]} material={plasterMat} position={[0, 0, wallFront - WALL_T]} castShadow={shadows} receiveShadow />
          {/* Green beadboard wainscot, chair rail and baseboard */}
          <mesh geometry={wainscot[id]} position={[0, 0, wallFront + 0.004]} receiveShadow>
            <meshStandardMaterial ref={id === "elmwood" ? beadMat : undefined} map={bead} roughness={0.55} emissive="#2a5a3c" emissiveMap={bead} emissiveIntensity={0} />
          </mesh>
          {TRIMS[id].map(([a, b]) => (
            <group key={a} position={[(a + b) / 2, 0, wallFront]}>
              <mesh position={[0, sill + 0.015, 0.03]} castShadow={shadows} receiveShadow>
                <boxGeometry args={[b - a, 0.05, 0.07]} />
                <meshStandardMaterial color="#274d37" roughness={0.45} />
              </mesh>
              <mesh position={[0, 0.07, 0.02]} receiveShadow>
                <boxGeometry args={[b - a, 0.14, 0.04]} />
                <meshStandardMaterial color="#274d37" roughness={0.5} />
              </mesh>
            </group>
          ))}
        </RunFrame>
      ))}

      <RunFrame run={RUNS.elmwood}>
        {/* Window trim */}
        <mesh geometry={trimGeo} position={[0, 0, wallFront]} castShadow={shadows} receiveShadow>
          <meshStandardMaterial color={green} roughness={0.5} metalness={0.05} />
        </mesh>
        {/* Marble sill */}
        <mesh position={[wx, sill - 0.035, wallFront + 0.12]} castShadow={shadows} receiveShadow>
          <boxGeometry args={[r * 2 + 0.34, 0.05, 0.34]} />
          <meshStandardMaterial color="#d9d2c6" roughness={0.28} />
        </mesh>

        {/* Mullions set into the opening */}
        <group position={[0, 0, wallFront - 0.12]}>
          <mesh position={[wx, (sill + spring) / 2, 0]} castShadow={shadows}>
            <boxGeometry args={[0.035, spring - sill, 0.05]} />
            <meshStandardMaterial color={green} roughness={0.5} />
          </mesh>
          <mesh position={[wx, 1.55, 0]} castShadow={shadows}>
            <boxGeometry args={[r * 2, 0.035, 0.05]} />
            <meshStandardMaterial color={green} roughness={0.5} />
          </mesh>
          <mesh position={[wx, spring, 0]} castShadow={shadows}>
            <boxGeometry args={[r * 2, 0.04, 0.05]} />
            <meshStandardMaterial color={green} roughness={0.5} />
          </mesh>
          {/* the lunette stays open so the neon sign can hang there; just a thin arched astragal */}
          <mesh position={[wx, spring, 0]} castShadow={shadows}>
            <torusGeometry args={[r * 0.97, 0.014, 8, 64, Math.PI]} />
            <meshStandardMaterial color={green} roughness={0.5} />
          </mesh>
        </group>
      </RunFrame>

      {/* brass threshold in the corner doorway */}
      <RunFrame run={RUNS.corner}>
        <mesh position={[0, 0.006, wallFront - 0.12]}>
          <boxGeometry args={[DOOR.w, 0.012, WALL_T + 0.1]} />
          <meshStandardMaterial color={brass} metalness={0.8} roughness={0.35} />
        </mesh>
      </RunFrame>

      {/* back wall, right wall and ceiling: never seen from the window table, but the doorway opens onto them */}
      <mesh material={shellMat} position={[(ROOM.bidwellX + ROOM.rightX) / 2, 2.3, ROOM.backZ]} rotation-y={Math.PI}>
        <planeGeometry args={[ROOM.rightX - ROOM.bidwellX, 4.6]} />
      </mesh>
      <mesh material={shellMat} position={[ROOM.rightX, 2.3, 6.5]} rotation-y={-Math.PI / 2}>
        <planeGeometry args={[16, 4.6]} />
      </mesh>
      <mesh geometry={ceilingGeo} position={[0, 4.6, 0]} rotation-x={Math.PI / 2}>
        <meshStandardMaterial color="#3a1713" roughness={0.97} />
      </mesh>

      {/* Tile floor */}
      <mesh geometry={floorGeo} rotation-x={-Math.PI / 2} receiveShadow>
        <meshStandardMaterial ref={floorMat} map={tile} roughness={0.35} metalness={0.0} emissive="#b8a888" emissiveMap={tile} emissiveIntensity={0} />
      </mesh>

      {/* Pendant lamp over the table */}
      <group position={[1.6, 1.72, 0.1]}>
        <mesh position={[0, 1.5, 0]}>
          <cylinderGeometry args={[0.006, 0.006, 3.0, 6]} />
          <meshBasicMaterial color="#0c0a09" />
        </mesh>
        <mesh position={[0, 0.13, 0]}>
          <cylinderGeometry args={[0.03, 0.06, 0.08, 20]} />
          <meshStandardMaterial color={brass} metalness={0.9} roughness={0.28} />
        </mesh>
        <mesh>
          <sphereGeometry args={[0.075, 28, 20]} />
          <meshBasicMaterial ref={pendantGlow} color="#ffd9a0" toneMapped={false} />
        </mesh>
        <sprite scale={[1.0, 1.0, 1]}>
          <spriteMaterial ref={pendantHalo} map={halo} color="#ffbd6a" transparent depthWrite={false} blending={THREE.AdditiveBlending} opacity={0.2} toneMapped={false} />
        </sprite>
        <pointLight ref={pendantLight} color="#ffc57d" intensity={0.5} distance={5} decay={2} position={[0, -0.15, 0]} />
      </group>

      {/* Brass sconces on the wall, left of the window */}
      {[-0.95, -2.25].map((x, i) => (
        <group key={i} position={[x, 1.85, wallFront + 0.02]}>
          <mesh position={[0, 0, 0.04]} rotation-x={Math.PI / 2}>
            <cylinderGeometry args={[0.035, 0.035, 0.08, 16]} />
            <meshStandardMaterial color={brass} metalness={0.9} roughness={0.3} />
          </mesh>
          <mesh position={[0, 0, 0.14]} rotation-x={Math.PI / 2}>
            <cylinderGeometry args={[0.012, 0.012, 0.2, 8]} />
            <meshStandardMaterial color={brass} metalness={0.9} roughness={0.3} />
          </mesh>
          <mesh position={[0, 0.08, 0.25]}>
            <sphereGeometry args={[0.065, 18, 14]} />
            <meshBasicMaterial
              ref={(m) => {
                sconceGlow.current[i] = m;
              }}
              color="#ffc47a"
              toneMapped={false}
            />
          </mesh>
          <sprite position={[0, 0.08, 0.25]} scale={[0.9, 0.9, 1]}>
            <spriteMaterial map={halo} color="#ffb361" transparent depthWrite={false} blending={THREE.AdditiveBlending} opacity={0.35} toneMapped={false} />
          </sprite>
          <pointLight
            ref={(l) => {
              sconceLights.current[i] = l;
            }}
            color="#ffb56a"
            intensity={0.5}
            distance={3.2}
            decay={2}
            position={[0, 0.1, 0.35]}
          />
        </group>
      ))}
    </group>
  );
}
