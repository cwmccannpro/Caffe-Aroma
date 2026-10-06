import raw from "@data/menu.json";

export type GroupKind = "size" | "milk" | "boost" | "flavor" | "detail" | "topping" | "choice" | "extra";

export interface Option {
  id: string;
  name: string;
  /** cents, added to the item price */
  price: number;
}

export interface Group {
  id: string;
  name: string;
  kind: GroupKind;
  min: number;
  max: number;
  default?: string;
  options: Option[];
}

export type Vessel = "cup" | "demi" | "tall" | "mug" | "coupe" | "bottle" | "can" | "flute" | "sandwich" | "bagel" | "cookie" | "cake" | "parfait" | "plate" | "box";

export interface Item {
  id: string;
  slug: string;
  name: string;
  description: string;
  categoryId: string;
  /** cents. Final price = price + chosen options. */
  price: number;
  groups: string[];
  tags: string[];
  ageRestricted: boolean;
  available: boolean;
  serve: "hot" | "iced" | "none";
  preview: { vessel: Vessel; liquid: string; foam: boolean; ice: boolean; whip: boolean; blended: boolean };
  draftedByUs: boolean;
  review?: string;
}

export interface Category {
  id: string;
  name: string;
  blurb: string;
  daypart: "morning" | "day" | "night" | "any";
}

interface MenuFile {
  meta: { source: string; snapshotAt: string };
  categories: Category[];
  groups: Record<string, Group>;
  items: Item[];
  review: string[];
}

export const menu = raw as unknown as MenuFile;

const itemById = new Map(menu.items.map((i) => [i.id, i]));
export const getItem = (id: string): Item | undefined => itemById.get(id);
export const getGroup = (id: string): Group => menu.groups[id];
export const groupsOf = (item: Item): Group[] => item.groups.map(getGroup);

/** itemId -> optionId -> selection state. A selection is the list of chosen option ids per group. */
export type Selections = Record<string, string[]>;

/** The lowest price a customer could pay: base + the cheapest option of each required group. */
export function fromPrice(item: Item): number {
  return (
    item.price +
    groupsOf(item)
      .filter((g) => g.min >= 1)
      .reduce((sum, g) => sum + Math.min(...g.options.map((o) => o.price)), 0)
  );
}

export function hasRequiredChoices(item: Item): boolean {
  return groupsOf(item).some((g) => g.min >= 1);
}

/** Sensible starting point: default milk preselected, the middle size preselected so it is one tap to add. */
export function defaultSelections(item: Item): Selections {
  const sel: Selections = {};
  for (const g of groupsOf(item)) {
    if (g.default && g.options.some((o) => o.id === g.default)) sel[g.id] = [g.default];
    else if (g.kind === "size" && g.min >= 1) {
      const mid = g.options.length === 3 ? 1 : 0;
      sel[g.id] = [g.options[mid].id];
    }
  }
  return sel;
}

export function missingRequired(item: Item, sel: Selections): Group[] {
  return groupsOf(item).filter((g) => (sel[g.id]?.length ?? 0) < g.min);
}

export function unitPrice(item: Item, sel: Selections): number {
  let total = item.price;
  for (const g of groupsOf(item)) {
    for (const oid of sel[g.id] ?? []) {
      const o = g.options.find((x) => x.id === oid);
      if (o) total += o.price;
    }
  }
  return total;
}

/** "Medium · Oat · Vanilla, Caramel" for cart lines and receipts. Skips the unremarkable default milk. */
export function describeSelections(item: Item, sel: Selections): string {
  const parts: string[] = [];
  for (const g of groupsOf(item)) {
    const chosen = (sel[g.id] ?? [])
      .filter((oid) => !(g.default && oid === g.default && g.kind === "milk"))
      .map((oid) => g.options.find((o) => o.id === oid)?.name)
      .filter(Boolean) as string[];
    if (chosen.length) parts.push(chosen.join(", "));
  }
  return parts.join(" · ");
}

export function itemsByCategory(categoryId: string): Item[] {
  return menu.items.filter((i) => i.categoryId === categoryId);
}

export const isAlcohol = (item: Item) => item.ageRestricted;

/** Which categories lead the page depends on the hour: espresso first in the morning, the bar after dark. */
export function orderedCategories(hour: number): Category[] {
  const want = hour < 11 ? "morning" : hour >= 17.5 ? "night" : "day";
  const score = (c: Category) => (c.id === "specials" ? -1 : c.daypart === want ? 0 : c.daypart === "any" ? 1 : 2);
  return [...menu.categories].sort((a, b) => score(a) - score(b) || menu.categories.indexOf(a) - menu.categories.indexOf(b));
}

export function searchItems(query: string): Item[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return menu.items.filter((i) => `${i.name} ${i.description} ${menu.categories.find((c) => c.id === i.categoryId)?.name}`.toLowerCase().includes(q));
}
