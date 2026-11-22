import { defineConfig } from "@playwright/test";
const port = process.env.PLAYWRIGHT_PORT ?? "3001";
export default defineConfig({
  testDir: "./e2e",
  outputDir: "test-results/mock",
  testIgnore: "integration.spec.ts",
  fullyParallel: false,
  workers: 1,
  timeout: 45_000,
  use: { baseURL: `http://127.0.0.1:${port}`, trace: "retain-on-failure" },
  webServer:
    process.env.EXTERNAL_MOCK_SERVER === "1"
      ? undefined
      : {
          command: `npm run dev -- --port ${port}`,
          env: { NEXT_PUBLIC_API_MODE: "mock", NEXT_BUILD_DIR: ".next-mock" },
          url: `http://127.0.0.1:${port}`,
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
        },
});
