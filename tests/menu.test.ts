import { describe, expect, it } from "vitest";
import { defaultSelections, describeSelections, fromPrice, getItem, getGroup, menu, missingRequired, orderedCategories, unitPrice } from "@/lib/menu";

const byName = (n: string) => menu.items.find((i) => i.name === n)!;

describe("menu data integrity", () => {
  it("every item belongs to a real category and references real groups", () => {
    const cats = new Set(menu.categories.map((c) => c.id));
    for (const i of menu.items) {
      expect(cats.has(i.categoryId), i.name).toBe(true);
      for (const g of i.groups) expect(menu.groups[g], `${i.name} -> ${g}`).toBeTruthy();
    }
  });

  it("no item can be ordered for $0: a free base needs a required size/kit", () => {
    for (const i of menu.items) expect(fromPrice(i), i.name).toBeGreaterThan(0);
  });

  it("required groups always have options, and min <= max", () => {
    for (const g of Object.values(menu.groups)) {
      expect(g.options.length, g.id).toBeGreaterThan(0);
      expect(g.min, g.id).toBeLessThanOrEqual(g.max);
    }
  });

  it("all alcohol is flagged 21+", () => {
    for (const n of ["Abita", "Spaten", "Bahama Nada Latte", "La Marca Prosecco (187 ml)"]) expect(byName(n).ageRestricted, n).toBe(true);
    expect(byName("Latte").ageRestricted).toBe(false);
  });
});

describe("pricing a cup", () => {
  const latte = byName("Latte");

  it("matches Clover: Latte starts at $4.50 (small) and a medium is $5.00", () => {
    expect(fromPrice(latte)).toBe(450);
    const sizeGroup = latte.groups.map(getGroup).find((g) => g.kind === "size")!;
    const medium = sizeGroup.options.find((o) => o.name === "Medium")!;
    expect(unitPrice(latte, { [sizeGroup.id]: [medium.id] })).toBe(500);
  });

  it("adds oat milk (+$1.40) and a flavor shot (+$0.75) to a medium latte", () => {
    const sel = defaultSelections(latte);
    const milk = latte.groups.map(getGroup).find((g) => g.kind === "milk")!;
    const flavor = latte.groups.map(getGroup).find((g) => g.kind === "flavor")!;
    sel[milk.id] = ["oat"];
    sel[flavor.id] = ["vanilla"];
    expect(unitPrice(latte, sel)).toBe(500 + 140 + 75);
    expect(describeSelections(latte, sel)).toContain("Oat");
  });

  it("preselects medium and whole milk so one tap adds a latte", () => {
    const sel = defaultSelections(latte);
    expect(missingRequired(latte, sel)).toHaveLength(0);
  });

  it("forces an explicit choice for tea and bread (no silent default)", () => {
    const tea = byName("Tea");
    expect(missingRequired(tea, defaultSelections(tea)).map((g) => g.id)).toContain("tea");
    const sandwich = byName("Breakfast Sandwich");
    expect(missingRequired(sandwich, defaultSelections(sandwich)).map((g) => g.id)).toContain("bread");
  });

  it("prices the coffee box by what comes with it", () => {
    const box = byName("Joe to Go");
    expect(fromPrice(box)).toBe(2700);
    expect(getItem(box.id)).toBeTruthy();
  });
});

describe("daypart ordering", () => {
  it("leads with espresso in the morning and the bar at night, specials always first", () => {
    expect(orderedCategories(8)[0].id).toBe("specials");
    expect(orderedCategories(8)[1].id).toBe("coffee");
    const night = orderedCategories(21).map((c) => c.id);
    expect(night[0]).toBe("specials");
    expect(night.indexOf("beer")).toBeLessThan(night.indexOf("coffee"));
  });
});
