import type { Metadata } from "next";
import OrderApp from "@/components/order/OrderApp";
import { business } from "@data/business";
import { menu } from "@/lib/menu";

export const metadata: Metadata = {
  title: "Order ahead",
  description: `Order coffee, breakfast, beer and wine from ${business.name} on Elmwood Ave for pickup or dine-in. Skip the line, open 6 AM to midnight.`,
};

// Schema.org Menu so search engines can read the offering. Prices are the "from" price per item.
function menuJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "CafeOrCoffeeShop",
    name: business.name,
    url: "https://caffearomabuffalo.com/order",
    telephone: business.phone,
    address: { "@type": "PostalAddress", streetAddress: business.address.street, addressLocality: business.address.city, addressRegion: business.address.state, postalCode: business.address.zip, addressCountry: "US" },
    servesCuisine: ["Coffee", "Espresso", "Breakfast", "Beer", "Wine"],
    hasMenu: {
      "@type": "Menu",
      hasMenuSection: menu.categories.map((c) => ({
        "@type": "MenuSection",
        name: c.name,
        hasMenuItem: menu.items
          .filter((i) => i.categoryId === c.id)
          .map((i) => ({ "@type": "MenuItem", name: i.name, description: i.description })),
      })),
    },
  };
}

export default function OrderPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(menuJsonLd()) }} />
      <OrderApp />
    </>
  );
}
