import type { NextConfig } from "next";

const useStandaloneOutput = process.env.NEXT_BUILD_STANDALONE === "true";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.blob.core.windows.net",
      },
    ],
  },
  ...(useStandaloneOutput ? { output: "standalone" as const } : {}),
};

export default nextConfig;
