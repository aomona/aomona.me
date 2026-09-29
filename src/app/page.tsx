import { PortfolioPage } from "@/components/portfolio/PortfolioPage";
import { getGitHubContributions } from "@/lib/githubContributions";
import { getNagoyaWeather } from "@/lib/jmaWeather";
import { getOsuProfile } from "@/lib/osuProfile";
import { getTetrioProfile } from "@/lib/tetrioProfile";
import { headers } from "next/headers";

export default async function Home() {
  const dataPromise = Promise.all([
    getNagoyaWeather(),
    getGitHubContributions(),
    getOsuProfile(),
    getTetrioProfile(),
  ]);
  const headersList = await headers();
  const userAgent = headersList.get("user-agent");

  return <PortfolioPage userAgent={userAgent} data={dataPromise} />;
}
