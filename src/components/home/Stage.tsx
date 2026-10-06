"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import StatusChip from "@/components/ui/StatusChip";
import TimeStrip from "@/components/ui/TimeStrip";
import { smoothstep } from "@/lib/timeOfDay";
import { formatHour } from "@/lib/time";
import { useTime } from "@/store/time";
import { business } from "@data/business";
import HeroScene from "./HeroScene";

interface Chapter {
  /** Hour of the cafe's day on screen for this chapter. null = the visitor's own (live) time. */
  hour: number | null;
  /** Camera station once inside (see Rig.tsx). */
  station: number;
  eyebrow: string;
  title: string;
  body: string;
  cta: { label: string; href: string };
  side: "left" | "right";
  /** A denser scrim behind the copy, for a busy part of the scene (the signs beside the door). */
  dense?: boolean;
}

/**
 * The story, one screen each. The hero (outside on the sidewalk) comes first; scrolling then flies the camera along the
 * facade, through the door (the first stop) and to the window table, where the day plays out: 6 AM croissant, midday laptop,
 * golden-hour live music, after dark, last call.
 */
const CHAPTERS: Chapter[] = [
  { hour: null, station: 6, side: "left", dense: true, eyebrow: "6 AM – 12 AM, every day", title: "Come on in.", body: "The door is open from first coffee to last call, every day of the week. Take a seat on the patio, or step inside.", cta: { label: "See the hours", href: "#visit" } },
  { hour: 6.2, station: 6, side: "left", eyebrow: "6 AM", title: "First pour.", body: "Elmwood is still blue. The espresso machine is warm, and the first cappuccino and a fresh pastry are already on their way.", cta: { label: "See the espresso bar", href: "/order#cat-espresso" } },
  { hour: 13, station: 6, side: "left", eyebrow: "1 PM", title: "Make it your office.", body: "Breakfast gives way to laptops. Take a window table, order lunch or a second cup, and stay as long as the work takes.", cta: { label: "Order ahead", href: "/order" } },
  { hour: 18, station: 7, side: "right", eyebrow: "6 PM", title: "Golden hour, live music.", body: "The light goes amber and the instruments come out. Open mic, poets and acoustic nights, two to five evenings a week.", cta: { label: "Check the schedule", href: "#tonight" } },
  { hour: 21, station: 2, side: "left", eyebrow: "9 PM", title: "After dark.", body: "The sign comes on. Coffee cocktails, a pour of wine, and a stage for poets and musicians.", cta: { label: "Beer, wine & cocktails", href: "/order#cat-cocktails" } },
  { hour: 23.6, station: 4, side: "right", eyebrow: "11:30 PM", title: "Last call is midnight.", body: "Open from 6 AM to midnight, because Elmwood doesn't keep banker's hours. Espresso is on until the last order.", cta: { label: "Order for tonight", href: "/order" } },
];

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));

const HOURS_LABEL = (() => {
  const hs = Object.values(business.hours);
  return `${formatHour(Math.min(...hs.map((h) => h.open)))} – ${formatHour(Math.max(...hs.map((h) => h.close)))}`;
})();

/**
 * The hero plus a scroll-driven walk through the day. One sticky 3D stage stays put while the chapters scroll over it.
 * Scroll position drives two shared values: `flight` (the camera moving from the sidewalk, through the door, to the table)
 * and the time of day (so the light, props and page theme all move together).
 */
