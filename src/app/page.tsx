import { PortfolioPage } from "@/components/portfolio/PortfolioPage";
import { getGitHubContributions } from "@/lib/githubContributions";
import { getNagoyaWeather } from "@/lib/jmaWeather";
import { getOsuProfile } from "@/lib/osuProfile";
import { getTetrioProfile } from "@/lib/tetrioProfile";

export const dynamic = "force-dynamic";

export default async function Home() {
  const dataPromise = Promise.all([
    getNagoyaWeather(),
    getGitHubContributions(),
    getOsuProfile(),
    getTetrioProfile(),
  ]);
  const [weather, githubContributions, osuProfile, tetrioProfile] = await dataPromise;

  return (
    <PortfolioPage
      weather={weather}
      githubContributions={githubContributions}
      osuProfile={osuProfile}
      tetrioProfile={tetrioProfile}
    />
  );
}
