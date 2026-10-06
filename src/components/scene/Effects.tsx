"use client";

import { Bloom, EffectComposer, ToneMapping, Vignette } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";

/** High-tier only: bloom for neon and lamps, a soft vignette, filmic tone mapping. */
export default function Effects() {
  return (
    <EffectComposer multisampling={4} enableNormalPass={false}>
      <Bloom intensity={0.75} luminanceThreshold={1.0} luminanceSmoothing={0.25} mipmapBlur radius={0.7} />
      <Vignette eskil={false} offset={0.28} darkness={0.5} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  );
}
