import { create } from "zustand";
import { visualHour } from "@/lib/timeOfDay";
import { zonedNow } from "@/lib/time";

/**
 * Which hour of the cafe's day is on screen.
 *   target  = what the visitor asked for (manual scrub > scroll story > real Buffalo time)
 *   display = the eased value the 3D scene and page theme actually render
 */
interface TimeState {
  live: number;
  scrub: number | null;
  story: number | null;
  target: number;
  display: number;
  /** Camera station index the 3D scene should frame once the visitor is inside. */
  station: number;
  /** 0 = out on the Elmwood sidewalk (hero), 1 = seated inside. Driven by scroll; the camera follows a path between. */
  flight: number;
  setLive: (clockHour: number) => void;
  setScrub: (h: number | null) => void;
  setStory: (h: number | null) => void;
  setDisplay: (h: number) => void;
  setStation: (n: number) => void;
  setFlight: (f: number) => void;
}

const pick = (scrub: number | null, story: number | null, live: number) => scrub ?? story ?? live;

// Server render uses a neutral morning so markup is deterministic; the client corrects on mount.
const INITIAL = 9;

export const useTime = create<TimeState>((set, get) => ({
  live: INITIAL,
  scrub: null,
  story: null,
  target: INITIAL,
  display: INITIAL,
  station: 0,
  flight: 0,
  setLive: (clockHour) => {
    const live = visualHour(clockHour);
    const { scrub, story } = get();
    set({ live, target: pick(scrub, story, live) });
  },
  setScrub: (scrub) => {
    const { story, live } = get();
    set({ scrub, target: pick(scrub, story, live) });
  },
  setStory: (story) => {
    const { scrub, live } = get();
    set({ story, target: pick(scrub, story, live) });
  },
  setDisplay: (display) => set({ display }),
  setStation: (station) => set({ station }),
  setFlight: (flight) => set({ flight }),
}));

/** Read the real Buffalo clock into the store (and snap the display there on first call). */
export function syncLiveTime(snap = false) {
  const { hour } = zonedNow();
  const s = useTime.getState();
  s.setLive(hour);
  if (snap) useTime.setState({ display: useTime.getState().target });
}

// dev handle for scripts (poster capture) and the console
if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") (window as unknown as { __time: typeof useTime }).__time = useTime;
