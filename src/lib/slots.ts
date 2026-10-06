import { business } from "@data/business";
import { formatHour, hoursFor, zonedNow } from "@/lib/time";

export interface PickupSlot {
  /** epoch ms of the pickup time */
  at: number;
  label: string;
  /** which day it falls on, relative to "now" in Buffalo */
  dayOffset: 0 | 1 | 2;
  full: boolean;
}

const MIN = 60_000;

/** The earliest we can plausibly have an order ready, rounded up to the next slot boundary. */
function roundUp(ms: number, slot: number) {
  const step = slot * MIN;
  return Math.ceil(ms / step) * step;
}

/**
 * Pickup slots for today and the next days, in Buffalo time.
 * `counts` is how many orders are already booked per slot (epoch ms -> count).
 */
export function getPickupSlots(now: Date = new Date(), counts: Record<number, number> = {}): PickupSlot[] {
  const { slotMinutes, slotCapacity, maxDaysAhead, asapMinutes } = business.ordering;
  const z = zonedNow(now);
  // epoch ms of Buffalo midnight today
  const midnightToday = now.getTime() - z.minutes * MIN - now.getSeconds() * 1000 - now.getMilliseconds();
  const slots: PickupSlot[] = [];
  const earliest = now.getTime() + asapMinutes[1] * MIN;
  for (let d = 0; d <= maxDaysAhead; d++) {
    const day = (z.day + d) % 7;
    const { open, close } = hoursFor(day);
    const dayStart = midnightToday + d * 24 * 60 * MIN;
    const first = dayStart + open * 60 * MIN;
    const last = dayStart + close * 60 * MIN - slotMinutes * MIN; // last pickup slot starts 15 min before close
    for (let t = first; t <= last; t += slotMinutes * MIN) {
      if (t < roundUp(earliest, slotMinutes)) continue;
      const hh = open + ((t - first) / MIN) / 60;
      slots.push({
        at: t,
        label: formatHour(hh),
        dayOffset: d as 0 | 1 | 2,
        full: (counts[t] ?? 0) >= slotCapacity,
      });
    }
  }
  return slots;
}

/** Can a customer order for "as soon as possible" right now? */
export function asapAvailable(now: Date = new Date()): boolean {
  const z = zonedNow(now);
  const { open, close } = hoursFor(z.day);
  // need at least the longest ASAP window before close
  return z.hour >= open && z.hour <= close - business.ordering.asapMinutes[1] / 60;
}

export function asapLabel(): string {
  const [a, b] = business.ordering.asapMinutes;
  return `${a}-${b} min`;
}

export function dayLabel(dayOffset: number): string {
  return dayOffset === 0 ? "Today" : dayOffset === 1 ? "Tomorrow" : "Later";
}
