// Builds the site as a static export for Cloudflare: STATIC_EXPORT=1 next build -> ./out, plus out/_headers.
//   npm run build:cf
import { spawnSync } from "node:child_process";
import { writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const next = join(process.cwd(), "node_modules", "next", "dist", "bin", "next");
const run = spawnSync(process.execPath, [next, "build"], { stdio: "inherit", env: { ...process.env, STATIC_EXPORT: "1" } });
if (run.status !== 0) process.exit(run.status ?? 1);

const out = join(process.cwd(), "out");
if (!existsSync(join(out, "index.html"))) {
  console.error("build:cf: out/index.html is missing, the export did not run");
  process.exit(1);
}

// Headers for the static files (the Worker only handles /robots.txt and /order/track/<id>).
// This is a pitch preview, so it is marked noindex. Remove X-Robots-Tag (and the /robots.txt rule in worker/index.js) to launch for real.
writeFileSync(
  join(out, "_headers"),
  `/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  X-Robots-Tag: noindex, nofollow

/_next/static/*
  Cache-Control: public, max-age=31536000, immutable

/posters/*
  Cache-Control: public, max-age=604800

/brand/*
  Cache-Control: public, max-age=604800
`,
);
console.log("build:cf: wrote out/ and out/_headers");
