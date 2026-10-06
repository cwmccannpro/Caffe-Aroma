// Single source of truth for everything about the business.
// Anything marked CONFIRM is a value we inferred and the owner should verify.

export interface DayHours {
  /** Opening hour, 24h clock decimal (6 = 6:00 AM). */
  open: number;
  /** Closing hour, 24h clock decimal (24 = midnight). */
  close: number;
}

export const business = {
  name: "Caffe Aroma",
  legalName: "The Caffe Elmwood LLC",
  tagline: "Coffee by day. Cocktails by night.",
  description:
    "Buffalo's longest-running independent coffee shop, on the corner of Elmwood and Bidwell since 1995. Espresso and breakfast by morning, beer, wine and coffee cocktails after dark, with live music and poetry most nights.",
  founded: 1995,
  address: {
    street: "957 Elmwood Ave",
    city: "Buffalo",
    state: "NY",
    zip: "14222",
    crossStreets: "Elmwood & Bidwell",
    neighborhood: "Elmwood Village",
  },
  geo: { lat: 42.9231356, lng: -78.8768641 },
  phone: "(716) 884-4522",
  phoneHref: "tel:+17168844522",
  instagram: "the_caffe_elmwood",
  facebook: "Caffe.Aroma.Buffalo",
  mapsUrl:
    "https://www.google.com/maps/place/Caffe+Aroma/@42.9231356,-78.8768641,17z/data=!3m1!4b1!4m6!3m5!1s0x89d3737a8c87e605:0xbc85f636a2d293df!8m2!3d42.9231356!4d-78.8768641!16s%2Fg%2F1tcvk276",
  timezone: "America/New_York",

  // CONFIRM: owner said 6 AM to midnight. A third-party listing shows shorter Mon/Sun and a 7 AM Sat/Sun open.
  hours: {
    0: { open: 6, close: 24 }, // Sun
    1: { open: 6, close: 24 }, // Mon
    2: { open: 6, close: 24 },
    3: { open: 6, close: 24 },
    4: { open: 6, close: 24 },
    5: { open: 6, close: 24 },
    6: { open: 6, close: 24 }, // Sat
  } satisfies Record<number, DayHours>,

  // CONFIRM with accountant: Erie County, NY combined sales tax. Clover uses a single tax rate for all items.
  taxRate: 0.0875,
  // Alcohol is only sold from this hour on, if the owner wants a hard rule. null = whenever open.
  alcoholFrom: null as number | null,

  ordering: {
    /** Minutes from "place order" to "ready" for ASAP orders. */
    asapMinutes: [8, 12] as [number, number],
    /** Pickup slot length in minutes. */
    slotMinutes: 15,
    /** Max number of orders accepted per slot. */
    slotCapacity: 6,
    /** Don't let customers schedule further out than this many days. */
    maxDaysAhead: 2,
    tipPresets: [0, 15, 20, 25] as number[],
    defaultTip: 15,
  },

  reviews: {
    rating: 4.5,
    count: 718,
    // Short excerpts from public Google reviews (anonymous). CONFIRM display OK with owner.
    quotes: [
      { text: "Love the staff, people watching, atmosphere and food.", source: "Google review" },
      { text: "Plenty of coffee/espresso options and tasty pastries.", source: "Google review" },
      { text: "Small, quaint coffee shop with a simple selection but truly Italian feel.", source: "Google review" },
    ],
  },

  /** Attached to the cafe on Elmwood (per Buffalo News). */
  neighbor: "Talking Leaves Books",

  // What a visitor wants to know before walking over. `confirm` = from a third-party listing, the owner should verify.
  amenities: [
    { id: "patio", label: "Patio seating", note: "Sidewalk tables on Elmwood, weather permitting.", confirm: false },
    { id: "wifi", label: "Wi-Fi", note: "Free Wi-Fi, per third-party listings.", confirm: true },
    { id: "music", label: "Live music & open mic", note: "Two to five music and literary nights a week.", confirm: false },
    { id: "bar", label: "Beer, wine & coffee cocktails", note: "Alcohol is for guests 21 and over, served in the cafe.", confirm: false },
    { id: "pickup", label: "Order ahead for pickup", note: "Skip the line from 6 AM to midnight.", confirm: false },
  ],

  // CONFIRM with owner: public reporting (Buffalo Rising, 2025) lists these recurring events.
  events: [
    { id: "wnl", title: "Wednesday Night Live", detail: "Poets, spoken word and open mic, every other Wednesday. The second open mic each month has a headlining poet.", day: 3, from: 21, to: 23 },
  ],
} as const;

export type Business = typeof business;
