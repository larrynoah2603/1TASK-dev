import type { NextConfig } from "next";

/**
 * Enforce the browser protections that do NOT interfere with Next.js inline
 * scripts, Microsoft Entra callbacks or the existing Web Push service worker.
 *
 * An aggressive script-src CSP requires per-request nonces and browser tests;
 * do not silently add one here. These directives are an enforceable baseline.
 */
const browserSecurityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "base-uri 'self'; object-src 'none'; frame-ancestors 'none'" },
  { key: "Referrer-Policy", value: "same-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
];

const privateResponseHeaders = [
  { key: "Cache-Control", value: "private, no-store, max-age=0" },
];

const nextConfig: NextConfig = {
  typedRoutes: true,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          ...browserSecurityHeaders,
          ...(process.env.VERCEL_ENV === "production"
            ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }]
            : []),
        ],
      },
      // The application API returns identity, ticket, permission and asset data.
      // None of its JSON or attachment/photo responses may be cached by proxies.
      { source: "/api/:path*", headers: privateResponseHeaders },
      ...[
        "/inbox/:path*", "/tickets/:path*", "/dashboard/:path*", "/admin/:path*",
        "/profile", "/my-assets/:path*", "/notifications/:path*", "/queues/:path*",
        "/reporting/:path*", "/assets/:path*", "/asset-requests/:path*",
      ].map((source) => ({ source, headers: privateResponseHeaders })),
    ];
  },
};

export default nextConfig;
