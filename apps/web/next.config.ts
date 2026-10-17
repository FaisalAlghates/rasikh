import createNextIntlPlugin from 'next-intl/plugin';
import type { NextConfig } from 'next';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

// The free demo build (GitHub Pages): a static export under /rasikh, built by scripts/build-demo.mjs.
const demo = process.env.DEMO_EXPORT === '1';

const nextConfig: NextConfig = {
  ...(demo
    ? {
        output: 'export' as const,
        distDir: '.next-demo',
        basePath: '/rasikh',
        trailingSlash: true,
        images: { unoptimized: true },
      }
    : {}),
  env: { NEXT_PUBLIC_BASE_PATH: demo ? '/rasikh' : '' },
  reactStrictMode: true,
  poweredByHeader: false,
  // the dev badge would show in the walkthrough videos recorded from the dev server
  devIndicators: false,
  ...(demo ? {} : { images: { formats: ['image/avif', 'image/webp'] } }),
  // Web server stays stateless and never logs personal data (CLAUDE.md §2).
};

export default withNextIntl(nextConfig);
