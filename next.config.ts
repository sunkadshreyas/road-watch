import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.ROADWATCH_NEXT_DIST_DIR ?? ".next",
  typescript: {
    tsconfigPath: process.env.ROADWATCH_TSCONFIG_PATH ?? "tsconfig.json",
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "12mb",
    },
  },
};

export default nextConfig;
