import createNextIntlPlugin from 'next-intl/plugin';
import type { NextConfig } from 'next';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // the dev badge would show in the walkthrough videos recorded from the dev server
  devIndicators: false,
  images: { formats: ['image/avif', 'image/webp'] },
  // Web server stays stateless and never logs personal data (CLAUDE.md §2).
};

export default withNextIntl(nextConfig);
