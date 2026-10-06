"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { defaultSelections, hasRequiredChoices, itemsByCategory, orderedCategories, searchItems, type Item } from "@/lib/menu";
import { getOpenStatus, type OpenStatus } from "@/lib/time";
import { money } from "@/lib/pricing";
import { cartCount, cartSubtotal, useCart } from "@/store/cart";
import { isItemAvailable, useShop } from "@/store/shop";
import { useTime } from "@/store/time";
import Header from "@/components/site/Header";
import StatusChip from "@/components/ui/StatusChip";
import Providers, { useReady } from "./Providers";
import ItemCard from "./ItemCard";
import ItemSheet from "./ItemSheet";
import CartPanel from "./CartPanel";

interface SheetState {
  itemId: string;
  editKey?: string;
}

function greeting(hour: number) {
  if (hour < 11) return { hi: "Good morning.", line: "The espresso machine has been on since six." };
  if (hour < 17.5) return { hi: "Afternoon fuel.", line: "Hot, iced or blended. Skip the line, pick it up." };
  return { hi: "After five, we turn into a bar.", line: "Coffee cocktails, beer and wine, still with espresso." };
}

function Inner() {
  const ready = useReady();
  const live = useTime((s) => s.live);
  const lines = useCart((s) => s.lines);
  const add = useCart((s) => s.add);
  const set = useCart((s) => s.set);
  const fulfillment = useCart((s) => s.fulfillment);
  const soldOut = useShop((s) => s.soldOut);
  const paused = useShop((s) => s.paused);

  const [sheet, setSheet] = useState<SheetState | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [status, setStatus] = useState<OpenStatus | null>(null);
  const toastTimer = useRef<number | null>(null);
  const chipRow = useRef<HTMLDivElement>(null);
  const cartDialog = useRef<HTMLDialogElement>(null);

  const cats = useMemo(() => orderedCategories(live), [live]);
  const results = useMemo(() => searchItems(query), [query]);
  const g = greeting(live);

  useEffect(() => {
    const tick = () => setStatus(getOpenStatus());
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, []);

  // scrollspy: highlight the category nearest the top of the viewport
  useEffect(() => {
    if (query) return;
    const els = cats.map((c) => document.getElementById(`cat-${c.id}`)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (vis[0]) setActive(vis[0].target.id.replace("cat-", ""));
      },
      { rootMargin: "-130px 0px -65% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [cats, query]);

  useEffect(() => {
    const chip = chipRow.current?.querySelector<HTMLElement>('[aria-current="true"]');
    chip?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [active]);

  useEffect(() => {
    const d = cartDialog.current;
    if (!d) return;
    if (cartOpen && !d.open) d.showModal();
    if (!cartOpen && d.open) d.close();
  }, [cartOpen]);

  const flash = (name: string) => {
    setToast(`Added ${name}`);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2600);
  };

  const openItem = (item: Item) => {
    if (hasRequiredChoices(item) || item.groups.length > 0) setSheet({ itemId: item.id });
    else {
      add(item.id, defaultSelections(item));
      if (item.ageRestricted && fulfillment === "togo") set({ fulfillment: "here" });
      flash(item.name);
    }
  };

  const goTo = (id: string) => {
    setQuery("");
    requestAnimationFrame(() => document.getElementById(`cat-${id}`)?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" }));
  };

  const count = ready ? cartCount(lines) : 0;
  const subtotal = ready ? cartSubtotal(lines) : 0;
  const closed = status && !status.open;

  return (
    <>
      <Header overScene={false} />
      <main id="main" className="pt-[68px]">
        {/* intro */}
        <section className="mx-auto max-w-[1400px] px-4 pb-4 pt-8 sm:px-8 sm:pt-10">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <StatusChip tone="theme" />
              <h1 className="display mt-4 text-[clamp(2.2rem,4.6vw,3.8rem)]">
                Order ahead.{" "}
                <span className="italic" style={{ color: "var(--accent)" }}>
                  {g.hi}
                </span>
              </h1>
              <p className="mt-3 max-w-[34rem] text-[1.05rem]" style={{ color: "var(--muted)" }}>
                {g.line}
              </p>
            </div>
            <div className="w-full max-w-[26rem]">
              <label htmlFor="menu-search" className="sr-only">
                Search the menu
              </label>
              <div className="relative">
                <svg className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 opacity-60" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
                  <circle cx="11" cy="11" r="7" />
                  <path d="M20 20l-3.5-3.5" />
                </svg>
                <input id="menu-search" type="search" className="field !pl-12" placeholder="Search lattes, bagels, beer…" value={query} onChange={(e) => setQuery(e.target.value)} />
              </div>
            </div>
          </div>

          {paused && (
            <div role="status" className="mt-6 rounded-2xl border px-5 py-4 font-medium" style={{ borderColor: "#d6402a", background: "color-mix(in oklab, #d6402a, transparent 88%)" }}>
              Online ordering is paused. The counter is slammed. You can still browse, and walk-ins are always welcome.
            </div>
          )}
          {closed && !paused && (
            <div role="status" className="mt-6 rounded-2xl border px-5 py-4" style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
              <strong>We&rsquo;re closed right now.</strong> {status?.label}. Go ahead and build your order: you can schedule it for pickup when we open.
            </div>
          )}
        </section>

        {/* category chips (mobile + tablet) */}
        <div className="sticky top-[68px] z-30 border-y backdrop-blur-xl lg:hidden" style={{ background: "color-mix(in oklab, var(--bg), transparent 8%)", borderColor: "var(--line)" }}>
          <div ref={chipRow} className="no-scrollbar mx-auto flex max-w-[1400px] gap-2 overflow-x-auto px-4 py-2.5 sm:px-8" role="group" aria-label="Jump to a menu category">
            {cats.map((c) => (
              <button key={c.id} type="button" className="cat-chip" aria-current={active === c.id} onClick={() => goTo(c.id)}>
                {c.name}
              </button>
            ))}
          </div>
        </div>

        <div className="mx-auto grid max-w-[1400px] gap-8 px-4 pb-32 pt-6 sm:px-8 lg:grid-cols-[210px_minmax(0,1fr)_380px] lg:pb-20">
          {/* left rail */}
          <nav aria-label="Menu categories" className="sticky top-[92px] hidden h-fit lg:block">
            <ul className="flex flex-col gap-1">
              {cats.map((c) => (
                <li key={c.id}>
                  <button type="button" onClick={() => goTo(c.id)} aria-current={active === c.id} className="flex min-h-[44px] w-full items-center justify-between rounded-xl px-3 text-left text-[0.98rem] font-medium transition-colors" style={{ background: active === c.id ? "var(--fg)" : "transparent", color: active === c.id ? "var(--bg)" : "var(--fg)" }}>
                    {c.name}
                    <span className="font-mono text-[0.75rem] opacity-60">{itemsByCategory(c.id).length}</span>
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          {/* menu */}
          <div className="min-w-0">
            {query ? (
              <section aria-live="polite">
                <h2 className="display mb-4 text-[1.8rem]">{results.length ? `${results.length} result${results.length === 1 ? "" : "s"} for “${query}”` : `Nothing matches “${query}”`}</h2>
                <div className="grid gap-3.5 md:grid-cols-2">
                  {results.map((it) => (
                    <ItemCard key={it.id} item={it} soldOut={!isItemAvailable(it.id, soldOut)} onOpen={() => openItem(it)} />
                  ))}
                </div>
              </section>
            ) : (
              cats.map((c) => (
                <section key={c.id} id={`cat-${c.id}`} aria-labelledby={`h-${c.id}`} className="mb-12 scroll-mt-[150px] lg:scroll-mt-[96px]">
                  <div className="mb-4 flex items-baseline justify-between gap-4 border-b pb-3" style={{ borderColor: "var(--line)" }}>
                    <h2 id={`h-${c.id}`} className="display text-[clamp(1.9rem,3.4vw,2.6rem)]">
                      {c.name}
                    </h2>
                    <p className="hidden text-right text-[0.95rem] sm:block" style={{ color: "var(--muted)" }}>
                      {c.blurb}
                    </p>
                  </div>
                  <div className="grid gap-3.5 md:grid-cols-2">
                    {itemsByCategory(c.id).map((it) => (
                      <ItemCard key={it.id} item={it} soldOut={!isItemAvailable(it.id, soldOut)} onOpen={() => openItem(it)} />
                    ))}
                  </div>
                </section>
              ))
            )}
            <p className="mt-4 text-[0.82rem] leading-relaxed" style={{ color: "var(--muted)" }}>
              Prices as listed on our register. Please tell us about any allergies. Alcohol is for guests 21 and over, served in the cafe, ID required.
            </p>
          </div>

          {/* desktop cart */}
          <aside aria-label="Your order" className="sticky top-[92px] hidden h-[calc(100dvh-116px)] rounded-[28px] border p-6 lg:block" style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
            {ready && <CartPanel onEdit={(key, itemId) => setSheet({ itemId, editKey: key })} />}
          </aside>
        </div>
      </main>

      {/* mobile cart bar */}
      {ready && count > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 p-3 lg:hidden" style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}>
          <button type="button" onClick={() => setCartOpen(true)} className="btn btn-primary w-full justify-between !min-h-[58px] shadow-2xl">
            <span className="flex items-center gap-3">
              <span className="grid h-8 min-w-8 place-items-center rounded-full px-2 font-mono text-[0.9rem]" style={{ background: "var(--on-cta)", color: "var(--cta)" }}>
                {count}
              </span>
              View order
            </span>
            <span className="font-mono">{money(subtotal)}</span>
          </button>
        </div>
      )}

      {/* mobile cart drawer */}
      <dialog ref={cartDialog} className="sheet" aria-label="Your order" onClose={() => setCartOpen(false)} onClick={(e) => e.target === cartDialog.current && setCartOpen(false)}>
        <div className="relative max-h-[inherit] overflow-y-auto p-5">
          <button type="button" aria-label="Close order" onClick={() => setCartOpen(false)} className="absolute right-4 top-4 z-10 grid h-11 w-11 place-items-center rounded-full border" style={{ borderColor: "var(--line)" }}>
            ✕
          </button>
          {cartOpen && <CartPanel onEdit={(key, itemId) => (setCartOpen(false), setSheet({ itemId, editKey: key }))} onNavigate={() => setCartOpen(false)} />}
        </div>
      </dialog>

      {sheet && <ItemSheet key={`${sheet.itemId}-${sheet.editKey ?? "new"}`} itemId={sheet.itemId} editKey={sheet.editKey} onClose={() => setSheet(null)} onAdded={flash} />}

      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex justify-center px-4 lg:bottom-8">
        {toast && (
          <div className="pointer-events-auto flex items-center gap-3 rounded-full px-5 py-3 text-[0.95rem] font-semibold shadow-2xl" style={{ background: "var(--fg)", color: "var(--bg)", animation: "sheet-in .3s var(--ease)" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
            {toast}
          </div>
        )}
      </div>
    </>
  );
}

export default function OrderApp() {
  return (
    <Providers>
      <Inner />
    </Providers>
  );
}
