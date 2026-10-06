import type { PaymentProvider, PaymentRequest, PaymentResult } from "./types";

/** Luhn checksum, so the demo card form rejects obvious typos like a real one would. */
export function luhn(num: string): boolean {
  const d = num.replace(/\D/g, "");
  if (d.length < 12) return false;
  let sum = 0;
  let alt = false;
  for (let i = d.length - 1; i >= 0; i--) {
    let n = Number(d[i]);
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

export function cardBrand(num: string): string {
  const d = num.replace(/\D/g, "");
  if (/^4/.test(d)) return "Visa";
  if (/^(5[1-5]|2[2-7])/.test(d)) return "Mastercard";
  if (/^3[47]/.test(d)) return "Amex";
  if (/^6(011|5)/.test(d)) return "Discover";
  return "Card";
}

export function formatCardNumber(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 16);
  return d.replace(/(.{4})/g, "$1 ").trim();
}

export function formatExp(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
}

export function validateCard(c: NonNullable<PaymentRequest["card"]>, now = new Date()): string | null {
  if (!luhn(c.number)) return "That card number doesn't look right.";
  const m = /^(\d{2})\/(\d{2})$/.exec(c.exp);
  if (!m) return "Enter the expiry as MM/YY.";
  const mm = Number(m[1]);
  const yy = 2000 + Number(m[2]);
  if (mm < 1 || mm > 12) return "That expiry month isn't valid.";
  const endOfMonth = new Date(yy, mm, 0, 23, 59, 59);
  if (endOfMonth < now) return "That card has expired.";
  if (!/^\d{3,4}$/.test(c.cvc)) return "Enter the 3 or 4 digit security code.";
  if (!/^\d{5}$/.test(c.zip)) return "Enter your 5 digit ZIP.";
  return null;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const ref = () => `demo_${Math.random().toString(36).slice(2, 10)}`;

/**
 * Demo processor. 4242 4242 4242 4242 succeeds, 4000 0000 0000 0002 is declined.
 * Apple Pay / Google Pay always succeed (the sheet is simulated in the UI).
 */
export const mockProvider: PaymentProvider = {
  id: "mock",
  demo: true,
  async pay(req: PaymentRequest): Promise<PaymentResult> {
    await wait(req.method === "card" ? 1400 : 700);
    if (req.method !== "card") return { ok: true, ref: ref(), brand: req.method === "apple-pay" ? "Apple Pay" : "Google Pay", last4: "0000" };
    const card = req.card;
    if (!card) return { ok: false, error: "Enter your card details." };
    const bad = validateCard(card);
    if (bad) return { ok: false, error: bad };
    const digits = card.number.replace(/\D/g, "");
    if (digits === "4000000000000002") return { ok: false, error: "Your card was declined. Try a different card." };
    return { ok: true, ref: ref(), last4: digits.slice(-4), brand: cardBrand(digits) };
  },
};

export const paymentProvider: PaymentProvider = mockProvider;
