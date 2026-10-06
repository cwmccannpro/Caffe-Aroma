"use client";

import { useState } from "react";
import type { Group, Item } from "@/lib/menu";
import { money } from "@/lib/pricing";

interface Props {
  item: Item;
  group: Group;
  selected: string[];
  onChange: (ids: string[]) => void;
  invalid?: boolean;
}

const priceLabel = (price: number, absolute: boolean) => (absolute ? money(price) : price > 0 ? `+${money(price)}` : "");

function Check() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

export default function OptionGroup({ item, group, selected, onChange, invalid }: Props) {
  const [expanded, setExpanded] = useState(false);
  const single = group.max === 1;
  const required = group.min >= 1;
  const absolute = group.kind === "size" && item.price === 0;
  const COLLAPSE_AT = 9;
  const collapsible = group.options.length > COLLAPSE_AT && !single;
  const options = collapsible && !expanded ? group.options.slice(0, 8) : group.options;
  // never hide something that is already picked
  const hiddenPicked = collapsible && !expanded ? group.options.slice(8).filter((o) => selected.includes(o.id)) : [];
  const shown = [...options, ...hiddenPicked];

  const toggle = (id: string) => {
    if (single) {
      if (selected.includes(id)) {
        if (!required) onChange([]);
      } else onChange([id]);
      return;
    }
    if (selected.includes(id)) onChange(selected.filter((x) => x !== id));
    else if (selected.length < group.max) onChange([...selected, id]);
  };

  const atMax = !single && selected.length >= group.max;
  const hint = required ? (single ? "Required" : `Choose ${group.min}${group.max > group.min ? `+` : ""}`) : group.max > 1 && group.max < 20 ? `Pick up to ${group.max}` : "Optional";

  return (
    <fieldset className="border-0 p-0" aria-invalid={invalid || undefined} id={`grp-${group.id}`}>
      <legend className="mb-3 flex w-full items-baseline justify-between gap-3">
        <span className="display text-[1.35rem]">{group.name}</span>
        <span className={`eyebrow ${invalid ? "text-[#d6402a]" : "opacity-70"}`}>{invalid ? "Required" : hint}</span>
      </legend>

      {group.kind === "size" ? (
        <div className="grid gap-2.5" style={{ gridTemplateColumns: `repeat(${Math.min(group.options.length, 3)}, minmax(0, 1fr))` }} role={single ? "radiogroup" : "group"}>
          {group.options.map((o) => {
            const on = selected.includes(o.id);
            return (
              <button
                key={o.id}
                type="button"
                role={single ? "radio" : "checkbox"}
                aria-checked={on}
                onClick={() => toggle(o.id)}
                className="rounded-2xl border-2 px-3 py-3.5 text-center transition-[transform,background-color,border-color] duration-200 active:scale-[0.97]"
                style={{
                  borderColor: on ? "var(--fg)" : "var(--line)",
                  background: on ? "var(--fg)" : "var(--surface)",
                  color: on ? "var(--bg)" : "var(--fg)",
                }}
              >
                <span className="block text-[1.02rem] font-semibold leading-tight">{o.name}</span>
                <span className="mt-0.5 block font-mono text-[0.85rem] opacity-80">{priceLabel(o.price, absolute) || "Included"}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-wrap gap-2" role={single ? "radiogroup" : "group"} aria-label={group.name}>
          {shown.map((o) => {
            const on = selected.includes(o.id);
            const blocked = !on && atMax;
            return (
              <button
                key={o.id}
                type="button"
                role={single ? "radio" : "checkbox"}
                aria-checked={on}
                disabled={blocked}
                onClick={() => toggle(o.id)}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-full border-[1.5px] px-4 text-[0.95rem] font-medium transition-[transform,background-color,border-color,opacity] duration-200 active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-40"
                style={{
                  borderColor: on ? "var(--fg)" : "var(--line)",
                  background: on ? "var(--fg)" : "var(--surface)",
                  color: on ? "var(--bg)" : "var(--fg)",
                }}
              >
                {on && <Check />}
                {o.name}
                {o.price > 0 && <span className="font-mono text-[0.78rem] opacity-70">+{money(o.price)}</span>}
              </button>
            );
          })}
          {collapsible && (
            <button type="button" onClick={() => setExpanded((v) => !v)} className="inline-flex min-h-[44px] items-center rounded-full px-4 text-[0.92rem] font-semibold underline underline-offset-4">
              {expanded ? "Show fewer" : `${group.options.length - 8} more`}
            </button>
          )}
        </div>
      )}
    </fieldset>
  );
}
