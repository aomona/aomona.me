import type { NagoyaWeather } from "@/lib/jmaWeather";
import type { GitHubContributions } from "@/lib/githubContributions";
import type { OsuProfile } from "@/lib/osuProfile";
import { PortfolioShell } from "./PortfolioShell";

export function PortfolioPage({
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
  return (
    <PortfolioShell
      userAgent={userAgent}
      weather={weather}
      githubContributions={githubContributions}
      osuProfile={osuProfile}
    />
  );
}
