import { defineConfig, devices } from "@playwright/test";

const external = process.env.NEXUS_TEST_URL;
export default defineConfig({
  testDir: "./tests", testMatch: "**/*.spec.ts", timeout: 45_000, workers: 2,
  use: { baseURL: external || "http://127.0.0.1:4180", trace: "retain-on-failure" },
  webServer: external ? undefined : {
    command: "npm run dev -- --port 4180 --hostname 127.0.0.1", url: "http://127.0.0.1:4180", timeout: 90_000
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], launchOptions: process.env.NEXUS_CHROMIUM_PATH ? { executablePath: process.env.NEXUS_CHROMIUM_PATH } : {} } },
    { name: "mobile", use: { ...devices["iPhone 13"], defaultBrowserType: "webkit" } }
  ]
});
