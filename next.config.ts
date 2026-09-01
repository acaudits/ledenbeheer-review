import type { NextConfig } from "next";

const scriptBronnen =
  process.env.NODE_ENV === "development"
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
    : "script-src 'self' 'unsafe-inline'";

const contentSecurityPolicy = [
  "default-src 'self'",
  scriptBronnen,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https:",
  "connect-src 'self' https: wss:",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "media-src 'self' blob: https:",
  "frame-src 'self' https:",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "form-action 'self'",
].join("; ");

const beveiligingsheaders = [
  {
    /*
     * In productie wordt unsafe-eval niet
     * toegestaan. Development heeft deze
     * uitzondering nodig voor Turbopack.
     */
    key: "Content-Security-Policy",
    value: contentSecurityPolicy,
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
  {
    /*
     * Twee jaar HTTPS afdwingen.
     * includeSubDomains en preload worden
     * pas toegevoegd nadat alle subdomeinen
     * afzonderlijk zijn gecontroleerd.
     */
    key: "Strict-Transport-Security",
    value: "max-age=63072000",
  },
];

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "25mb",
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
