"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Providers, { useReady } from "@/components/order/Providers";
import Logo from "@/components/ui/Logo";
import { menu } from "@/lib/menu";
import { money } from "@/lib/pricing";
import { seedDemoOrders, useShop } from "@/store/shop";
import { business } from "@data/business";
import type { Order, OrderStatus } from "@/lib/orders/types";

const PIN = "1995"; // demo PIN
const NEXT: Partial<Record<OrderStatus, { to: OrderStatus; label: string }>> = {
  received: { to: "making", label: "Start making" },
  making: { to: "ready", label: "Mark ready" },
  ready: { to: "completed", label: "Picked up" },
};

const clock = (ms: number) => new Date(ms).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: business.timezone });
const ago = (ms: number, now: number) => {
  const m = Math.max(0, Math.floor((now - ms) / 60_000));
  return m < 1 ? "just now" : `${m} min ago`;
};

function chime() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const tone = (f: number, t0: number, dur: number) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = f;
      g.gain.setValueAtTime(0, ctx.currentTime + t0);
      g.gain.linearRampToValueAtTime(0.25, ctx.currentTime + t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t0 + dur);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + t0);
      o.stop(ctx.currentTime + t0 + dur + 0.05);
    };
    tone(880, 0, 0.5);
    tone(1175, 0.16, 0.7);
    window.setTimeout(() => void ctx.close(), 1500);
  } catch {
    /* audio not available */
  }
}

function OrderCard({ o, now, onAdvance, onCancel }: { o: Order; now: number; onAdvance: () => void; onCancel: () => void }) {
  const next = NEXT[o.status];
  const [confirm, setConfirm] = useState(false);
  const late = o.status !== "ready" && o.status !== "completed" && now > o.readyBy;
  return (
    <article className="rounded-3xl border p-5" style={{ borderColor: late ? "#e0593a" : "var(--line)", background: "var(--surface)", animation: "rise .4s var(--ease)" }} aria-label={`Order ${o.number} for ${o.customer.name}`}>
      <header className="flex items-start justify-between gap-3">
        <div>
          <div className="display text-[2rem] leading-none">{o.number}</div>
          <div className="mt-1 text-[1.05rem] font-semibold">{o.customer.name}</div>
        </div>
        <div className="text-right">
          <div className="font-mono text-[0.9rem]" style={{ color: late ? "#e0593a" : "var(--muted)" }}>
            {o.pickupAt ? `Pickup ${clock(o.pickupAt)}` : "ASAP"}
          </div>
          <div className="text-[0.82rem]" style={{ color: "var(--muted)" }}>
            {ago(o.createdAt, now)}
          </div>
        </div>
      </header>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <span className="chip !py-0.5 !text-[0.78rem]">{o.fulfillment === "here" ? "FOR HERE" : "TO GO"}</span>
        {o.alcohol && (
          <span className="chip !py-0.5 !text-[0.78rem]" style={{ background: "#e0593a", color: "#fff", borderColor: "#e0593a" }}>
            CHECK ID · 21+
          </span>
        )}
        {o.promo && <span className="chip !py-0.5 !text-[0.78rem]">{o.promo}</span>}
      </div>
      <ul className="mt-4 grid gap-2.5">
        {o.lines.map((l) => (
          <li key={l.id} className="text-[1.05rem] leading-snug">
            <span className="mr-2 font-mono font-bold">{l.qty}×</span>
            <span className="font-semibold">{l.name}</span>
            {l.options && (
              <div className="ml-7 text-[0.9rem]" style={{ color: "var(--muted)" }}>
                {l.options}
              </div>
            )}
            {l.note && <div className="ml-7 text-[0.9rem] font-semibold" style={{ color: "var(--amber)" }}>⚑ {l.note}</div>}
          </li>
        ))}
      </ul>
      <footer className="mt-5 flex items-center gap-2">
        {next && (
          <button type="button" onClick={onAdvance} className="btn btn-primary flex-1 !min-h-[56px] text-[1.05rem]">
            {next.label}
          </button>
        )}
        {o.status !== "completed" && o.status !== "canceled" &&
          (confirm ? (
            <button type="button" onClick={onCancel} className="btn !min-h-[56px] !px-4" style={{ background: "#e0593a", color: "#fff" }}>
              Cancel it?
            </button>
          ) : (
            <button type="button" aria-label={`Cancel order ${o.number}`} onClick={() => (setConfirm(true), window.setTimeout(() => setConfirm(false), 3000))} className="btn btn-ghost !min-h-[56px] !px-4">
              ✕
            </button>
          ))}
      </footer>
      <div className="mt-3 text-right font-mono text-[0.82rem]" style={{ color: "var(--muted)" }}>
        {money(o.totals.total)} paid · {o.payment.method.replace("-", " ")}
      </div>
    </article>
  );
}

