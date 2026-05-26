"use client";

import { GrainGradient } from "grain-gradient/react";
import type { ReactNode } from "react";

export function PortfolioBackground({
  children,
  userAgent,
}: {
  children: ReactNode;
  userAgent: string | null;
}) {
  return (
    <GrainGradient
      androidCanvasFallback="auto"
      androidCanvasFallbackUserAgent={userAgent}
      className="min-h-dvh text-white"
      baseColor="#0597e8"
      colors={["#0046b8", "#0086ff", "#18c4ff", "#0641a2", "#00a2d4"]}
      opacity={0.22}
      frequency={0.48}
      numOctaves={4}
      contrast={1.22}
      blur={18}
      saturation={1.28}
      swirl={18}
      motionPreset="breathe"
      motionSpeed={18}
      motionIntensity={28}
    >
      <div className="relative z-10 min-h-dvh">{children}</div>
    </GrainGradient>
  );
}
