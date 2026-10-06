"use client";

import { useEffect, useState } from "react";
import { business } from "@data/business";
import { formatHour, zonedNow } from "@/lib/time";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** The week's hours, with today picked out once we know the day in Buffalo. */
export default function HoursTable() {
  const [today, setToday] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setToday(zonedNow().day);
    tick();
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, []);
  return (
    <table className="mt-3 w-full max-w-md text-[1.02rem]">
      <caption className="sr-only">Opening hours by day</caption>
      <tbody>
        {[1, 2, 3, 4, 5, 6, 0].map((d) => {
          const h = business.hours[d as keyof typeof business.hours];
          const isToday = today === d;
          return (
            <tr key={d} className="border-b" style={{ borderColor: "var(--line)", background: isToday ? "var(--surface-2)" : undefined }}>
              <th scope="row" className={`py-2.5 pl-2 text-left ${isToday ? "font-bold" : "font-medium"}`}>
                {DAYS[d]}
                {isToday && (
                  <span className="eyebrow ml-2 rounded-full px-2 py-0.5 !text-[0.62rem]" style={{ background: "var(--accent)", color: "var(--bg)" }}>
                    Today
                  </span>
                )}
              </th>
              <td className={`py-2.5 pr-2 text-right font-mono text-[0.95rem] ${isToday ? "font-bold" : ""}`}>
                {formatHour(h.open)} – {formatHour(h.close)}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
