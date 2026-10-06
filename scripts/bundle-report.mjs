// Prints the gzip size of every client JS chunk in .next/static/chunks, largest first.
// Usage: npm run build && node scripts/bundle-report.mjs
import { readdirSync, readFileSync, statSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { join } from "node:path";

const dir = join(process.cwd(), ".next", "static", "chunks");
const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
const rows = walk(dir)
  .filter((f) => f.endsWith(".js"))
  .map((f) => {
    const buf = readFileSync(f);
    return { file: f.slice(dir.length + 1), raw: buf.length, gz: gzipSync(buf).length };
  })
  .sort((a, b) => b.gz - a.gz);
const kb = (n) => (n / 1024).toFixed(1).padStart(7) + " KB";
for (const r of rows.slice(0, 12)) console.log(kb(r.gz), "gz", kb(r.raw), "raw ", r.file);
console.log("TOTAL", kb(rows.reduce((s, r) => s + r.gz, 0)), "gz across", rows.length, "chunks");
