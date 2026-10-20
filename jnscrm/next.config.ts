import type { NextConfig } from "next";

// Backend (NestJS) URL. Browser calls go to /backend/* on the frontend's own domain and
// Next.js proxies them here, so there is no CORS and the auth cookie lands on the frontend domain.
// Set BACKEND_URL in the Vercel project settings (e.g. https://your-backend.vercel.app).
const BACKEND_URL = (
  process.env.BACKEND_URL ||
  (process.env.NODE_ENV === "production"
    ? "https://jnsenterprise-65uv-alpha.vercel.app"
    : "http://localhost:4000")
).replace(/\/+$/, "");

const nextConfig: NextConfig = {
  reactCompiler: true,
  poweredByHeader: false,
  async rewrites() {
    return [
      {
        source: "/backend/:path*",
        destination: `${BACKEND_URL}/:path*`,
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/login",
        destination: "/protection/login",
        permanent: false,
      },
      {
        source: "/dashboard",
        destination: "/protection/dashboard",
        permanent: false,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
