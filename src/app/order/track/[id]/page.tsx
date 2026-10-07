import type { Metadata } from "next";
import TrackerApp from "@/components/track/TrackerApp";

export const metadata: Metadata = { title: "Your order", robots: { index: false } };

// One pre-built page serves every order id (the id is read from the URL in the browser). Any other id is rewritten to this
// one: by next.config.ts when running the server, by the Worker (worker/index.js) on the static export.
export const dynamicParams = false;
export function generateStaticParams() {
  return [{ id: "_" }];
}

export default function TrackPage() {
  return <TrackerApp />;
}
