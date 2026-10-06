// Counts what the scene draws (dev server only: it reads window.__gl / window.__scene, which are not exposed in production).
//   npm run dev   then   node scripts/scene-stats.mjs
import { chromium } from "@playwright/test";
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const page = await (await browser.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
await page.goto("http://localhost:3100/?q=lite", { waitUntil: "load" });
await page.waitForFunction(() => { const el = document.querySelector("canvas")?.closest(".transition-opacity"); return !!el && Number(getComputedStyle(el).opacity) > 0.99; }, undefined, { timeout: 240000, polling: 500 });
await page.waitForTimeout(5000);
const rows = await page.evaluate(() => {
  const scene = window.__scene;
  const count = (o) => {
    if (!o.visible) return 0;
    let n = (o.isMesh || o.isPoints || o.isLine || o.isSprite) ? 1 : 0;
    for (const c of o.children) n += count(c);
    return n;
  };
  return scene.children.map((c, i) => ({ i, type: c.type, kids: c.children.length, renderables: count(c), first: c.children[0]?.type }));
});
const total = rows.reduce((s, r) => s + r.renderables, 0);
console.log("total renderables", total);
for (const r of rows.filter((r) => r.renderables > 2)) console.log(JSON.stringify(r));
console.log("renderer calls", await page.evaluate(() => window.__gl.info.render.calls));
await browser.close();
