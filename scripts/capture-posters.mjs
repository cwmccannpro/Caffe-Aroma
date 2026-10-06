// Captures stills of the real 3D scene with the installed Chrome (software WebGL is fine, it just takes a moment).
//
//   npm run dev                                   (in another terminal, port 3100: the ?cam= debug camera is dev-only)
//   node scripts/capture-posters.mjs posters      -> public/posters/{ext,tod}-{06,09,12,15,18,21}.webp   (ONLY_HOURS=18 redoes just that hour)
//   node scripts/capture-posters.mjs shot "/?q=high&cam=..." out.png [hour] [scrollVh] [width] [height]
//   KEEP_UI=1 node scripts/capture-posters.mjs stops "/?q=high" outDir 0,1,2,3 [width] [height]   (one page load, a shot per scroll stop; works on a production build)
//
// ext-* = the storefront from the sidewalk (hero, first paint). tod-* = the room (the fallback once you are inside).
import { chromium } from "@playwright/test";
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

const BASE = process.env.BASE_URL ?? "http://localhost:3100";
const HOURS = [6, 9, 12, 15, 18, 21];
const TAGS = ["06", "09", "12", "15", "18", "21"];
const INTERIOR_CAM = "1.75,1.78,3.55,0.5,1.4,-1.2,44";
const OUT = join(process.cwd(), "public", "posters");

// KEEP_UI=1 keeps the header, copy and dial in the shot (handy for checking layouts); posters never do.
// visibility (not display) so the page layout, and the scroll maths that drives the camera, stay exactly as a visitor sees them.
const hide = (process.env.KEEP_UI ? "" : "header, .z-10, .z-20 { visibility: hidden !important } ") + "nextjs-portal, [data-nextjs-toast], #__next-build-watcher { display: none !important } html { scroll-snap-type: none !important }";

async function open(browser, path, { width = 1440, height = 810 } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.error("pageerror:", e.message));
  await page.goto(BASE + path, { waitUntil: "load" });
  await page.addStyleTag({ content: hide });
  // wait until real frames have been drawn over the placeholder still
  await page.waitForFunction(
    () => {
      const el = document.querySelector("canvas")?.closest(".transition-opacity");
      return !!el && Number(getComputedStyle(el).opacity) > 0.99;
    },
    undefined,
    { timeout: 240_000, polling: 500 },
  );
  return { ctx, page };
}

async function setHour(page, hour) {
  await page.evaluate((h) => window.__time.getState().setScrub(h), hour);
  await page.waitForFunction((h) => Math.abs(window.__time.getState().display - h) < 0.02, hour, { timeout: 120_000, polling: 250 });
  await page.waitForTimeout(2500); // a few frames at the final light
}

async function scrollVh(page, k) {
  if (!k) return;
  await page.evaluate((v) => window.scrollTo({ top: window.innerHeight * v, behavior: "instant" }), k);
  await page.waitForTimeout(4000);
}

async function toWebp(pngPath, outPath) {
  mkdirSync(dirname(outPath), { recursive: true });
  await sharp(pngPath).webp({ quality: 74, effort: 6 }).toFile(outPath);
  const { size } = await import("node:fs").then((fs) => fs.statSync(outPath));
  console.log("wrote", outPath, Math.round(size / 1024) + " KB");
}

const [cmd, ...args] = process.argv.slice(2);
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--enable-webgl"] });
try {
  if (cmd === "shot") {
    const [path, out, hour, vh, w, h] = args;
    const { ctx, page } = await open(browser, path, { width: Number(w) || 1440, height: Number(h) || 810 });
    await scrollVh(page, Number(vh) || 0);
    if (hour) await setHour(page, Number(hour));
    else await page.waitForTimeout(2500);
    mkdirSync(dirname(out), { recursive: true });
    await page.screenshot({ path: out });
    console.log("wrote", out);
    await ctx.close();
  } else if (cmd === "stops") {
    const [path, outDir, list, w, h] = args;
    const { ctx, page } = await open(browser, path, { width: Number(w) || 1440, height: Number(h) || 900 });
    for (const k of list.split(",").map(Number)) {
      await scrollVh(page, k);
      await page.waitForTimeout(Number(process.env.STOP_WAIT ?? 6000)); // the camera chases the scroll, the hour eases: let both settle (slow software GL needs ~30000)
      mkdirSync(outDir, { recursive: true });
      await page.screenshot({ path: join(outDir, `stop-${k}.png`) });
      console.log("wrote", join(outDir, `stop-${k}.png`));
    }
    await ctx.close();
  } else if (cmd === "posters") {
    const only = args[0]; // "ext" | "int"
    for (const kind of ["ext", "int"]) {
      if (only && only !== kind) continue;
      const path = kind === "ext" ? "/?q=high" : `/?q=high&cam=${INTERIOR_CAM}`;
      const { ctx, page } = await open(browser, path);
      for (let i = 0; i < HOURS.length; i++) {
        if (process.env.ONLY_HOURS && !process.env.ONLY_HOURS.split(",").map(Number).includes(HOURS[i])) continue;
        await setHour(page, HOURS[i]);
        const png = join(process.env.TEMP ?? ".", `poster-${kind}-${TAGS[i]}.png`);
        await page.screenshot({ path: png });
        await toWebp(png, join(OUT, `${kind === "ext" ? "ext" : "tod"}-${TAGS[i]}.webp`));
      }
      await ctx.close();
    }
  } else {
    console.log("usage: capture-posters.mjs posters [ext|int] | shot <path> <out.png> [hour] [scrollVh] [w] [h]");
  }
} finally {
  await browser.close();
}
