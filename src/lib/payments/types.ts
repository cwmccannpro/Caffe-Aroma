export type PayMethod = "apple-pay" | "google-pay" | "card";

export interface CardInput {
  number: string;
  /** MM/YY */
  exp: string;
  cvc: string;
  zip: string;
}

export interface PaymentRequest {
  /** cents */
  amount: number;
  method: PayMethod;
  card?: CardInput;
  description: string;
}

export interface PaymentResult {
  ok: boolean;
  /** processor reference, e.g. a Clover payment id */
  ref?: string;
  last4?: string;
  brand?: string;
  error?: string;
}

/**
 * The seam between the storefront and whoever moves the money.
 * Today: `mock` (demo, nothing is charged). After the owner signs off: a Clover Ecommerce adapter,
 * so card payments settle in their existing Clover merchant account and orders land in their POS.
 */
export interface PaymentProvider {
  id: "mock" | "clover" | "stripe";
  /** true = no real charge happens (show a demo notice in the UI) */
  demo: boolean;
  pay(req: PaymentRequest): Promise<PaymentResult>;
}
