import * as THREE from "three";

// All textures are generated on a 2D canvas at runtime: zero network cost, perfectly on-brand.

type Draw = (ctx: CanvasRenderingContext2D, w: number, h: number) => void;

export function canvasTexture(w: number, h: number, draw: Draw, opts: { repeat?: [number, number]; color?: boolean; aniso?: number } = {}) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  draw(ctx, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = opts.color === false ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  if (opts.repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(...opts.repeat);
  }
  t.anisotropy = opts.aniso ?? 4;
  t.needsUpdate = true;
  return t;
}

// deterministic pseudo-random so textures are identical every load
export function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Dark walnut with long grain. */
export function woodTexture() {
  return canvasTexture(
    1024,
    512,
    (ctx, w, h) => {
      const r = rng(11);
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, "#3a2214");
      g.addColorStop(0.5, "#2f1b10");
      g.addColorStop(1, "#3b2415");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 260; i++) {
        const y = r() * h;
        const amp = 2 + r() * 10;
        const f = 0.002 + r() * 0.006;
        ctx.strokeStyle = r() > 0.5 ? `rgba(10,5,2,${0.08 + r() * 0.2})` : `rgba(120,76,42,${0.04 + r() * 0.12})`;
        ctx.lineWidth = 0.6 + r() * 2.2;
        ctx.beginPath();
        for (let x = 0; x <= w; x += 16) ctx.lineTo(x, y + Math.sin(x * f + i) * amp);
        ctx.stroke();
      }
      // a couple of soft knots
      for (let k = 0; k < 3; k++) {
        const kx = r() * w;
        const ky = r() * h;
        const kg = ctx.createRadialGradient(kx, ky, 2, kx, ky, 40);
        kg.addColorStop(0, "rgba(15,8,4,0.55)");
        kg.addColorStop(1, "rgba(15,8,4,0)");
        ctx.fillStyle = kg;
        ctx.fillRect(kx - 50, ky - 50, 100, 100);
      }
    },
    { repeat: [1, 1] },
  );
}

/** Warm oxblood plaster, mottled. */
export function plasterTexture(base = "#5a211b") {
  return canvasTexture(
    1024,
    1024,
    (ctx, w, h) => {
      const r = rng(5);
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 520; i++) {
        const x = r() * w;
        const y = r() * h;
        const rad = 30 + r() * 150;
        const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
        const dark = r() > 0.5;
        g.addColorStop(0, dark ? "rgba(20,5,4,0.07)" : "rgba(190,90,70,0.05)");
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
      }
      const img = ctx.getImageData(0, 0, w, h);
      for (let i = 0; i < img.data.length; i += 4) {
        const n = (r() - 0.5) * 10;
        img.data[i] += n;
        img.data[i + 1] += n * 0.7;
        img.data[i + 2] += n * 0.7;
      }
      ctx.putImageData(img, 0, 0);
    },
    { repeat: [13, 2.2] },
  );
}

/** Bottle-green beadboard wainscot. */
export function beadboardTexture() {
  return canvasTexture(
    512,
    512,
    (ctx, w, h) => {
      ctx.fillStyle = "#1f3d2b";
      ctx.fillRect(0, 0, w, h);
      const n = 8;
      for (let i = 0; i < n; i++) {
        const x = (i / n) * w;
        const g = ctx.createLinearGradient(x, 0, x + w / n, 0);
        g.addColorStop(0, "rgba(0,0,0,0.5)");
        g.addColorStop(0.08, "rgba(0,0,0,0.0)");
        g.addColorStop(0.5, "rgba(255,255,255,0.05)");
        g.addColorStop(0.92, "rgba(0,0,0,0.0)");
        g.addColorStop(1, "rgba(0,0,0,0.45)");
        ctx.fillStyle = g;
        ctx.fillRect(x, 0, w / n, h);
      }
    },
    { repeat: [10, 1] },
  );
}

