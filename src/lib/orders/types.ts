import type { Totals } from "@/lib/pricing";
import type { PayMethod } from "@/lib/payments/types";

export type OrderStatus = "received" | "making" | "ready" | "completed" | "canceled";
export type Fulfillment = "here" | "togo";

export interface OrderLine {
  id: string;
  itemId: string;
  name: string;
  qty: number;
  /** "Medium · Oat · Vanilla" */
  options: string;
  /** cents, per unit */
  unit: number;
  alcohol: boolean;
  note?: string;
}

export interface Order {
  id: string;
  /** short number the customer says at the counter, e.g. "A-214" */
  number: string;
  createdAt: number;
  status: OrderStatus;
  statusAt: Partial<Record<OrderStatus, number>>;
  lines: OrderLine[];
  fulfillment: Fulfillment;
  customer: { name: string; phone: string; email?: string };
  /** epoch ms the customer asked for. null = as soon as possible. */
  pickupAt: number | null;
  /** epoch ms we promise it will be ready. */
  readyBy: number;
  totals: Totals;
  promo?: string;
  payment: { method: PayMethod; ref: string; last4?: string; brand?: string };
  alcohol: boolean;
  notes?: string;
}
