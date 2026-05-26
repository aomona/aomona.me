import type { NagoyaWeather } from "@/lib/jmaWeather";
import { PortfolioShell } from "./PortfolioShell";

export function PortfolioPage({
  userAgent,
  weather,
}: {
  userAgent: string | null;
  weather: NagoyaWeather;
}) {
  return <PortfolioShell userAgent={userAgent} weather={weather} />;
}
