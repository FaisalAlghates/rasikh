import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['ar', 'en'],
  defaultLocale: 'ar',
  // Arabic-first product: do not switch to English based on the browser's Accept-Language.
  localeDetection: false,
});
