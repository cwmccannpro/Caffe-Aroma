import { sampleTod, type TodSample } from "@/lib/timeOfDay";
import { useTime } from "@/store/time";

let cachedHour = Number.NaN;
let cached: TodSample = sampleTod(9);

/**
 * Current eased time-of-day sample for the 3D scene. Identity changes only when the hour changes,
 * so components can do `if (tod !== lastTod) applyToMaterials(tod)` inside useFrame cheaply.
 */
export function getTod(): TodSample {
  const h = useTime.getState().display;
  if (!(Math.abs(h - cachedHour) < 0.0006)) {
    cachedHour = h;
    cached = sampleTod(h);
  }
  return cached;
}

export const easeOutBack = (t: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
