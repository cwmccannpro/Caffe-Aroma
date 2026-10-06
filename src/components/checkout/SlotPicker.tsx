"use client";

import { useMemo, useState } from "react";
import { asapAvailable, asapLabel, dayLabel, getPickupSlots } from "@/lib/slots";
import { business } from "@data/business";
import { useCart } from "@/store/cart";
import { slotCounts, useShop } from "@/store/shop";
import type { Fulfillment } from "@/lib/orders/types";

export default function SlotPicker({ fulfillment, now }: { fulfillment: Fulfillment; now: Date }) {
  const pickup = useCart((s) => s.pickup);
  const set = useCart((s) => s.set);
  const orders = useShop((s) => s.orders);
  const counts = useMemo(() => slotCounts(orders), [orders]);
  const slots = useMemo(() => getPickupSlots(now, counts), [now, counts]);
  const asapOk = asapAvailable(now);
  const days = useMemo(() => [...new Set(slots.map((s) => s.dayOffset))], [slots]);
  const selectedDay = pickup.mode === "at" ? slots.find((s) => s.at === pickup.at)?.dayOffset : undefined;
  const [day, setDay] = useState<number>(selectedDay ?? days[0] ?? 0);
  const activeDay = days.includes(day as 0 | 1 | 2) ? day : (days[0] ?? 0);
  const verb = fulfillment === "here" ? "arrive" : "pick up";

  const weekday = (at: number) => new Date(at).toLocaleDateString("en-US", { weekday: "short", timeZone: business.timezone });
  const dayName = (d: number) => (d < 2 ? dayLabel(d) : weekday(slots.find((s) => s.dayOffset === d)?.at ?? now.getTime()));

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label={`When do you want to ${verb}?`}>
        <button
          type="button"
          role="radio"
          aria-checked={pickup.mode === "asap"}
          disabled={!asapOk}
          onClick={() => set({ pickup: { mode: "asap" } })}
          className="rounded-2xl border-2 p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-45"
          style={{ borderColor: pickup.mode === "asap" ? "var(--fg)" : "var(--line)", background: pickup.mode === "asap" ? "var(--surface-2)" : "var(--surface)" }}
        >
          <span className="display block text-[1.25rem]">As soon as possible</span>
          <span className="mt-0.5 block text-[0.92rem]" style={{ color: "var(--muted)" }}>
            {asapOk ? `Ready in about ${asapLabel()}` : "We're closed right now. Schedule for when we open."}
          </span>
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={pickup.mode === "at"}
          onClick={() => set({ pickup: pickup.mode === "at" ? pickup : { mode: "at", at: slots.find((s) => !s.full)?.at ?? slots[0]?.at ?? Date.now() } })}
          className="rounded-2xl border-2 p-4 text-left transition-colors"
          style={{ borderColor: pickup.mode === "at" ? "var(--fg)" : "var(--line)", background: pickup.mode === "at" ? "var(--surface-2)" : "var(--surface)" }}
        >
          <span className="display block text-[1.25rem]">Schedule for later</span>
          <span className="mt-0.5 block text-[0.92rem]" style={{ color: "var(--muted)" }}>
            {pickup.mode === "at" ? `${dayName(slots.find((s) => s.at === pickup.at)?.dayOffset ?? 0)} at ${slots.find((s) => s.at === pickup.at)?.label ?? "…"}` : `Pick a ${business.ordering.slotMinutes}-minute window`}
          </span>
        </button>
      </div>

      {pickup.mode === "at" && (
        <div className="mt-4">
          {days.length > 1 && (
            <div className="mb-3 flex gap-2" role="tablist" aria-label="Day">
              {days.map((d) => (
                <button key={d} type="button" role="tab" aria-selected={activeDay === d} className="cat-chip" aria-current={activeDay === d} onClick={() => setDay(d)}>
                  {dayName(d)}
                </button>
              ))}
            </div>
          )}
          <div className="grid max-h-[260px] grid-cols-3 gap-2 overflow-y-auto pr-1 sm:grid-cols-4 md:grid-cols-5" role="radiogroup" aria-label="Time">
            {slots
              .filter((s) => s.dayOffset === activeDay)
              .map((s) => {
                const on = pickup.mode === "at" && pickup.at === s.at;
                return (
                  <button
                    key={s.at}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    disabled={s.full}
                    onClick={() => set({ pickup: { mode: "at", at: s.at } })}
                    className="min-h-[46px] rounded-xl border-[1.5px] px-2 font-mono text-[0.88rem] transition-colors disabled:cursor-not-allowed disabled:line-through disabled:opacity-40"
                    style={{ borderColor: on ? "var(--fg)" : "var(--line)", background: on ? "var(--fg)" : "var(--surface)", color: on ? "var(--bg)" : "var(--fg)" }}
                    title={s.full ? "This window is full" : undefined}
                  >
                    {s.label}
                  </button>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
