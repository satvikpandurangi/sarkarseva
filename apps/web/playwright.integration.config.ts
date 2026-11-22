import { defineConfig } from "@playwright/test";
const port = process.env.INTEGRATION_PORT ?? "3000";

export default defineConfig({
  testDir: "./e2e",
  outputDir: `test-results/${process.env.TEST_PRODUCTION === "1" ? "production" : "live"}`,
  testMatch: "integration.spec.ts",
  workers: 1,
  timeout: 60_000,
  use: { baseURL: `http://127.0.0.1:${port}`, trace: "retain-on-failure" },
  webServer:
    process.env.EXTERNAL_LIVE_SERVER === "1"
      ? undefined
      : {
          command: `npm run ${process.env.TEST_PRODUCTION === "1" ? "start" : "dev"} -- --port ${port}`,
          url: `http://127.0.0.1:${port}`,
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
        },
});
