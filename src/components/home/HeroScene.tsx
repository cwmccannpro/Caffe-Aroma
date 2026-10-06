"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

// The 3D chunk (three, R3F, drei) is split out and never runs on the server.
const SceneCanvas = dynamic(() => import("@/components/scene/SceneCanvas"), {
  ssr: false,
  loading: () => <div className="poster-bg" />,
});

/**
 * Paints the storefront still first, then pulls in the 3D scene once the page has loaded and the browser is idle, so the
 * big WebGL download never competes with the first paint, the fonts or the hero still.
 */
export default function HeroScene({ className = "" }: { className?: string }) {
  const [go, setGo] = useState(false);
  useEffect(() => {
    let idle = 0;
    let timer = 0;
    const start = () => setGo(true);
    const arm = () => {
      if (typeof window.requestIdleCallback === "function") idle = window.requestIdleCallback(start, { timeout: 1500 });
      else timer = window.setTimeout(start, 300);
    };
    if (document.readyState === "complete") arm();
    else window.addEventListener("load", arm, { once: true });
    return () => {
      window.removeEventListener("load", arm);
      if (idle && typeof window.cancelIdleCallback === "function") window.cancelIdleCallback(idle);
      window.clearTimeout(timer);
    };
  }, []);
  if (!go) {
    return (
      <div className={className} aria-hidden>
        <div className="poster-bg" />
      </div>
    );
  }
  return <SceneCanvas className={className} />;
}
