import { defineConfig } from 'vitest/config';

// Unit tests live next to the code; Playwright specs under e2e/ are run by `pnpm e2e`, not by Vitest.
export default defineConfig({
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
    exclude: ['e2e/**', 'node_modules/**', '.next/**'],
  },
});
