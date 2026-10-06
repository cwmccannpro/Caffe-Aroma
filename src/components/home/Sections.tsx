import Link from "next/link";
import Reveal from "@/components/ui/Reveal";
import HashLink from "@/components/ui/HashLink";
import Logo from "@/components/ui/Logo";
import { business } from "@data/business";
import { getItem } from "@/lib/menu";
import { money } from "@/lib/pricing";
import { formatHour } from "@/lib/time";
import Glyph from "@/components/order/Glyph";
import StatusChip from "@/components/ui/StatusChip";
import HoursTable from "./HoursTable";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Pulled from the cafe's Google "menu highlights". CONFIRM names and prices with the owner before listing as orderable.
const BAR_EXTRAS = ["Peroni & espresso", "Lemoncello", "Samuel Smith's Imperial Stout", "Coffee cocktails"];

const NIGHT_PICKS = ["4CD3792BH1HAG", "A9PPNJAN9TSQ6", "TWYYA7SQN44NC", "FAKWXTEVTW564", "G2D5MMZX267WE", "7VYE7WSCS29HT"];

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="eyebrow" style={{ color: "var(--accent)" }}>{children}</p>;
}

/* ───────────── At a glance ───────────── */
function hoursLabel() {
  const hs = Object.values(business.hours);
  return `${formatHour(Math.min(...hs.map((h) => h.open)))} \u2013 ${formatHour(Math.max(...hs.map((h) => h.close)))}`;
}

function InfoCard({ label, big, children }: { label: string; big: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex h-full flex-col rounded-3xl border p-6" style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
      <p className="eyebrow opacity-70">{label}</p>
      <p className="display mt-2 text-[1.7rem] leading-tight">{big}</p>
      <div className="mt-3 flex flex-1 flex-col items-start gap-3 text-[0.98rem]" style={{ color: "var(--muted)" }}>
        {children}
      </div>
    </div>
  );
}

