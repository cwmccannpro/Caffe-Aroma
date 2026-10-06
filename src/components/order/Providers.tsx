"use client";

import { useEffect } from "react";
import { create } from "zustand";
import { useCart } from "@/store/cart";
import { startShopSync } from "@/store/shop";

const useReadyStore = create<{ ready: boolean }>(() => ({ ready: false }));

/** True once persisted cart + shop state have been read from the browser (avoids a hydration flash). */
export const useReady = () => useReadyStore((s) => s.ready);

/** Mount once around anything that reads the cart, orders or staff state. */
export default function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    void Promise.resolve(useCart.persist.rehydrate()).then(() => useReadyStore.setState({ ready: true }));
    startShopSync();
  }, []);
  return <>{children}</>;
}
