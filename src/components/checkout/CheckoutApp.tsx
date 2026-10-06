"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import Header from "@/components/site/Header";
import Providers, { useReady } from "@/components/order/Providers";
import Glyph from "@/components/order/Glyph";
import { describeSelections, getItem, unitPrice } from "@/lib/menu";
import { computeTotals, money, promoFor } from "@/lib/pricing";
import { asapAvailable, getPickupSlots } from "@/lib/slots";
import { cartHasAlcohol, cartSubtotal, lineTotal, useCart } from "@/store/cart";
import { isItemAvailable, slotCounts, useShop } from "@/store/shop";
import { business } from "@data/business";
import { paymentProvider } from "@/lib/payments/mock";
import { formatCardNumber, formatExp } from "@/lib/payments/mock";
import type { CardInput, PayMethod } from "@/lib/payments/types";
import type { OrderLine } from "@/lib/orders/types";
import SlotPicker from "./SlotPicker";
import PaySheet from "./PaySheet";

const formatPhone = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 10);
  if (d.length < 4) return d;
  if (d.length < 7) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
};

function Section({ n, title, children, hint }: { n: number; title: string; children: React.ReactNode; hint?: string }) {
  return (
    <section className="rounded-[26px] border p-5 sm:p-7" style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
      <div className="mb-5 flex items-baseline gap-3">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full font-mono text-[0.85rem]" style={{ background: "var(--fg)", color: "var(--bg)" }}>
          {n}
        </span>
        <h2 className="display text-[1.7rem]">{title}</h2>
        {hint && <span className="eyebrow ml-auto hidden opacity-60 sm:block">{hint}</span>}
      </div>
      {children}
    </section>
  );
}

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[0.9rem] font-semibold">
        {label}
      </label>
      {children}
      {error && (
        <p id={`${id}-err`} role="alert" className="mt-1.5 text-[0.85rem] font-medium text-[#d6402a]">
          {error}
        </p>
      )}
    </div>
  );
}

