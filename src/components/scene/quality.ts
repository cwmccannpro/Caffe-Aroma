import { create } from "zustand";

/**
 * high   : bloom, 2048 shadows, DPR up to 2
 * med    : no post-processing, 1024 shadows, DPR up to 1.5
 * lite   : no shadows, fewer steam particles, DPR 1
 * poster : no WebGL at all (static image fallback)
 */
export type Quality = "high" | "med" | "lite" | "poster";
const ORDER: Quality[] = ["poster", "lite", "med", "high"];

interface QualityState {
  quality: Quality;
  ready: boolean;
  set: (q: Quality) => void;
  downgrade: () => void;
  upgrade: () => void;
  init: (q: Quality) => void;
}

export const useQuality = create<QualityState>((set, get) => ({
  quality: "med",
  ready: false,
  set: (quality) => set({ quality }),
  init: (quality) => set({ quality, ready: true }),
  // A slow GPU steps down to the lightest 3D tier, never to the static poster: the poster is only for
  // visitors who can't or shouldn't run WebGL (no support, reduced motion, data saver).
  downgrade: () => {
    const i = ORDER.indexOf(get().quality);
    if (i > ORDER.indexOf("lite")) set({ quality: ORDER[i - 1] });
  },
  upgrade: () => {
    const i = ORDER.indexOf(get().quality);
    if (i < ORDER.length - 1) set({ quality: ORDER[i + 1] });
  },
}));

function hasWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

/** Decide the starting tier. Query overrides: ?q=high|med|lite|poster or ?gl=off. */
export function detectQuality(): Quality {
  const params = new URLSearchParams(window.location.search);
  const forced = params.get("q") as Quality | null;
  if (params.get("gl") === "off") return "poster";
  if (forced && ORDER.includes(forced)) return forced;
  if (!hasWebGL()) return "poster";
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return "poster";

  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean; effectiveType?: string } };
  if (nav.connection?.saveData) return "poster";
  const cores = nav.hardwareConcurrency ?? 4;
  const mem = nav.deviceMemory ?? 4;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const small = Math.min(window.innerWidth, window.innerHeight) < 640;
  if (coarse || small) return cores >= 8 && mem >= 6 ? "med" : "lite";
  if (cores >= 8 && mem >= 8) return "high";
  if (cores <= 2 || mem <= 2) return "lite";
  return "med";
}

// dev handle for debugging tiers from the console
if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") (window as unknown as { __quality: typeof useQuality }).__quality = useQuality;
