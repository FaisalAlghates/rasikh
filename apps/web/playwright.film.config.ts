import { defineConfig, devices } from '@playwright/test';

/** Records the split-screen marketing film (desktop + phone passes). Needs the emulators and a production build. */
export default defineConfig({
  testDir: './video2',
  timeout: 30 * 60_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    ...devices['Desktop Chrome'],
    baseURL: process.env.TOUR_URL ?? 'http://localhost:3000',
    // the cookie notice is dismissed so it never covers what the film shows
    storageState: {
      cookies: [],
      origins: [
        {
          origin: process.env.TOUR_URL ?? 'http://localhost:3000',
          localStorage: [{ name: 'rk-cookie-ok', value: '1' }],
        },
      ],
    },
    launchOptions: {
      args: [
        '--use-angle=swiftshader',
        '--enable-unsafe-swiftshader',
        '--ignore-gpu-blocklist',
        '--use-fake-device-for-media-stream',
        '--use-fake-ui-for-media-stream',
      ],
    },
  },
});
