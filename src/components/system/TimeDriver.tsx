"use client";

import { useEffect } from "react";
import { useTime, syncLiveTime } from "@/store/time";
import { sampleTod } from "@/lib/timeOfDay";

/**
 * Always mounted. Keeps the live Buffalo clock fresh, eases the displayed hour toward the target,
 * and writes the page theme (--night) so the DOM and the 3D scene stay perfectly in sync.
 */
export default function TimeDriver() {
  useEffect(() => {
    syncLiveTime(true);
    const clock = window.setInterval(() => syncLiveTime(false), 30_000);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    let raf = 0;
    let last = performance.now();
    let lastNight = -1;

    const frame = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const { display, target } = useTime.getState();
      const delta = target - display;
      let next = display;
      if (Math.abs(delta) > 0.0005) {
        next = reduce.matches ? target : display + delta * (1 - Math.exp(-dt * 4.2));
        if (Math.abs(target - next) < 0.003) next = target;
        useTime.setState({ display: next });
      }
      const night = sampleTod(next).night;
      if (Math.abs(night - lastNight) > 0.002) {
        lastNight = night;
        document.documentElement.style.setProperty("--night", night.toFixed(3));
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    const onVisibility = () => {
      if (document.hidden) cancelAnimationFrame(raf);
      else {
        last = performance.now();
        raf = requestAnimationFrame(frame);
        syncLiveTime(false);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(clock);
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);
  return null;
}
