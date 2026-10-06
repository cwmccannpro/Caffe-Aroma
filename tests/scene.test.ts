import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { Kit, at } from "@/components/scene/kit";
import { DOOR, DOOR_OUT, DOOR_WORLD, FACADE_Z, ROOM, RUNS, WALL_T, WINDOW, runMatrix, toWorld, wallShape } from "@/components/scene/wall";
import { FLIGHT, STATIONS } from "@/components/scene/Rig";

describe("merged geometry kit", () => {
  it("merges every kind of primitive the facade, patio and music corner use into one vertex-coloured geometry", () => {
    const k = new Kit();
    k.box([1, 1, 1], [0, 0, 0], "#ff0000");
    k.cyl(0.1, 0.2, 1, [1, 0, 0], "#00ff00");
    k.sphere(0.2, [2, 0, 0], "#0000ff");
    k.rod([0, 0, 0], [0, 2, 0], 0.02, "#ffffff");
    k.add(new THREE.TorusGeometry(0.2, 0.02, 6, 12), "#ffff00");
    k.add(new THREE.PlaneGeometry(1, 1), "#ff00ff");
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(1, 0);
    shape.lineTo(0, 1);
    k.add(new THREE.ExtrudeGeometry(shape, { depth: 0.1, bevelEnabled: false }), "#00ffff");
    const g = k.build();
    const n = g.attributes.position.count;
    expect(n).toBeGreaterThan(100);
    expect(g.attributes.normal.count).toBe(n);
    expect(g.attributes.color.count).toBe(n);
    expect(g.index).toBeNull();
  });

  it("places things relative to a transform and restores it afterwards", () => {
    const k = new Kit();
    k.within(at(5, 0, 0), () => k.box([1, 1, 1], [0, 0, 0], "#ffffff"));
    k.box([1, 1, 1], [0, 10, 0], "#ffffff");
    const g = k.build();
    g.computeBoundingBox();
    expect(g.boundingBox!.max.x).toBeCloseTo(5.5, 5);
    expect(g.boundingBox!.min.x).toBeCloseTo(-0.5, 5);
  });
});

describe("the corner building", () => {
  it("cuts the arch into the Elmwood wall and the door into the corner wall, and nothing else", () => {
    expect(wallShape(6, RUNS.elmwood.x0, RUNS.elmwood.x1, { arch: true }).holes).toHaveLength(1);
    expect(wallShape(6, RUNS.corner.x0, RUNS.corner.x1, { door: true }).holes).toHaveLength(1);
    expect(wallShape(6, RUNS.bidwell.x0, RUNS.bidwell.x1).holes).toHaveLength(0);
  });

  it("is a true 45 degree chamfer joining the Elmwood face (z = -1.8) to the Bidwell face (x = -5.4)", () => {
    const e1 = toWorld(RUNS.corner, RUNS.corner.x1, 0, FACADE_Z);
    const e2 = toWorld(RUNS.corner, RUNS.corner.x0, 0, FACADE_Z);
    expect(e1.z).toBeCloseTo(-1.8, 2); // meets the Elmwood face
    expect(e2.x).toBeCloseTo(-5.4, 2); // meets the Bidwell face
    expect(toWorld(RUNS.elmwood, 5, 0, FACADE_Z).z).toBeCloseTo(-1.8, 5);
    expect(toWorld(RUNS.bidwell, -3, 0, FACADE_Z).x).toBeCloseTo(-5.4, 5);
    // the two ends are the same distance from the corner point, so the cut is symmetric
    const corner = new THREE.Vector3(-5.4, 0, -1.8);
    expect(e1.distanceTo(corner)).toBeCloseTo(e2.distanceTo(corner), 2);
    // each run's local frame faces the street: the outward normal of the corner wall points down and left (-x, -z)
    const out = new THREE.Vector3(0, 0, -1).transformDirection(runMatrix(RUNS.corner));
    expect(out.x).toBeCloseTo(-Math.SQRT1_2, 5);
    expect(out.z).toBeCloseTo(-Math.SQRT1_2, 5);
  });

  it("puts the door in the middle of the chamfer, facing the intersection", () => {
    expect(DOOR_WORLD.x).toBeCloseTo(-4.47, 1);
    expect(DOOR_WORLD.z).toBeCloseTo(-0.87, 1);
    expect(DOOR_OUT.x).toBeLessThan(0);
    expect(DOOR_OUT.z).toBeLessThan(0);
  });

  it("keeps the doorway out of every interior camera frame the story uses", () => {
    // the 9 PM and last-call shots (the widest we use) see the Elmwood wall from about x = -2.3, never the corner
    for (const sx of [-1, 1]) {
      const jamb = toWorld(RUNS.corner, (sx * DOOR.w) / 2, 0, WINDOW.wallFront);
      expect(jamb.x).toBeLessThan(-3.5);
    }
  });

  it("matches the room outline: the inner chamfer meets the Elmwood and Bidwell inner faces", () => {
    const inner = (x: number, z: number) => x + z; // the inner chamfer plane is x + z = const
    const k = inner(ROOM.elmwoodEnd, WINDOW.wallFront);
    expect(inner(ROOM.bidwellX, ROOM.bidwellStartZ)).toBeCloseTo(k, 2);
  });
});

