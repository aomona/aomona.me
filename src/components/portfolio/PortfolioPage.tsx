import type { NagoyaWeather } from "@/lib/jmaWeather";
import type { GitHubContributions } from "@/lib/githubContributions";
import type { OsuProfile } from "@/lib/osuProfile";
import type { TetrioProfile } from "@/lib/tetrioProfile";
import { Suspense } from "react";
import { PortfolioShell } from "./PortfolioShell";
import { SocialCards } from "./SocialCards";

type PortfolioProps = {
  userAgent: string | null;
  data: Promise<[NagoyaWeather, GitHubContributions, OsuProfile, TetrioProfile]>;
};

export function PortfolioPage({ userAgent, data }: PortfolioProps) {
  return (
    <PortfolioShell userAgent={userAgent}>
      <Suspense
        fallback={
          <div className="grid w-full max-w-92 shrink-0 grid-cols-2 gap-3 md:aspect-3/4 md:max-w-140 md:grid-cols-3 md:grid-rows-4">
            <output className="sr-only">Loading profile cards</output>
            {Array.from({ length: 9 }, (_, index) => (
              <div
                key={index}
                className={`rounded-[34px] border border-black/15 bg-white/10 ${
                  index === 0 || index === 3 || index === 4
                    ? "col-span-2 aspect-2/1 md:aspect-auto"
                    : "aspect-square"
                }`}
              />
            ))}
          </div>
        }
      >
        <ProfileCards userAgent={userAgent} data={data} />
      </Suspense>
    </PortfolioShell>
  );
}

async function ProfileCards({ userAgent, data }: PortfolioProps) {
  const [weather, githubContributions, osuProfile, tetrioProfile] = await data;
  return (
    <SocialCards
      userAgent={userAgent}
      weather={weather}
      githubContributions={githubContributions}
      osuProfile={osuProfile}
      tetrioProfile={tetrioProfile}
    />
  );
}
