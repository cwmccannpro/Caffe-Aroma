"use client";

import { useEffect, useRef, useState } from "react";
import { money } from "@/lib/pricing";
import { business } from "@data/business";
import type { PayMethod } from "@/lib/payments/types";

/** A simulated wallet sheet (Apple Pay / Google Pay) so the pitch shows the real one-tap experience. */
export default function PaySheet({ method, amount, onConfirm, onCancel }: { method: Exclude<PayMethod, "card">; amount: number; onConfirm: () => void; onCancel: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [stage, setStage] = useState<"ready" | "auth" | "done">("ready");
  const label = method === "apple-pay" ? "Apple Pay" : "Google Pay";

  useEffect(() => {
    const d = dialog.current;
    if (d && !d.open) d.showModal();
  }, []);

  const pay = () => {
    setStage("auth");
    window.setTimeout(() => setStage("done"), 900);
    window.setTimeout(onConfirm, 1500);
  };

  return (
    <dialog ref={dialog} className="sheet" style={{ maxWidth: 440 }} aria-label={`${label} (demo)`} onClose={onCancel} onClick={(e) => e.target === dialog.current && stage === "ready" && onCancel()}>
      <div className="p-6">
        <div className="flex items-center justify-between">
          <span className="eyebrow opacity-70">{label} · demo</span>
          {stage === "ready" && (
            <button type="button" onClick={onCancel} className="min-h-[44px] px-2 text-[0.95rem] underline underline-offset-4">
              Cancel
            </button>
          )}
        </div>
        <div className="mt-5 rounded-2xl p-5" style={{ background: "var(--surface-2)" }}>
          <div className="flex items-baseline justify-between">
            <span className="font-semibold">{business.name}</span>
            <span className="font-mono text-[1.4rem]">{money(amount)}</span>
          </div>
          <div className="mt-1 text-[0.88rem]" style={{ color: "var(--muted)" }}>
            {business.address.street}, Buffalo · Pay with ••0000
          </div>
        </div>

        <div className="mt-8 grid place-items-center">
          {stage === "ready" && (
            <button type="button" onClick={pay} className="btn w-full !min-h-[60px] text-[1.1rem]" style={{ background: "#000", color: "#fff", border: "1px solid #3a3a3a" }}>
              {method === "apple-pay" ? "Confirm with Face ID" : "Confirm payment"}
            </button>
          )}
          {stage === "auth" && (
            <div className="grid place-items-center gap-3 py-2" role="status">
              <svg width="64" height="64" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden>
                <circle cx="32" cy="32" r="26" opacity=".2" />
                <path d="M32 6a26 26 0 0 1 26 26" style={{ transformOrigin: "32px 32px", animation: "spin .8s linear infinite" }} />
              </svg>
              <span className="text-[0.95rem]">Authenticating…</span>
            </div>
          )}
          {stage === "done" && (
            <div className="grid place-items-center gap-3 py-2" role="status">
              <svg width="64" height="64" viewBox="0 0 64 64" fill="none" stroke="#3ecf6e" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <circle cx="32" cy="32" r="26" />
                <path d="M20 33l9 9 16-18" />
              </svg>
              <span className="text-[0.95rem] font-semibold">Done</span>
            </div>
          )}
        </div>
        <p className="mt-6 text-center text-[0.8rem]" style={{ color: "var(--muted)" }}>
          Demo only. Nothing is charged. In production this is the real {label} sheet.
        </p>
      </div>
    </dialog>
  );
}
