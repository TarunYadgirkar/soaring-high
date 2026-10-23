import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Claims read a local event log on every request, so pages render per request.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
