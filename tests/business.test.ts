import { describe, expect, it } from "vitest";
import { business } from "@data/business";
import { formatHour } from "@/lib/time";

describe("the facts the storefront sign, hero and structured data all print", () => {
  it("is open 6 AM to midnight on every day of the week", () => {
    for (let d = 0; d < 7; d++) {
      const h = business.hours[d as keyof typeof business.hours];
      expect(formatHour(h.open), `day ${d} opens`).toBe("6 AM");
      expect(formatHour(h.close), `day ${d} closes`).toBe("12 AM");
    }
  });

  it("has a tel: link that matches the printed phone number", () => {
    const digits = business.phone.replace(/\D/g, "");
    expect(business.phoneHref).toBe(`tel:+1${digits}`);
  });

  it("lists each amenity once, and marks the ones that came from a third-party listing for the owner to confirm", () => {
    const ids = business.amenities.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(business.amenities.find((a) => a.id === "wifi")?.confirm).toBe(true);
    for (const a of business.amenities) {
      expect(a.label.length).toBeGreaterThan(0);
      expect(a.note.length).toBeGreaterThan(0);
    }
  });

  it("has an address a visitor can navigate to", () => {
    expect(business.address.street).toBe("957 Elmwood Ave");
    expect(business.mapsUrl).toMatch(/^https:\/\/www\.google\.com\/maps\//);
  });
});
