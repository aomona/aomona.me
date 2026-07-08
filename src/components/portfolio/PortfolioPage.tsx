import type { NagoyaWeather } from "@/lib/jmaWeather";
import type { GitHubContributions } from "@/lib/githubContributions";
import type { OsuProfile } from "@/lib/osuProfile";
import type { TetrioProfile } from "@/lib/tetrioProfile";
import { PortfolioShell } from "./PortfolioShell";

export function PortfolioPage({
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
  return (
    <PortfolioShell
      weather={weather}
      githubContributions={githubContributions}
      osuProfile={osuProfile}
      tetrioProfile={tetrioProfile}
    />
  );
}
