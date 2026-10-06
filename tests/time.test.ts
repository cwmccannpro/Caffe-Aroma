import { describe, expect, it } from "vitest";
import { formatHour, getOpenStatus, zonedNow } from "@/lib/time";
import { sampleTod, visualHour } from "@/lib/timeOfDay";
import { asapAvailable, getPickupSlots } from "@/lib/slots";

// October 6, 2026 is a Tuesday. Buffalo is on EDT (UTC-4) on that date.
const at = (h: number, m = 0) => new Date(Date.UTC(2026, 9, 6, h + 4, m));

describe("Buffalo clock", () => {
  it("reads the wall-clock time in America/New_York regardless of server timezone", () => {
    const z = zonedNow(at(17, 30));
    expect(z.day).toBe(2);
    expect(z.hour).toBeCloseTo(17.5, 5);
  });

  it("handles DST: the same UTC hour reads an hour apart in January (EST)", () => {
    const jan = new Date(Date.UTC(2027, 0, 12, 22, 0)); // 5 PM EST
    expect(zonedNow(jan).hour).toBeCloseTo(17, 5);
  });

  it("reports midnight as 0, not 24", () => {
    expect(zonedNow(at(0, 0)).hour).toBe(0);
  });

  it("formats hours the way the sign would", () => {
    expect(formatHour(6)).toBe("6 AM");
    expect(formatHour(13.5)).toBe("1:30 PM");
    expect(formatHour(24)).toBe("12 AM");
    expect(formatHour(0)).toBe("12 AM");
  });
});

describe("open status (6 AM to midnight)", () => {
  it("is open mid-morning and says when it closes", () => {
    const s = getOpenStatus(at(10));
    expect(s.open).toBe(true);
    expect(s.label).toBe("Open until 12 AM");
  });
  it("is open at 11:59 PM, closed at 12:01 AM and 5:59 AM, open again at 6:00", () => {
    expect(getOpenStatus(at(23, 59)).open).toBe(true);
    expect(getOpenStatus(at(0, 1)).open).toBe(false);
    expect(getOpenStatus(at(5, 59)).open).toBe(false);
    expect(getOpenStatus(at(5, 59)).label).toBe("Opens at 6 AM");
    expect(getOpenStatus(at(6, 0)).open).toBe(true);
  });
});

