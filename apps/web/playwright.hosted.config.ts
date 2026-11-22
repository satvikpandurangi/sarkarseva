import { defineConfig } from "@playwright/test";

const baseURL = process.env.HOSTED_BASE_URL;
if (!baseURL || new URL(baseURL).protocol !== "https:") {
  throw new Error("HOSTED_BASE_URL must be the HTTPS deployment to verify");
}

export default defineConfig({
  testDir: "./e2e",
  testMatch: "integration.spec.ts",
  outputDir: "test-results/hosted",
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 20_000 },
  use: { baseURL, trace: "off" },
});
