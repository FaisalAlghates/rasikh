import { defineConfig, devices } from '@playwright/test';

// Expects the Firebase emulators to be running (see docs/FIREBASE-SETUP.md).
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 }, // dev-server pages compile on first hit
  fullyParallel: false,
  workers: 1,
  // One retry on CI only: dev-server compile times on a shared runner are not a product bug.
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
    // The cookie notice is dismissed up front so it never covers controls; shell.spec checks it on its own.
    storageState: {
      cookies: [],
      origins: [
        { origin: 'http://localhost:3000', localStorage: [{ name: 'rk-cookie-ok', value: '1' }] },
      ],
    },
    // Software WebGL so the 3D scene can run in headless/CI browsers.
    launchOptions: {
      args: [
        '--use-angle=swiftshader',
        '--enable-unsafe-swiftshader',
        '--ignore-gpu-blocklist',
        // A synthetic camera, so the in-app capture flow can be tested without hardware.
        '--use-fake-device-for-media-stream',
        '--use-fake-ui-for-media-stream',
      ],
    },
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000/ar',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
