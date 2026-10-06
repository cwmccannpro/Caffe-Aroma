"use client";

import { fromPrice, hasRequiredChoices, type Item } from "@/lib/menu";
import { money } from "@/lib/pricing";
import Glyph from "./Glyph";

interface Props {
  item: Item;
  soldOut: boolean;
  onOpen: () => void;
}

export default function ItemCard({ item, soldOut, onOpen }: Props) {
  const price = fromPrice(item);
  const sized = hasRequiredChoices(item) && item.price === 0;
  const unavailable = soldOut || !item.available;
  return (
    <button type="button" className="menu-card" aria-disabled={unavailable} onClick={() => !unavailable && onOpen()} aria-label={`${item.name}, ${sized ? "from " : ""}${money(price)}${unavailable ? ", sold out" : ""}`}>
      <span className="grid h-[72px] w-[72px] place-items-center rounded-2xl" style={{ background: "var(--surface-2)", color: "var(--fg)" }}>
        <Glyph vessel={item.preview.vessel} liquid={item.preview.liquid} size={54} />
      </span>
      <span className="block min-w-0 pr-11">
        <span className="display block text-[1.22rem] leading-[1.1]">{item.name}</span>
        <span className="mt-1 line-clamp-2 block text-[0.9rem] leading-snug" style={{ color: "var(--muted)" }}>
          {item.description}
        </span>
        <span className="mt-2.5 flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <span className="font-mono text-[0.9rem] font-medium">
            {sized && <span className="mr-1 opacity-60">from</span>}
            {money(price)}
          </span>
          {item.tags.includes("popular") && !unavailable && <span className="eyebrow rounded-full px-2 py-0.5" style={{ background: "color-mix(in oklab, var(--accent), transparent 82%)", color: "var(--accent)" }}>Popular</span>}
          {item.tags.includes("seasonal") && <span className="eyebrow rounded-full px-2 py-0.5" style={{ background: "color-mix(in oklab, var(--aroma-green), transparent 80%)" }}>Seasonal</span>}
          {item.ageRestricted && <span className="eyebrow rounded-full border px-2 py-0.5" style={{ borderColor: "var(--line)" }}>21+</span>}
          {item.tags.includes("gluten-free") && <span className="eyebrow rounded-full border px-2 py-0.5" style={{ borderColor: "var(--line)" }}>GF</span>}
          {unavailable && <span className="eyebrow rounded-full px-2 py-0.5" style={{ background: "color-mix(in oklab, #d6402a, transparent 80%)" }}>Sold out</span>}
        </span>
      </span>
      {!unavailable && (
        <span className="plus" aria-hidden>
          +
        </span>
      )}
    </button>
  );
}
