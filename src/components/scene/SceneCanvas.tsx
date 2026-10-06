"use client";

import { useEffect, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import WindowSeatScene from "./WindowSeatScene";
import { detectQuality, useQuality } from "./quality";
import PosterFallback from "./PosterFallback";
import ErrorBoundary from "@/components/ui/ErrorBoundary";

/** Calls back once real frames have been drawn so we can fade the canvas in over the poster. */
function FirstFrames({ onReady }: { onReady: () => void }) {
  const n = useRef(0);
  useFrame(() => {
    if (++n.current === 6) onReady();
  });
  return null;
}

export default function SceneCanvas({ className = "" }: { className?: string }) {
  const quality = useQuality((s) => s.quality);
  const ready = useQuality((s) => s.ready);
  const [visible, setVisible] = useState(true);
  const [painted, setPainted] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    useQuality.getState().init(detectQuality());
  }, []);

  // stop rendering when the scene is scrolled out of view
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: "100px" });
    io.observe(el);
    return () => io.disconnect();
  }, [ready]);

  if (!ready || quality === "poster") {
    return (
      <div ref={wrap} className={className} aria-hidden>
        <PosterFallback />
      </div>
    );
  }

  const maxDpr = quality === "high" ? 2 : quality === "med" ? 1.5 : 1;
  return (
    <div ref={wrap} className={className} aria-hidden>
      <PosterFallback />
      <div className="absolute inset-0 transition-opacity duration-[1400ms]" style={{ opacity: painted ? 1 : 0 }}>
        {/* if the GPU can't run the scene, the poster underneath simply stays visible */}
        <ErrorBoundary fallback={null}>
        <Canvas
          key={quality === "high" ? "hi" : "std"}
          shadows={quality === "high" || quality === "med"}
          dpr={[1, maxDpr]}
          frameloop={visible ? "always" : "never"}
          camera={{ fov: 46, near: 0.1, far: 140, position: [-11.9, 2.0, -8.7] }}
          gl={{ antialias: true, powerPreference: "high-performance", alpha: false }}
          onCreated={({ gl, scene }) => {
            // dev handle for measuring draw calls and triangles from scripts and the console
            if (process.env.NODE_ENV !== "production") Object.assign(window, { __gl: gl, __scene: scene });
          }}
        >
          <FirstFrames onReady={() => setPainted(true)} />
          <WindowSeatScene />
        </Canvas>
        </ErrorBoundary>
      </div>
    </div>
  );
}
