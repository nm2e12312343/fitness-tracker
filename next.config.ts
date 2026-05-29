import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  generateBuildId: async () => `build-${Date.now()}`,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default nextConfig;
