import * as THREE from "three";
import { canvasTexture, rng } from "./textures";

// Canvas-generated textures for the street side of the building and the new props. No downloads.

/**
 * Running-bond Elmwood brick, one tile = 2 m x 1 m (9 bricks across, 12 courses). Returns the colour map and, on
 * better GPUs, a matching bump map so the mortar joints catch the low sun.
 */
export function brickTextures(detail: boolean) {
  const W = detail ? 1024 : 512;
  const H = detail ? 512 : 256;
  const COLS = 9;
  const ROWS = 12;
  const draw = (bump: boolean) => (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const r = rng(1995);
    const bw = w / COLS;
    const bh = h / ROWS;
    const m = detail ? 2 : 1;
    ctx.fillStyle = bump ? "#161616" : "#b5a692";
    ctx.fillRect(0, 0, w, h);
    // each brick has one colour so the half-bricks that wrap the tile edge match
    const tone: number[][] = Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => r()));
    const hue: number[][] = Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => r()));
    for (let row = 0; row < ROWS; row++) {
      const off = (row % 2) * (bw / 2);
      for (let c = -1; c <= COLS; c++) {
        const idx = ((c % COLS) + COLS) % COLS;
        const x = c * bw + off;
        const y = row * bh;
        const t = tone[row][idx];
        const burnt = t > 0.94;
        if (bump) {
          const v = 170 + Math.round(t * 60);
          ctx.fillStyle = `rgb(${v},${v},${v})`;
        } else {
          const hh = 9 + hue[row][idx] * 9;
          const ss = 34 + t * 16;
          const ll = burnt ? 17 : 27 + t * 12;
          ctx.fillStyle = `hsl(${hh}deg ${ss}% ${ll}%)`;
        }
        ctx.fillRect(x + m, y + m, bw - m * 2, bh - m * 2);
        if (!bump) {
          // faint light along the top edge, shade along the bottom
          ctx.fillStyle = "rgba(255,225,190,0.10)";
          ctx.fillRect(x + m, y + m, bw - m * 2, 1.5);
          ctx.fillStyle = "rgba(20,5,0,0.16)";
          ctx.fillRect(x + m, y + bh - m - 2, bw - m * 2, 2);
        }
      }
    }
    if (!bump) {
      for (let i = 0; i < (detail ? 2600 : 900); i++) {
        ctx.fillStyle = r() > 0.5 ? "rgba(20,8,4,0.07)" : "rgba(255,230,200,0.05)";
        ctx.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2);
      }
    }
  };
  const map = canvasTexture(W, H, draw(false), { repeat: [0.5, 1], aniso: 8 });
  const bump = detail ? canvasTexture(W, H, draw(true), { repeat: [0.5, 1], color: false, aniso: 4 }) : null;
  return { map, bump };
}

/** Concrete sidewalk slabs, 1.5 m squares with cut joints. One tile = 3 m x 3 m. */
export function sidewalkTexture() {
  return canvasTexture(
    512,
    512,
    (ctx, w, h) => {
      const r = rng(21);
      ctx.fillStyle = "#8a847a";
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 1800; i++) {
        ctx.fillStyle = r() > 0.5 ? "rgba(255,250,240,0.07)" : "rgba(30,25,20,0.08)";
        ctx.fillRect(r() * w, r() * h, 1 + r() * 3, 1 + r() * 3);
      }
      // each slab a hair different
      for (let sy = 0; sy < 2; sy++)
        for (let sx = 0; sx < 2; sx++) {
          ctx.fillStyle = `rgba(${r() > 0.5 ? "255,245,225" : "40,32,26"},${0.03 + r() * 0.04})`;
          ctx.fillRect(sx * (w / 2), sy * (h / 2), w / 2, h / 2);
        }
      ctx.strokeStyle = "rgba(25,20,16,0.55)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(w / 2, 0);
      ctx.lineTo(w / 2, h);
      ctx.moveTo(0, h / 2);
      ctx.lineTo(w, h / 2);
      ctx.moveTo(1, 0);
      ctx.lineTo(1, h);
      ctx.moveTo(0, 1);
      ctx.lineTo(w, 1);
      ctx.stroke();
    },
    { repeat: [40, 1.2], aniso: 8 },
  );
}