function Inner() {
  const router = useRouter();
  const ready = useReady();
  const lines = useCart((s) => s.lines);
  const fulfillment = useCart((s) => s.fulfillment);
  const customer = useCart((s) => s.customer);
  const tip = useCart((s) => s.tip);
  const pickup = useCart((s) => s.pickup);
  const promoCode = useCart((s) => s.promo);
  const notes = useCart((s) => s.notes);
  const set = useCart((s) => s.set);
  const orders = useShop((s) => s.orders);
  const paused = useShop((s) => s.paused);
  const soldOut = useShop((s) => s.soldOut);

  const [now, setNow] = useState<Date>(() => new Date());
  const [method, setMethod] = useState<PayMethod>("apple-pay");
  const [card, setCard] = useState<CardInput>({ number: "", exp: "", cvc: "", zip: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [payError, setPayError] = useState("");
  const [placing, setPlacing] = useState(false);
  const [idAck, setIdAck] = useState(false);
  const [wallet, setWallet] = useState<Exclude<PayMethod, "card"> | null>(null);
  const [customTip, setCustomTip] = useState("");
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const alcohol = cartHasAlcohol(lines);
  const counts = useMemo(() => slotCounts(orders), [orders]);

  // If we can't do ASAP (closed), or the chosen slot has passed or filled, move to a valid one.
  useEffect(() => {
    if (!ready) return;
    const slots = getPickupSlots(now, counts);
    if (pickup.mode === "asap" && !asapAvailable(now)) {
      const first = slots.find((s) => !s.full);
      if (first) set({ pickup: { mode: "at", at: first.at } });
    } else if (pickup.mode === "at" && !slots.some((s) => s.at === pickup.at && !s.full)) {
      const first = slots.find((s) => !s.full);
      set({ pickup: first ? { mode: "at", at: first.at } : { mode: "asap" } });
    }
  }, [ready, now, counts, pickup, set]);

  const subtotal = cartSubtotal(lines);
  const promo = promoCode ? promoFor(promoCode) : null;
  const totals = computeTotals({ subtotal, promoPercent: promo?.percent, tip: tip.kind === "percent" ? { percent: tip.value } : { cents: tip.cents } });
  const unavailable = lines.filter((l) => !isItemAvailable(l.itemId, soldOut));

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (customer.name.trim().length < 2) e.name = "Tell us a name for the order.";
    if (customer.phone.replace(/\D/g, "").length !== 10) e.phone = "Enter a 10 digit phone so we can text you when it's ready.";
    if (customer.email && !/^\S+@\S+\.\S+$/.test(customer.email)) e.email = "That email doesn't look right.";
    if (alcohol && !idAck) e.id = "Please confirm you're 21 or older.";
    if (alcohol && fulfillment === "togo") e.fulfillment = "Alcohol is served in the cafe. Switch to For here.";
    if (unavailable.length) e.items = "Something in your order sold out. Remove it to continue.";
    setErrors(e);
    if (Object.keys(e).length) {
      const first = Object.keys(e)[0];
      const el = document.getElementById(first === "id" ? "id-ack" : first) ?? formRef.current;
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      (el as HTMLElement | null)?.focus?.({ preventScroll: true });
      return false;
    }
    return true;
  };

  const finish = async (m: PayMethod) => {
    setPlacing(true);
    setPayError("");
    const res = await paymentProvider.pay({ amount: totals.total, method: m, card: m === "card" ? card : undefined, description: `${business.name} online order` });
    if (!res.ok) {
      setPlacing(false);
      setWallet(null);
      setPayError(res.error ?? "Payment failed. Please try again.");
      return;
    }
    const orderLines: OrderLine[] = lines.map((l) => {
      const it = getItem(l.itemId)!;
      return { id: l.key, itemId: it.id, name: it.name, qty: l.qty, options: describeSelections(it, l.sel), unit: unitPrice(it, l.sel), alcohol: it.ageRestricted, note: l.note };
    });
    const order = useShop.getState().placeOrder({
      lines: orderLines,
      fulfillment,
      customer: { name: customer.name.trim(), phone: customer.phone, email: customer.email.trim() || undefined },
      pickupAt: pickup.mode === "at" ? pickup.at : null,
      totals,
      promo: promo?.code,
      payment: { method: m, ref: res.ref ?? "", last4: res.last4, brand: res.brand },
      alcohol,
      notes: notes || undefined,
    });
    useCart.getState().clear();
    router.push(`/order/track/${order.id}`);
  };

  const submit = () => {
    if (placing || paused) return;
    if (!validate()) return;
    if (method === "card") void finish("card");
    else setWallet(method);
  };

  if (!ready) {
    return (
      <>
        <Header overScene={false} />
        <main className="mx-auto max-w-[1100px] px-4 pb-20 pt-28 sm:px-8">
          <div className="h-10 w-48 animate-pulse rounded-xl" style={{ background: "var(--surface-2)" }} />
        </main>
      </>
    );
  }

  if (lines.length === 0) {
    return (
      <>
        <Header overScene={false} />
        <main className="mx-auto grid max-w-[640px] place-items-center px-4 pb-24 pt-36 text-center">
          <Glyph vessel="cup" liquid="#b98a5e" size={110} className="opacity-70" />
          <h1 className="display mt-4 text-[2.6rem]">Your order is empty</h1>
          <p className="mt-2" style={{ color: "var(--muted)" }}>
            Add a drink or a bite and we&rsquo;ll have it ready.
          </p>
          <Link href="/order" className="btn btn-primary mt-7">
            Browse the menu
          </Link>
        </main>
      </>
    );
  }

  const tipPresets = business.ordering.tipPresets;
  const placeLabel = method === "apple-pay" ? "Pay with Apple Pay" : method === "google-pay" ? "Pay with Google Pay" : "Place order";

  const PlaceButton = (
    <button type="button" onClick={submit} disabled={placing || paused} className="btn btn-primary w-full justify-between !min-h-[58px] disabled:opacity-60">
      <span>{placing ? "Placing your order…" : paused ? "Ordering paused" : placeLabel}</span>
      <span className="font-mono">{money(totals.total)}</span>
    </button>
  );

  return (
    <>
      <Header overScene={false} />
      <main id="main" className="mx-auto max-w-[1200px] px-4 pb-36 pt-[92px] sm:px-8 lg:pb-20">
        <Link href="/order" className="inline-flex min-h-[44px] items-center gap-2 text-[0.95rem] font-semibold underline-offset-4 hover:underline">
          <span aria-hidden>←</span> Back to the menu
        </Link>
        <h1 className="display mt-2 text-[clamp(2.4rem,5vw,4rem)]">Checkout</h1>

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_400px]">
          <div ref={formRef} className="grid gap-5">
            {errors.items && (
              <p role="alert" className="rounded-2xl border px-4 py-3 font-medium" style={{ borderColor: "#d6402a", background: "color-mix(in oklab, #d6402a, transparent 90%)" }}>
                {errors.items}
              </p>
            )}

            <Section n={1} title="Who's it for?">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="name" label="Name for the order" error={errors.name}>
                  <input id="name" className="field" autoComplete="given-name" aria-invalid={!!errors.name} aria-describedby={errors.name ? "name-err" : undefined} value={customer.name} onChange={(e) => set({ customer: { ...customer, name: e.target.value } })} placeholder="First name is fine" />
                </Field>
                <Field id="phone" label="Mobile number (we text when it's ready)" error={errors.phone}>
                  <input id="phone" className="field" inputMode="tel" autoComplete="tel-national" aria-invalid={!!errors.phone} aria-describedby={errors.phone ? "phone-err" : undefined} value={customer.phone} onChange={(e) => set({ customer: { ...customer, phone: formatPhone(e.target.value) } })} placeholder="(716) 555-0123" />
                </Field>
                <div className="sm:col-span-2">
                  <Field id="email" label="Email for your receipt (optional)" error={errors.email}>
                    <input id="email" type="email" className="field" autoComplete="email" aria-invalid={!!errors.email} aria-describedby={errors.email ? "email-err" : undefined} value={customer.email} onChange={(e) => set({ customer: { ...customer, email: e.target.value } })} placeholder="you@example.com" />
                  </Field>
                </div>
              </div>
              <p className="mt-3 text-[0.85rem]" style={{ color: "var(--muted)" }}>
                No account needed. We remember your details on this device for next time.
              </p>
            </Section>

            <Section n={2} title={fulfillment === "here" ? "When will you arrive?" : "When do you want it?"}>
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <div className="grid grid-cols-2 gap-1 rounded-full p-1" style={{ background: "var(--surface-2)" }} role="radiogroup" aria-label="Order type">
                  {(["togo", "here"] as const).map((f) => (
                    <button key={f} type="button" role="radio" aria-checked={fulfillment === f} disabled={f === "togo" && alcohol} onClick={() => set({ fulfillment: f })} className="min-h-[44px] rounded-full px-5 text-[0.95rem] font-semibold disabled:cursor-not-allowed disabled:opacity-40" style={{ background: fulfillment === f ? "var(--fg)" : "transparent", color: fulfillment === f ? "var(--bg)" : "var(--fg)" }}>
                      {f === "togo" ? "To go" : "For here"}
                    </button>
                  ))}
                </div>
                <span className="text-[0.9rem]" style={{ color: "var(--muted)" }}>
                  {business.address.street} · {business.address.crossStreets}
                </span>
              </div>
              {errors.fulfillment && (
                <p role="alert" className="mb-3 text-[0.9rem] font-medium text-[#d6402a]">
                  {errors.fulfillment}
                </p>
              )}
              <SlotPicker fulfillment={fulfillment} now={now} />
            </Section>

            <Section n={3} title="Add a tip" hint="100% goes to the crew">
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5" role="radiogroup" aria-label="Tip">
                {tipPresets.map((p) => {
                  const on = tip.kind === "percent" && tip.value === p;
                  const amount = computeTotals({ subtotal, promoPercent: promo?.percent, tip: { percent: p } }).tip;
                  return (
                    <button key={p} type="button" role="radio" aria-checked={on} onClick={() => (setCustomTip(""), set({ tip: { kind: "percent", value: p } }))} className="rounded-2xl border-2 px-2 py-3 text-center transition-colors" style={{ borderColor: on ? "var(--fg)" : "var(--line)", background: on ? "var(--fg)" : "transparent", color: on ? "var(--bg)" : "var(--fg)" }}>
                      <span className="block font-semibold">{p === 0 ? "No tip" : `${p}%`}</span>
                      <span className="block font-mono text-[0.82rem] opacity-80">{p === 0 ? "—" : money(amount)}</span>
                    </button>
                  );
                })}
                <div className="col-span-2 sm:col-span-1">
                  <label htmlFor="custom-tip" className="sr-only">
                    Custom tip in dollars
                  </label>
                  <div className="relative h-full">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono opacity-60">$</span>
                    <input
                      id="custom-tip"
                      className="field !h-full !min-h-[62px] !pl-7 font-mono"
                      inputMode="decimal"
                      placeholder="Custom"
                      value={customTip}
                      onChange={(e) => {
                        const v = e.target.value.replace(/[^\d.]/g, "").slice(0, 6);
                        setCustomTip(v);
                        const cents = Math.round(parseFloat(v || "0") * 100);
                        set({ tip: { kind: "custom", cents: Number.isFinite(cents) ? cents : 0 } });
                      }}
                    />
                  </div>
                </div>
              </div>
            </Section>

            {alcohol && (
              <Section n={4} title="ID check">
                <label className="flex cursor-pointer items-start gap-3">
                  <input id="id-ack" type="checkbox" checked={idAck} onChange={(e) => setIdAck(e.target.checked)} className="mt-1 h-6 w-6 shrink-0 accent-[var(--aroma-green)]" aria-describedby={errors.id ? "id-err" : undefined} />
                  <span>
                    <strong>I&rsquo;m 21 or older</strong> and will show a valid photo ID when I get to the cafe. Alcohol is served for here only.
                  </span>
                </label>
                {errors.id && (
                  <p id="id-err" role="alert" className="mt-2 text-[0.88rem] font-medium text-[#d6402a]">
                    {errors.id}
                  </p>
                )}
              </Section>
            )}

            <Section n={alcohol ? 5 : 4} title="Payment">
              {paymentProvider.demo && (
                <p className="mb-4 rounded-xl border border-dashed px-4 py-3 text-[0.88rem]" style={{ borderColor: "var(--line)", background: "var(--surface-2)" }}>
                  <strong>Demo checkout.</strong> No card is charged. Try card <span className="font-mono">4242 4242 4242 4242</span>, any future date, any CVC. Use <span className="font-mono">4000 0000 0000 0002</span> to see a decline.
                </p>
              )}
              <div className="grid gap-2.5 sm:grid-cols-3" role="radiogroup" aria-label="Payment method">
                {(
                  [
                    ["apple-pay", "Apple Pay"],
                    ["google-pay", "Google Pay"],
                    ["card", "Card"],
                  ] as const
                ).map(([id, label]) => (
                  <button key={id} type="button" role="radio" aria-checked={method === id} onClick={() => setMethod(id)} className="min-h-[56px] rounded-2xl border-2 px-4 font-semibold transition-colors" style={{ borderColor: method === id ? "var(--fg)" : "var(--line)", background: method === id ? "var(--surface-2)" : "transparent" }}>
                    {label}
                  </button>
                ))}
              </div>
              {method === "card" && (
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Field id="cc-number" label="Card number">
                      <input id="cc-number" className="field font-mono" inputMode="numeric" autoComplete="cc-number" placeholder="4242 4242 4242 4242" value={card.number} onChange={(e) => setCard({ ...card, number: formatCardNumber(e.target.value) })} />
                    </Field>
                  </div>
                  <Field id="cc-exp" label="Expiry">
                    <input id="cc-exp" className="field font-mono" inputMode="numeric" autoComplete="cc-exp" placeholder="MM/YY" value={card.exp} onChange={(e) => setCard({ ...card, exp: formatExp(e.target.value) })} />
                  </Field>
                  <Field id="cc-csc" label="Security code">
                    <input id="cc-csc" className="field font-mono" inputMode="numeric" autoComplete="cc-csc" placeholder="CVC" maxLength={4} value={card.cvc} onChange={(e) => setCard({ ...card, cvc: e.target.value.replace(/\D/g, "") })} />
                  </Field>
                  <Field id="cc-zip" label="ZIP">
                    <input id="cc-zip" className="field font-mono" inputMode="numeric" autoComplete="postal-code" maxLength={5} placeholder="14222" value={card.zip} onChange={(e) => setCard({ ...card, zip: e.target.value.replace(/\D/g, "") })} />
                  </Field>
                </div>
              )}
              {payError && (
                <p role="alert" className="mt-4 rounded-xl border px-4 py-3 font-medium" style={{ borderColor: "#d6402a", background: "color-mix(in oklab, #d6402a, transparent 90%)" }}>
                  {payError}
                </p>
              )}
            </Section>
          </div>

          {/* summary */}
          <aside className="lg:sticky lg:top-[92px] lg:h-fit" aria-label="Order summary">
            <div className="rounded-[26px] border p-6" style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
              <h2 className="display text-[1.6rem]">Order summary</h2>
              <p className="mt-1 text-[0.9rem]" style={{ color: "var(--muted)" }}>
                {fulfillment === "here" ? "For here" : "To go"} · {pickup.mode === "asap" ? "As soon as possible" : new Date(pickup.at).toLocaleString("en-US", { weekday: "short", hour: "numeric", minute: "2-digit", timeZone: business.timezone })}
              </p>
              <ul className="mt-4 divide-y" style={{ borderColor: "var(--line)" }}>
                {lines.map((l) => {
                  const it = getItem(l.itemId);
                  if (!it) return null;
                  return (
                    <li key={l.key} className="flex items-start justify-between gap-3 py-3" style={{ borderColor: "var(--line)" }}>
                      <div className="min-w-0">
                        <div className="font-semibold leading-tight">
                          {l.qty > 1 && <span className="mr-1.5 font-mono opacity-70">{l.qty}×</span>}
                          {it.name}
                        </div>
                        {describeSelections(it, l.sel) && (
                          <div className="mt-0.5 text-[0.82rem]" style={{ color: "var(--muted)" }}>
                            {describeSelections(it, l.sel)}
                          </div>
                        )}
                      </div>
                      <div className="font-mono text-[0.92rem]">{money(lineTotal(l))}</div>
                    </li>
                  );
                })}
              </ul>
              <dl className="mt-3 grid grid-cols-[1fr_auto] gap-x-4 gap-y-1.5 border-t pt-4 text-[0.95rem]" style={{ borderColor: "var(--line)" }}>
                <dt style={{ color: "var(--muted)" }}>Subtotal</dt>
                <dd className="font-mono">{money(totals.subtotal)}</dd>
                {totals.discount > 0 && (
                  <>
                    <dt className="font-semibold" style={{ color: "var(--aroma-green)" }}>
                      {promo?.code}
                    </dt>
                    <dd className="font-mono font-semibold" style={{ color: "var(--aroma-green)" }}>
                      −{money(totals.discount)}
                    </dd>
                  </>
                )}
                <dt style={{ color: "var(--muted)" }}>Tax ({+(business.taxRate * 100).toFixed(2)}%)</dt>
                <dd className="font-mono">{money(totals.tax)}</dd>
                <dt style={{ color: "var(--muted)" }}>Tip</dt>
                <dd className="font-mono">{money(totals.tip)}</dd>
                <dt className="display pt-2 text-[1.35rem]">Total</dt>
                <dd className="pt-2 font-mono text-[1.3rem] font-semibold">{money(totals.total)}</dd>
              </dl>
              <div className="mt-5 hidden lg:block">{PlaceButton}</div>
              <p className="mt-3 text-center text-[0.8rem]" style={{ color: "var(--muted)" }}>
                No service fees. By ordering you agree to pick up at {business.address.street}.
              </p>
            </div>
          </aside>
        </div>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t p-3 lg:hidden" style={{ background: "color-mix(in oklab, var(--bg), transparent 4%)", borderColor: "var(--line)", paddingBottom: "max(12px, env(safe-area-inset-bottom))", backdropFilter: "blur(14px)" }}>
        {PlaceButton}
      </div>

      {wallet && <PaySheet method={wallet} amount={totals.total} onCancel={() => setWallet(null)} onConfirm={() => void finish(wallet)} />}
    </>
  );
}

export default function CheckoutApp() {
  return (
    <Providers>
      <Inner />
    </Providers>
  );
}
