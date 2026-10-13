import { defineConfig, devices } from '@playwright/test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const port = Number(process.env.E2E_PORT ?? 4310);
const ci = Boolean(process.env.CI);

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  forbidOnly: ci,
  retries: ci ? 1 : 0,
  reporter: ci ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: `http://localhost:${port}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] }, testIgnore: /mobile/ },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] }, testIgnore: /mobile/ },
    { name: 'webkit', use: { ...devices['Desktop Safari'] }, testIgnore: /mobile/ },
    { name: 'mobile-chrome', use: { ...devices['Pixel 7'] }, testMatch: /mobile/ },
    { name: 'mobile-safari', use: { ...devices['iPhone 15'] }, testMatch: /mobile/ },
  ],
  webServer: {
    command: 'tsx tests/e2e/server.ts',
    url: `http://localhost:${port}/api/health`,
    reuseExistingServer: !ci,
    stdout: 'ignore',
    env: {
      PORT: String(port),
      DATA_DIR: mkdtempSync(join(tmpdir(), 'jom-e2e-')),
    },
  },
});
