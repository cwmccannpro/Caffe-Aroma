import type { Vessel } from "@/lib/menu";

/**
 * Small duotone illustrations for the menu (Clover has no item photos).
 * Strokes use currentColor; `liquid` tints the drink or food.
 */
export default function Glyph({ vessel, liquid = "#b98a5e", size = 64, className = "" }: { vessel: Vessel; liquid?: string; size?: number; className?: string }) {
  const stroke = { stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, fill: "none" };
  const ceramic = "color-mix(in oklab, var(--surface), white 35%)";
  const steam = (
    <g {...stroke} opacity="0.55">
      <path d="M26 14c-3-3 3-5 0-9" />
      <path d="M34 15c-3-3 3-5 0-9" />
    </g>
  );
  let body: React.ReactNode;
  switch (vessel) {
    case "cup":
      body = (
        <>
          {steam}
          <ellipse cx="32" cy="53" rx="23" ry="4.5" {...stroke} fill={ceramic} />
          <path d="M14 24h32v11c0 9-7 15-16 15s-16-6-16-15z" {...stroke} fill={ceramic} />
          <ellipse cx="30" cy="24" rx="16" ry="3.2" {...stroke} fill={liquid} />
          <path d="M46 28h3a5.5 5.5 0 0 1 0 11h-3.5" {...stroke} />
        </>
      );
      break;
    case "demi":
      body = (
        <>
          {steam}
          <ellipse cx="32" cy="53" rx="19" ry="4" {...stroke} fill={ceramic} />
          <path d="M18 30h28v8c0 7-6 12-14 12s-14-5-14-12z" {...stroke} fill={ceramic} />
          <ellipse cx="32" cy="30" rx="14" ry="2.8" {...stroke} fill={liquid} />
          <path d="M46 33h2.5a4.5 4.5 0 0 1 0 9H45" {...stroke} />
        </>
      );
      break;
    case "mug":
      body = (
        <>
          <path d="M18 8c0 3-3 4-3 7" {...stroke} opacity="0.5" />
          <path d="M14 22h30v22c0 5-4 9-9 9H23c-5 0-9-4-9-9z" {...stroke} fill={ceramic} />
          <ellipse cx="29" cy="22" rx="15" ry="3.2" {...stroke} fill={liquid} />
          <path d="M44 27h3a6 6 0 0 1 0 12h-3" {...stroke} />
        </>
      );
      break;
    case "tall":
      body = (
        <>
          <path d="M17 10h30l-4 44H21z" {...stroke} fill="color-mix(in oklab, var(--surface), white 20%)" />
          <path d="M19 24h26l-2.6 30H21.6z" fill={liquid} opacity="0.92" />
          <path d="M17 10h30l-4 44H21z" {...stroke} />
          <rect x="24" y="16" width="9" height="9" rx="2" {...stroke} strokeWidth="1.6" transform="rotate(-10 28 20)" fill="rgba(255,255,255,.35)" />
          <rect x="33" y="26" width="9" height="9" rx="2" {...stroke} strokeWidth="1.6" transform="rotate(12 37 30)" fill="rgba(255,255,255,.35)" />
          <path d="M37 4l-3 12" {...stroke} />
        </>
      );
      break;
    case "coupe":
      body = (
        <>
          <path d="M12 16h40c0 10-8 18-20 18S12 26 12 16z" {...stroke} fill={liquid} />
          <path d="M32 34v18M22 54h20" {...stroke} />
          <path d="M20 16h24" {...stroke} opacity="0.4" />
        </>
      );
      break;
    case "flute":
      body = (
        <>
          <path d="M24 8h16l-1 24c-.2 4-3 6-7 6s-6.8-2-7-6z" {...stroke} fill={liquid} opacity="0.95" />
          <path d="M32 38v16M23 56h18" {...stroke} />
          <circle cx="30" cy="22" r="1.2" fill="currentColor" opacity=".5" />
          <circle cx="34" cy="28" r="1.2" fill="currentColor" opacity=".5" />
        </>
      );
      break;
    case "bottle":
      body = (
        <>
          <path d="M28 4h8v10c0 3 6 5 6 12v28c0 3-2 5-5 5H27c-3 0-5-2-5-5V26c0-7 6-9 6-12z" {...stroke} fill={liquid} opacity="0.95" />
          <rect x="24" y="30" width="16" height="16" rx="2" fill="var(--surface)" stroke="currentColor" strokeWidth="1.6" />
        </>
      );
      break;
    case "can":
      body = (
        <>
          <rect x="20" y="10" width="24" height="44" rx="4" {...stroke} fill={liquid} />
          <path d="M20 17h24M20 47h24" {...stroke} />
          <circle cx="32" cy="32" r="5" fill="var(--surface)" stroke="currentColor" strokeWidth="1.6" />
        </>
      );
      break;
    case "sandwich":
      body = (
        <>
          <path d="M10 28c0-10 10-16 22-16s22 6 22 16z" {...stroke} fill={liquid} />
          <path d="M8 34h48" {...stroke} stroke="#e8b923" strokeWidth="5" />
          <path d="M10 40h44" {...stroke} stroke="#c0392b" strokeWidth="3.5" opacity=".85" />
          <path d="M10 46c0 4 4 7 8 7h28c4 0 8-3 8-7z" {...stroke} fill={liquid} />
        </>
      );
      break;
    case "bagel":
      body = (
        <>
          <circle cx="32" cy="32" r="21" {...stroke} fill={liquid} />
          <circle cx="32" cy="32" r="7" {...stroke} fill="var(--bg)" />
          <path d="M20 18l3 2M42 17l-2 3M47 32l-3 1M19 44l3-2M38 49l-1-3" {...stroke} strokeWidth="1.6" opacity=".7" />
        </>
      );
      break;
    case "cookie":
      body = (
        <>
          <circle cx="32" cy="32" r="22" {...stroke} fill={liquid} />
          <circle cx="24" cy="26" r="2.6" fill="currentColor" opacity=".65" />
          <circle cx="38" cy="24" r="2.2" fill="currentColor" opacity=".65" />
          <circle cx="30" cy="38" r="2.8" fill="currentColor" opacity=".65" />
          <circle cx="42" cy="38" r="2.2" fill="currentColor" opacity=".65" />
        </>
      );
      break;
    case "cake":
      body = (
        <>
          <path d="M8 42l44-12v18L8 54z" {...stroke} fill={liquid} />
          <path d="M8 42l12-26 32 14z" {...stroke} fill="color-mix(in oklab, var(--surface), white 40%)" />
          <path d="M8 48l44-12" {...stroke} opacity=".5" />
        </>
      );
      break;
    case "parfait":
      body = (
        <>
          <path d="M16 12h32l-4 40c-.3 3-2.5 5-5 5H25c-2.5 0-4.7-2-5-5z" {...stroke} fill="color-mix(in oklab, var(--surface), white 25%)" />
          <path d="M18 28h28M19 40h26" {...stroke} opacity=".4" />
          <path d="M19 20h26l-.8 8H19.8z" fill={liquid} opacity=".9" />
          <path d="M20 40l.8 10c.2 2 2 3.5 4 3.5h14.4c2 0 3.8-1.5 4-3.5l.8-10z" fill="#c58b4b" opacity=".85" />
          <circle cx="28" cy="10" r="3.5" fill="#b3261e" />
        </>
      );
      break;
    case "plate":
      body = (
        <>
          <ellipse cx="32" cy="44" rx="26" ry="8" {...stroke} fill={ceramic} />
          <path d="M14 42c0-12 8-20 18-20s18 8 18 20z" {...stroke} fill={liquid} opacity=".9" />
          <path d="M32 14v6" {...stroke} />
        </>
      );
      break;
    case "box":
      body = (
        <>
          <path d="M8 22l24-10 24 10v28L32 60 8 50z" {...stroke} fill="#c9a06a" />
          <path d="M8 22l24 10 24-10M32 32v28" {...stroke} />
          <path d="M20 17l24 10v7" {...stroke} opacity=".6" />
        </>
      );
      break;
  }
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={className} role="img" aria-hidden>
      {body}
    </svg>
  );
}