/** What you see through the left shop window: warm shelves of cups, bottles and jars. Used as colour and as the night glow. */
export function shopfrontTexture() {
  return canvasTexture(512, 320, (ctx, w, h) => {
    const r = rng(8);
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#3a2418");
    g.addColorStop(1, "#1a0f0a");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // warm pools from pendants
    for (const x of [90, 256, 420]) {
      const rg = ctx.createRadialGradient(x, 40, 4, x, 120, 190);
      rg.addColorStop(0, "rgba(255,200,120,0.85)");
      rg.addColorStop(1, "rgba(255,170,80,0)");
      ctx.fillStyle = rg;
      ctx.fillRect(0, 0, w, h);
    }
    // shelves
    for (const y of [110, 190]) {
      ctx.fillStyle = "#6a4426";
      ctx.fillRect(14, y, w - 28, 7);
      for (let x = 24; x < w - 24; ) {
        const kind = r();
        const bw = 14 + r() * 20;
        if (kind < 0.4) {
          // bottle
          ctx.fillStyle = ["#2e5a3a", "#7a2a1e", "#c9a24a", "#3a4a6a"][Math.floor(r() * 4)];
          ctx.fillRect(x, y - 44, bw * 0.7, 44);
          ctx.fillRect(x + bw * 0.22, y - 62, bw * 0.26, 20);
        } else if (kind < 0.75) {
          // cups
          ctx.fillStyle = "#efe6d4";
          ctx.fillRect(x, y - 18, bw, 18);
          ctx.fillRect(x + bw * 0.1, y - 34, bw * 0.8, 16);
        } else {
          // jar
          ctx.fillStyle = "#d9c9a4";
          ctx.fillRect(x, y - 36, bw, 36);
          ctx.fillStyle = "#6a3a1e";
          ctx.fillRect(x, y - 42, bw, 7);
        }
        x += bw + 6 + r() * 10;
      }
    }
    // counter at the bottom
    ctx.fillStyle = "#2a1a10";
    ctx.fillRect(0, h - 70, w, 70);
    ctx.fillStyle = "#8a6240";
    ctx.fillRect(0, h - 74, w, 6);
  });
}

export interface Fonts {
  display: string;
  script: string;
  sans: string;
  mono: string;
}

function letterSpaced(ctx: CanvasRenderingContext2D, text: string, cx: number, y: number, spacing: number) {
  const widths = [...text].map((ch) => ctx.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0) + spacing * (text.length - 1);
  let x = cx - total / 2;
  ctx.textAlign = "left";
  [...text].forEach((ch, i) => {
    ctx.fillText(ch, x, y);
    x += widths[i] + spacing;
  });
  ctx.textAlign = "center";
}

/** Cream lettering on a transparent canvas, for the awning valances. `ratio` = plane width / plane height. */
export function awningTextTexture(text: string, fonts: Fonts, ratio: number) {
  const W = 1536;
  const H = Math.round(W / ratio);
  return canvasTexture(W, H, (ctx) => {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#f3e7c9";
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    const size = Math.min(H * 0.62, (W * 0.84) / (text.length * 0.78));
    ctx.font = `600 ${size}px ${fonts.display}`;
    ctx.shadowColor = "rgba(0,0,0,0.35)";
    ctx.shadowBlur = 3;
    letterSpaced(ctx, text, W / 2, H / 2 + size * 0.04, size * 0.16);
  });
}

