import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ewigfxjaoxsczrauuxfj.supabase.co',
        pathname: '/storage/**',
      },
    ],
  },
};

export default nextConfig;
