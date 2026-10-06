"use client";

import { useEffect } from "react";
import { useTime } from "@/store/time";
import { nearestPosterIndex } from "@/lib/timeOfDay";

/**
 * A still of the real 3D scene at the nearest time of day. Shown while the 3D loads, when WebGL is unavailable,
 * and for reduced-motion / data-saver visitors. Outside (the hero) it is the storefront; once the story has carried
 * you through the door it is the room. The dial still works: it swaps to the matching still.
 */
export default function PosterFallback() {
  useEffect(() => {
    let raf = 0;
    let lastIndex = -1;
    let lastScene = "";
    const root = document.documentElement;
    const loop = () => {
      const s = useTime.getState();
      const i = nearestPosterIndex(s.display);
      if (i !== lastIndex) {
        lastIndex = i;
        root.setAttribute("data-poster", String(i));
      }
      const scene = s.flight < 0.75 ? "ext" : "int";
      if (scene !== lastScene) {
        lastScene = scene;
        root.setAttribute("data-scene", scene);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  return <div className="poster-bg" />;
}
