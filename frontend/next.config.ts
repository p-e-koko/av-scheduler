import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    unoptimized: true,
  },
  async rewrites() {
    const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    let backendOrigin = rawApiUrl;
    try {
      if (rawApiUrl.startsWith("http")) {
        backendOrigin = new URL(rawApiUrl).origin;
      }
    } catch {
      backendOrigin = "http://localhost:8000";
    }

    return [
      {
        source: "/storage/:path*",
        destination: `${backendOrigin}/storage/:path*`,
      },
    ];
  },
};

export default nextConfig;