/** The hours board by the door: a green panel with a brass rule, red neon "OPEN", then the hours. `lit` is the glowing overlay. */
export function hoursBoardTexture(fonts: Fonts, lit: boolean, dayLine: string, hoursLine: string, subLine: string) {
  const W = 640;
  const H = 760;
  return canvasTexture(W, H, (ctx) => {
    ctx.clearRect(0, 0, W, H);
    if (!lit) {
      ctx.fillStyle = "#183626";
      ctx.fillRect(0, 0, W, H);
      const g = ctx.createLinearGradient(0, 0, W, H);
      g.addColorStop(0, "rgba(255,255,255,0.07)");
      g.addColorStop(1, "rgba(0,0,0,0.18)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = "#c8a24e";
      ctx.lineWidth = 7;
      ctx.strokeRect(26, 26, W - 52, H - 52);
      ctx.lineWidth = 2;
      ctx.strokeRect(42, 42, W - 84, H - 84);
    }
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    // neon OPEN
    const red = lit ? "#ff5a3c" : "#5a2218";
    for (const pass of lit ? [0, 1] : [0]) {
      ctx.save();
      ctx.shadowColor = "#ff4a2e";
      ctx.shadowBlur = lit ? (pass ? 14 : 46) : 0;
      ctx.fillStyle = pass ? "#ffd2c4" : red;
      ctx.font = `150px ${fonts.script}`;
      ctx.fillText("open", W / 2, 190);
      ctx.restore();
    }
    if (!lit) {
      ctx.fillStyle = "#c8a24e";
      ctx.fillRect(110, 292, W - 220, 3);
      ctx.fillStyle = "#e8dcc0";
      ctx.font = `500 34px ${fonts.mono}`;
      letterSpaced(ctx, dayLine, W / 2, 348, 9);
      ctx.fillStyle = "#f6ead2";
      ctx.font = `600 76px ${fonts.display}`;
      ctx.fillText(hoursLine, W / 2, 452);
      ctx.fillStyle = "#c8a24e";
      ctx.fillRect(110, 520, W - 220, 3);
      ctx.fillStyle = "#e8dcc0";
      ctx.font = `500 29px ${fonts.mono}`;
      letterSpaced(ctx, subLine, W / 2, 586, 5);
      ctx.fillStyle = "#e8dcc0";
      ctx.font = `500 29px ${fonts.mono}`;
      letterSpaced(ctx, "ELMWOOD & BIDWELL", W / 2, 652, 5);
    }
  });
}

/** A-frame chalkboard on the sidewalk. */
export function chalkboardTexture(fonts: Fonts, lines: { text: string; size: number; font?: "display" | "script" | "mono" }[]) {
  const W = 512;
  const H = 768;
  return canvasTexture(W, H, (ctx) => {
    const r = rng(33);
    ctx.fillStyle = "#1c2420";
    ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 900; i++) {
      ctx.fillStyle = `rgba(255,255,255,${r() * 0.035})`;
      ctx.fillRect(r() * W, r() * H, 2 + r() * 20, 1 + r() * 2);
    }
    ctx.strokeStyle = "rgba(244,236,214,0.7)";
    ctx.lineWidth = 4;
    ctx.strokeRect(22, 22, W - 44, H - 44);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#f4ecd6";
    let y = 100;
    for (const l of lines) {
      const fam = l.font === "script" ? fonts.script : l.font === "mono" ? fonts.mono : fonts.display;
      ctx.font = `${l.font === "script" ? 400 : 600} ${l.size}px ${fam}`;
      ctx.fillText(l.text, W / 2, y);
      y += l.size * 1.28;
    }
  });
}

/** What the midday laptop is showing: a calm work-in-progress UI. */
export function laptopScreenTexture() {
  const W = 768;
  const H = 480;
  return canvasTexture(W, H, (ctx) => {
    ctx.fillStyle = "#eef1f5";
    ctx.fillRect(0, 0, W, H);
    // window chrome
    ctx.fillStyle = "#dfe4ec";
    ctx.fillRect(0, 0, W, 44);
    ["#ff5f57", "#febc2e", "#28c840"].forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(26 + i * 26, 22, 8, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.fillStyle = "#fff";
    ctx.fillRect(140, 10, 360, 24);
    // sidebar
    ctx.fillStyle = "#2a3140";
    ctx.fillRect(0, 44, 150, H - 44);
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = i === 1 ? "#ffb347" : "rgba(255,255,255,0.35)";
      ctx.fillRect(22, 80 + i * 44, i === 1 ? 104 : 80 + (i % 3) * 14, 12);
    }
    // document
    ctx.fillStyle = "#1b2430";
    ctx.fillRect(196, 84, 300, 22);
    ctx.fillStyle = "#8a94a6";
    for (let i = 0; i < 7; i++) ctx.fillRect(196, 128 + i * 26, 360 - ((i * 53) % 110), 10);
    // chart card
    ctx.fillStyle = "#fff";
    ctx.fillRect(520, 70, 220, 190);
    ctx.strokeStyle = "#dde2ea";
    ctx.strokeRect(520, 70, 220, 190);
    const bars = [60, 96, 78, 124, 104, 140];
    bars.forEach((b, i) => {
      ctx.fillStyle = i === 5 ? "#b3261e" : "#5a8cf0";
      ctx.fillRect(540 + i * 33, 240 - b, 22, b);
    });
    // a chat bubble and a button
    ctx.fillStyle = "#fff";
    ctx.fillRect(196, 330, 330, 74);
    ctx.strokeStyle = "#dde2ea";
    ctx.strokeRect(196, 330, 330, 74);
    ctx.fillStyle = "#8a94a6";
    ctx.fillRect(214, 350, 240, 10);
    ctx.fillRect(214, 372, 170, 10);
    ctx.fillStyle = "#b3261e";
    ctx.fillRect(560, 336, 160, 46);
    ctx.fillStyle = "#fff";
    ctx.fillRect(588, 354, 104, 10);
  });
}