describe("time-of-day engine", () => {
  it("holds overnight on 'last call' and clamps to the visual day", () => {
    expect(visualHour(3)).toBe(24);
    expect(visualHour(6)).toBe(6);
  });
  it("is light by day and dark by night, with lamps and neon flipping on at dusk", () => {
    expect(sampleTod(13).night).toBe(0);
    expect(sampleTod(13).neon).toBeLessThan(0.05);
    expect(sampleTod(21).night).toBe(1);
    expect(sampleTod(21).neon).toBeGreaterThan(0.95);
    expect(sampleTod(21).lamp).toBeGreaterThan(0.95);
  });
  it("swaps table props from cup to glassware across the evening", () => {
    expect(sampleTod(10).dayProps).toBe(1);
    expect(sampleTod(10).nightProps).toBe(0);
    expect(sampleTod(21).dayProps).toBe(0);
    expect(sampleTod(21).nightProps).toBe(1);
    const mid = sampleTod(18.8);
    expect(mid.dayProps).toBeGreaterThan(0);
    expect(mid.nightProps).toBeGreaterThan(0);
  });
  it("sets the golden-hour table with the steaming cup and a full-size glass of red, and nothing sharing the cup's spot", () => {
    const golden = sampleTod(18);
    expect(golden.dayProps).toBe(1); // the cup, beside the book, at full size
    expect(golden.wine).toBe(1); // the glass on the right, at full size
    expect(golden.nightProps).toBe(0); // no coupe or candle yet: they would sit on top of the cup
    expect(golden.laptop).toBe(0);
    expect(golden.breakfast).toBe(0);
    // the glass is there for the whole evening and never at midday or breakfast
    for (const h of [21, 23.6, 24]) expect(sampleTod(h).wine, `wine at ${h}`).toBe(1);
    for (const h of [6.2, 10, 13, 16]) expect(sampleTod(h).wine, `wine at ${h}`).toBe(0);
    // the laptop is cleared away before the glass arrives, so they are never both on the right of the table
    for (let h = 6; h <= 24; h += 0.05) {
      const s = sampleTod(h);
      expect(Math.min(s.laptop, s.wine), `laptop and wine together at ${h.toFixed(2)}`).toBeLessThan(0.02);
      expect(Math.min(s.dayProps, s.nightProps) > 0 ? s.wine : 1, `wine during the cup/coupe swap at ${h.toFixed(2)}`).toBe(1);
    }
  });
  it("plays the story in order: croissant at 6 AM, laptop at midday, live music at golden hour, then none of them by last call", () => {
    expect(sampleTod(6.2).breakfast).toBe(1);
    expect(sampleTod(6.2).laptop).toBe(0);
    expect(sampleTod(6.2).music).toBe(0);
    // the croissant hands over to the laptop through late morning, with a moment where both are on the table
    const handover = sampleTod(11.1);
    expect(handover.breakfast).toBeGreaterThan(0);
    expect(handover.laptop).toBeGreaterThan(0);
    expect(sampleTod(13).breakfast).toBe(0);
    expect(sampleTod(13).laptop).toBe(1);
    // golden hour clears the laptop and sets up the music corner
    expect(sampleTod(18).laptop).toBe(0);
    expect(sampleTod(18).music).toBe(1);
    // after dark and at last call the table is as it always was
    for (const h of [21, 23.6, 24]) {
      const s = sampleTod(h);
      expect(s.breakfast, `breakfast at ${h}`).toBe(0);
      expect(s.laptop, `laptop at ${h}`).toBe(0);
      expect(s.music, `music at ${h}`).toBe(0);
    }
  });
  it("keeps every prop phase within 0..1 across the whole day", () => {
    for (let h = 6; h <= 24; h += 0.1) {
      const s = sampleTod(h);
      for (const v of [s.dayProps, s.nightProps, s.breakfast, s.laptop, s.music, s.wine]) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
  });
  it("returns valid hex colors everywhere in the day", () => {
    for (let h = 6; h <= 24; h += 0.25) {
      const s = sampleTod(h);
      for (const c of [s.skyTop, s.skyMid, s.skyHorizon, s.sunColor, s.fog]) expect(c).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});

describe("pickup slots", () => {
  it("starts after the ASAP window, in 15-minute steps, and never past closing", () => {
    const now = at(10, 3);
    const slots = getPickupSlots(now);
    const today = slots.filter((s) => s.dayOffset === 0);
    expect(today[0].at).toBeGreaterThanOrEqual(now.getTime() + 12 * 60_000);
    expect(today[0].label).toBe("10:15 AM");
    expect(today[1].at - today[0].at).toBe(15 * 60_000);
    expect(today[today.length - 1].label).toBe("11:45 PM");
  });

  it("when closed overnight, the first slot is when we open", () => {
    const slots = getPickupSlots(at(2, 0));
    const first = slots[0];
    expect(first.label).toBe("6 AM");
  });

  it("marks a slot full when capacity is reached", () => {
    const base = getPickupSlots(at(10, 3));
    const target = base[2].at;
    const slots = getPickupSlots(at(10, 3), { [target]: 6 });
    expect(slots.find((s) => s.at === target)?.full).toBe(true);
    expect(slots.find((s) => s.at === base[3].at)?.full).toBe(false);
  });

  it("ASAP is available mid-day, not in the last ten minutes, not overnight", () => {
    expect(asapAvailable(at(14))).toBe(true);
    expect(asapAvailable(at(23, 50))).toBe(false);
    expect(asapAvailable(at(3))).toBe(false);
  });
});
