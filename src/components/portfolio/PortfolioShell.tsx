"use client";

import { useNowPlaying } from "./useNowPlaying";
import { HeroIntro } from "./HeroIntro";
import { SocialCards } from "./SocialCards";
import { GrainGradient } from "grain-gradient/react";
import type { NagoyaWeather } from "@/lib/jmaWeather";
import type { GitHubContributions } from "@/lib/githubContributions";
import type { OsuProfile } from "@/lib/osuProfile";
import type { TetrioProfile } from "@/lib/tetrioProfile";

export function PortfolioShell({
  weather,
  githubContributions,
  osuProfile,
  tetrioProfile,
}: {
  weather: NagoyaWeather;
  githubContributions: GitHubContributions;
  osuProfile: OsuProfile;
  tetrioProfile: TetrioProfile;
}) {
  const { track, colors, isLoading } = useNowPlaying();

  return (
    <GrainGradient
      className="min-h-dvh text-white"
      baseColor="#031a58"
      colors={["#003fa6", "#0078e6", "#16b4eb", "#05388d", "#67c7f4"]}
      motionPreset="orbit"
      motionSpeed={1}
    >
      <div className="relative z-10 min-h-dvh">
        <main className="flex min-h-dvh items-center justify-center px-6 pt-[104px] pb-8 sm:px-10 lg:px-16">
          <div className="flex w-full max-w-[1312px] flex-col items-center gap-10 min-[1141px]:h-[calc(100dvh-40px)] min-[1141px]:flex-row">
            <HeroIntro />
            <SocialCards
              weather={weather}
              githubContributions={githubContributions}
              osuProfile={osuProfile}
              tetrioProfile={tetrioProfile}
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
