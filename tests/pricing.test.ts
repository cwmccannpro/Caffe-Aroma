import { describe, expect, it } from "vitest";
import { computeTotals, money, promoFor } from "@/lib/pricing";

describe("computeTotals", () => {
  it("adds 8.75% Erie County tax on the net subtotal", () => {
    const t = computeTotals({ subtotal: 1000, tip: { cents: 0 } });
    expect(t.tax).toBe(88); // 87.5 rounds up
    expect(t.total).toBe(1088);
  });

  it("computes preset tip on the pre-tax net, not on tax", () => {
    const t = computeTotals({ subtotal: 2000, tip: { percent: 20 } });
    expect(t.tip).toBe(400);
    expect(t.tax).toBe(175);
    expect(t.total).toBe(2000 + 175 + 400);
  });

  it("applies a percent promo before tax and tip", () => {
    const t = computeTotals({ subtotal: 2000, promoPercent: 10, tip: { percent: 15 } });
    expect(t.discount).toBe(200);
    expect(t.net).toBe(1800);
    expect(t.tip).toBe(270);
    expect(t.tax).toBe(158); // 157.5
    expect(t.total).toBe(1800 + 158 + 270);
  });

  it("never lets a discount exceed the subtotal and ignores negative tips", () => {
    const t = computeTotals({ subtotal: 500, promoPercent: 150, tip: { cents: -300 } });
    expect(t.discount).toBe(500);
    expect(t.net).toBe(0);
    expect(t.tip).toBe(0);
    expect(t.total).toBe(0);
  });

  it("keeps everything in whole cents", () => {
    for (const subtotal of [1, 99, 275, 349, 1234, 9999]) {
      const t = computeTotals({ subtotal, promoPercent: 10, tip: { percent: 18 } });
      for (const v of [t.subtotal, t.discount, t.net, t.tax, t.tip, t.total]) expect(Number.isInteger(v)).toBe(true);
      expect(t.total).toBe(t.net + t.tax + t.tip);
    }
  });
});

describe("money + promos", () => {
  it("formats cents as dollars", () => {
    expect(money(1088)).toBe("$10.88");
    expect(money(0)).toBe("$0.00");
  });
  it("matches promo codes case-insensitively and rejects unknown ones", () => {
    expect(promoFor(" elmwood10 ")?.percent).toBe(10);
    expect(promoFor("FREECOFFEE")).toBeNull();
  });
});
