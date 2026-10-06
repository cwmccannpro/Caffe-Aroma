"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Order, OrderStatus } from "@/lib/orders/types";
import { getItem } from "@/lib/menu";
import { business } from "@data/business";

/**
 * The cafe's live state: orders, "pause online ordering", and sold-out items.
 *
 * DEMO BACKEND: this lives in localStorage and syncs between tabs/windows of the same browser, which is how the
 * counter board (/staff) updates live in a second window. In production this becomes a server-backed store
 * (Clover orders API / Supabase realtime) behind the same actions.
 */
interface ShopState {
  orders: Order[];
  paused: boolean;
  soldOut: string[];
  seq: number;
  /** last heartbeat from an open staff board; the tracker only auto-advances demo orders when nobody is staffing */
  staffSeenAt: number;
  placeOrder: (o: Omit<Order, "id" | "number" | "createdAt" | "status" | "statusAt" | "readyBy"> & { readyBy?: number }) => Order;
  setStatus: (id: string, status: OrderStatus) => void;
  setPaused: (p: boolean) => void;
  toggleSoldOut: (itemId: string) => void;
  heartbeat: () => void;
  reset: () => void;
}

const uid = () => Math.random().toString(36).slice(2, 10);
const CHANNEL = "aroma-shop";

export const useShop = create<ShopState>()(
  persist(
    (set, get) => ({
      orders: [],
      paused: false,
      soldOut: [],
      seq: 0,
      staffSeenAt: 0,
      placeOrder: (draft) => {
        const seq = get().seq + 1;
        const now = Date.now();
        const readyBy = draft.readyBy ?? draft.pickupAt ?? now + business.ordering.asapMinutes[1] * 60_000;
        const order: Order = { ...draft, readyBy, id: uid() + uid(), number: `A-${100 + seq}`, createdAt: now, status: "received", statusAt: { received: now } };
        set((s) => ({ orders: [order, ...s.orders].slice(0, 60), seq }));
        return order;
      },
      setStatus: (id, status) =>
        set((s) => ({ orders: s.orders.map((o) => (o.id === id ? { ...o, status, statusAt: { ...o.statusAt, [status]: Date.now() } } : o)) })),
      setPaused: (paused) => set({ paused }),
      toggleSoldOut: (itemId) => set((s) => ({ soldOut: s.soldOut.includes(itemId) ? s.soldOut.filter((x) => x !== itemId) : [...s.soldOut, itemId] })),
      heartbeat: () => set({ staffSeenAt: Date.now() }),
      reset: () => set({ orders: [], seq: 0, paused: false, soldOut: [] }),
    }),
    {
      name: "aroma.shop.v1",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
    },
  ),
);

// ───────────── cross-tab sync ─────────────
let started = false;
/** Call once on the client. Keeps every open tab (customer, tracker, staff board) in step. */
export function startShopSync() {
  if (started || typeof window === "undefined") return;
  started = true;
  void useShop.persist.rehydrate();
  const bc = "BroadcastChannel" in window ? new BroadcastChannel(CHANNEL) : null;
  let applying = false;
  useShop.subscribe(() => {
    if (!applying) bc?.postMessage("changed");
  });
  const pull = () => {
    applying = true;
    void Promise.resolve(useShop.persist.rehydrate()).finally(() => {
      applying = false;
    });
  };
  bc?.addEventListener("message", pull);
  window.addEventListener("storage", (e) => {
    if (e.key === "aroma.shop.v1") pull();
  });
}

// ───────────── selectors ─────────────
export const isItemAvailable = (itemId: string, soldOut: string[]) => {
  const it = getItem(itemId);
  return !!it && it.available && !soldOut.includes(itemId);
};

/** How many live orders already hold each pickup slot (for capacity limits). */
export function slotCounts(orders: Order[]): Record<number, number> {
  const out: Record<number, number> = {};
  for (const o of orders) {
    if (o.pickupAt && o.status !== "canceled" && o.status !== "completed") out[o.pickupAt] = (out[o.pickupAt] ?? 0) + 1;
  }
  return out;
}

/** A few realistic orders so the counter board is never empty during a demo. */
export function seedDemoOrders() {
  const now = Date.now();
  const names = ["Maya R.", "Devon", "Priya S.", "Tom & Ellie"];
  const picks: string[][] = [
    ["0651TFGT50J06", "BF1HGM5MXGC9G"],
    ["FY0W5XMJAJ7KJ", "G6NYW4QD995P2"],
    ["W8KD3Z80TQB9C"],
    ["TWYYA7SQN44NC", "4CD3792BH1HAG"],
  ];
  picks.forEach((ids, i) => {
    const lines = ids
      .map((id) => getItem(id))
      .filter(Boolean)
      .map((it, j) => ({ id: uid(), itemId: it!.id, name: it!.name, qty: 1, options: "", unit: it!.price || 450, alcohol: it!.ageRestricted, note: j === 0 && i === 1 ? "no onions" : undefined }));
    const subtotal = lines.reduce((s, l) => s + l.unit, 0);
    const tax = Math.round(subtotal * 0.0875);
    const alcohol = lines.some((l) => l.alcohol);
    const o = useShop.getState().placeOrder({
      lines,
      fulfillment: alcohol ? "here" : "togo",
      customer: { name: names[i], phone: "(716) 555-01" + (10 + i) },
      pickupAt: null,
      readyBy: now + (8 + i * 3) * 60_000,
      totals: { subtotal, discount: 0, net: subtotal, tax, tip: 0, total: subtotal + tax },
      payment: { method: "card", ref: "demo_seed", last4: "4242", brand: "Visa" },
      alcohol,
    });
    if (i === 0) useShop.getState().setStatus(o.id, "making");
  });
}
