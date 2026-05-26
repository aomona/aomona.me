import type { NagoyaWeather } from "@/lib/jmaWeather";
import type { GitHubContributions } from "@/lib/githubContributions";
import { PortfolioShell } from "./PortfolioShell";

export function PortfolioPage({
  userAgent,
  weather,
  githubContributions,
}: {
  userAgent: string | null;
  weather: NagoyaWeather;
  githubContributions: GitHubContributions;
}) {
  return (
    <PortfolioShell
      userAgent={userAgent}
      weather={weather}
      githubContributions={githubContributions}
    />
  );
}
