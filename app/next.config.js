const { config } = require("dotenv");
const path = require("path");

config({ path: path.join(__dirname, "..", ".env") });

/** @type {import('next').NextConfig} */
const nextConfig = {
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

module.exports = nextConfig;
