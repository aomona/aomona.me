export const dynamic = "force-dynamic";

import { PortfolioPage } from "@/components/portfolio/PortfolioPage";
import { getGitHubContributions } from "@/lib/githubContributions";
import { getNagoyaWeather } from "@/lib/jmaWeather";
import { headers } from "next/headers";

export default async function Home() {
  const [headersList, weather, githubContributions] = await Promise.all([
    headers(),
    getNagoyaWeather(),
    getGitHubContributions(),
  ]);
  const userAgent = headersList.get("user-agent");

  return (
    <PortfolioPage
      userAgent={userAgent}
      weather={weather}
      githubContributions={githubContributions}
    />
  );
}
