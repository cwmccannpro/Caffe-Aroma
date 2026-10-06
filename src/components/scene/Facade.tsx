"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { business } from "@data/business";
import { formatHour } from "@/lib/time";
import { Kit, at, mergePlanes } from "./kit";
import { DOOR, FACADE_Z as ZF, RUNS, WINDOW, runMatrix, toWorld, wallShape, type Run, type RunId } from "./wall";
import { awningTextTexture, brickTextures, chalkboardTexture, disposeAll, glareTexture, hoursBoardTexture, shopfrontTexture } from "./exteriorTextures";
import { haloTexture } from "./textures";
import { useFonts } from "./useFonts";
import { getTod } from "./tod";
import { useQuality } from "./quality";

type V3 = [number, number, number];

const STONE = "#d6c9a8";
const STONE_D = "#b9aa86";
const AWNING = "#2f6e57"; // the sage green of the real awnings
const FRAME = "#1d4d3b";
const IRON = "#16191b";
const BRASS = "#b58f3f";

/** Every awning label shares one aspect ratio, so labels with the same text share one texture and one mesh. */
const LABEL_RATIO = 12;

/** The hours board hangs on the brick above the corner door, where you are looking from the street. */
const BOARD = { y: 4.72, w: 1.05, h: 1.25 };

/** "6 AM - 12 AM", from the one source of truth for hours. */
function boardText() {
  const hs = Object.values(business.hours);
  const first = hs[0];
  const same = hs.every((h) => h.open === first.open && h.close === first.close);
  const open = Math.min(...hs.map((h) => h.open));
  const close = Math.max(...hs.map((h) => h.close));
  return { day: same ? "EVERY DAY" : "OPEN DAILY", hours: `${formatHour(open)} – ${formatHour(close)}` };
}

interface Kits {
  stone: Kit;
  paint: Kit;
  metal: Kit;
  glassLit: Kit;
  glassDark: Kit;
  bulbs: Kit;
}
interface Label {
  run: RunId;
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  text: string;
}
interface Shop {
  run: Run;
  x: number;
  w: number;
  y0: number;
  y1: number;
}
interface Pool {
  pos: V3;
  yaw: number;
  sx: number;
  sz: number;
}
interface Collected {
  labels: Label[];
  lamps: V3[];
  shops: Shop[];
  pools: Pool[];
}

const out = (d: number) => ZF - d / 2;

/** Run `fn` with every kit placed relative to `m`. */
function allWithin(k: Kits, m: THREE.Matrix4, fn: () => void) {
  const list = Object.values(k);
  const go = (i: number) => (i === list.length ? fn() : list[i].within(m, () => go(i + 1)));
  go(0);
}

interface Tone {
  stone: string;
  base: string;
}
const TONE_CAFE: Tone = { stone: STONE, base: STONE_D };
const TONE_NEIGHBOR: Tone = { stone: "#e3d8bd", base: "#c9bb98" };

/** Plinth, belt course, frieze, dentils and cornice along one wall run. `bump` keeps coplanar faces of neighbouring runs from z-fighting. */
function courses(k: Kits, x0: number, x1: number, tone: Tone, bump: number) {
  const len = x1 - x0;
  const cx = (x0 + x1) / 2;
  k.stone.box([len, 0.4, 0.1 + bump], [cx, 0.2, out(0.1 + bump)], tone.base);
  k.stone.box([len, 0.22, 0.12 + bump], [cx, 3.62, out(0.12 + bump)], tone.stone);
  k.stone.box([len, 0.24, 0.05 + bump], [cx, 5.75, out(0.05 + bump)], tone.stone);
  for (let x = x0 + 0.13; x <= x1 - 0.13; x += 0.26) k.stone.box([0.13, 0.13, 0.15 + bump], [x, 5.98, out(0.15 + bump)], tone.stone);
  k.stone.box([len, 0.16, 0.34 + bump], [cx, 6.14, out(0.34 + bump)], tone.stone);
}

function pilaster(k: Kits, x: number, tone: Tone) {
  k.stone.box([0.26, 3.1, 0.1], [x, 1.95, out(0.1)], tone.stone);
  k.stone.box([0.36, 0.18, 0.14], [x, 0.5, out(0.14)], tone.base);
  k.stone.box([0.36, 0.14, 0.14], [x, 3.43, out(0.14)], tone.stone);
}

