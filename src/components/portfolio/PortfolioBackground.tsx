"use client";

import { WebGLGrainGradient } from "grain-gradient/webgl/react";
import { useEffect, useState } from "react";

export function PortfolioBackground({ userAgent }: { userAgent: string | null }) {
  const [reducedMotion, setReducedMotion] = useState(true);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return (
    <WebGLGrainGradient
      androidCanvasFallback="auto"
      androidCanvasFallbackUserAgent={userAgent}
      style={{ position: "fixed", inset: 0, zIndex: -1, pointerEvents: "none" }}
      baseColor="#031a58"
      colors={["#003fa6", "#0078e6", "#16b4eb", "#05388d", "#67c7f4"]}
      opacity={0.23}
      frequency={0.5}
      numOctaves={4}
      size={512}
      stitchTiles
      contrast={1.2}
      blur={20}
      saturation={1.32}
      swirl={34}
      motionPreset={reducedMotion ? "none" : "orbit"}
      motionSpeed={22}
      motionIntensity={34}
      maxPixelRatio={1.25}
      motionMaxPixelRatio={0.75}
      fps={30}
    />
  );
}
