import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["aomonamacbookpro.tail7a84e3.ts.net"],
  reactCompiler: true,
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "i.scdn.co",
        pathname: "/image/**",
      },
      {
        protocol: "https",
        hostname: "github.com",
        pathname: "/aomona.png",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "3845",
        pathname: "/assets/**",
      },
    ],
  },
};

export default function config(phase: string): NextConfig {
  if (phase !== PHASE_DEVELOPMENT_SERVER || !process.env.AOMONA_DEV_DIST_DIR) return nextConfig;
  return {
    ...nextConfig,
    distDir: process.env.AOMONA_DEV_DIST_DIR,
    typescript: { tsconfigPath: process.env.AOMONA_DEV_TSCONFIG },
  };
}
