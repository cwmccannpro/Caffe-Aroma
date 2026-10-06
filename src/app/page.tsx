import Header from "@/components/site/Header";
import Stage from "@/components/home/Stage";
import { Footer, OurStory, QuickInfo, Reviews, Tonight, Visit } from "@/components/home/Sections";
import { business } from "@data/business";
import { menu } from "@/lib/menu";

// Local SEO: the cafe, its hours, and what's on the menu, in a form search engines read directly.
function jsonLd() {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return {
    "@context": "https://schema.org",
    "@type": ["CafeOrCoffeeShop", "BarOrPub"],
    name: business.name,
    description: business.description,
    url: "https://caffearomabuffalo.com/",
    telephone: business.phone,
    foundingDate: String(business.founded),
    priceRange: "$$",
    servesCuisine: ["Coffee", "Espresso", "Breakfast", "Beer", "Wine"],
    address: { "@type": "PostalAddress", streetAddress: business.address.street, addressLocality: business.address.city, addressRegion: business.address.state, postalCode: business.address.zip, addressCountry: "US" },
    geo: { "@type": "GeoCoordinates", latitude: business.geo.lat, longitude: business.geo.lng },
    openingHoursSpecification: Object.entries(business.hours).map(([d, h]) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: days[Number(d)],
      opens: `${String(Math.floor(h.open)).padStart(2, "0")}:00`,
      closes: h.close >= 24 ? "23:59" : `${String(Math.floor(h.close)).padStart(2, "0")}:00`,
    })),
    aggregateRating: { "@type": "AggregateRating", ratingValue: business.reviews.rating, reviewCount: business.reviews.count },
    sameAs: [`https://www.instagram.com/${business.instagram}/`, `https://www.facebook.com/${business.facebook}`],
    hasMenu: "https://caffearomabuffalo.com/order",
    hasMap: business.mapsUrl,
    amenityFeature: business.amenities.map((a) => ({ "@type": "LocationFeatureSpecification", name: a.label, value: true })),
    acceptsReservations: false,
    potentialAction: { "@type": "OrderAction", target: "https://caffearomabuffalo.com/order", deliveryMethod: ["http://purl.org/goodrelations/v1#DeliveryModePickUp"] },
    menuItemCount: menu.items.length,
  };
}

export default function Home() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd()) }} />
      <Header />
      {/* the story: a labelled region whose scenes snap into place, one screen at a time */}
      <Stage />
      {/* from "Plan your visit" to the footer the page scrolls freely: one tall snap area, see .free-scroll in globals.css */}
      <div className="free-scroll">
        <main id="main">
          <QuickInfo />
          <Tonight />
          <OurStory />
          <Reviews />
          <Visit />
        </main>
        <Footer />
      </div>
    </>
  );
}
