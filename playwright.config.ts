import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
// E2E_BASE_URL=http://127.0.0.1:8788 runs the same tests against the Cloudflare build (npm run build:cf, then npm run preview:cf)
const REMOTE = process.env.E2E_BASE_URL;

/**
 * End-to-end tests drive the installed Google Chrome (no browser download needed).
 *   npm run build && npm run e2e
 * Uses the production server so the tests exercise what would ship.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: REMOTE ?? `http://localhost:${PORT}`,
    channel: "chrome",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], channel: "chrome", viewport: { width: 1440, height: 900 } } },
    { name: "mobile", use: { ...devices["Pixel 7"], channel: "chrome", viewport: { width: 390, height: 844 } } },
  ],
  webServer: REMOTE
    ? undefined
    : {
        command: `npx next start -p ${PORT}`,
        url: `http://localhost:${PORT}`,
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
