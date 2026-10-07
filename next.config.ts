import type { NextConfig } from "next";

// `STATIC_EXPORT=1 next build` (npm run build:cf) writes the whole site as plain files into ./out for Cloudflare.
// Everything else (dev, tests, `next start`) runs the normal server build.
const isExport = process.env.STATIC_EXPORT === "1";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  ...(isExport
    ? { output: "export", trailingSlash: true, images: { unoptimized: true } }
    : {
        images: { formats: ["image/avif", "image/webp"] },
        // every order id is served by the one pre-built tracker page (see app/order/track/[id]/page.tsx)
        async rewrites() {
          return [{ source: "/order/track/:id", destination: "/order/track/_" }];
        },
      }),
};

export default nextConfig;
