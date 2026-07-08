import type { NextConfig } from "next";
import { config } from "dotenv";
import path from "path";

config({ path: path.join(__dirname, "..", ".env") });

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.fbcdn.net" },
      { protocol: "https", hostname: "**.facebook.com" },
      { protocol: "https", hostname: "**.cdninstagram.com" },
      { protocol: "https", hostname: "i.ytimg.com" },
      { protocol: "https", hostname: "img.youtube.com" },
      { protocol: "https", hostname: "api.apify.com" },
      { protocol: "https", hostname: "**.kie.ai" },
    ],
  },
};

export default nextConfig;
