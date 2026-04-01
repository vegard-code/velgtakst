import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "i.pravatar.cc",
      },
    ],
  },
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "velgtakst.no" }],
        destination: "https://www.takstmann.net/:path*",
        permanent: true,
      },
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.velgtakst.no" }],
        destination: "https://www.takstmann.net/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
