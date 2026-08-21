import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.ROADWATCH_NEXT_DIST_DIR ?? ".next",
  allowedDevOrigins: process.env.ROADWATCH_DEV_ORIGIN
    ? [process.env.ROADWATCH_DEV_ORIGIN]
    : undefined,
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
