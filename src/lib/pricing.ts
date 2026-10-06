import { business } from "@data/business";

export const money = (cents: number): string =>
  (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });

/** Demo promo codes. Real ones will come from the owner / Clover discounts. */
export const PROMOS: Record<string, { label: string; percent: number }> = {
  ELMWOOD10: { label: "10% off your order", percent: 10 },
  NIGHTCAP: { label: "15% off, any evening", percent: 15 },
};

export function promoFor(code: string): { code: string; label: string; percent: number } | null {
  const key = code.trim().toUpperCase();
  const p = PROMOS[key];
  return p ? { code: key, ...p } : null;
}

export interface Totals {
  subtotal: number;
  discount: number;
  tip: number;
  tax: number;
  total: number;
  /** subtotal - discount, the base for tip and tax */
  net: number;
}

export interface TotalsInput {
  subtotal: number;
  promoPercent?: number;
  /** Either a preset percent of the net subtotal, or an exact amount in cents. */
  tip: { percent: number } | { cents: number };
  taxRate?: number;
}

/** All money is integer cents. Tip is on the pre-tax net; tax is on the net (tips are not taxed). */
export function computeTotals(input: TotalsInput): Totals {
  const subtotal = Math.max(0, Math.round(input.subtotal));
  const discount = Math.min(subtotal, Math.round((subtotal * (input.promoPercent ?? 0)) / 100));
  const net = subtotal - discount;
  const rate = input.taxRate ?? business.taxRate;
  const tax = Math.round(net * rate);
  const tip = "percent" in input.tip ? Math.round((net * input.tip.percent) / 100) : Math.max(0, Math.round(input.tip.cents));
  return { subtotal, discount, net, tax, tip, total: net + tax + tip };
}