/** A six-over-six sash window above a storefront bay. Lit ones glow at night. */
function sashWindow(k: Kits, x: number, lit: boolean, tone: Tone) {
  const w = 0.92;
  const h = 1.3;
  const y = 4.67;
  (lit ? k.glassLit : k.glassDark).add(new THREE.PlaneGeometry(w, h), "#2b3b4c", [x, y, ZF - 0.012], [0, Math.PI, 0]);
  const f = 0.07;
  k.stone.box([w + 2 * f, f, 0.1], [x, y + h / 2 + f / 2, out(0.1)], tone.stone);
  k.stone.box([f, h, 0.1], [x - w / 2 - f / 2, y, out(0.1)], tone.stone);
  k.stone.box([f, h, 0.1], [x + w / 2 + f / 2, y, out(0.1)], tone.stone);
  // muntins: three columns, and two rows in each sash around the meeting rail
  for (const dy of [0, h / 4, -h / 4]) k.stone.box([w, 0.035, 0.06], [x, y + dy, out(0.06)], "#e8dcc0");
  for (const dx of [-w / 6, w / 6]) k.stone.box([0.03, h, 0.06], [x + dx, y, out(0.06)], "#e8dcc0");
  k.stone.box([w + 0.32, 0.08, 0.22], [x, y - h / 2 - 0.075, out(0.22)], tone.stone);
  k.stone.box([w + 0.3, 0.18, 0.14], [x, y + h / 2 + 0.16, out(0.14)], tone.stone);
}

function awning(k: Kits, c: Collected, run: Run, x: number, w: number, topY: number, drop: number, proj: number, text: string) {
  const L = Math.hypot(proj, drop);
  const th = Math.atan2(drop, proj);
  k.paint.box([w, 0.045, L], [x, topY - drop / 2, ZF - proj / 2], AWNING, [-th, 0, 0]);
  for (let i = -1; i <= 1; i++) k.paint.box([0.025, 0.02, L + 0.02], [x + i * (w / 2 - 0.2), topY - drop / 2 + 0.03, ZF - proj / 2], BRASS, [-th, 0, 0]);
  k.paint.box([w, 0.26, 0.05], [x, topY - drop - 0.11, ZF - proj - 0.005], AWNING);
  for (const s of [-1, 1]) k.metal.rod([x + s * (w / 2 - 0.06), topY - drop - 0.02, ZF - proj + 0.03], [x + s * (w / 2 - 0.06), topY + 0.25, ZF], 0.012, IRON);
  c.labels.push({ run: run.id, x, y: topY - drop - 0.11, z: ZF - proj - 0.034, w: w - 0.18, h: 0.2, text });
}

function lamp(k: Kits, c: Collected, run: Run, x: number, y: number) {
  k.metal.rod([x, y, ZF], [x, y + 0.13, ZF - 0.2], 0.016, IRON);
  k.metal.rod([x, y + 0.13, ZF - 0.2], [x, y + 0.02, ZF - 0.4], 0.016, IRON);
  k.metal.cyl(0.05, 0.05, 0.03, [x, y, ZF - 0.015], IRON, [Math.PI / 2, 0, 0], 12);
  k.metal.cyl(0.03, 0.12, 0.1, [x, y - 0.03, ZF - 0.41], IRON, undefined, 14);
  k.bulbs.sphere(0.04, [x, y - 0.095, ZF - 0.41], "#ffffff", 1, 8);
  const p = toWorld(run, x, y - 0.14, ZF - 0.41);
  c.lamps.push([p.x, p.y, p.z]);
}

