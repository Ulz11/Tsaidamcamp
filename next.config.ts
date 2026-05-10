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
  images: {
    remotePatterns: [
      // Stock photos used as placeholders on the public landing page.
      // Replace with Supabase Storage hostname once ger photos are uploaded.
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
};

export default withNextIntl(nextConfig);
