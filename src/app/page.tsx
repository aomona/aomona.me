import { PortfolioPage } from "@/components/portfolio/PortfolioPage";
import { headers } from "next/headers";

export default async function Home() {
  const userAgent = (await headers()).get("user-agent");

  return <PortfolioPage userAgent={userAgent} />;
}
