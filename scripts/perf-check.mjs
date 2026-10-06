// Load-speed check against the PRODUCTION server (npm run build && npx next start -p 3100).
//   node scripts/perf-check.mjs [path] [--mobile]
// Reports first paint, LCP, what had been downloaded by then, when the 3D chunk arrived, and the totals. Chrome's own
// numbers, on this machine and network; compare runs against each other rather than reading them as absolutes.
import { chromium, devices } from "@playwright/test";

const BASE = process.env.BASE_URL ?? "http://localhost:3100";
const path = process.env.PERF_PATH ?? process.argv.find((a, i) => i > 1 && a.startsWith("/")) ?? "/";
const mobile = process.argv.includes("--mobile");

const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const ctx = await browser.newContext(mobile ? { ...devices["Pixel 7"] } : { viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const client = await ctx.newCDPSession(page);
await client.send("Network.enable");

const reqs = new Map();
const t0 = Date.now();
client.on("Network.requestWillBeSent", (e) => reqs.set(e.requestId, { url: e.request.url, start: Date.now() - t0, bytes: 0, type: e.type }));
client.on("Network.loadingFinished", (e) => {
  const r = reqs.get(e.requestId);
  if (r) {
    r.bytes = e.encodedDataLength;
    r.end = Date.now() - t0;
  }
});

await page.addInitScript(() => {
  window.__perf = { lcp: 0, fcp: 0 };
  new PerformanceObserver((l) => {
    for (const e of l.getEntries()) window.__perf.lcp = e.startTime;
  }).observe({ type: "largest-contentful-paint", buffered: true });
  new PerformanceObserver((l) => {
    for (const e of l.getEntries()) if (e.name === "first-contentful-paint") window.__perf.fcp = e.startTime;
  }).observe({ type: "paint", buffered: true });
});

await page.goto(BASE + path, { waitUntil: "load" });
await page.waitForTimeout(1500);
const perf = await page.evaluate(() => window.__perf);
const nav = await page.evaluate(() => {
  const n = performance.getEntriesByType("navigation")[0];
  return { dcl: Math.round(n.domContentLoadedEventEnd), load: Math.round(n.loadEventEnd) };
});

const kb = (n) => (n / 1024).toFixed(0).padStart(5) + " KB";
const all = [...reqs.values()].filter((r) => r.bytes);
const beforeLcp = all.filter((r) => r.end <= perf.lcp + 50);
const sum = (rs) => rs.reduce((s, r) => s + r.bytes, 0);
const js = all.filter((r) => /\.js(\?|$)/.test(r.url));
const posters = all.filter((r) => r.url.includes("/posters/"));
console.log(`${mobile ? "mobile" : "desktop"} ${path}`);
console.log(`  FCP ${Math.round(perf.fcp)} ms   LCP ${Math.round(perf.lcp)} ms   DOMContentLoaded ${nav.dcl} ms   load ${nav.load} ms`);
const jsBeforeLcp = sum(beforeLcp.filter((r) => /\.js(\?|$)/.test(r.url)));
console.log(`  downloaded by LCP: ${kb(sum(beforeLcp))} in ${beforeLcp.length} requests (${kb(jsBeforeLcp)} of it JS)`);
console.log(`  total after 1.5 s idle: ${kb(sum(all))} in ${all.length} requests, JS ${kb(sum(js))}`);
for (const p of posters) console.log(`  poster ${p.url.split("/").pop()} ${kb(p.bytes)} arrived at ${p.end} ms`);
const biggest = js.sort((a, b) => b.bytes - a.bytes)[0];
if (biggest) console.log(`  largest script ${biggest.url.split("/").pop().slice(0, 28)} ${kb(biggest.bytes)} requested at ${biggest.start} ms (3D chunk starts after load: ${biggest.start > nav.load - 400 ? "yes" : "no"})`);
// what the visitor pays before the 3D chunk is even requested (the first paint budget), by resource type
const cutoff = biggest ? biggest.start : Infinity;
const byType = {};
for (const r of all.filter((r) => r.start < cutoff)) byType[r.type] = (byType[r.type] ?? 0) + r.bytes;
console.log("  before the 3D chunk is requested:", Object.entries(byType).map(([t, b]) => `${t} ${kb(b).trim()}`).join(", "), `(total ${kb(Object.values(byType).reduce((a, b) => a + b, 0)).trim()})`);
await browser.close();
