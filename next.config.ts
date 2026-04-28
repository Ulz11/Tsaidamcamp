import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // Pin the Turbopack workspace root to this project. Without this, Next 16
  // walks up and picks up a stray `C:\Users\Obama\pnpm-lock.yaml` in the
  // home directory as the workspace root, which produces a startup warning
  // and confuses module resolution for packages like `tailwindcss`.
  // `process.cwd()` is the project directory when running `next dev` /
  // `next build`. We use it instead of `import.meta.url` because the TS
  // config loader doesn't always transpile `import.meta` cleanly.
  turbopack: {
    root: process.cwd(),
  },
  // CORS for the public API. The public website front-end is built
  // separately (Claude-Design) and will live on a different origin,
  // so /api/public/* must accept cross-origin reads + the booking POST.
  // PUBLIC_WEB_ORIGIN can pin this down once the domain is known;
  // unset → "*" for ease of local development.
  async headers() {
    const origin = process.env.PUBLIC_WEB_ORIGIN || "*";
    return [
      {
        source: "/api/public/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: origin },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type" },
          { key: "Access-Control-Max-Age", value: "86400" },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
