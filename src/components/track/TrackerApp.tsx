"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import Header from "@/components/site/Header";
import Providers, { useReady } from "@/components/order/Providers";
import { money } from "@/lib/pricing";
import { useShop } from "@/store/shop";
import { business } from "@data/business";
import type { OrderStatus } from "@/lib/orders/types";

const STEPS: { id: OrderStatus; label: string }[] = [
  { id: "received", label: "Received" },
  { id: "making", label: "Making it" },
  { id: "ready", label: "Ready" },
];

const COPY: Record<OrderStatus, { title: string; sub: string }> = {
  received: { title: "We've got your order", sub: "The crew just saw it come in." },
  making: { title: "Brewing now", sub: "A barista is making your order." },
  ready: { title: "It's ready!", sub: "Come on in. It's waiting at the counter." },
  completed: { title: "Enjoy!", sub: "Thanks for stopping by Caffe Aroma." },
  canceled: { title: "Order canceled", sub: "Please call us if this is a surprise." },
};

const fmtTime = (ms: number) => new Date(ms).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: business.timezone });

/** The cup that fills as the order progresses. */
function FillingCup({ pct, done }: { pct: number; done: boolean }) {
  return (
    <svg viewBox="0 0 160 160" width="190" height="190" role="img" aria-label={`Order ${Math.round(pct)} percent done`}>
      <defs>
        <clipPath id="cup-clip">
          <path d="M34 58h92v22c0 26-20 46-46 46S34 106 34 80z" />
        </clipPath>
      </defs>
      <ellipse cx="80" cy="140" rx="62" ry="9" fill="color-mix(in oklab, var(--surface-2), white 20%)" stroke="currentColor" strokeWidth="3" />
      <g clipPath="url(#cup-clip)">
        <rect x="20" y="40" width="120" height="100" fill="color-mix(in oklab, var(--surface-2), white 28%)" />
        <rect x="20" y={126 - (pct / 100) * 78} width="120" height="100" fill="#8a5632" style={{ transition: "y 1.6s var(--ease)" }} />
        <ellipse cx="80" cy={126 - (pct / 100) * 78} rx="46" ry="5" fill="#c49a6c" style={{ transition: "cy 1.6s var(--ease)" }} />
      </g>
      <path d="M34 58h92v22c0 26-20 46-46 46S34 106 34 80z" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinejoin="round" />
      <path d="M126 70h8a14 14 0 0 1 0 28h-10" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
      <g stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none" opacity={pct < 100 ? 0.55 : 0.9} style={{ animation: done ? "none" : "rise 2s ease-in-out infinite alternate" }}>
        <path d="M64 40c-5-6 5-9 0-18" />
        <path d="M80 42c-5-6 5-9 0-18" />
        <path d="M96 40c-5-6 5-9 0-18" />
      </g>
    </svg>
  );
}

