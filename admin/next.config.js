const path = require("path");
const isBuild = process.argv.includes("build");
const currentEnv = process.env.NODE_ENV;
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
process.env.NODE_ENV = isBuild ? "production" : (currentEnv || process.env.NODE_ENV || "development");
const rawApi = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";
const API_BASE = (rawApi.includes("onrender.com") ? "http://localhost:5000/api/v1" : rawApi).replace(/\/api\/v1\/?$/, "");

const nextConfig = {
  assetPrefix: process.env.NODE_ENV === "production" ? "/admin-assets" : "",
  reactStrictMode: true,
  turbopack: {
    root: path.resolve(__dirname, ".."),
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.amazonaws.com" },
      { protocol: "https", hostname: "**.onrender.com" },
      { protocol: "https", hostname: "localhost" },
    ],
  },
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${API_BASE}/api/v1/:path*`,
      },
      {
        source: "/uploads/:path*",
        destination: `${API_BASE}/uploads/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
