import type { NextConfig } from "next";

const beveiligingsheaders = [
  {
    key: "Content-Security-Policy",
    value:
      "object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "Referrer-Policy",
    value:
      "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value:
      "camera=(), microphone=(), geolocation=()",
  },
];

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "300mb",
    },
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: beveiligingsheaders,
      },
      {
        source:
          "/aanmelden-laattijdige-plaatsbezoeken",
        headers: [
          {
            key: "Cache-Control",
            value:
              "no-store, max-age=0",
          },
          {
            key: "X-Robots-Tag",
            value:
              "noindex, nofollow, noarchive",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
