// The "6 AM to Midnight" engine.
// One function, sampleTod(hour), is the single source of truth for the 3D scene lighting,
// the sky, which props are on the table, and the page theme.
// Framework-free on purpose so it can be unit-tested.

export const DAY_START = 6;
export const DAY_END = 24;

/** Map any clock hour (0–24) into the cafe's visual day. After-midnight-before-open reads as deep night. */
export function visualHour(clockHour: number): number {
  if (clockHour < DAY_START) return DAY_END; // closed overnight: hold on "last call"
  return Math.min(DAY_END, clockHour);
}

type Hex = string;

interface Stop {
  h: number;
  label: string;
  skyTop: Hex;
  skyMid: Hex;
  skyHorizon: Hex;
  sunColor: Hex;
  sunIntensity: number;
  hemiSky: Hex;
  hemiGround: Hex;
  hemiIntensity: number;
  fog: Hex;
  lamp: number; // interior lamps + candles, 0..1
  neon: number; // neon sign, 0..1
  streetGlow: number; // lit windows / street lamps outside, 0..1
  exposure: number;
}

// Keep colors artistically chosen, then interpolate in linear light between them.
const STOPS: Stop[] = [
  { h: 6, label: "First light", skyTop: "#1b2652", skyMid: "#5a5a96", skyHorizon: "#f4a27c", sunColor: "#ffa56e", sunIntensity: 0.9, hemiSky: "#6a74b8", hemiGround: "#2a1a14", hemiIntensity: 0.5, fog: "#6a5a7e", lamp: 0.85, neon: 0.9, streetGlow: 0.75, exposure: 0.95 },
  { h: 7.5, label: "Morning", skyTop: "#5d8fcf", skyMid: "#9fc4e8", skyHorizon: "#ffdcae", sunColor: "#ffd2a0", sunIntensity: 2.4, hemiSky: "#a9c8ef", hemiGround: "#4a3426", hemiIntensity: 0.75, fog: "#e9d8c4", lamp: 0.3, neon: 0.1, streetGlow: 0.2, exposure: 1.05 },
  { h: 10, label: "Late morning", skyTop: "#6fa8e3", skyMid: "#a8d0f0", skyHorizon: "#e4f1fb", sunColor: "#fff1d8", sunIntensity: 3.0, hemiSky: "#bddaf5", hemiGround: "#5a4434", hemiIntensity: 0.85, fog: "#e4eef7", lamp: 0.05, neon: 0, streetGlow: 0.05, exposure: 1.1 },
  { h: 13, label: "Midday", skyTop: "#5ea3e8", skyMid: "#9ccaf0", skyHorizon: "#e9f4fc", sunColor: "#ffffff", sunIntensity: 3.3, hemiSky: "#c4def7", hemiGround: "#5a4636", hemiIntensity: 0.9, fog: "#e8f1f8", lamp: 0, neon: 0, streetGlow: 0, exposure: 1.1 },
  { h: 16, label: "Afternoon", skyTop: "#6aa0da", skyMid: "#a9c9e6", skyHorizon: "#f6e4c4", sunColor: "#ffe3b3", sunIntensity: 2.9, hemiSky: "#bcd3ee", hemiGround: "#5a4232", hemiIntensity: 0.8, fog: "#efe3cd", lamp: 0.1, neon: 0, streetGlow: 0.05, exposure: 1.05 },
  { h: 18, label: "Golden hour", skyTop: "#4a6aa8", skyMid: "#c58f8a", skyHorizon: "#ffb25e", sunColor: "#ffa850", sunIntensity: 2.7, hemiSky: "#8a98c8", hemiGround: "#4a2e22", hemiIntensity: 0.6, fog: "#d9a77a", lamp: 0.55, neon: 0.35, streetGlow: 0.35, exposure: 1.0 },
  { h: 19.5, label: "Blue hour", skyTop: "#1c2756", skyMid: "#5d4f93", skyHorizon: "#f08a5d", sunColor: "#ff8a4a", sunIntensity: 0.8, hemiSky: "#5560a8", hemiGround: "#251720", hemiIntensity: 0.45, fog: "#5b4b78", lamp: 0.9, neon: 0.85, streetGlow: 0.85, exposure: 0.95 },
  { h: 21, label: "Night", skyTop: "#080c22", skyMid: "#171a3d", skyHorizon: "#33295a", sunColor: "#7a8fe0", sunIntensity: 0.45, hemiSky: "#2a3270", hemiGround: "#150e18", hemiIntensity: 0.32, fog: "#1a1434", lamp: 1, neon: 1, streetGlow: 1, exposure: 0.95 },
  { h: 24, label: "Last call", skyTop: "#05071a", skyMid: "#0e0f2a", skyHorizon: "#221a44", sunColor: "#6578c8", sunIntensity: 0.35, hemiSky: "#222a62", hemiGround: "#100a14", hemiIntensity: 0.28, fog: "#130f2a", lamp: 0.95, neon: 1, streetGlow: 0.9, exposure: 0.92 },
];

// ───────────────────────── color math (linear-light blending) ─────────────────────────
const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toSrgb = (c: number) => (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055);
const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