/** Black and cream checker tile. */
export function tileTexture() {
  return canvasTexture(
    512,
    512,
    (ctx, w, h) => {
      const r = rng(3);
      const n = 4;
      for (let y = 0; y < n; y++)
        for (let x = 0; x < n; x++) {
          ctx.fillStyle = (x + y) % 2 ? "#161110" : "#a99d85";
          ctx.fillRect((x * w) / n, (y * h) / n, w / n, h / n);
        }
      const img = ctx.getImageData(0, 0, w, h);
      for (let i = 0; i < img.data.length; i += 4) {
        const v = (r() - 0.5) * 14;
        img.data[i] += v;
        img.data[i + 1] += v;
        img.data[i + 2] += v;
      }
      ctx.putImageData(img, 0, 0);
      ctx.strokeStyle = "rgba(0,0,0,0.35)";
      ctx.lineWidth = 3;
      for (let i = 0; i <= n; i++) {
        ctx.beginPath();
        ctx.moveTo((i * w) / n, 0);
        ctx.lineTo((i * w) / n, h);
        ctx.moveTo(0, (i * h) / n);
        ctx.lineTo(w, (i * h) / n);
        ctx.stroke();
      }
    },
    { repeat: [8, 8] },
  );
}

/** A rosetta poured into a cappuccino. */
export function latteArtTexture() {
  return canvasTexture(512, 512, (ctx, w, h) => {
    const cx = w / 2;
    const cy = h / 2;
    const R = w / 2;
    const base = ctx.createRadialGradient(cx, cy, 10, cx, cy, R);
    base.addColorStop(0, "#9a6a43");
    base.addColorStop(0.7, "#7a4a2b");
    base.addColorStop(1, "#4a2713");
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = "#f4e6cf";
    ctx.strokeStyle = "#f4e6cf";
    // stacked crescents
    const layers = 7;
    for (let i = 0; i < layers; i++) {
      const t = i / (layers - 1);
      const y = cy - R * 0.5 + t * R * 1.0;
      const rad = R * (0.62 - t * 0.38);
      ctx.lineWidth = R * (0.12 - t * 0.05);
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.arc(cx, y - rad * 0.2, rad, Math.PI * 0.12, Math.PI * 0.88);
      ctx.stroke();
    }
    // pull-through
    ctx.strokeStyle = "#7a4a2b";
    ctx.lineWidth = R * 0.035;
    ctx.beginPath();
    ctx.moveTo(cx, cy - R * 0.62);
    ctx.quadraticCurveTo(cx + 4, cy + R * 0.1, cx, cy + R * 0.7);
    ctx.stroke();
    ctx.restore();
  });
}

/** Neon sign: script "caffe" over "aroma" in a framed tube, like the cafe's logo. */
export function neonTexture(fontFamily: string, lit: boolean) {
  const W = 1024;
  const H = 640;
  return canvasTexture(W, H, (ctx) => {
    ctx.clearRect(0, 0, W, H);
    const red = lit ? "#ff5a3c" : "#4a1b14";
    const hot = lit ? "#fff2e0" : "#5a3a30";
    const glow = (color: string, blur: number, fn: () => void) => {
      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = lit ? blur : 0;
      fn();
      ctx.restore();
    };
    // frame
    const pad = 40;
    const rr = (x: number, y: number, w: number, h: number, r: number) => {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    };
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    for (const pass of [0, 1]) {
      glow(red, pass ? 18 : 48, () => {
        ctx.strokeStyle = pass ? "#ff9a7c" : red;
        ctx.lineWidth = pass ? 5 : 14;
        rr(pad, pad, W - pad * 2, H - pad * 2, 54);
        ctx.stroke();
      });
    }
    // caffe
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `150px ${fontFamily}`;
    for (const pass of [0, 1]) {
      glow(red, pass ? 14 : 44, () => {
        ctx.fillStyle = pass ? "#ffb09a" : red;
        ctx.fillText("caffe", W / 2, 215);
      });
    }
    // aroma
    ctx.font = `210px ${fontFamily}`;
    for (const pass of [0, 1]) {
      glow(lit ? "#ffd29a" : "#000", pass ? 14 : 40, () => {
        ctx.fillStyle = pass ? "#ffffff" : hot;
        ctx.fillText("aroma", W / 2, 415);
      });
    }
    // two small green stripes, from the logo
    ctx.lineWidth = 8;
    for (const [y, x0, x1] of [
      [330, 170, 330],
      [330, 694, 854],
    ] as const) {
      glow("#40d070", 16, () => {
        ctx.strokeStyle = lit ? "#7dffa8" : "#1f4a30";
        ctx.beginPath();
        ctx.moveTo(x0, y);
        ctx.lineTo(x1, y);
        ctx.stroke();
      });
    }
  });
}

