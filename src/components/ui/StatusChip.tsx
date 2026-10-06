"use client";

import { useEffect, useState } from "react";
import { getOpenStatus, type OpenStatus } from "@/lib/time";

/** "Open until 12 AM" / "Opens at 6 AM", computed on Buffalo time and refreshed every 30s. */
export default function StatusChip({ className = "", tone = "scene" }: { className?: string; tone?: "scene" | "theme" }) {
  const [s, setS] = useState<OpenStatus | null>(null);
  useEffect(() => {
    const tick = () => setS(getOpenStatus());
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, []);
  const style = tone === "scene" ? { color: "var(--on-scene)", borderColor: "rgb(248 236 216 / .3)", background: "rgb(20 10 8 / .5)" } : undefined;
  return (
    <span className={`chip ${className}`} style={style}>
      <span className="live-dot" data-closed={s ? String(!s.open) : "false"} />
      {s ? s.label : "Elmwood & Bidwell"}
    </span>
  );
}