function Inner({ id }: { id: string }) {
  const ready = useReady();
  const order = useShop((s) => s.orders.find((o) => o.id === id));
  const staffSeenAt = useShop((s) => s.staffSeenAt);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  // Demo autopilot: if nobody has the counter board open, walk ASAP orders through the stages so a solo demo still plays out.
  useEffect(() => {
    if (!order || order.pickupAt) return;
    const staffed = now - staffSeenAt < 90_000;
    if (staffed) return;
    const { setStatus } = useShop.getState();
    if (order.status === "received" && now - order.createdAt > 9_000) setStatus(order.id, "making");
    else if (order.status === "making" && now - (order.statusAt.making ?? now) > 22_000) setStatus(order.id, "ready");
  }, [order, now, staffSeenAt]);

  useEffect(() => {
    if (order) document.title = `${COPY[order.status].title} · ${order.number} | Caffe Aroma`;
  }, [order?.status, order?.number]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!ready) return <Header overScene={false} />;

  if (!order) {
    return (
      <>
        <Header overScene={false} />
        <main className="mx-auto grid max-w-[620px] place-items-center px-4 pb-24 pt-40 text-center">
          <h1 className="display text-[2.6rem]">We can&rsquo;t find that order</h1>
          <p className="mt-3" style={{ color: "var(--muted)" }}>
            In this demo, orders live on the device that placed them. If you placed it on another device, open the link there, or call us at {business.phone}.
          </p>
          <Link href="/order" className="btn btn-primary mt-7">
            Back to the menu
          </Link>
        </main>
      </>
    );
  }

  const idx = Math.max(0, STEPS.findIndex((s) => s.id === order.status));
  const pct = order.status === "canceled" ? 0 : order.status === "completed" || order.status === "ready" ? 100 : order.status === "making" ? 62 : 22;
  const minsLeft = Math.max(0, Math.round((order.readyBy - now) / 60_000));
  const copy = COPY[order.status];
  const done = order.status === "ready" || order.status === "completed";

  return (
    <>
      <Header overScene={false} />
      <main id="main" className="mx-auto max-w-[1000px] px-4 pb-24 pt-[96px] sm:px-8">
        <div className="grid gap-8 md:grid-cols-[auto_1fr] md:items-center">
          <div className="grid place-items-center rounded-[32px] p-6" style={{ background: "var(--surface)", border: "1px solid var(--line)", color: "var(--fg)" }}>
            <FillingCup pct={pct} done={done} />
            <div className="eyebrow mt-1 opacity-70">Order</div>
            <div className="display text-[3rem] leading-none" style={{ animation: "pop-in .6s var(--ease)" }}>
              {order.number}
            </div>
          </div>

          <div>
            <p className="eyebrow opacity-70">Thanks, {order.customer.name.split(" ")[0]}</p>
            <h1 className="display mt-2 text-[clamp(2.6rem,6vw,4.6rem)]" aria-live="polite">
              {copy.title}
            </h1>
            <p className="mt-3 text-[1.1rem]" style={{ color: "var(--muted)" }}>
              {copy.sub}
            </p>

            <ol className="mt-8 grid grid-cols-3 gap-2" aria-label="Order progress">
              {STEPS.map((s, i) => {
                const reached = i <= idx && order.status !== "canceled";
                return (
                  <li key={s.id} aria-current={i === idx ? "step" : undefined}>
                    <div className="h-2 overflow-hidden rounded-full" style={{ background: "var(--surface-2)" }}>
                      <div className="h-full rounded-full transition-[width] duration-[1200ms]" style={{ width: reached ? "100%" : "0%", background: done ? "var(--aroma-green)" : "var(--accent)" }} />
                    </div>
                    <div className="mt-2 text-[0.9rem] font-semibold" style={{ opacity: reached ? 1 : 0.5 }}>
                      {s.label}
                    </div>
                  </li>
                );
              })}
            </ol>

            <div className="mt-8 flex flex-wrap gap-3">
              <div className="chip !px-4 !py-2.5 !text-[0.95rem]">
                {order.pickupAt ? `Scheduled for ${fmtTime(order.pickupAt)}` : done ? `Ready since ${fmtTime(order.statusAt.ready ?? order.readyBy)}` : minsLeft > 0 ? `About ${minsLeft} min` : "Any minute now"}
              </div>
              <div className="chip !px-4 !py-2.5 !text-[0.95rem]">{order.fulfillment === "here" ? "For here" : "To go"}</div>
              {order.alcohol && <div className="chip !px-4 !py-2.5 !text-[0.95rem]">Bring photo ID (21+)</div>}
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <a className="btn btn-primary" href={business.mapsUrl} target="_blank" rel="noreferrer">
                Get directions
              </a>
              <a className="btn btn-ghost" href={business.phoneHref}>
                Call {business.phone}
              </a>
            </div>
          </div>
        </div>

        <section className="mt-12 rounded-[28px] border p-6 sm:p-8" style={{ borderColor: "var(--line)", background: "var(--surface)" }} aria-label="Order details">
          <h2 className="display text-[1.8rem]">Your order</h2>
          <ul className="mt-4 divide-y" style={{ borderColor: "var(--line)" }}>
            {order.lines.map((l) => (
              <li key={l.id} className="flex items-start justify-between gap-4 py-3" style={{ borderColor: "var(--line)" }}>
                <div>
                  <div className="font-semibold">
                    {l.qty}× {l.name}
                  </div>
                  {l.options && (
                    <div className="text-[0.88rem]" style={{ color: "var(--muted)" }}>
                      {l.options}
                    </div>
                  )}
                  {l.note && (
                    <div className="text-[0.85rem] italic" style={{ color: "var(--muted)" }}>
                      &ldquo;{l.note}&rdquo;
                    </div>
                  )}
                </div>
                <div className="font-mono">{money(l.unit * l.qty)}</div>
              </li>
            ))}
          </ul>
          <dl className="mt-4 grid max-w-sm grid-cols-[1fr_auto] gap-x-6 gap-y-1.5 border-t pt-4" style={{ borderColor: "var(--line)" }}>
            <dt style={{ color: "var(--muted)" }}>Subtotal</dt>
            <dd className="font-mono">{money(order.totals.subtotal)}</dd>
            {order.totals.discount > 0 && (
              <>
                <dt style={{ color: "var(--aroma-green)" }}>{order.promo}</dt>
                <dd className="font-mono" style={{ color: "var(--aroma-green)" }}>
                  −{money(order.totals.discount)}
                </dd>
              </>
            )}
            <dt style={{ color: "var(--muted)" }}>Tax</dt>
            <dd className="font-mono">{money(order.totals.tax)}</dd>
            <dt style={{ color: "var(--muted)" }}>Tip</dt>
            <dd className="font-mono">{money(order.totals.tip)}</dd>
            <dt className="display pt-1 text-[1.3rem]">Paid</dt>
            <dd className="pt-1 font-mono text-[1.2rem] font-semibold">{money(order.totals.total)}</dd>
          </dl>
          <p className="mt-3 text-[0.85rem]" style={{ color: "var(--muted)" }}>
            {order.payment.brand}
            {order.payment.last4 && order.payment.last4 !== "0000" ? ` ending ${order.payment.last4}` : ""} · {business.address.street}, {business.address.city}
          </p>
        </section>

        <div className="mt-8 text-center">
          <Link href="/order" className="btn btn-ghost">
            Order something else
          </Link>
        </div>
      </main>
    </>
  );
}

/**
 * The order id comes from the address bar, not from a route param: the site is a static export, so /order/track/<anything>
 * is served by the same pre-built page (the host rewrites it to /order/track/_/) and the id is read here once it loads.
 */
const noSubscription = () => () => {};
const readOrderId = () => {
  const parts = window.location.pathname.split("/").filter(Boolean);
  const at = parts.indexOf("track");
  return at >= 0 ? decodeURIComponent(parts[at + 1] ?? "") : "";
};

/** null while the page is still being built or hydrated (there is no address bar yet), then the id from the URL. */
function useTrackedOrderId(): string | null {
  usePathname(); // re-read after a client-side navigation
  return useSyncExternalStore(noSubscription, readOrderId, () => null);
}

export default function TrackerApp() {
  const id = useTrackedOrderId();
  return <Providers>{id === null ? <Header overScene={false} /> : <Inner id={id} />}</Providers>;
}