/** Radial gradient used for soft glow halos. */
export function haloTexture() {
  return canvasTexture(256, 256, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.25, "rgba(255,255,255,0.45)");
    g.addColorStop(0.6, "rgba(255,255,255,0.1)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });
}

/** One storey of an Elmwood Avenue building. 'ground' = shopfront with a big lit window; 'upper' = sash windows. */
export function facadeTextures(seed: number, tone: string, kind: "ground" | "upper" = "upper") {
  const W = 256;
  const H = 192;
  const mkCv = () => {
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    return c;
  };
  const albedo = mkCv();
  const emissive = mkCv();
  const a = albedo.getContext("2d")!;
  const e = emissive.getContext("2d")!;
  const r = rng(seed);
  a.fillStyle = tone;
  a.fillRect(0, 0, W, H);
  a.strokeStyle = "rgba(0,0,0,0.16)";
  a.lineWidth = 1;
  for (let y = 0; y < H; y += 8) {
    a.beginPath();
    a.moveTo(0, y);
    a.lineTo(W, y);
    a.stroke();
  }
  e.fillStyle = "#000";
  e.fillRect(0, 0, W, H);
  if (kind === "ground") {
    // shopfront: bulkhead, big window, door
    a.fillStyle = "#1b1411";
    a.fillRect(0, H - 34, W, 34);
    a.fillStyle = "#16100d";
    a.fillRect(14, 22, 150, H - 60);
    a.fillStyle = "#2a3140";
    a.fillRect(20, 28, 138, H - 72);
    a.fillStyle = "#1b1411";
    a.fillRect(184, 26, 54, H - 26);
    a.fillStyle = "#2a3140";
    a.fillRect(190, 32, 42, H - 70);
    e.fillStyle = r() > 0.3 ? "#ffcf86" : "#ffe2b0";
    e.fillRect(20, 28, 138, H - 72);
    e.fillStyle = "rgba(0,0,0,0.5)";
    e.fillRect(20 + 138 / 2 - 1, 28, 2, H - 72);
    e.fillStyle = r() > 0.5 ? "#ffd9a0" : "#ff9a5a";
    e.fillRect(190, 32, 42, H - 70);
  } else {
    for (let c = 0; c < 3; c++) {
      const w = 46;
      const h = 100;
      const x = 22 + c * 78;
      const y = 40;
      a.fillStyle = "#1c1612";
      a.fillRect(x - 4, y - 4, w + 8, h + 8);
      a.fillStyle = "#2a3140";
      a.fillRect(x, y, w, h);
      if (r() > 0.45) {
        e.fillStyle = r() > 0.25 ? "#ffcf86" : "#ffe9bd";
        e.fillRect(x, y, w, h);
        e.fillStyle = "rgba(0,0,0,0.45)";
        e.fillRect(x + w / 2 - 1, y, 2, h);
        e.fillRect(x, y + h / 2 - 1, w, 2);
      }
    }
  }
  const mk = (cv: HTMLCanvasElement) => {
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  };
  return { map: mk(albedo), emissiveMap: mk(emissive) };
}
