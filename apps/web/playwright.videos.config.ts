import { defineConfig } from '@playwright/test';

// Records the section walkthrough videos. Needs the Firebase emulators and `pnpm dev` (see videos/record.spec.ts).
export default defineConfig({
  testDir: './videos',
  timeout: 600_000,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:3000',
    launchOptions: {
      args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
    },
  },
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000/ar',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
