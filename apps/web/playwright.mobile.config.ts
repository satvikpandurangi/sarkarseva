import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "mobile.spec.ts",
  outputDir: "test-results/mobile",
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 20_000 },
  use: {
    baseURL: process.env.MOBILE_BASE_URL ?? "http://127.0.0.1:3005",
    trace: "off",
  },
  projects: [
    {
      name: "small-phone",
      use: {
        ...devices["iPhone SE"],
        browserName: "chromium",
        viewport: { width: 320, height: 640 },
      },
    },
    {
      name: "android",
      use: { ...devices["Pixel 7"], browserName: "chromium" },
    },
    { name: "iphone", use: { ...devices["iPhone 13"], browserName: "webkit" } },
    {
      name: "landscape",
      use: { ...devices["iPhone 13 landscape"], browserName: "chromium" },
    },
  ],
});