export function hexToRgb(hex: Hex): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255) as [number, number, number];
}
export function rgbToHex(rgb: [number, number, number]): Hex {
  return `#${rgb.map((v) => Math.round(clamp01(v) * 255).toString(16).padStart(2, "0")).join("")}`;
}
export function mixHex(a: Hex, b: Hex, t: number): Hex {
  const A = hexToRgb(a).map(toLinear);
  const B = hexToRgb(b).map(toLinear);
  return rgbToHex(A.map((v, i) => toSrgb(v + (B[i] - v) * t)) as [number, number, number]);
}
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smoothstep = (e0: number, e1: number, x: number) => {
  const t = clamp01((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};

// ───────────────────────── sampling ─────────────────────────
export interface TodSample {
  hour: number;
  label: string;
  skyTop: Hex;
  skyMid: Hex;
  skyHorizon: Hex;
  sunColor: Hex;
  sunIntensity: number;
  /** degrees above the horizon; negative = below. */
  sunElevation: number;
  /** degrees; -90 = from the left (east), +90 = from the right (west). */
  sunAzimuth: number;
  hemiSky: Hex;
  hemiGround: Hex;
  hemiIntensity: number;
  fog: Hex;
  lamp: number;
  neon: number;
  streetGlow: number;
  exposure: number;
  /** Props on the table: daytime cup vs. evening glassware. Both can be partly visible mid-crossfade. */
  dayProps: number;
  nightProps: number;
  /** The morning croissant. It gives way to the laptop as the morning turns to midday. */
  breakfast: number;
  /** The midday laptop, cleared away by late afternoon. */
  laptop: number;
  /** The glass of red on the right of the table: in by golden hour, there all evening. */
  wine: number;
  /** The live-music corner (guitar, mic, rug and a warm spot) that sets up around golden hour. */
  music: number;
  /** 0 = page uses the light "crema" theme, 1 = dark "ink" theme. */
  night: number;
  /** 0..1 how bright the outside is (for glare, god rays). */
  daylight: number;
}

function sunPosition(hour: number) {
  // Rise ~6:45, set ~19:15. Peaks around 13:00 at ~52°.
  const t = (hour - 6.75) / (19.25 - 6.75);
  const elevation = t >= 0 && t <= 1 ? Math.sin(t * Math.PI) * 52 : -8 * Math.min(1, Math.abs(t < 0 ? t : t - 1) * 4 + 0.15);
  const sunAzimuth = lerp(-42, 42, clamp01(t));
  return { elevation, sunAzimuth };
}

export function sampleTod(clockHour: number): TodSample {
  const hour = Math.min(DAY_END, Math.max(DAY_START, clockHour));
  let i = 0;
  while (i < STOPS.length - 2 && hour >= STOPS[i + 1].h) i++;
  const a = STOPS[i];
  const b = STOPS[i + 1];
  const t = clamp01((hour - a.h) / (b.h - a.h));
  // ease between stops so transitions linger on the stops (more "golden hour", less muddy middle)
  const e = t * t * (3 - 2 * t);
  const { elevation, sunAzimuth } = sunPosition(hour);
  const daylight = smoothstep(6.3, 8.2, hour) * (1 - smoothstep(17.8, 19.6, hour));
  const duskNight = smoothstep(18.5, 18.95, hour);
  const dawnNight = 1 - smoothstep(6.0, 7.3, hour);
  return {
    hour,
    label: t < 0.5 ? a.label : b.label,
    skyTop: mixHex(a.skyTop, b.skyTop, e),
    skyMid: mixHex(a.skyMid, b.skyMid, e),
    skyHorizon: mixHex(a.skyHorizon, b.skyHorizon, e),
    sunColor: mixHex(a.sunColor, b.sunColor, e),
    sunIntensity: lerp(a.sunIntensity, b.sunIntensity, e),
    sunElevation: elevation,
    sunAzimuth,
    hemiSky: mixHex(a.hemiSky, b.hemiSky, e),
    hemiGround: mixHex(a.hemiGround, b.hemiGround, e),
    hemiIntensity: lerp(a.hemiIntensity, b.hemiIntensity, e),
    fog: mixHex(a.fog, b.fog, e),
    lamp: lerp(a.lamp, b.lamp, e),
    neon: lerp(a.neon, b.neon, e),
    streetGlow: lerp(a.streetGlow, b.streetGlow, e),
    exposure: lerp(a.exposure, b.exposure, e),
    // The cup stays put (steaming, beside the book) through golden hour; the coupe and the candle only arrive as it goes,
    // because they take the cup's place. The wine glass has the empty right-hand side of the table to itself.
    dayProps: 1 - smoothstep(18.3, 19.1, hour),
    nightProps: smoothstep(18.5, 19.4, hour),
    wine: smoothstep(17.3, 17.9, hour),
    breakfast: 1 - smoothstep(9.8, 11.4, hour),
    laptop: smoothstep(10.6, 12.2, hour) * (1 - smoothstep(16.0, 16.9, hour)),
    music: smoothstep(16.4, 17.4, hour) * (1 - smoothstep(19.6, 20.6, hour)),
    night: Math.max(duskNight, dawnNight),
    daylight,
  };
}

/** Which named stop is closest. Handy for chapter captions and posters. */
export function nearestStop(hour: number): { h: number; label: string } {
  return STOPS.reduce((best, s) => (Math.abs(s.h - hour) < Math.abs(best.h - hour) ? s : best), STOPS[0]);
}

/** Hours for which a still of the real scene is shipped (public/posters/{ext,tod}-NN.webp: storefront and room). Mirrored in the boot script in layout.tsx. */
export const POSTER_HOURS = [6, 9, 12, 15, 18, 21] as const; // midnight reuses the 9 PM still
export function nearestPosterIndex(hour: number): number {
  let best = 0;
  POSTER_HOURS.forEach((h, i) => {
    if (Math.abs(h - hour) < Math.abs(POSTER_HOURS[best] - hour)) best = i;
  });
  return best;
}