/** Keyboard deck: rows of keys on a dark base. */
export function keyboardTexture() {
  return canvasTexture(
    512,
    256,
    (ctx, w, h) => {
      ctx.fillStyle = "#1c1d21";
      ctx.fillRect(0, 0, w, h);
      const rows = 5;
      for (let r = 0; r < rows; r++) {
        const n = r === 4 ? 9 : 13;
        const kw = (w - 40) / 13;
        for (let i = 0; i < n; i++) {
          ctx.fillStyle = "#2c2e34";
          const x = 20 + (r === 4 ? 2.2 * kw : 0) + i * kw + (r === 4 ? 0 : 0);
          ctx.fillRect(x + 2, 18 + r * 28, (r === 4 && i === 4 ? kw * 4.5 : kw) - 4, 22);
        }
      }
      ctx.fillStyle = "#35373d";
      ctx.fillRect(w / 2 - 70, 170, 140, 70);
    },
    { color: true },
  );
}

/** A round rug for the music corner: oxblood field, cream rings, a few green stripes from the logo. */
export function rugTexture() {
  return canvasTexture(512, 512, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    const c = w / 2;
    const ring = (rad: number, col: string) => {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(c, c, rad, 0, Math.PI * 2);
      ctx.fill();
    };
    ring(250, "#2a1810");
    ring(240, "#7a2a1e");
    ring(214, "#e8dcc0");
    ring(204, "#7a2a1e");
    ring(160, "#2f6b3b");
    ring(150, "#7a2a1e");
    ring(96, "#e8dcc0");
    ring(86, "#7a2a1e");
    const r = rng(5);
    for (let i = 0; i < 700; i++) {
      ctx.fillStyle = r() > 0.5 ? "rgba(255,230,200,0.05)" : "rgba(0,0,0,0.06)";
      ctx.fillRect(r() * w, r() * h, 2 + r() * 4, 2);
    }
  });
}

/** Soft dark disc used as a cheap contact shadow under furniture. */
export function blobShadowTexture() {
  return canvasTexture(128, 128, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2);
    g.addColorStop(0, "rgba(0,0,0,0.55)");
    g.addColorStop(0.55, "rgba(0,0,0,0.25)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });
}

/** Faint diagonal glare, for the street-side face of the arched window's glass. */
export function glareTexture() {
  return canvasTexture(256, 256, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    const g = ctx.createLinearGradient(0, h, w, 0);
    g.addColorStop(0, "rgba(255,255,255,0)");
    g.addColorStop(0.35, "rgba(255,255,255,0.0)");
    g.addColorStop(0.42, "rgba(255,255,255,0.55)");
    g.addColorStop(0.5, "rgba(255,255,255,0.05)");
    g.addColorStop(0.56, "rgba(255,255,255,0.4)");
    g.addColorStop(0.62, "rgba(255,255,255,0)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });
}

export function disposeAll(...items: (THREE.Texture | null | undefined)[]) {
  items.forEach((t) => t?.dispose());
}
