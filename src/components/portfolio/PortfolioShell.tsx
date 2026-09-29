import type { ReactNode } from "react";
import { HeroIntro } from "./HeroIntro";
import { PortfolioBackground } from "./PortfolioBackground";

export function PortfolioShell({
  userAgent,
  children,
}: {
  userAgent: string | null;
  children: ReactNode;
}) {
  return (
    <div className="relative isolate min-h-dvh text-white">
      <PortfolioBackground userAgent={userAgent} />
      <div className="relative z-10 min-h-dvh">
        <main className="flex min-h-dvh items-center justify-center px-6 py-5 sm:px-10 lg:px-16">
          <div className="flex w-full max-w-[1312px] flex-col items-center gap-10 min-[1141px]:h-[calc(100dvh-40px)] min-[1141px]:flex-row">
            <HeroIntro />
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