export default function Stage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const storyRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(-1);

  useEffect(() => {
    let raf = 0;
    let scrubAtY = 0;
    const unsub = useTime.subscribe((s, prev) => {
      if (s.scrub !== null && prev.scrub === null) scrubAtY = window.scrollY;
    });

    const update = () => {
      raf = 0;
      const hero = heroRef.current;
      const story = storyRef.current;
      if (!hero || !story) return;
      const vh = window.innerHeight;
      const st = useTime.getState();
      const n = CHAPTERS.length;
      const hr = hero.getBoundingClientRect();
      const H = Math.max(1, hr.height);
      const y = -hr.top; // how far into the stage we have scrolled

      // scrolling after dragging the dial hands control back to the page
      if (st.scrub !== null && Math.abs(window.scrollY - scrubAtY) > 180) st.setScrub(null);

      // out on the sidewalk -> through the door (one screen) -> seated at the window table (two screens)
      const flight = Number(clamp(y / (2 * H), 0, 1).toFixed(4));
      if (st.flight !== flight) st.setFlight(flight);

      if (y <= 2) {
        // hero only: the visitor's own time of day
        if (st.story !== null) st.setStory(null);
        if (st.station !== 0) st.setStation(0);
        setActive(-1);
        return;
      }
      const r = story.getBoundingClientRect();
      const total = Math.max(1, r.height - H);
      const prog = clamp(-r.top / total, 0, 1);
      const pos = prog * (n - 1);
      const i = Math.min(n - 1, Math.floor(pos));
      const e = smoothstep(0.3, 0.7, pos - i);
      const hourOf = (k: number) => CHAPTERS[k].hour ?? st.live;
      const storyHour = lerp(hourOf(i), hourOf(Math.min(n - 1, i + 1)), e);
      const hour = r.bottom < vh * 0.6 ? hourOf(n - 1) : storyHour;
      st.setStory(Number(hour.toFixed(3)));
      const idx = clamp(Math.round(pos), 0, n - 1);
      st.setStation(CHAPTERS[idx].station);
      setActive(y < H * 0.5 ? -1 : idx);
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    const hash = window.location.hash.slice(1);
    const jump = hash ? window.setTimeout(() => document.getElementById(hash)?.scrollIntoView({ block: "start" }), 120) : 0;
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
      window.clearTimeout(jump);
      unsub();
      const s = useTime.getState();
      s.setStory(null);
      s.setStation(0);
      s.setFlight(0);
    };
  }, []);

  return (
    <section id="top" className="on-scene relative bg-[#2a100d] text-on-scene" aria-label="A day at Caffe Aroma">
      {/* the 3D scene stays put for the whole walk: the sidewalk first, then the room */}
      <div className="sticky top-0 z-0 h-[100svh] min-h-[640px] overflow-hidden">
        <HeroScene className="absolute inset-x-0 top-0 h-full max-md:h-[62svh]" />
        {/* phones: the scene lives in the top of the screen and fades into a dark panel for the copy */}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent_34%,#12090a_58%)] md:hidden" />
      </div>

      <div className="relative z-10 -mt-[100svh]">
        {/* hero copy */}
        <div ref={heroRef} className="relative flex h-[100svh] min-h-[640px] snap-start snap-always flex-col justify-end md:justify-center">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgb(14_6_4/.84)_0%,rgb(14_6_4/.5)_30%,rgb(14_6_4/0)_55%)] max-md:bg-[linear-gradient(180deg,rgb(14_6_4/.6)_0%,rgb(14_6_4/.1)_30%,rgb(14_6_4/.1)_50%,rgb(14_6_4/.88)_100%)]" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-[rgb(14_6_4/.88)] to-transparent" />
          <div className="relative mx-auto w-full max-w-[1400px] px-4 pb-[9.8rem] pt-24 sm:px-8 sm:pb-[9.5rem] md:pb-36 md:pt-24">
            <div className="max-w-[40rem]">
              <div className="flex flex-wrap items-center gap-2">
                <StatusChip />
                <span className="chip" style={{ color: "var(--on-scene)", borderColor: "rgb(248 236 216 / .3)", background: "rgb(20 10 8 / .5)" }}>
                  Open daily {HOURS_LABEL}
                </span>
              </div>
              <h1 className="display mt-5 text-[clamp(2.7rem,min(7.6vw,13vh),7.4rem)] text-on-scene">
                Coffee by&nbsp;day.
                <br />
                <span className="italic" style={{ color: "var(--amber)" }}>
                  Cocktails
                </span>
                <br />
                by&nbsp;night.
              </h1>
              <p className="mt-5 hidden max-w-[30rem] text-[1.08rem] leading-relaxed text-on-scene-muted sm:block sm:text-[1.15rem] [@media(max-height:780px)]:!hidden">
                Buffalo&rsquo;s longest-running independent coffee shop on Elmwood since {business.founded}. Patio seats, espresso at 6&nbsp;AM, a glass of wine at midnight, and poetry in&nbsp;between.
              </p>
              <div className="mt-6 flex gap-2.5 sm:mt-7 sm:flex-wrap sm:gap-3">
                <Link href="/order" className="btn btn-primary max-sm:flex-1 max-sm:!px-4">
                  Order ahead
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </Link>
                <a href="#tonight" className="btn btn-ghost max-sm:flex-1 max-sm:!px-4">
                  <span className="sm:hidden">Tonight</span>
                  <span className="max-sm:hidden">What&rsquo;s on tonight</span>
                </a>
              </div>
              <p className="mt-5 hidden flex-wrap gap-x-5 gap-y-1 text-[0.95rem] text-on-scene-muted sm:flex [@media(max-height:700px)]:!hidden">
                <a href={business.mapsUrl} target="_blank" rel="noreferrer" className="underline-offset-4 hover:underline">
                  {business.address.street}, {business.address.city}
                </a>
                <a href={business.phoneHref} className="underline-offset-4 hover:underline">
                  {business.phone}
                </a>
              </p>
            </div>
          </div>
        </div>

        {/* the day: the door first, then the window table */}
        <div ref={storyRef}>
          {CHAPTERS.map((c, i) => (
            <div key={c.eyebrow} className="relative flex h-[100svh] min-h-[640px] snap-start snap-always items-end md:items-center" aria-hidden={active !== i}>
              <div className={`pointer-events-none absolute inset-0 ${c.side === "left" ? (c.dense ? "bg-[linear-gradient(90deg,rgb(14_6_4/.93)_0%,rgb(14_6_4/.78)_30%,rgb(14_6_4/.3)_46%,transparent_62%)]" : "bg-[linear-gradient(90deg,rgb(14_6_4/.78)_0%,rgb(14_6_4/.4)_32%,transparent_58%)]") : "bg-[linear-gradient(270deg,rgb(14_6_4/.84)_0%,rgb(14_6_4/.5)_32%,transparent_60%)]"} max-md:bg-[linear-gradient(180deg,transparent_30%,rgb(14_6_4/.88)_100%)]`} />
              <div className={`relative mx-auto flex w-full max-w-[1400px] px-4 pb-32 sm:px-8 md:pb-0 ${c.side === "right" ? "md:justify-end" : ""}`}>
                <div className="max-w-[28rem] transition-[opacity,transform] duration-700" style={{ opacity: active === i ? 1 : 0, transform: active === i ? "none" : "translateY(26px)", transitionTimingFunction: "var(--ease)" }}>
                  <p className="eyebrow" style={{ color: "var(--amber)" }}>
                    {c.eyebrow}
                  </p>
                  <h2 className="display mt-3 text-[clamp(2.6rem,5.6vw,4.8rem)] text-on-scene">{c.title}</h2>
                  <p className="mt-4 text-[1.12rem] leading-relaxed text-on-scene-muted">{c.body}</p>
                  {c.cta.href.startsWith("#") ? (
                    <a href={c.cta.href} className="btn btn-ghost mt-6" tabIndex={active === i ? 0 : -1}>
                      {c.cta.label}
                    </a>
                  ) : (
                    <Link href={c.cta.href} className="btn btn-ghost mt-6" tabIndex={active === i ? 0 : -1}>
                      {c.cta.label}
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* the clock dial rides along the bottom of the whole walk */}
      <div className="pointer-events-none sticky bottom-0 z-20 h-0">
        <div className="pointer-events-auto absolute inset-x-0 bottom-0 mx-auto max-w-[1400px] px-4 pb-4 sm:px-8 sm:pb-6">
          <div className="max-w-[46rem] rounded-3xl bg-[linear-gradient(180deg,transparent,rgb(14_6_4/.55))] px-1 pt-3 md:mx-auto">
            <TimeStrip />
          </div>
        </div>
      </div>
    </section>
  );
}