/** A storefront bay: big green-framed glass over a bulkhead panel, a sage awning with lettering, and gooseneck lamps. */
function shopBay(k: Kits, c: Collected, run: Run, x: number, w: number, label: string) {
  const y0 = 0.72;
  const y1 = 2.52;
  const cy = (y0 + y1) / 2;
  k.paint.box([w + 0.22, 0.1, 0.09], [x, y1 + 0.05, out(0.09)], FRAME);
  k.paint.box([w + 0.22, 0.1, 0.09], [x, y0 - 0.05, out(0.09)], FRAME);
  k.paint.box([0.1, y1 - y0 + 0.2, 0.09], [x - w / 2 - 0.05, cy, out(0.09)], FRAME);
  k.paint.box([0.1, y1 - y0 + 0.2, 0.09], [x + w / 2 + 0.05, cy, out(0.09)], FRAME);
  const cols = w > 2.2 ? 3 : 2;
  for (let i = 1; i < cols; i++) k.paint.box([0.06, y1 - y0, 0.07], [x - w / 2 + (i * w) / cols, cy, out(0.07)], FRAME);
  k.paint.box([w, 0.06, 0.07], [x, 2.0, out(0.07)], FRAME);
  k.paint.box([w + 0.22, 0.3, 0.07], [x, 0.545, out(0.07)], FRAME);
  awning(k, c, run, x, w + 0.5, 3.05, 0.46, 0.9, label);
  lamp(k, c, run, x - w * 0.3, 3.28);
  lamp(k, c, run, x + w * 0.3, 3.28);
  c.shops.push({ run, x, w, y0, y1 });
  const p = toWorld(run, x, 0, ZF - 1.3);
  c.pools.push({ pos: [p.x, 0.03, p.z], yaw: run.yaw, sx: w + 1.6, sz: 2.4 });
}

/** The arched window on Elmwood: limestone surround, keystone and sill. The window itself is cut through the wall. */
function archBay(k: Kits) {
  const { x: wx, sill, spring, r } = WINDOW;
  const t = 0.2;
  const ring = new THREE.Shape();
  ring.moveTo(wx - r - t, sill - 0.12);
  ring.lineTo(wx + r + t, sill - 0.12);
  ring.lineTo(wx + r + t, spring);
  ring.absarc(wx, spring, r + t, 0, Math.PI, false);
  ring.lineTo(wx - r - t, sill - 0.12);
  const hole = new THREE.Path();
  hole.moveTo(wx - r, sill);
  hole.lineTo(wx + r, sill);
  hole.lineTo(wx + r, spring);
  hole.absarc(wx, spring, r, 0, Math.PI, false);
  hole.lineTo(wx - r, sill);
  ring.holes.push(hole);
  k.stone.add(new THREE.ExtrudeGeometry(ring, { depth: 0.08, bevelEnabled: false, curveSegments: 36 }), STONE, [0, 0, ZF - 0.08]);
  k.stone.box([0.28, 0.3, 0.12], [wx, spring + r + 0.12, out(0.12)], STONE_D);
  k.stone.box([2 * (r + t) + 0.2, 0.08, 0.26], [wx, sill - 0.08, out(0.26)], STONE);
}

/** The front door: green frame and limestone lintel, a pair of glass doors swung open into the room, and brass pulls. */
function cornerDoor(k: Kits, c: Collected, run: Run) {
  const dw = DOOR.w;
  k.paint.box([0.12, DOOR.h + 0.1, 0.12], [-dw / 2 - 0.05, (DOOR.h + 0.1) / 2, out(0.12)], FRAME);
  k.paint.box([0.12, DOOR.h + 0.1, 0.12], [dw / 2 + 0.05, (DOOR.h + 0.1) / 2, out(0.12)], FRAME);
  k.paint.box([dw + 0.22, 0.14, 0.12], [0, DOOR.h + 0.07, out(0.12)], FRAME);
  k.stone.box([dw + 0.5, 0.16, 0.14], [0, DOOR.h + 0.24, out(0.14)], STONE);
  const wl = dw / 2 - 0.04;
  const phi = 1.25;
  for (const side of [-1, 1]) {
    const m = side < 0 ? at(-dw / 2 + 0.03, 0, -1.62, -phi) : at(dw / 2 - 0.03, 0, -1.62, Math.PI + phi);
    allWithin(k, m, () => {
      k.paint.box([0.09, 2.28, 0.05], [0.045, 1.14, 0], FRAME);
      k.paint.box([0.09, 2.28, 0.05], [wl - 0.045, 1.14, 0], FRAME);
      k.paint.box([wl, 0.1, 0.05], [wl / 2, 2.23, 0], FRAME);
      k.paint.box([wl, 0.32, 0.05], [wl / 2, 0.16, 0], FRAME);
      k.paint.box([wl, 0.07, 0.05], [wl / 2, 1.0, 0], FRAME);
      k.glassDark.add(new THREE.PlaneGeometry(wl - 0.14, 1.12), "#2b3b4c", [wl / 2, 1.6, 0]);
      for (const z of [-0.05, 0.05]) k.metal.box([0.025, 0.4, 0.03], [wl - 0.12, 1.02, z], BRASS);
    });
  }
  awning(k, c, run, 0, 1.95, 3.0, 0.4, 0.8, "VINO · BEER · COFFEE");
  lamp(k, c, run, -0.72, 3.22);
  lamp(k, c, run, 0.72, 3.22);
  const p = toWorld(run, 0, 0, ZF - 1.4);
  c.pools.push({ pos: [p.x, 0.03, p.z], yaw: run.yaw, sx: 3.4, sz: 3.2 });
}

