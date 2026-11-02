import type { NextConfig } from "next";

const apiOrigin = process.env.SERVER_ORIGIN ?? "http://localhost:5000";
const nextConfig: NextConfig = {
  async rewrites() {
    return [{ source: "/api/backend/:path*", destination: `${apiOrigin}/api/:path*` }];
  },
  images: { remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }, { protocol: "https", hostname: "i.ibb.co" }, { protocol: "https", hostname: "*.imgbb.com" }] },
};
export default nextConfig;
