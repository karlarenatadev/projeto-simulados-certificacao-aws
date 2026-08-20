import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI
    ? [["line"], ["html", { outputFolder: "playwright-report", open: "never" }]]
    : "list",
  outputDir: "test-results/e2e",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:4173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "off",
  },
  ...(process.env.PLAYWRIGHT_EXTERNAL_SERVER
    ? {}
    : {
        webServer: {
          command: "node e2e/serve-public.mjs",
          url: "http://127.0.0.1:4173/index.html",
          reuseExistingServer: false,
          timeout: 30_000,
          stdout: "pipe",
          stderr: "pipe",
        },
      }),
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
