import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    unoptimized: true,
  },
  async rewrites() {
    // Determine internal backend URL for server-side proxying to bypass Cloudflare/WAF.
    // In docker-compose, this is typically 'http://backend:8080'
    const internalApiUrl = process.env.INTERNAL_BACKEND_URL || "http://backend:8080";
    let backendOrigin = internalApiUrl;

    try {
      if (internalApiUrl.startsWith("http")) {
        backendOrigin = new URL(internalApiUrl).origin;
      }
    } catch {
      backendOrigin = "http://backend:8080";
    }

    // Fallback if not running in docker but running locally
    if (process.env.NODE_ENV === 'development' && !process.env.INTERNAL_BACKEND_URL) {
      backendOrigin = "http://localhost:8080";
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