/** Everything static on the street faces, merged into a few vertex-coloured meshes. */
function buildFacade() {
  const k: Kits = { stone: new Kit(), paint: new Kit(), metal: new Kit(), glassLit: new Kit(), glassDark: new Kit(), bulbs: new Kit() };
  const c: Collected = { labels: [], lamps: [], shops: [], pools: [] };

  // ── Elmwood: a storefront bay, the arched window, a second bay, then the side-by-side shops
  const E = RUNS.elmwood;
  allWithin(k, runMatrix(E), () => {
    courses(k, E.x0, E.x1, TONE_CAFE, 0);
    for (const px of [-0.8, 1.95, 5.35, 8.15]) pilaster(k, px, TONE_CAFE);
    archBay(k);
    shopBay(k, c, E, -1.95, 1.9, "CAFFE AROMA");
    shopBay(k, c, E, 3.7, 2.7, "CAFFE AROMA");
    shopBay(k, c, E, 6.75, 2.0, "CAFFE AROMA");
    [-1.95, 0.5, 3.7, 6.75].forEach((x, i) => sashWindow(k, x, i % 2 === 0, TONE_CAFE));
  });

  // ── the chamfered corner: the door, its awning, and blank brick above for the hours board
  const C = RUNS.corner;
  allWithin(k, runMatrix(C), () => {
    courses(k, C.x0, C.x1, TONE_CAFE, 0.004);
    cornerDoor(k, c, C);
  });

  // ── Bidwell: more storefront bays, with their own patio in front
  const B = RUNS.bidwell;
  allWithin(k, runMatrix(B), () => {
    courses(k, B.x0, B.x1, TONE_CAFE, 0.008);
    for (const px of [-3.475, -6.925, -10.375, -14.0]) pilaster(k, px, TONE_CAFE);
    const bays = [-1.75, -5.2, -8.65, -12.1];
    bays.forEach((x, i) => {
      shopBay(k, c, B, x, 2.3, "VINO · BEER · COFFEE");
      sashWindow(k, x, i % 2 === 1, TONE_CAFE);
    });
  });

  // ── corner piers: octagonal limestone columns where the three faces meet, so there is never a visible seam
  for (const [x, z] of [
    [-3.8, -1.8],
    [-5.4, -0.2],
  ]) {
    k.stone.cyl(0.3, 0.34, 5.65, [x, 3.225, z], STONE, undefined, 8);
    k.stone.cyl(0.38, 0.38, 0.22, [x, 0.5, z], STONE_D, undefined, 8);
    k.stone.cyl(0.38, 0.38, 0.16, [x, 3.55, z], STONE, undefined, 8);
  }

  // ── the next-door building (Talking Leaves Books): a taller, paler brick face with its own windows
  allWithin(k, new THREE.Matrix4(), () => {
    courses(k, 8.4, 34, TONE_NEIGHBOR, 0.012);
    for (let x = 11; x < 34; x += 3.4) {
      pilaster(k, x - 1.7, TONE_NEIGHBOR);
      k.paint.box([2.6, 0.12, 0.09], [x, 2.6, out(0.09)], "#2c2a26");
      k.paint.box([2.6, 0.12, 0.09], [x, 0.72, out(0.09)], "#2c2a26");
      k.glassDark.add(new THREE.PlaneGeometry(2.5, 1.8), "#2f3b45", [x, 1.66, ZF - 0.012], [0, Math.PI, 0]);
      sashWindow(k, x, Math.round(x) % 2 === 0, TONE_NEIGHBOR);
    }
  });

  const yawPi = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);
  const byText = new Map<string, { matrix: THREE.Matrix4; w: number; h: number }[]>();
  for (const a of c.labels) {
    const matrix = runMatrix(RUNS[a.run]).multiply(new THREE.Matrix4().compose(new THREE.Vector3(a.x, a.y, a.z), yawPi, new THREE.Vector3(1, 1, 1)));
    const list = byText.get(a.text) ?? [];
    list.push({ matrix, w: a.w, h: a.w / LABEL_RATIO });
    byText.set(a.text, list);
  }
  const labelGeos: Record<string, THREE.BufferGeometry> = {};
  byText.forEach((items, text) => (labelGeos[text] = mergePlanes(items)));

  const lampPoints = new THREE.BufferGeometry();
  lampPoints.setAttribute("position", new THREE.Float32BufferAttribute(c.lamps.flat(), 3));
  const flat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);

  return {
    labelGeos,
    lampPoints,
    poolGeo: mergePlanes(
      c.pools.map((p) => ({
        matrix: new THREE.Matrix4().compose(new THREE.Vector3(...p.pos), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), p.yaw).multiply(flat), new THREE.Vector3(1, 1, 1)),
        w: p.sx,
        h: p.sz,
      })),
    ),
    stone: k.stone.build(),
    paint: k.paint.build(),
    metal: k.metal.build(),
    glassLit: k.glassLit.build(),
    glassDark: k.glassDark.build(),
    bulbs: k.bulbs.build(),
    shopGlass: mergePlanes(
      c.shops.map((s) => ({
        matrix: runMatrix(s.run).multiply(new THREE.Matrix4().compose(new THREE.Vector3(s.x, (s.y0 + s.y1) / 2, ZF - 0.012), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI), new THREE.Vector3(1, 1, 1))),
        w: s.w,
        h: s.y1 - s.y0,
      })),
    ),
    meta: c,
  };
}