describe("camera flight", () => {
  const corner = runMatrix(RUNS.corner);
  const inv = corner.clone().invert();
  const curve = new THREE.CatmullRomCurve3(FLIGHT.map((s) => new THREE.Vector3(...s.pos)), false, "centripetal");

  it("starts out in the intersection, in front of the corner", () => {
    const p = new THREE.Vector3(...FLIGHT[0].pos);
    expect(p.x).toBeLessThan(-9);
    expect(p.z).toBeLessThan(-6);
    // it is looking at the corner, not at one street
    const t = new THREE.Vector3(...FLIGHT[0].target);
    expect(t.distanceTo(DOOR_WORLD)).toBeLessThan(5);
    expect(FLIGHT[FLIGHT.length - 1]).toBe(STATIONS[6]);
  });

  it("has the door stop exactly halfway, a few metres out along the door's own axis", () => {
    expect(FLIGHT.length % 2).toBe(1);
    const mid = new THREE.Vector3(...FLIGHT[Math.floor(FLIGHT.length / 2)].pos);
    const local = mid.clone().applyMatrix4(inv); // x along the chamfer, z out to the street (more negative = further out)
    expect(Math.abs(local.x)).toBeLessThan(0.5);
    expect(local.z).toBeLessThan(-3.5);
    expect(local.z).toBeGreaterThan(-6);
  });

  it("goes through the wall exactly once, and only through the doorway", () => {
    const wallZ = WINDOW.wallFront - WALL_T / 2; // mid-thickness of the corner wall in its local frame
    const crossings: { u: number; lx: number }[] = [];
    let prev = curve.getPoint(0).applyMatrix4(inv);
    for (let i = 1; i <= 600; i++) {
      const p = curve.getPoint(i / 600).applyMatrix4(inv);
      if ((prev.z - wallZ) * (p.z - wallZ) < 0) crossings.push({ u: i / 600, lx: p.x });
      prev = p;
    }
    expect(crossings).toHaveLength(1);
    expect(Math.abs(crossings[0].lx)).toBeLessThan(DOOR.w / 2 - 0.25);
    // once it has cleared the doorway it stays well inside the room: never back through the chamfer, the Elmwood wall or the Bidwell wall
    let inside = false;
    for (let i = Math.round(crossings[0].u * 600); i <= 600; i++) {
      const p = curve.getPoint(i / 600);
      if (!inside && p.x + p.z > -4.9) inside = true;
      if (!inside) continue;
      expect(p.x + p.z, `inside the chamfer at ${(i / 600).toFixed(2)}`).toBeGreaterThan(-4.9);
      expect(p.z, `past the Elmwood wall at ${(i / 600).toFixed(2)}`).toBeGreaterThan(-1.3);
      expect(p.x, `clear of the Bidwell wall at ${(i / 600).toFixed(2)}`).toBeGreaterThan(ROOM.bidwellX + 0.3);
    }
    expect(inside).toBe(true);
  });
});
