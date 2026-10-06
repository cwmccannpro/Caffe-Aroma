"use client";

import { lazy, Suspense, useRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";
import type { Group } from "three";
import { useTime } from "@/store/time";
import Sky from "./Sky";
import Street from "./Street";
import Room from "./Room";
import Facade from "./Facade";
import Table from "./Table";
import Neon from "./Neon";
import Shafts from "./Shafts";
import Patio from "./Patio";
import MusicCorner from "./MusicCorner";
import { Pothos, RubberPlant } from "./Foliage";
import { BistroChair } from "./Furniture";
import Lighting from "./Lighting";
import Rig from "./Rig";
import { useQuality } from "./quality";

// post-processing is only worth its download on the top tier, so it loads after the scene is already on screen
const Effects = lazy(() => import("./Effects"));

/**
 * Small interior details that nobody can make out from the street: skipped (not drawn at all) until the camera has started
 * its flight in. Nothing in here carries a light, so showing it never changes the shader set.
 */
function NearOnly({ children, from = 0.2 }: { children: ReactNode; from?: number }) {
  const g = useRef<Group>(null);
  // the dev ?cam= override (poster capture, framing work) always wants the whole room
  const forced = typeof window !== "undefined" && process.env.NODE_ENV !== "production" && new URLSearchParams(window.location.search).has("cam");
  useFrame(() => {
    if (g.current) g.current.visible = forced || useTime.getState().flight > from;
  });
  return (
    <group ref={g} visible={false}>
      {children}
    </group>
  );
}

/**
 * "Caffe Aroma": the brick corner building where Elmwood meets Bidwell, with its patios on both streets, and one corner
 * table by an arched window inside, lit by the time of day. The camera flies from one to the other as you scroll.
 */
export default function WindowSeatScene() {
  const quality = useQuality((s) => s.quality);
  const shadows = quality === "high" || quality === "med";
  return (
    <>
      <PerformanceMonitor flipflops={2} onDecline={() => useQuality.getState().downgrade()} />
      <Lighting />
      <Sky />
      <Street />
      <Patio />
      <Facade />
      <Room />
      <Table />
      <NearOnly>
        {/* two chairs pulled up to the window table, turned in toward each other */}
        <BistroChair position={[-0.3, 0, 0.2]} rotationY={Math.PI / 2 - 0.18} scale={1.3} frame="#2b1b12" seat="#6b4328" shadows={shadows} />
        <BistroChair position={[1.3, 0, -0.25]} rotationY={-Math.PI / 2 + 0.3} scale={1.3} frame="#2b1b12" seat="#6b4328" shadows={shadows} />
        {/* green things inside: a rubber plant by the window wall and a pothos trailing off the sill */}
        <RubberPlant position={[2.35, 0, -1.15]} scale={1.1} />
        <Pothos position={[0.15, 0.84, -1.4]} />
        <MusicCorner />
        <Shafts />
      </NearOnly>
      <Neon />
      <Rig />
      {quality === "high" && (
        <Suspense fallback={null}>
          <Effects />
        </Suspense>
      )}
    </>
  );
}
