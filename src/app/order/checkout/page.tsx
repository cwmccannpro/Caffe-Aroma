import type { Metadata } from "next";
import CheckoutApp from "@/components/checkout/CheckoutApp";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default function CheckoutPage() {
  return <CheckoutApp />;
}
