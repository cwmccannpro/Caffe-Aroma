"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { defaultSelections, describeSelections, getItem, groupsOf, missingRequired, unitPrice, type Selections } from "@/lib/menu";
import { money } from "@/lib/pricing";
import { useCart } from "@/store/cart";
import { isItemAvailable, useShop } from "@/store/shop";
import OptionGroup from "./OptionGroup";
import Glyph from "./Glyph";
import { PREVIEWABLE } from "./DrinkPreview3D";
import ErrorBoundary from "@/components/ui/ErrorBoundary";

const DrinkPreview3D = dynamic(() => import("./DrinkPreview3D"), { ssr: false, loading: () => <div className="absolute inset-0 animate-pulse" style={{ background: "color-mix(in oklab, var(--surface-2), transparent 50%)" }} /> });

interface Props {
  itemId: string;
  /** when set, we are editing an existing cart line */
  editKey?: string;
  onClose: () => void;
  onAdded?: (name: string) => void;
}

export default function ItemSheet({ itemId, editKey, onClose, onAdded }: Props) {
  const item = getItem(itemId)!;
  const line = useCart((s) => (editKey ? s.lines.find((l) => l.key === editKey) : undefined));
  const [sel, setSel] = useState<Selections>(() => line?.sel ?? defaultSelections(item));
  const [qty, setQty] = useState(line?.qty ?? 1);
  const [note, setNote] = useState(line?.note ?? "");
  const [tried, setTried] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const soldOut = useShop((s) => s.soldOut);
  const available = isItemAvailable(item.id, soldOut);
  const [mounted3d, setMounted3d] = useState(false);

  useEffect(() => {
    const d = dialog.current;
    if (d && !d.open) d.showModal();
    document.documentElement.style.overflow = "hidden";
    const t = window.setTimeout(() => setMounted3d(true), 120);
    return () => {
      window.clearTimeout(t);
      document.documentElement.style.overflow = "";
    };
  }, []);

  const groups = groupsOf(item);
  const missing = missingRequired(item, sel);
  const unit = unitPrice(item, sel);
  const total = unit * qty;
  const canPreview = PREVIEWABLE.has(item.preview.vessel);
  const previewSel = useMemo(() => sel, [sel]);

  const submit = () => {
    if (!available) return;
    if (missing.length) {
      setTried(true);
      document.getElementById(`grp-${missing[0].id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    const cart = useCart.getState();
    if (editKey) cart.update(editKey, { sel, qty, note: note.trim() || undefined });
    else cart.add(item.id, sel, qty, note.trim() || undefined);
    if (item.ageRestricted && cart.fulfillment === "togo") cart.set({ fulfillment: "here" });
    onAdded?.(item.name);
    onClose();
  };

  return (
    <dialog
      ref={dialog}
      className="sheet"
      aria-labelledby="sheet-title"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === dialog.current) onClose();
      }}
    >
      <div className="grid max-h-[inherit] grid-rows-[auto_1fr_auto] md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] md:grid-rows-[1fr_auto]">
        {/* preview */}
        <div className="relative md:row-span-2" style={{ background: "radial-gradient(90% 80% at 50% 38%, color-mix(in oklab, var(--surface-2), white 14%), var(--surface-2))" }}>
          <button type="button" onClick={onClose} aria-label="Close" className="absolute right-3 top-3 z-10 grid h-11 w-11 place-items-center rounded-full border" style={{ background: "var(--bg)", borderColor: "var(--line)" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
          <div className="relative h-[210px] md:h-full md:min-h-[460px]">
            {canPreview ? (
              mounted3d && (
                <ErrorBoundary
                  fallback={
                    <div className="absolute inset-0 grid place-items-center" style={{ color: "var(--fg)" }}>
                      <Glyph vessel={item.preview.vessel} liquid={item.preview.liquid} size={190} />
                    </div>
                  }
                >
                  <DrinkPreview3D item={item} sel={previewSel} />
                </ErrorBoundary>
              )
            ) : (
              <div className="absolute inset-0 grid place-items-center" style={{ color: "var(--fg)" }}>
                <Glyph vessel={item.preview.vessel} liquid={item.preview.liquid} size={190} />
              </div>
            )}
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 hidden p-6 md:block">
            <div className="eyebrow opacity-70">{item.serve === "iced" ? "Served cold" : item.serve === "hot" ? "Served hot" : "Caffe Aroma"}</div>
          </div>
        </div>

        {/* header + options */}
        <div ref={body} className="min-h-0 overflow-y-auto overscroll-contain px-5 pb-6 pt-5 md:px-8 md:pt-8">
          <h2 id="sheet-title" className="display text-[clamp(2rem,4vw,2.8rem)]">
            {item.name}
          </h2>
          <p className="mt-2 max-w-[34rem] text-[1.02rem] leading-relaxed" style={{ color: "var(--muted)" }}>
            {item.description}
          </p>
          {item.ageRestricted && (
            <p className="mt-4 rounded-xl border px-4 py-3 text-[0.92rem]" style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
              <strong>21+ only.</strong> Alcohol is served in the cafe, and we&rsquo;ll check ID when you arrive.
            </p>
          )}
          {!available && (
            <p className="mt-4 rounded-xl px-4 py-3 text-[0.95rem] font-semibold" style={{ background: "color-mix(in oklab, #d6402a, transparent 85%)", color: "var(--fg)" }}>
              Sold out right now. Check back soon.
            </p>
          )}

          <div className="mt-7 grid gap-8">
            {groups.map((g) => (
              <OptionGroup key={g.id} item={item} group={g} selected={sel[g.id] ?? []} onChange={(ids) => setSel((s) => ({ ...s, [g.id]: ids }))} invalid={tried && missing.some((m) => m.id === g.id)} />
            ))}
            <div>
              <label htmlFor="note" className="display mb-2 block text-[1.35rem]">
                Note for the barista
              </label>
              <textarea
                id="note"
                value={note}
                maxLength={140}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Extra hot, no ice, allergy…"
                rows={2}
                className="w-full resize-none rounded-2xl border-[1.5px] px-4 py-3 text-[1rem]"
                style={{ borderColor: "var(--line)", background: "var(--surface)", color: "var(--fg)" }}
              />
            </div>
          </div>
          {item.draftedByUs && <p className="mt-6 text-[0.78rem] opacity-60">Description is a draft awaiting the owner&rsquo;s approval.</p>}
        </div>

        {/* sticky add bar */}
        <div className="flex items-center gap-3 border-t px-5 py-4 md:px-8" style={{ borderColor: "var(--line)", background: "var(--bg)" }}>
          <div className="flex items-center rounded-full border-[1.5px]" style={{ borderColor: "var(--line)" }} role="group" aria-label="Quantity">
            <button type="button" aria-label="Decrease quantity" className="grid h-12 w-12 place-items-center rounded-full text-xl disabled:opacity-30" disabled={qty <= 1} onClick={() => setQty((q) => Math.max(1, q - 1))}>
              −
            </button>
            <span className="w-8 text-center font-mono text-[1.05rem]" aria-live="polite">
              {qty}
            </span>
            <button type="button" aria-label="Increase quantity" className="grid h-12 w-12 place-items-center rounded-full text-xl disabled:opacity-30" disabled={qty >= 20} onClick={() => setQty((q) => Math.min(20, q + 1))}>
              +
            </button>
          </div>
          <button type="button" onClick={submit} disabled={!available} className="btn btn-primary min-w-0 flex-1 justify-between disabled:opacity-50" aria-describedby="add-hint">
            <span className="truncate">{editKey ? "Update order" : missing.length ? `Choose ${missing[0].name.toLowerCase()}` : "Add to order"}</span>
            <span className="font-mono">{money(total)}</span>
          </button>
          <span id="add-hint" className="sr-only">
            {describeSelections(item, sel)}
          </span>
        </div>
      </div>
    </dialog>
  );
}
