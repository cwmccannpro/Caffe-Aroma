import { business, type DayHours } from "@data/business";

export interface ZonedNow {
  /** 0 = Sunday … 6 = Saturday, in the cafe's timezone. */
  day: number;
  /** Decimal hour 0–24 (e.g. 17.5 = 5:30 PM) in the cafe's timezone. */
  hour: number;
  /** Midnight-to-midnight minutes. */
  minutes: number;
  year: number;
  month: number;
  date: number;
}

const WEEKDAYS: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

const formatterCache = new Map<string, Intl.DateTimeFormat>();
function formatter(tz: string) {
  let f = formatterCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour12: false,
      weekday: "short",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
    });
    formatterCache.set(tz, f);
  }
  return f;
}

/** The current moment as it reads on the clock in Buffalo, regardless of where the visitor is. */
export function zonedNow(date: Date = new Date(), tz: string = business.timezone): ZonedNow {
  const parts = Object.fromEntries(formatter(tz).formatToParts(date).map((p) => [p.type, p.value]));
  const h = Number(parts.hour) % 24; // some engines report midnight as "24"
  const m = Number(parts.minute);
  return {
    day: WEEKDAYS[parts.weekday] ?? 0,
    hour: h + m / 60,
    minutes: h * 60 + m,
    year: Number(parts.year),
    month: Number(parts.month),
    date: Number(parts.date ?? parts.day),
  };
}

export function hoursFor(day: number): DayHours {
  return business.hours[day as keyof typeof business.hours];
}

export interface OpenStatus {
  open: boolean;
  /** Short chip label: "Open until 12 AM" / "Opens at 6 AM". */
  label: string;
  /** Minutes until the next opening or closing. */
  minutesUntilChange: number;
}

/** 6 -> "6 AM", 13.5 -> "1:30 PM", 24 -> "12 AM". */
export function formatHour(h: number): string {
  const total = Math.round(h * 60);
  const hh = Math.floor(total / 60) % 24;
  const mm = total % 60;
  const suffix = hh >= 12 ? "PM" : "AM";
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return mm === 0 ? `${h12} ${suffix}` : `${h12}:${String(mm).padStart(2, "0")} ${suffix}`;
}

export function getOpenStatus(date: Date = new Date()): OpenStatus {
  const now = zonedNow(date);
  const today = hoursFor(now.day);
  if (now.hour >= today.open && now.hour < today.close) {
    return {
      open: true,
      label: `Open until ${formatHour(today.close)}`,
      minutesUntilChange: Math.round((today.close - now.hour) * 60),
    };
  }
  if (now.hour < today.open) {
    return { open: false, label: `Opens at ${formatHour(today.open)}`, minutesUntilChange: Math.round((today.open - now.hour) * 60) };
  }
  const next = hoursFor((now.day + 1) % 7);
  return {
    open: false,
    label: `Opens tomorrow at ${formatHour(next.open)}`,
    minutesUntilChange: Math.round((24 - now.hour + next.open) * 60),
  };
}

/** Which daypart a decimal hour belongs to. Drives menu emphasis and copy. */
export type Daypart = "morning" | "midday" | "golden" | "night";
export function daypartFor(hour: number): Daypart {
  if (hour < 11) return "morning";
  if (hour < 17) return "midday";
  if (hour < 20) return "golden";
  return "night";
}
