"use client";

import { useEffect, useMemo } from "react";
import { Kit } from "./kit";
import { addChair } from "./furnitureGeo";

type V3 = [number, number, number];

interface ChairProps {
  position: V3;
  /** 0 faces +z (toward the viewer); the hoop back is behind the seat. */
  rotationY?: number;
  scale?: number;
  frame?: string;
  seat?: string;
  shadows?: boolean;
}

/** A bistro chair: round seat on four splayed legs with a hoop back, merged into a single mesh. Used at the window table. */
export function BistroChair({ position, rotationY = 0, scale = 1, frame = "#15181a", seat = "#8a5a35", shadows = false }: ChairProps) {
  const geo = useMemo(() => {
    const k = new Kit();
    addChair(k, 0, 0, 0, 1, frame, seat);
    return k.build();
  }, [frame, seat]);
  useEffect(() => () => geo.dispose(), [geo]);
  return (
    <mesh geometry={geo} position={position} rotation-y={rotationY} scale={scale} castShadow={shadows} receiveShadow={shadows}>
      <meshStandardMaterial vertexColors roughness={0.55} metalness={0.3} />
    </mesh>
  );
}
