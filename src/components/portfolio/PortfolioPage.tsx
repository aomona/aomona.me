import type { NagoyaWeather } from "@/lib/jmaWeather";
import { HeroIntro } from "./HeroIntro";
import { PortfolioBackground } from "./PortfolioBackground";
import { SocialCards } from "./SocialCards";

export function PortfolioPage({
  userAgent,
  weather,
}: {
  userAgent: string | null;
  weather: NagoyaWeather;
}) {
  return (
    <PortfolioBackground userAgent={userAgent}>
      <main className="flex min-h-dvh items-center justify-center px-6 py-5 sm:px-10 lg:px-16">
        <div className="flex w-full max-w-[1312px] flex-col items-center gap-10 lg:h-[calc(100dvh-40px)] lg:flex-row">
          <HeroIntro />
          <SocialCards userAgent={userAgent} weather={weather} />
        </div>
      </main>
    </PortfolioBackground>
  );
}
