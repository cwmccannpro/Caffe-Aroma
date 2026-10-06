import * as THREE from "three";
import { Kit, at } from "./kit";

/**
 * A bistro chair added to a Kit: round seat on four splayed legs with a hoop back. `yaw` 0 faces +z (PI faces -z, PI/2 faces +x).
 * Shared by the patio (dozens of them in one mesh) and the two chairs at the window table.
 */
export function addChair(k: Kit, x: number, z: number, yaw: number, s = 1.12, frame = "#15181a", seat = "#6b4328") {
  k.within(at(x, 0, z, yaw, s), () => {
    k.cyl(0.19, 0.19, 0.035, [0, 0.45, 0], seat, undefined, 20);
    k.add(new THREE.TorusGeometry(0.185, 0.008, 6, 24), frame, [0, 0.425, 0], [Math.PI / 2, 0, 0]);
    for (const [lx, lz] of [[0.13, 0.13], [-0.13, 0.13], [0.13, -0.13], [-0.13, -0.13]]) k.rod([lx * 1.2, 0, lz * 1.2], [lx * 0.95, 0.44, lz * 0.95], 0.011, frame, 5);
    k.add(new THREE.TorusGeometry(0.185, 0.011, 6, 20, Math.PI * 0.8), frame, [0, 0.72, 0], [Math.PI / 2, 0, Math.PI * 1.1]);
    for (const lx of [-0.13, 0, 0.13]) k.cyl(0.008, 0.008, 0.26, [lx, 0.6, -0.14 + Math.abs(lx) * 0.25], frame, undefined, 5);
  });
}