function SoldOutDialog({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const soldOut = useShop((s) => s.soldOut);
  const toggle = useShop((s) => s.toggleSoldOut);
  const [q, setQ] = useState("");
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  const items = menu.items.filter((i) => i.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <dialog ref={ref} className="sheet theme-scope" style={{ ["--night" as string]: 1, maxWidth: 560 }} aria-label="Sold-out items" onClose={onClose} onClick={(e) => e.target === ref.current && onClose()}>
      <div className="flex max-h-[min(780px,92dvh)] flex-col p-6">
        <div className="flex items-center justify-between">
          <h2 className="display text-[1.9rem]">86 an item</h2>
          <button type="button" onClick={onClose} className="btn btn-ghost !min-h-[44px] !px-4">
            Done
          </button>
        </div>
        <p className="mt-1 text-[0.92rem]" style={{ color: "var(--muted)" }}>
          Toggle anything that&rsquo;s run out. It shows as sold out on the website instantly.
        </p>
        <input className="field mt-4" placeholder="Search items" aria-label="Search items" value={q} onChange={(e) => setQ(e.target.value)} />
        <ul className="mt-3 min-h-0 flex-1 divide-y overflow-y-auto" style={{ borderColor: "var(--line)" }}>
          {items.map((i) => {
            const out = soldOut.includes(i.id) || !i.available;
            const locked = !i.available;
            return (
              <li key={i.id} className="flex items-center justify-between gap-3 py-2.5" style={{ borderColor: "var(--line)" }}>
                <span className="font-medium">{i.name}</span>
                <button type="button" role="switch" aria-checked={out} disabled={locked} onClick={() => toggle(i.id)} className="min-h-[44px] min-w-[104px] rounded-full border-2 px-4 text-[0.9rem] font-semibold disabled:opacity-50" style={{ borderColor: out ? "#e0593a" : "var(--line)", background: out ? "#e0593a" : "transparent", color: out ? "#fff" : "var(--fg)" }}>
                  {locked ? "Off menu" : out ? "Sold out" : "Available"}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </dialog>
  );
}

function Board() {
  const orders = useShop((s) => s.orders);
  const paused = useShop((s) => s.paused);
  const setPaused = useShop((s) => s.setPaused);
  const setStatus = useShop((s) => s.setStatus);
  const heartbeat = useShop((s) => s.heartbeat);
  const reset = useShop((s) => s.reset);
  const soldOutCount = useShop((s) => s.soldOut.length);
  const [now, setNow] = useState(() => Date.now());
  const [sound, setSound] = useState(false);
  const [showSoldOut, setShowSoldOut] = useState(false);
  const seen = useRef<Set<string> | null>(null);

  useEffect(() => {
    heartbeat();
    const a = window.setInterval(() => setNow(Date.now()), 10_000);
    const b = window.setInterval(heartbeat, 10_000);
    return () => {
      window.clearInterval(a);
      window.clearInterval(b);
    };
  }, [heartbeat]);

  // chime on each newly arrived order
  useEffect(() => {
    const ids = new Set(orders.map((o) => o.id));
    if (seen.current && sound) {
      for (const id of ids) if (!seen.current.has(id)) chime();
    }
    seen.current = ids;
  }, [orders, sound]);

  const cols = useMemo(
    () => ({
      received: orders.filter((o) => o.status === "received").sort((a, b) => a.createdAt - b.createdAt),
      making: orders.filter((o) => o.status === "making").sort((a, b) => a.createdAt - b.createdAt),
      ready: orders.filter((o) => o.status === "ready").sort((a, b) => a.createdAt - b.createdAt),
    }),
    [orders],
  );
  const doneToday = orders.filter((o) => o.status === "completed" || o.status === "canceled").slice(0, 6);

  const columns: { id: "received" | "making" | "ready"; title: string; tone: string }[] = [
    { id: "received", title: "New", tone: "#ffb347" },
    { id: "making", title: "Making", tone: "#7ab8ff" },
    { id: "ready", title: "Ready", tone: "#3ecf6e" },
  ];

  return (
    <div className="theme-scope min-h-dvh" style={{ ["--night" as string]: 1 }}>
      <header className="sticky top-0 z-20 flex flex-wrap items-center gap-4 border-b px-5 py-3" style={{ borderColor: "var(--line)", background: "color-mix(in oklab, var(--bg), transparent 6%)", backdropFilter: "blur(12px)" }}>
        <Logo size={40} />
        <div>
          <h1 className="display text-[1.5rem] leading-none">Counter</h1>
          <p className="eyebrow mt-1 opacity-60">Live orders · this device syncs with the website</p>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setSound((v) => (v ? false : (chime(), true)))} aria-pressed={sound} className="btn btn-ghost !min-h-[46px] !px-4 !text-[0.92rem]">
            {sound ? "🔔 Sound on" : "🔕 Enable sound"}
          </button>
          <button type="button" onClick={() => setShowSoldOut(true)} className="btn btn-ghost !min-h-[46px] !px-4 !text-[0.92rem]">
            86 items{soldOutCount ? ` (${soldOutCount})` : ""}
          </button>
          <button type="button" role="switch" aria-checked={paused} onClick={() => setPaused(!paused)} className="btn !min-h-[46px] !px-4 !text-[0.92rem]" style={{ background: paused ? "#e0593a" : "transparent", color: paused ? "#fff" : "var(--fg)", border: `1.5px solid ${paused ? "#e0593a" : "var(--line)"}` }}>
            {paused ? "⏸ Online ordering PAUSED" : "Pause online ordering"}
          </button>
          <button type="button" onClick={seedDemoOrders} className="btn btn-primary !min-h-[46px] !px-4 !text-[0.92rem]">
            + Demo orders
          </button>
          <button type="button" onClick={() => window.confirm("Clear all demo orders and settings?") && reset()} className="btn btn-ghost !min-h-[46px] !px-4 !text-[0.92rem]">
            Reset
          </button>
        </div>
      </header>

      <main className="grid gap-5 p-5 lg:grid-cols-3">
        {columns.map((c) => (
          <section key={c.id} aria-label={`${c.title} orders`}>
            <h2 className="mb-3 flex items-center gap-3 px-1">
              <span className="h-3 w-3 rounded-full" style={{ background: c.tone }} />
              <span className="display text-[1.7rem]">{c.title}</span>
              <span className="font-mono text-[1rem] opacity-60">{cols[c.id].length}</span>
            </h2>
            <div className="grid gap-4">
              {cols[c.id].length === 0 && (
                <div className="rounded-3xl border border-dashed p-8 text-center" style={{ borderColor: "var(--line)", color: "var(--muted)" }}>
                  {c.id === "received" ? "No new orders. Take a breath." : "Nothing here."}
                </div>
              )}
              {cols[c.id].map((o) => (
                <OrderCard key={o.id} o={o} now={now} onAdvance={() => NEXT[o.status] && setStatus(o.id, NEXT[o.status]!.to)} onCancel={() => setStatus(o.id, "canceled")} />
              ))}
            </div>
          </section>
        ))}
      </main>

      {doneToday.length > 0 && (
        <footer className="px-5 pb-10">
          <h2 className="eyebrow mb-2 opacity-60">Recently finished</h2>
          <ul className="flex flex-wrap gap-2">
            {doneToday.map((o) => (
              <li key={o.id} className="chip">
                {o.number} · {o.customer.name} · {o.status}
              </li>
            ))}
          </ul>
        </footer>
      )}

      {showSoldOut && <SoldOutDialog onClose={() => setShowSoldOut(false)} />}
    </div>
  );
}

const staffSubscribe = (cb: () => void) => {
  window.addEventListener("aroma-staff", cb);
  return () => window.removeEventListener("aroma-staff", cb);
};
const staffSnapshot = () => sessionStorage.getItem("aroma.staff") === "1";

function Gate() {
  const ready = useReady();
  const ok = useSyncExternalStore(staffSubscribe, staffSnapshot, () => false);
  const [pin, setPin] = useState("");
  const [err, setErr] = useState(false);
  if (!ready) return null;
  if (ok) return <Board />;
  return (
    <div className="theme-scope grid min-h-dvh place-items-center p-6" style={{ ["--night" as string]: 1 }}>
      <form
        className="w-full max-w-sm text-center"
        onSubmit={(e) => {
          e.preventDefault();
          if (pin === PIN) {
            sessionStorage.setItem("aroma.staff", "1");
            window.dispatchEvent(new Event("aroma-staff"));
          } else setErr(true);
        }}
      >
        <div className="mb-6 grid place-items-center">
          <Logo size={72} />
        </div>
        <h1 className="display text-[2.4rem]">Counter</h1>
        <p className="mt-2" style={{ color: "var(--muted)" }}>
          Staff only. Demo PIN is {PIN}.
        </p>
        <label htmlFor="pin" className="sr-only">
          PIN
        </label>
        <input id="pin" className="field mt-6 text-center font-mono text-[1.4rem] tracking-[0.4em]" inputMode="numeric" autoComplete="off" maxLength={4} value={pin} onChange={(e) => (setErr(false), setPin(e.target.value.replace(/\D/g, "")))} aria-invalid={err} aria-describedby={err ? "pin-err" : undefined} />
        {err && (
          <p id="pin-err" role="alert" className="mt-2 text-[0.9rem] font-medium text-[#e0593a]">
            That PIN isn&rsquo;t right.
          </p>
        )}
        <button className="btn btn-primary mt-5 w-full" type="submit">
          Open the counter
        </button>
      </form>
    </div>
  );
}

export default function StaffApp() {
  return (
    <Providers>
      <Gate />
    </Providers>
  );
}
