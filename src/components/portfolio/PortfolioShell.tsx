"use client";

import { useNowPlaying } from "./useNowPlaying";
import { HeroIntro } from "./HeroIntro";
import { SocialCards } from "./SocialCards";
import { GrainGradient } from "grain-gradient/react";
import type { NagoyaWeather } from "@/lib/jmaWeather";
import type { GitHubContributions } from "@/lib/githubContributions";
import type { OsuProfile } from "@/lib/osuProfile";

export function PortfolioShell({
  userAgent,
  weather,
  githubContributions,
  osuProfile,
}: {
  userAgent: string | null;
  weather: NagoyaWeather;
  githubContributions: GitHubContributions;
  osuProfile: OsuProfile;
}) {
  const { track, colors, isLoading } = useNowPlaying(30000);

  return (
    <GrainGradient
      androidCanvasFallback="auto"
      androidCanvasFallbackUserAgent={userAgent}
      className="min-h-dvh text-white"
      baseColor="#031a58"
      colors={["#003fa6", "#0078e6", "#16b4eb", "#05388d", "#67c7f4"]}
      opacity={0.23}
      frequency={0.5}
      numOctaves={4}
      contrast={1.2}
      blur={20}
      saturation={1.32}
      swirl={34}
      motionPreset="orbit"
      motionSpeed={22}
      motionIntensity={34}
    >
      <div className="relative z-10 min-h-dvh">
        <main className="flex min-h-dvh items-center justify-center px-6 py-5 sm:px-10 lg:px-16">
          <div className="flex w-full max-w-[1312px] flex-col items-center gap-10 lg:h-[calc(100dvh-40px)] lg:flex-row">
            <HeroIntro />
            <SocialCards
              userAgent={userAgent}
              weather={weather}
              githubContributions={githubContributions}
              osuProfile={osuProfile}
              track={track}
              colors={colors}
              isLoading={isLoading}
            />
          </div>
        </main>
      </div>
    </GrainGradient>
  );
}
