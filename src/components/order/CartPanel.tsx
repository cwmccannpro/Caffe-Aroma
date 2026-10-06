"use client";

import Link from "next/link";
import { useState } from "react";
import { business } from "@data/business";
import { defaultSelections, describeSelections, getItem } from "@/lib/menu";
import { computeTotals, money, promoFor } from "@/lib/pricing";
import { cartCount, cartHasAlcohol, cartSubtotal, lineTotal, useCart } from "@/store/cart";
import { isItemAvailable, useShop } from "@/store/shop";
import Glyph from "./Glyph";

const UPSELL_IDS = ["BF1HGM5MXGC9G", "M0B7W521Q9QSW", "H878558BJZ4PW"];

interface Props {
  onEdit: (key: string, itemId: string) => void;
  onNavigate?: () => void;
}

export default function CartPanel({ onEdit, onNavigate }: Props) {
  const lines = useCart((s) => s.lines);
  const fulfillment = useCart((s) => s.fulfillment);
  const promoCode = useCart((s) => s.promo);
  const set = useCart((s) => s.set);
  const setQty = useCart((s) => s.setQty);
  const remove = useCart((s) => s.remove);
  const add = useCart((s) => s.add);
  const paused = useShop((s) => s.paused);
  const soldOut = useShop((s) => s.soldOut);
  const taxPct = `${+(business.taxRate * 100).toFixed(2)}%`;
  const [promoInput, setPromoInput] = useState("");
  const [promoError, setPromoError] = useState("");
  const [promoOpen, setPromoOpen] = useState(false);

  const subtotal = cartSubtotal(lines);
  const promo = promoCode ? promoFor(promoCode) : null;
  const totals = computeTotals({ subtotal, promoPercent: promo?.percent, tip: { cents: 0 } });
  const alcohol = cartHasAlcohol(lines);
  const count = cartCount(lines);
  const upsell = UPSELL_IDS.filter((id) => !lines.some((l) => l.itemId === id) && isItemAvailable(id, soldOut))
    .map((id) => getItem(id)!)
    .slice(0, 3);

  const applyPromo = () => {
    const p = promoFor(promoInput);
    if (!p) {
      setPromoError("That code isn't valid.");
      return;
    }
    setPromoError("");
    set({ promo: p.code });
    setPromoInput("");
    setPromoOpen(false);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-baseline justify-between">
        <h2 className="display text-[1.8rem]">Your order</h2>
        {count > 0 && <span className="eyebrow opacity-70">{count} item{count === 1 ? "" : "s"}</span>}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-1 rounded-full p-1" style={{ background: "var(--surface-2)" }} role="radiogroup" aria-label="Order type">
        {(["togo", "here"] as const).map((f) => {
          const on = fulfillment === f;
          const blocked = f === "togo" && alcohol;
          return (
            <button
              key={f}
              type="button"
              role="radio"
              aria-checked={on}
              disabled={blocked}
              title={blocked ? "Alcohol is served in the cafe only" : undefined}
              onClick={() => set({ fulfillment: f })}
              className="min-h-[44px] rounded-full text-[0.95rem] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40"
              style={{ background: on ? "var(--fg)" : "transparent", color: on ? "var(--bg)" : "var(--fg)" }}
            >
              {f === "togo" ? "To go" : "For here"}
            </button>
          );
        })}
      </div>
      {alcohol && (
        <p className="mt-2 text-[0.82rem]" style={{ color: "var(--muted)" }}>
          Your order has alcohol, so it&rsquo;s served for here. Bring ID.
        </p>
      )}

      {lines.length === 0 ? (
        <div className="mt-10 flex flex-1 flex-col items-center text-center" style={{ color: "var(--muted)" }}>
          <Glyph vessel="cup" liquid="#b98a5e" size={88} className="opacity-60" />
          <p className="display mt-3 text-[1.3rem]" style={{ color: "var(--fg)" }}>
            Nothing yet
          </p>
          <p className="mt-1 max-w-[16rem] text-[0.95rem]">Pick a drink and it lands here. Skip the line, we&rsquo;ll have it ready.</p>
        </div>
      ) : (
        <>
          <div className="mt-2 min-h-0 flex-1 overflow-y-auto pr-1">
          <ul className="mt-2 divide-y" style={{ borderColor: "var(--line)" }}>
            {lines.map((l) => {
              const item = getItem(l.itemId);
              if (!item) return null;
              const gone = !isItemAvailable(l.itemId, soldOut);
              return (
                <li key={l.key} className="py-4" style={{ borderColor: "var(--line)" }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold leading-tight">{item.name}</div>
                      {describeSelections(item, l.sel) && (
                        <div className="mt-0.5 text-[0.85rem] leading-snug" style={{ color: "var(--muted)" }}>
                          {describeSelections(item, l.sel)}
                        </div>
                      )}
                      {l.note && (
                        <div className="mt-0.5 text-[0.82rem] italic" style={{ color: "var(--muted)" }}>
                          &ldquo;{l.note}&rdquo;
                        </div>
                      )}
                      {gone && <div className="mt-1 text-[0.85rem] font-semibold text-[#d6402a]">No longer available. Please remove.</div>}
                    </div>
                    <div className="font-mono text-[0.95rem]">{money(lineTotal(l))}</div>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center rounded-full border" style={{ borderColor: "var(--line)" }} role="group" aria-label={`Quantity of ${item.name}`}>
                      <button type="button" aria-label={`Remove one ${item.name}`} className="grid h-10 w-10 place-items-center rounded-full" onClick={() => setQty(l.key, l.qty - 1)}>
                        {l.qty === 1 ? (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                            <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
                          </svg>
                        ) : (
                          "−"
                        )}
                      </button>
                      <span className="w-6 text-center font-mono text-[0.95rem]">{l.qty}</span>
                      <button type="button" aria-label={`Add one more ${item.name}`} className="grid h-10 w-10 place-items-center rounded-full" onClick={() => setQty(l.key, l.qty + 1)}>
                        +
                      </button>
                    </div>
                    <div className="flex gap-1">
                      <button type="button" className="min-h-[40px] rounded-full px-3 text-[0.88rem] font-semibold underline underline-offset-4" onClick={() => onEdit(l.key, l.itemId)}>
                        Edit
                      </button>
                      <button type="button" className="min-h-[40px] rounded-full px-3 text-[0.88rem] opacity-70 hover:opacity-100" onClick={() => remove(l.key)}>
                        Remove
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          {upsell.length > 0 && !alcohol && (
            <div className="mt-3 rounded-2xl p-3" style={{ background: "var(--surface-2)" }}>
              <div className="eyebrow mb-2 opacity-70">Add something sweet?</div>
              <div className="flex flex-col gap-1.5">
                {upsell.map((it) => (
                  <button key={it.id} type="button" onClick={() => add(it.id, defaultSelections(it))} className="flex min-h-[44px] items-center justify-between gap-3 rounded-xl px-2 text-left transition-colors hover:bg-[color-mix(in_oklab,var(--fg),transparent_92%)]">
                    <span className="flex items-center gap-2.5">
                      <Glyph vessel={it.preview.vessel} liquid={it.preview.liquid} size={30} />
                      <span className="text-[0.95rem] font-medium">{it.name}</span>
                    </span>
                    <span className="font-mono text-[0.88rem]">
                      + {money(it.price)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4">
            {promo ? (
              <div className="flex items-center justify-between rounded-xl border px-3 py-2 text-[0.92rem]" style={{ borderColor: "var(--aroma-green)", background: "color-mix(in oklab, var(--aroma-green), transparent 90%)" }}>
                <span>
                  <strong>{promo.code}</strong> · {promo.label}
                </span>
                <button type="button" aria-label="Remove promo code" className="grid h-9 w-9 place-items-center rounded-full" onClick={() => set({ promo: null })}>
                  ✕
                </button>
              </div>
            ) : promoOpen ? (
              <div>
                <div className="flex gap-2">
                  <input className="field !min-h-[46px]" aria-label="Promo code" placeholder="Try ELMWOOD10" value={promoInput} onChange={(e) => setPromoInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && applyPromo()} aria-invalid={!!promoError} autoCapitalize="characters" />
                  <button type="button" className="btn btn-primary !min-h-[46px] !px-5" onClick={applyPromo}>
                    Apply
                  </button>
                </div>
                {promoError && <p className="mt-1 text-[0.85rem] text-[#d6402a]">{promoError}</p>}
              </div>
            ) : (
              <button type="button" className="text-[0.92rem] font-semibold underline underline-offset-4" onClick={() => setPromoOpen(true)}>
                Have a promo code?
              </button>
            )}
          </div>
          </div>

          <dl className="mt-3 grid grid-cols-[1fr_auto] gap-x-4 gap-y-1.5 border-t pt-4 text-[0.95rem]" style={{ borderColor: "var(--line)" }}>
            <dt style={{ color: "var(--muted)" }}>Subtotal</dt>
            <dd className="font-mono">{money(totals.subtotal)}</dd>
            {totals.discount > 0 && (
              <>
                <dt className="font-semibold" style={{ color: "var(--aroma-green)" }}>
                  Promo
                </dt>
                <dd className="font-mono font-semibold" style={{ color: "var(--aroma-green)" }}>
                  −{money(totals.discount)}
                </dd>
              </>
            )}
            <dt style={{ color: "var(--muted)" }}>Tax ({taxPct})</dt>
            <dd className="font-mono">{money(totals.tax)}</dd>
            <dt className="display pt-1 text-[1.25rem]">Total before tip</dt>
            <dd className="pt-1 font-mono text-[1.15rem] font-semibold">{money(totals.total)}</dd>
          </dl>

          <Link
            href={paused ? "#" : "/order/checkout"}
            onClick={(e) => {
              if (paused) e.preventDefault();
              else onNavigate?.();
            }}
            aria-disabled={paused}
            className="btn btn-primary mt-4 w-full justify-between aria-disabled:opacity-50"
          >
            <span>Checkout</span>
            <span className="font-mono">{money(totals.total)}</span>
          </Link>
          {paused && (
            <p className="mt-2 text-center text-[0.85rem]" style={{ color: "var(--muted)" }}>
              Online ordering is paused. The counter is slammed, try again in a few minutes.
            </p>
          )}
        </>
      )}
    </div>
  );
}
