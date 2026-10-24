import { defineConfig, devices } from "@playwright/test";

// BASE_URL lets the same suite run locally, in CI, or against a pre-built bundle.
const baseURL = process.env.BASE_URL || "http://localhost:4173";

export default defineConfig({
  testDir: "./tests",
  timeout: 15000,
  expect: { timeout: 3000 },
  retries: process.env.CI ? 1 : 0,
  reporter: [
    ["list"],
    ["json", { outputFile: "test-results/results.json" }],
    ["html", { open: "never", outputFolder: "playwright-report" }],
  ],
  use: { baseURL, screenshot: "only-on-failure", trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // Start the built app automatically unless BASE_URL is supplied.
  webServer: process.env.BASE_URL
    ? undefined
    : { command: "npm run build && npm run preview", url: "http://localhost:4173", reuseExistingServer: !process.env.CI, timeout: 120000 },
});
