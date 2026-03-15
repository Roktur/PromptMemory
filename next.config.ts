import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Serve uploaded images from the local filesystem
  images: {
    remotePatterns: [],
    // Disable Next.js image optimization for local files —
    // we handle resizing ourselves with Sharp.
    unoptimized: true,
  },

  // Allow importing SVGs as React components if needed later
  webpack(config) {
    return config;
  },

  // Headers for uploaded static assets served via /api/images/[id]/file
  async headers() {
    return [
      {
        source: "/api/images/:id/file",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
};

export default nextConfig;
