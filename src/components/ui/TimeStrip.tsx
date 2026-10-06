"use client";

import { useMemo, useRef } from "react";
import { useTime } from "@/store/time";
import { mixHex, sampleTod } from "@/lib/timeOfDay";
import { formatHour } from "@/lib/time";
import { useMounted } from "@/lib/useMounted";

const MIN = 6;
const MAX = 24;
const SPAN = MAX - MIN;
const TICKS = [6, 9, 12, 15, 18, 21, 24];

const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));
const snap = (h: number) => Math.round(h * 20) / 20;

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <circle cx="12" cy="12" r="4.2" fill="currentColor" />
      <path d="M12 2.5v2.4M12 19.1v2.4M2.5 12h2.4M19.1 12h2.4M5.3 5.3l1.7 1.7M17 17l1.7 1.7M18.7 5.3 17 7M7 17l-1.7 1.7" />
    </svg>
  );
}
function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden>
      <path d="M20.5 14.2A8.6 8.6 0 0 1 9.8 3.5a.6.6 0 0 0-.8-.7A9.6 9.6 0 1 0 21.2 15a.6.6 0 0 0-.7-.8Z" />
    </svg>
  );
}

/**
 * The clock dial: a scrubbable sky timeline from 6 AM to midnight.
 * Drag it (or use the arrow keys) and the whole room, the sky and the page theme follow.
 */
export default function TimeStrip({ className = "" }: { className?: string }) {
  const target = useTime((s) => s.target);
  const live = useTime((s) => s.live);
  const scrub = useTime((s) => s.scrub);
  const setScrub = useTime((s) => s.setScrub);
  const story = useTime((s) => s.story);
  const track = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const mounted = useMounted();

  const gradient = useMemo(() => {
    const stops: string[] = [];
    for (let h = MIN; h <= MAX; h += 0.5) {
      const t = sampleTod(h);
      stops.push(`${mixHex(t.skyTop, t.skyHorizon, 0.55)} ${(((h - MIN) / SPAN) * 100).toFixed(1)}%`);
    }
    return `linear-gradient(90deg, ${stops.join(", ")})`;
  }, []);

  const sample = sampleTod(target);
  const pct = ((clamp(target, MIN, MAX) - MIN) / SPAN) * 100;
  const isNight = sample.night > 0.5;
  const previewing = scrub !== null;

  const fromPointer = (clientX: number) => {
    const el = track.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const p = clamp((clientX - r.left) / r.width, 0, 1);
    setScrub(snap(MIN + p * SPAN));
  };

  const onKey = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 1 : 0.25;
    const cur = target;
    let next: number | null = null;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") next = cur + step;
    else if (e.key === "ArrowLeft" || e.key === "ArrowDown") next = cur - step;
    else if (e.key === "PageUp") next = cur + 1;
    else if (e.key === "PageDown") next = cur - 1;
    else if (e.key === "Home") next = MIN;
    else if (e.key === "End") next = MAX;
    else if (e.key === "Escape") {
      setScrub(null);
      return;
    }
    if (next !== null) {
      e.preventDefault();
      setScrub(snap(clamp(next, MIN, MAX)));
    }
  };

  return (
    <div className={`select-none ${className}`}>
      <div className="mb-1 flex min-h-[38px] items-center justify-between gap-4 text-on-scene">
        <div className="flex min-w-0 items-baseline gap-3" aria-live="polite">
          <span className="display shrink-0 whitespace-nowrap text-[1.55rem] leading-none">{formatHour(target)}</span>
          <span className="eyebrow truncate text-on-scene-muted">
            <span className="max-sm:hidden">{previewing ? "Previewing" : story !== null ? "A day on Elmwood" : "Live"} · </span>
            {sample.label}
          </span>
        </div>
        {mounted && previewing && (
          <button type="button" className="chip !py-1 text-on-scene" style={{ borderColor: "rgb(248 236 216 / .35)", background: "rgb(20 10 8 / .5)" }} onClick={() => setScrub(null)}>
            <span className="live-dot" />
            <span className="sm:hidden">Now</span>
            <span className="max-sm:hidden">Back to now ({formatHour(live)})</span>
          </button>
        )}
      </div>

      <div
        ref={track}
        className="relative h-11 touch-none cursor-pointer"
        onPointerDown={(e) => {
          dragging.current = true;
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          fromPointer(e.clientX);
        }}
        onPointerMove={(e) => dragging.current && fromPointer(e.clientX)}
        onPointerUp={() => (dragging.current = false)}
        onPointerCancel={() => (dragging.current = false)}
      >
        <div className="absolute inset-x-0 top-1/2 h-[10px] -translate-y-1/2 rounded-full" style={{ background: gradient, boxShadow: "0 0 0 1.5px rgb(248 236 216 / .35), 0 10px 30px -10px rgb(0 0 0 / .6)" }} />
        {/* where "now" is */}
        {mounted && (
          <div className="absolute top-1/2 h-[18px] w-[2px] -translate-y-1/2 rounded bg-white/80" style={{ left: `${((clamp(live, MIN, MAX) - MIN) / SPAN) * 100}%` }} title="Now" />
        )}
        <div
          role="slider"
          tabIndex={0}
          aria-label="Time of day, 6 AM to midnight"
          aria-valuemin={MIN}
          aria-valuemax={MAX}
          aria-valuenow={Number(target.toFixed(2))}
          aria-valuetext={`${formatHour(target)}, ${sample.label}`}
          onKeyDown={onKey}
          className="absolute top-1/2 grid h-9 w-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full transition-[box-shadow,transform] duration-200 focus-visible:outline-offset-4"
          style={{
            left: `${pct}%`,
            background: isNight ? "#1a1424" : "#fff5e1",
            color: isNight ? "#ffd27a" : "#c4521a",
            boxShadow: isNight ? "0 0 0 2px #ffb347, 0 0 24px 4px rgb(255 179 71 / .45)" : "0 0 0 2px #fff, 0 6px 18px rgb(0 0 0 / .4), 0 0 24px 4px rgb(255 214 120 / .5)",
          }}
        >
          {isNight ? <MoonIcon /> : <SunIcon />}
        </div>
      </div>

      <div className="mt-1 flex justify-between px-0.5 text-on-scene-muted">
        {TICKS.map((h) => (
          <button key={h} type="button" className="eyebrow rounded px-1 py-1 hover:text-on-scene focus-visible:text-on-scene" onClick={() => setScrub(h)}>
            {h === 24 ? "12a" : h === 12 ? "12p" : h < 12 ? `${h}a` : `${h - 12}p`}
          </button>
        ))}
      </div>
    </div>
  );
}
