"use client";

import { useEffect, useState } from "react";
import type { Fonts } from "./exteriorTextures";

/** The page's own display/script/sans/mono faces, resolved from the next/font CSS variables once they have loaded. */
export function useFonts(): Fonts | null {
  const [fonts, setFonts] = useState<Fonts | null>(null);
  useEffect(() => {
    let off = false;
    const cs = getComputedStyle(document.documentElement);
    const pick = (v: string, fb: string) => cs.getPropertyValue(v).trim() || fb;
    const f: Fonts = {
      display: pick("--font-fraunces", "Georgia, serif"),
      script: pick("--font-script", '"Kaushan Script", cursive'),
      sans: pick("--font-hanken", "system-ui, sans-serif"),
      mono: pick("--font-dm-mono", "ui-monospace, monospace"),
    };
    Promise.all([document.fonts.load(`600 80px ${f.display}`), document.fonts.load(`80px ${f.script}`), document.fonts.load(`500 40px ${f.mono}`)])
      .catch(() => undefined)
      .finally(() => {
        if (!off) setFonts(f);
      });
    return () => {
      off = true;
    };
  }, []);
  return fonts;
}
