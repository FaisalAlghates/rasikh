import { defineConfig, devices } from '@playwright/test';

/** Records the product tour (docs/video). Needs the Firebase emulators and a production web build on port 3100. */
export default defineConfig({
  testDir: './video',
  timeout: 20 * 60_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    ...devices['Desktop Chrome'],
    baseURL: process.env.TOUR_URL ?? 'http://localhost:3100',
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
