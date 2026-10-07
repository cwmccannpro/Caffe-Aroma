// Draws the favicon set from vector drawings of the sign: brick-red frame, green stripes, a steaming cup, the black "aroma" bar.
//   node scripts/make-icons.mjs        (needs the installed Chrome, same as the e2e tests)
// Writes src/app/icon.svg, src/app/favicon.ico (16/32/48) and src/app/apple-icon.png (180). Next links them automatically.
import { chromium } from "@playwright/test";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const RED = "#b3261e";
const GREEN = "#2f6b3b";
const CREAM = "#f7efe0";
const INK = "#1a110c";

/**
 * Two drawings of the same sign. `bold` is for tabs and bookmarks (16-48 px): one stripe, a big cup, thick strokes, nothing
 * finer than a pixel. The detailed one (two stripes, saucer, lettering dashes) is for the home-screen icon.
 * `round`: rounded tile on transparent corners. Otherwise a full-bleed square, because iOS rounds the corners itself.
 */
function drawing({ round, bold }) {
  const tile = round
    ? `<rect x="2" y="2" width="60" height="60" rx="10" fill="${CREAM}" stroke="${RED}" stroke-width="4"/>`
    : `<rect width="64" height="64" fill="${CREAM}"/><rect x="2" y="2" width="60" height="60" rx="3" fill="none" stroke="${RED}" stroke-width="4"/>`;
  if (bold) {
    // every edge sits on a multiple of 4 units, so at 16 px (4 units = 1 px) the shapes land on whole pixels
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  ${tile}
  <path d="M4 14h56" stroke="${GREEN}" stroke-width="4"/>
  <g fill="none" stroke="${INK}" stroke-linecap="round" stroke-linejoin="round">
    <path d="M18 26c-4.4-3.4 3.4-6.4-.2-10.2s2.4-5.4.4-8.8" stroke-width="4"/>
    <path d="M30 26c-4.4-3.4 3.4-6.4-.2-10.2s2.4-5.4.4-8.8" stroke-width="4"/>
    <path d="M38 34h6a6 6 0 0 1 0 12h-5" stroke-width="4"/>
  </g>
  <path d="M8 28h32v6c0 8-6.6 14-16 14S8 42 8 34z" fill="${INK}"/>
  <rect x="8" y="52" width="48" height="4" fill="${INK}"/>
</svg>
`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  ${tile}
  <path d="M5 12.5h54M5 17.5h54" stroke="${GREEN}" stroke-width="2.2"/>
  <g fill="none" stroke="${INK}" stroke-linecap="round" stroke-linejoin="round">
    <path d="M25 26c-4.5-3.8 4-6.4-.2-10.2s2.6-5.6.6-8.6" stroke-width="3"/>
    <path d="M34 26c-4.5-3.8 4-6.4-.2-10.2s2.6-5.6.6-8.6" stroke-width="3"/>
    <path d="M42.5 31h2.6a5 5 0 0 1 0 10h-3.4" stroke-width="3.2"/>
  </g>
  <path d="M16 28.5h27v6.5c0 6.6-5.6 11.5-13.5 11.5S16 41.6 16 35z" fill="${INK}"/>
  <rect x="10" y="46.5" width="39" height="3.2" rx="1.6" fill="${INK}"/>
  <rect x="8" y="52" width="48" height="6" rx="1" fill="${INK}"/>
  <path d="M13 55h4m3 0h4m3 0h4m3 0h4m3 0h4" stroke="${CREAM}" stroke-width="1.4" stroke-linecap="round" opacity=".55"/>
</svg>
`;
}

const root = process.cwd();
const roundSvg = drawing({ round: true, bold: true });
writeFileSync(join(root, "src/app/icon.svg"), roundSvg);

const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage();
async function png(svg, px) {
  await page.setViewportSize({ width: px, height: px });
  await page.setContent(`<style>html,body{margin:0;background:transparent}svg{display:block;width:${px}px;height:${px}px}</style>${svg}`);
  return page.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: px, height: px } });
}

// favicon.ico: PNG images inside an ICO container
const sizes = [16, 32, 48];
const images = [];
for (const px of sizes) images.push(await png(roundSvg, px));
const head = Buffer.alloc(6);
head.writeUInt16LE(1, 2); // type: icon
head.writeUInt16LE(sizes.length, 4);
let offset = 6 + 16 * sizes.length;
const dir = [];
sizes.forEach((px, i) => {
  const e = Buffer.alloc(16);
  e.writeUInt8(px, 0);
  e.writeUInt8(px, 1);
  e.writeUInt16LE(1, 4); // planes
  e.writeUInt16LE(32, 6); // bits per pixel
  e.writeUInt32LE(images[i].length, 8);
  e.writeUInt32LE(offset, 12);
  offset += images[i].length;
  dir.push(e);
});
writeFileSync(join(root, "src/app/favicon.ico"), Buffer.concat([head, ...dir, ...images]));

writeFileSync(join(root, "src/app/apple-icon.png"), await png(drawing({ round: false, bold: false }), 180));

// previews for a quick look (not shipped)
if (process.env.PREVIEW_DIR) {
  for (const px of [16, 32, 64, 180]) writeFileSync(join(process.env.PREVIEW_DIR, `icon-${px}.png`), await png(roundSvg, px));
}
await browser.close();
console.log("wrote src/app/icon.svg, favicon.ico (16/32/48), apple-icon.png (180)");
