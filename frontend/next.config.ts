import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  // Allow API calls to VPS
  serverExternalPackages: [],
};

export default nextConfig;
