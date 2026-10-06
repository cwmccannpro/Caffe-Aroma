"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { getItem, unitPrice, type Selections } from "@/lib/menu";
import type { Fulfillment } from "@/lib/orders/types";
import { business } from "@data/business";

export interface CartLine {
  key: string;
  itemId: string;
  qty: number;
  sel: Selections;
  note?: string;
}

export type Tip = { kind: "percent"; value: number } | { kind: "custom"; cents: number };
export type PickupChoice = { mode: "asap" } | { mode: "at"; at: number };

interface CartState {
  lines: CartLine[];
  fulfillment: Fulfillment;
  promo: string | null;
  customer: { name: string; phone: string; email: string };
  notes: string;
  tip: Tip;
  pickup: PickupChoice;
  add: (itemId: string, sel: Selections, qty?: number, note?: string) => void;
  update: (key: string, patch: Partial<Pick<CartLine, "sel" | "qty" | "note">>) => void;
  setQty: (key: string, qty: number) => void;
  remove: (key: string) => void;
  clear: () => void;
  set: (patch: Partial<Pick<CartState, "fulfillment" | "promo" | "customer" | "notes" | "tip" | "pickup">>) => void;
}

const sameSel = (a: Selections, b: Selections) => {
  const ka = Object.keys(a).filter((k) => a[k].length);
  const kb = Object.keys(b).filter((k) => b[k].length);
  if (ka.length !== kb.length) return false;
  return ka.every((k) => b[k] && [...a[k]].sort().join() === [...b[k]].sort().join());
};

const uid = () => Math.random().toString(36).slice(2, 10);

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      fulfillment: "togo",
      promo: null,
      customer: { name: "", phone: "", email: "" },
      notes: "",
      tip: { kind: "percent", value: business.ordering.defaultTip },
      pickup: { mode: "asap" },
      add: (itemId, sel, qty = 1, note) =>
        set((s) => {
          const existing = s.lines.find((l) => l.itemId === itemId && sameSel(l.sel, sel) && (l.note ?? "") === (note ?? ""));
          if (existing) return { lines: s.lines.map((l) => (l === existing ? { ...l, qty: Math.min(20, l.qty + qty) } : l)) };
          return { lines: [...s.lines, { key: uid(), itemId, qty, sel, note }] };
        }),
      update: (key, patch) => set((s) => ({ lines: s.lines.map((l) => (l.key === key ? { ...l, ...patch } : l)) })),
      setQty: (key, qty) => set((s) => ({ lines: qty <= 0 ? s.lines.filter((l) => l.key !== key) : s.lines.map((l) => (l.key === key ? { ...l, qty: Math.min(20, qty) } : l)) })),
      remove: (key) => set((s) => ({ lines: s.lines.filter((l) => l.key !== key) })),
      clear: () => set({ lines: [], promo: null, notes: "", pickup: { mode: "asap" } }),
      set: (patch) => set(patch),
    }),
    {
      name: "aroma.cart.v1",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      // never persist stale pickup slots
      partialize: (s) => ({ lines: s.lines, fulfillment: s.fulfillment, promo: s.promo, customer: s.customer, notes: s.notes, tip: s.tip }),
    },
  ),
);

// ───────────── derived helpers ─────────────
export function lineTotal(line: CartLine): number {
  const item = getItem(line.itemId);
  return item ? unitPrice(item, line.sel) * line.qty : 0;
}
export const cartSubtotal = (lines: CartLine[]) => lines.reduce((s, l) => s + lineTotal(l), 0);
export const cartCount = (lines: CartLine[]) => lines.reduce((s, l) => s + l.qty, 0);
export const cartHasAlcohol = (lines: CartLine[]) => lines.some((l) => getItem(l.itemId)?.ageRestricted);