/** The Elmwood and Bidwell storefronts, the chamfered corner entrance, the open glass doors and the hours board, seen from the sidewalks. */
export default function Facade() {
  const quality = useQuality((s) => s.quality);
  const detail = quality !== "lite";
  const fonts = useFonts();

  const skins = useMemo(
    () => ({
      elmwood: new THREE.ExtrudeGeometry(wallShape(6.1, RUNS.elmwood.x0, RUNS.elmwood.x1, { arch: true }), { depth: 0.05, bevelEnabled: false, curveSegments: 32 }),
      corner: new THREE.ExtrudeGeometry(wallShape(6.1, RUNS.corner.x0, RUNS.corner.x1, { door: true }), { depth: 0.05, bevelEnabled: false }),
      bidwell: new THREE.ExtrudeGeometry(wallShape(6.1, RUNS.bidwell.x0, RUNS.bidwell.x1), { depth: 0.05, bevelEnabled: false }),
      neighbor: new THREE.ExtrudeGeometry(wallShape(6.1, 8.4, 34), { depth: 0.05, bevelEnabled: false }),
    }),
    [],
  );
  const brick = useMemo(() => brickTextures(detail), [detail]);
  const g = useMemo(() => buildFacade(), []);
  const halo = useMemo(() => haloTexture(), []);
  const shopTex = useMemo(() => shopfrontTexture(), []);
  const glare = useMemo(() => glareTexture(), []);
  const archGlass = useMemo(() => {
    const { x, sill, spring, r } = WINDOW;
    const s = new THREE.Shape();
    s.moveTo(x - r, sill);
    s.lineTo(x + r, sill);
    s.lineTo(x + r, spring);
    s.absarc(x, spring, r, 0, Math.PI, false);
    s.lineTo(x - r, sill);
    return new THREE.ShapeGeometry(s, 32);
  }, []);

  const signs = useMemo(() => {
    if (!fonts) return null;
    const txt = boardText();
    return {
      labels: Object.fromEntries(Object.keys(g.labelGeos).map((text) => [text, awningTextTexture(text, fonts, LABEL_RATIO)])) as Record<string, THREE.Texture>,
      board: hoursBoardTexture(fonts, false, txt.day, txt.hours, "COFFEE · WINE · LIVE MUSIC"),
      boardLit: hoursBoardTexture(fonts, true, txt.day, txt.hours, "COFFEE · WINE · LIVE MUSIC"),
      chalk: chalkboardTexture(fonts, [
        { text: "caffe aroma", size: 78, font: "script" },
        { text: "ESPRESSO · WINE · BEER", size: 30, font: "mono" },
        { text: "Patio seats open", size: 62 },
        { text: "Live music nights", size: 62 },
        { text: "ORDER AHEAD ONLINE", size: 30, font: "mono" },
      ]),
    };
  }, [fonts, g]);

  const skinMat = useMemo(
    () => new THREE.MeshStandardMaterial({ map: brick.map, bumpMap: brick.bump ?? undefined, bumpScale: 1.6, roughness: 0.92, emissive: new THREE.Color("#ff9a5a"), emissiveMap: brick.map, emissiveIntensity: 0 }),
    [brick],
  );
  const neighborMat = useMemo(() => {
    const m = skinMat.clone();
    m.color = new THREE.Color("#ecd9b8");
    return m;
  }, [skinMat]);
  const litMat = useRef<THREE.MeshStandardMaterial>(null);
  const shopMat = useRef<THREE.MeshStandardMaterial>(null);
  const glareMat = useRef<THREE.MeshBasicMaterial>(null);
  const boardLitMat = useRef<THREE.MeshBasicMaterial>(null);
  const bulbMat = useMemo(() => new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }), []);
  const haloMat = useMemo(() => new THREE.PointsMaterial({ map: halo, color: "#ffbd6a", size: 0.95, sizeAttenuation: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0, toneMapped: false }), [halo]);
  const poolMat = useMemo(() => new THREE.MeshBasicMaterial({ map: halo, color: "#ffb25e", transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0, toneMapped: false }), [halo]);
  const last = useRef<unknown>(null);

  useFrame(() => {
    const tod = getTod();
    if (tod === last.current) return;
    last.current = tod;
    const glow = tod.streetGlow;
    skinMat.emissiveIntensity = glow * 0.18;
    neighborMat.emissiveIntensity = glow * 0.18;
    if (litMat.current) litMat.current.emissiveIntensity = 0.08 + glow * 1.7;
    if (shopMat.current) shopMat.current.emissiveIntensity = 0.1 + glow * 1.5;
    if (glareMat.current) glareMat.current.opacity = 0.05 + tod.daylight * 0.32;
    if (boardLitMat.current) boardLitMat.current.opacity = tod.neon;
    bulbMat.color.setScalar(0.25 + tod.lamp * 1.8);
    haloMat.opacity = tod.lamp * 0.85;
    poolMat.opacity = tod.lamp * 0.55;
  });

  useEffect(
    () => () => {
      Object.values(skins).forEach((s) => s.dispose());
      Object.values(g.labelGeos).forEach((l) => l.dispose());
      archGlass.dispose();
      Object.values(g).forEach((v) => v instanceof THREE.BufferGeometry && v.dispose());
      disposeAll(brick.map, brick.bump, halo, shopTex, glare);
      skinMat.dispose();
      neighborMat.dispose();
      bulbMat.dispose();
      haloMat.dispose();
      poolMat.dispose();
    },
    [skins, archGlass, g, brick, halo, shopTex, glare, skinMat, neighborMat, bulbMat, haloMat, poolMat],
  );
  useEffect(
    () => () => {
      if (!signs) return;
      disposeAll(...Object.values(signs.labels), signs.board, signs.boardLit, signs.chalk);
    },
    [signs],
  );

  const runs = Object.values(RUNS);
  return (
    <group>
      {/* brick skins over the plaster walls, with the arch and the door cut through */}
      {runs.map((run) => (
        <group key={run.id} position={run.pos} rotation-y={run.yaw}>
          <mesh geometry={skins[run.id]} position={[0, 0, ZF]} material={skinMat} />
        </group>
      ))}
      <mesh geometry={skins.neighbor} position={[0, 0, ZF]} material={neighborMat} />

      <mesh geometry={g.stone}>
        <meshStandardMaterial vertexColors roughness={0.82} />
      </mesh>
      <mesh geometry={g.paint}>
        <meshStandardMaterial vertexColors roughness={0.5} />
      </mesh>
      <mesh geometry={g.metal}>
        <meshStandardMaterial vertexColors roughness={0.4} metalness={0.65} />
      </mesh>
      <mesh geometry={g.glassLit}>
        <meshStandardMaterial ref={litMat} vertexColors side={THREE.DoubleSide} roughness={0.12} metalness={0.7} envMapIntensity={1.2} emissive="#ffcf86" emissiveIntensity={0} />
      </mesh>
      <mesh geometry={g.glassDark}>
        <meshStandardMaterial vertexColors side={THREE.DoubleSide} roughness={0.12} metalness={0.7} envMapIntensity={1.2} />
      </mesh>
      <mesh geometry={g.bulbs} material={bulbMat} />
      <points geometry={g.lampPoints} material={haloMat} frustumCulled={false} />
      {/* warm pools on the paving in front of each shop window and the open door */}
      <mesh geometry={g.poolGeo} material={poolMat} frustumCulled={false} />

      {/* every storefront window: shelves and cups behind glass (one merged mesh, one texture) */}
      <mesh geometry={g.shopGlass}>
        <meshStandardMaterial ref={shopMat} map={shopTex} emissiveMap={shopTex} emissive="#ffffff" emissiveIntensity={0.1} roughness={0.2} metalness={0.2} side={THREE.DoubleSide} />
      </mesh>

      {/* glass in the arch, street side only, so the room still reads clearly from inside */}
      <mesh geometry={archGlass} position={[0, 0, -1.69]} rotation-y={Math.PI} renderOrder={6}>
        <meshBasicMaterial ref={glareMat} map={glare} transparent opacity={0.3} depthWrite={false} toneMapped={false} />
      </mesh>

      {signs && (
        <>
          {Object.entries(g.labelGeos).map(([text, geo]) => (
            <mesh key={text} geometry={geo} frustumCulled={false}>
              <meshStandardMaterial map={signs.labels[text]} transparent roughness={0.7} depthWrite={false} />
            </mesh>
          ))}
          {/* the hours board, above the corner door */}
          <group position={RUNS.corner.pos} rotation-y={RUNS.corner.yaw}>
            <group position={[0, BOARD.y, ZF - 0.052]} rotation-y={Math.PI}>
              <mesh position={[0, 0, -0.03]}>
                <boxGeometry args={[BOARD.w + 0.06, BOARD.h + 0.06, 0.05]} />
                <meshStandardMaterial color={FRAME} roughness={0.5} />
              </mesh>
              <mesh>
                <planeGeometry args={[BOARD.w, BOARD.h]} />
                <meshStandardMaterial map={signs.board} roughness={0.55} />
              </mesh>
              <mesh position={[0, 0, 0.004]}>
                <planeGeometry args={[BOARD.w, BOARD.h]} />
                <meshBasicMaterial ref={boardLitMat} map={signs.boardLit} transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
              </mesh>
            </group>
          </group>
          {/* A-frame chalkboard on the sidewalk at the corner, turned to face the intersection */}
          <group position={[-6.5, 0, -2.5]} rotation-y={Math.PI / 4 + 0.22}>
            <group position={[0, 0.51, -0.14]} rotation-x={0.29}>
              <mesh rotation-y={Math.PI}>
                <planeGeometry args={[0.62, 0.95]} />
                <meshStandardMaterial map={signs.chalk} roughness={0.85} />
              </mesh>
            </group>
            <group position={[0, 0.51, 0.14]} rotation-x={-0.29}>
              <mesh>
                <planeGeometry args={[0.62, 0.95]} />
                <meshStandardMaterial map={signs.chalk} roughness={0.85} />
              </mesh>
            </group>
            <mesh position={[0, 0.98, 0]} rotation-z={Math.PI / 2}>
              <cylinderGeometry args={[0.018, 0.018, 0.66, 8]} />
              <meshStandardMaterial color="#6b4328" roughness={0.7} />
            </mesh>
          </group>
        </>
      )}
    </group>
  );
}
