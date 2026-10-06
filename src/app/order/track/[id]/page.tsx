import type { Metadata } from "next";
import TrackerApp from "@/components/track/TrackerApp";

export const metadata: Metadata = { title: "Your order", robots: { index: false } };

export default async function TrackPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TrackerApp id={id} />;
}
