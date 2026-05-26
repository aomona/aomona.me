export const dynamic = "force-dynamic";

import { PortfolioPage } from "@/components/portfolio/PortfolioPage";
import { getGitHubContributions } from "@/lib/githubContributions";
import { getNagoyaWeather } from "@/lib/jmaWeather";
import { getOsuProfile } from "@/lib/osuProfile";
import { getTetrioProfile } from "@/lib/tetrioProfile";
import { headers } from "next/headers";

export default async function Home() {
  const [headersList, weather, githubContributions, osuProfile, tetrioProfile] = await Promise.all([
    headers(),
    getNagoyaWeather(),
    getGitHubContributions(),
    getOsuProfile(),
    getTetrioProfile(),
  ]);
  const userAgent = headersList.get("user-agent");

  return (
    <PortfolioPage
      userAgent={userAgent}
      weather={weather}
      githubContributions={githubContributions}
      osuProfile={osuProfile}
      tetrioProfile={tetrioProfile}
    />
  );
}
