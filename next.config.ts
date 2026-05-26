import type { NextConfig } from "next";

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
        protocol: "http",
        hostname: "localhost",
        port: "3845",
        pathname: "/assets/**",
      },
    ],
  },
};

export default nextConfig;