/** Practical, scannable facts: hours, where, how to reach us, how to order, and what is on offer. */
export function QuickInfo() {
  const [minA, maxA] = business.ordering.asapMinutes;
  const link = "inline-flex min-h-[44px] items-center font-semibold underline underline-offset-4";
  return (
    <section id="info" className="relative px-4 py-20 sm:px-8 md:py-24" aria-labelledby="info-h">
      <div className="mx-auto max-w-[1400px]">
        <Reveal>
          <Eyebrow>Plan your visit</Eyebrow>
          <h2 id="info-h" className="display mt-3 text-[clamp(2.4rem,4.8vw,4rem)]">
            Everything you need, <span className="italic">at a glance.</span>
          </h2>
        </Reveal>
        <Reveal delay={80} className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <InfoCard label="Hours" big={<>Daily, {hoursLabel()}</>}>
            <StatusChip tone="theme" />
            <a className={link} style={{ color: "var(--fg)" }} href="#visit">
              See the full week
            </a>
          </InfoCard>
          <InfoCard label="Find us" big={business.address.street}>
            <span>
              {business.address.city}, {business.address.state} {business.address.zip}. On the corner of {business.address.crossStreets}, next to {business.neighbor}.
            </span>
            <a className={link} style={{ color: "var(--fg)" }} href={business.mapsUrl} target="_blank" rel="noreferrer">
              Get directions
            </a>
          </InfoCard>
          <InfoCard label="Call" big={business.phone}>
            <span>Questions, a big order, or to check tonight&rsquo;s lineup.</span>
            <a className={link} style={{ color: "var(--fg)" }} href={business.phoneHref}>
              Call the cafe
            </a>
          </InfoCard>
          <InfoCard label="Order ahead" big={<>Ready in about {minA}&ndash;{maxA} min</>}>
            <span>Pick up from 6&nbsp;AM to midnight. Pay online, skip the line.</span>
            <Link className="btn btn-primary !min-h-[48px] !px-5" href="/order">
              Start an order
            </Link>
          </InfoCard>
        </Reveal>
        <Reveal delay={140}>
          <ul className="mt-6 flex flex-wrap gap-2.5" aria-label="Good to know">
            {business.amenities.map((a) => (
              <li key={a.id} className="rounded-full border px-4 py-2 text-[0.95rem] font-medium" style={{ borderColor: "var(--line)", background: "var(--surface)" }} title={a.note}>
                {a.label}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[0.88rem]" style={{ color: "var(--muted)" }}>
            Beer, wine and coffee cocktails are for guests 21 and over and are served in the cafe.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

/* ───────────── Tonight ───────────── */
export function Tonight() {
  const picks = NIGHT_PICKS.map((id) => getItem(id)!).filter(Boolean);
  return (
    <section id="tonight" className="relative px-4 py-24 sm:px-8 md:py-32" aria-labelledby="tonight-h">
      <div className="mx-auto grid max-w-[1400px] gap-14 lg:grid-cols-[1.05fr_1fr]">
        <div>
          <Reveal>
            <Eyebrow>Live music &amp; events</Eyebrow>
            <h2 id="tonight-h" className="display mt-3 text-[clamp(2.8rem,6vw,5.6rem)]">
              The espresso machine <span className="italic">moonlights.</span>
            </h2>
            <p className="mt-5 max-w-[34rem] text-[1.15rem] leading-relaxed" style={{ color: "var(--muted)" }}>
              When the sun goes down over Elmwood the cafe becomes a bar: beer, wine, coffee cocktails and a stage. Two to five music and literary nights a week.
            </p>
          </Reveal>

          <Reveal delay={80} className="mt-10">
            <h3 className="eyebrow mb-3 opacity-70">On the calendar</h3>
            <ul className="grid gap-3">
              {business.events.map((e) => (
                <li key={e.id} className="flex items-center gap-5 rounded-3xl border p-5" style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
                  <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl text-center leading-none" style={{ background: "var(--accent)", color: "var(--bg)" }}>
                    <span>
                      <span className="eyebrow block !text-[0.62rem]">{DAYS[e.day].slice(0, 3)}</span>
                      <span className="display block text-[1.25rem]">{formatHour(e.from).replace(" ", "")}</span>
                    </span>
                  </div>
                  <div>
                    <div className="display text-[1.5rem]">{e.title}</div>
                    <div className="text-[0.95rem]" style={{ color: "var(--muted)" }}>
                      {e.detail} {formatHour(e.from)} to {formatHour(e.to)}.
                    </div>
                  </div>
                </li>
              ))}
              <li className="flex items-center gap-5 rounded-3xl border p-5" style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
                <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl text-[1.9rem]" style={{ background: "var(--surface-2)" }} aria-hidden>
                  ♪
                </div>
                <div>
                  <div className="display text-[1.5rem]">Live music</div>
                  <div className="text-[0.95rem]" style={{ color: "var(--muted)" }}>
                    More nights of music and readings through the week.
                  </div>
                </div>
              </li>
            </ul>
            <div className="mt-5 rounded-3xl border p-5" style={{ borderColor: "var(--line)", background: "var(--surface-2)" }}>
              <h3 className="display text-[1.35rem]">Check the schedule</h3>
              <p className="mt-1 text-[0.98rem]" style={{ color: "var(--muted)" }}>
                The lineup changes week to week, and the full week of music is posted on Instagram. Doors are open the whole time, so you can always drop in.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <a className="btn btn-primary" href={`https://www.instagram.com/${business.instagram}/`} target="_blank" rel="noreferrer">
                  This week on Instagram
                </a>
                <a className="btn btn-ghost" href={business.phoneHref}>
                  Call {business.phone}
                </a>
              </div>
            </div>
          </Reveal>
        </div>

        <Reveal delay={120}>
          <div className="rounded-[32px] border p-6 sm:p-8" style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
            <h3 className="display text-[2rem]">On the bar</h3>
            <ul className="mt-5 divide-y" style={{ borderColor: "var(--line)" }}>
              {picks.map((it) => (
                <li key={it.id} className="flex items-center justify-between gap-4 py-3.5" style={{ borderColor: "var(--line)" }}>
                  <span className="flex items-center gap-3.5">
                    <span className="grid h-11 w-11 place-items-center rounded-xl" style={{ background: "var(--surface-2)" }}>
                      <Glyph vessel={it.preview.vessel} liquid={it.preview.liquid} size={34} />
                    </span>
                    <span>
                      <span className="block font-semibold leading-tight">{it.name}</span>
                      <span className="block text-[0.85rem]" style={{ color: "var(--muted)" }}>
                        {it.description}
                      </span>
                    </span>
                  </span>
                  <span className="font-mono text-[0.95rem]">{money(it.price)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-[0.88rem]" style={{ color: "var(--muted)" }}>
              Also behind the bar: {BAR_EXTRAS.join(", ")}. Ask your server.
            </p>
            <Link href="/order#cat-cocktails" className="btn btn-primary mt-6 w-full">
              Order for here
            </Link>
            <p className="mt-3 text-center text-[0.8rem]" style={{ color: "var(--muted)" }}>
              21+ with ID. Alcohol is served in the cafe.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ───────────── Since 1995 ───────────── */
export function OurStory() {
  const stats = [
    { big: String(business.founded), small: "on the corner of Elmwood & Bidwell" },
    { big: `${business.reviews.rating}★`, small: `${business.reviews.count} Google reviews` },
    { big: "6 AM–12 AM", small: "open late, every night" },
    { big: "2–5", small: "music & poetry nights a week" },
  ];
  return (
    <section id="story" className="relative px-4 py-24 sm:px-8 md:py-32" aria-labelledby="story-h" style={{ background: "var(--surface)" }}>
      <div className="mx-auto max-w-[1400px]">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:items-end">
          <Reveal>
            <Eyebrow>Since {business.founded}</Eyebrow>
            <h2 id="story-h" className="display mt-3 text-[clamp(2.8rem,6vw,5.4rem)]">
              Buffalo&rsquo;s longest-running <span className="italic">independent</span> coffee shop.
            </h2>
          </Reveal>
          <Reveal delay={100}>
            <p className="text-[1.2rem] leading-relaxed" style={{ color: "var(--muted)" }}>
              Caffe Aroma opened at Elmwood and Bidwell in {business.founded}, two years after its first cafe in Williamsville (now Trattoria Aroma). Since 2023, Jesse and Michaela Schmidbauer have kept the lights on, the espresso pulling and, thanks to Michaela&rsquo;s open mic, the poetry going.
            </p>
            <p className="mt-4 text-[1.2rem] leading-relaxed" style={{ color: "var(--muted)" }}>
              It&rsquo;s a place for chatting, reading, people watching, and a glass of something once the sun goes down. Come as you are.
            </p>
          </Reveal>
        </div>
        <dl className="mt-16 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {stats.map((s, i) => (
            <Reveal key={s.big} delay={i * 70} className="rounded-3xl border p-6" style={{ borderColor: "var(--line)", background: "var(--bg)" }}>
              <dt className="display text-[clamp(1.9rem,3.4vw,3rem)]">{s.big}</dt>
              <dd className="mt-1 text-[0.95rem]" style={{ color: "var(--muted)" }}>
                {s.small}
              </dd>
            </Reveal>
          ))}
        </dl>
      </div>
    </section>
  );
}

/* ───────────── Reviews ───────────── */
export function Reviews() {
  return (
    <section className="px-4 py-24 sm:px-8 md:py-28" aria-labelledby="reviews-h">
      <div className="mx-auto max-w-[1400px]">
        <Reveal className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <Eyebrow>What people say</Eyebrow>
            <h2 id="reviews-h" className="display mt-3 text-[clamp(2.6rem,5.4vw,4.6rem)]">
              Loved by the neighborhood.
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="display text-[3.4rem] leading-none">{business.reviews.rating}</span>
            <span>
              <span aria-hidden className="block text-[1.3rem] tracking-[0.15em]" style={{ color: "var(--amber)" }}>
                ★★★★★
              </span>
              <span className="block text-[0.9rem]" style={{ color: "var(--muted)" }}>
                {business.reviews.count} reviews on Google
              </span>
            </span>
          </div>
        </Reveal>
        <ul className="mt-12 grid gap-4 md:grid-cols-3">
          {business.reviews.quotes.map((q, i) => (
            <Reveal as="li" key={q.text} delay={i * 90} className="flex flex-col justify-between rounded-3xl border p-7" style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
              <p className="display text-[1.55rem] leading-snug">&ldquo;{q.text}&rdquo;</p>
              <p className="eyebrow mt-6 opacity-60">{q.source}</p>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ───────────── Visit ───────────── */
function MapCard() {
  return (
    <a href={business.mapsUrl} target="_blank" rel="noreferrer" aria-label="Open Caffe Aroma in Google Maps" className="group relative block aspect-[4/3] overflow-hidden rounded-[28px] border" style={{ borderColor: "var(--line)", background: "var(--surface-2)" }}>
      <svg viewBox="0 0 400 300" className="absolute inset-0 h-full w-full" aria-hidden>
        <defs>
          <pattern id="blocks" width="60" height="60" patternUnits="userSpaceOnUse">
            <rect width="60" height="60" fill="none" />
            <rect x="6" y="6" width="48" height="48" rx="4" fill="currentColor" opacity=".05" />
          </pattern>
        </defs>
        <rect width="400" height="300" fill="url(#blocks)" style={{ color: "var(--fg)" }} />
        {/* Elmwood Ave runs north-south, Bidwell Pkwy crosses it */}
        <path d="M205-10 L190 310" stroke="var(--fg)" strokeOpacity=".22" strokeWidth="22" strokeLinecap="round" />
        <path d="M-10 182 L410 160" stroke="var(--fg)" strokeOpacity=".16" strokeWidth="16" strokeLinecap="round" />
        <path d="M205-10 L190 310" stroke="var(--bg)" strokeWidth="2" strokeDasharray="10 12" opacity=".8" />
        <text x="214" y="46" fontSize="11" fill="currentColor" opacity=".7" style={{ fontFamily: "var(--font-dm-mono)", letterSpacing: ".14em" }}>ELMWOOD AVE</text>
        <text x="40" y="158" fontSize="11" fill="currentColor" opacity=".7" style={{ fontFamily: "var(--font-dm-mono)", letterSpacing: ".14em" }}>BIDWELL PKWY</text>
        <g transform="translate(198 168)">
          <circle r="34" fill="var(--accent)" opacity=".18">
            <animate attributeName="r" values="22;40;22" dur="3s" repeatCount="indefinite" />
          </circle>
          <path d="M0-30c-10 0-18 8-18 18 0 14 18 32 18 32s18-18 18-32c0-10-8-18-18-18z" fill="var(--aroma-red)" stroke="#fff" strokeWidth="2.5" />
          <circle cy="-12" r="6" fill="#fff" />
        </g>
      </svg>
      <span className="absolute bottom-4 left-4 rounded-full px-4 py-2 text-[0.92rem] font-semibold" style={{ background: "var(--bg)", color: "var(--fg)" }}>
        {business.address.street} · Get directions →
      </span>
    </a>
  );
}

export function Visit() {
  return (
    <section id="visit" className="px-4 py-24 sm:px-8 md:py-32" aria-labelledby="visit-h" style={{ background: "var(--surface)" }}>
      <div className="mx-auto grid max-w-[1400px] gap-12 lg:grid-cols-[1fr_1.1fr]">
        <Reveal>
          <Eyebrow>Come on in</Eyebrow>
          <h2 id="visit-h" className="display mt-3 text-[clamp(2.8rem,6vw,5.4rem)]">
            Find us on <span className="italic">Elmwood.</span>
          </h2>
          <address className="mt-6 text-[1.25rem] not-italic leading-snug">
            {business.address.street}
            <br />
            {business.address.city}, {business.address.state} {business.address.zip}
            <br />
            <span style={{ color: "var(--muted)" }}>
              {business.address.crossStreets} · {business.address.neighborhood}
              <br />
              Next to {business.neighbor}
            </span>
          </address>
          <div className="mt-6 flex flex-wrap gap-3">
            <a className="btn btn-primary" href={business.mapsUrl} target="_blank" rel="noreferrer">
              Get directions
            </a>
            <a className="btn btn-ghost" href={business.phoneHref}>
              {business.phone}
            </a>
            <Link className="btn btn-ghost" href="/order">
              Order ahead
            </Link>
          </div>

          <h3 className="eyebrow mt-12 opacity-70">Hours</h3>
          <HoursTable />
          <p className="mt-3 text-[0.9rem]" style={{ color: "var(--muted)" }}>
            Open every day, {hoursLabel()}. Last orders are taken until closing.
          </p>

          <h3 className="eyebrow mt-10 opacity-70">Good to know</h3>
          <ul className="mt-3 grid max-w-md gap-2 text-[1rem]">
            {business.amenities.map((a) => (
              <li key={a.id} className="flex gap-3">
                <span aria-hidden className="mt-[0.55em] h-2 w-2 shrink-0 rounded-full" style={{ background: "var(--accent)" }} />
                <span>
                  <span className="font-semibold">{a.label}.</span> <span style={{ color: "var(--muted)" }}>{a.note}</span>
                </span>
              </li>
            ))}
          </ul>

          <p className="mt-4 text-[0.9rem]" style={{ color: "var(--muted)" }}>
            Follow along on{" "}
            <a className="font-semibold underline underline-offset-4" style={{ color: "var(--fg)" }} href={`https://www.instagram.com/${business.instagram}/`} target="_blank" rel="noreferrer">
              Instagram
            </a>{" "}
            and{" "}
            <a className="font-semibold underline underline-offset-4" style={{ color: "var(--fg)" }} href={`https://www.facebook.com/${business.facebook}`} target="_blank" rel="noreferrer">
              Facebook
            </a>
            .
          </p>
        </Reveal>
        <Reveal delay={120}>
          <MapCard />
        </Reveal>
      </div>
    </section>
  );
}

/* ───────────── Footer ───────────── */
export function Footer() {
  return (
    <footer className="px-4 pb-28 pt-16 sm:px-8 lg:pb-16">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-10 md:flex-row md:items-start md:justify-between">
        <div className="flex items-center gap-4">
          <Logo size={64} />
          <div>
            <div className="display text-[1.7rem]">Caffe Aroma</div>
            <div className="eyebrow opacity-70">{business.address.street} · Buffalo, NY</div>
            <div className="eyebrow mt-1 opacity-70">Open daily {hoursLabel()}</div>
          </div>
        </div>
        <nav aria-label="Footer" className="grid grid-cols-2 gap-x-12 gap-y-2 text-[0.98rem]">
          <Link href="/order" className="hover:underline">Order ahead</Link>
          <HashLink href="/#tonight" className="hover:underline">Tonight</HashLink>
          <HashLink href="/#story" className="hover:underline">Our story</HashLink>
          <HashLink href="/#visit" className="hover:underline">Visit</HashLink>
          <a href={business.phoneHref} className="hover:underline">{business.phone}</a>
          <a href={`https://www.instagram.com/${business.instagram}/`} target="_blank" rel="noreferrer" className="hover:underline">Instagram</a>
        </nav>
      </div>
      <p className="mx-auto mt-12 max-w-[1400px] text-[0.8rem]" style={{ color: "var(--muted)" }}>
        Concept preview. Menu and prices come from the current Clover storefront; checkout is a demo and no card is charged. Alcohol is for guests 21 and over.
      </p>
    </footer>
  );
}
