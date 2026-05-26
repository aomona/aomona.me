import { PortfolioPage } from "@/components/portfolio/PortfolioPage";
import { getNagoyaWeather } from "@/lib/jmaWeather";
import { headers } from "next/headers";

export default async function Home() {
  const [headersList, weather] = await Promise.all([headers(), getNagoyaWeather()]);
  const userAgent = headersList.get("user-agent");

  return <PortfolioPage userAgent={userAgent} weather={weather} />;
}
