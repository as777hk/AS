import type { NextConfig } from "next";
const nextConfig: NextConfig = { poweredByHeader: false, images: { remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }, { protocol: "https", hostname: "i.ibb.co" }, { protocol: "https", hostname: "imgbb.com" }] } };
export default nextConfig;
