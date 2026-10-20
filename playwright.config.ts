import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: false,
  workers: 1,
  timeout: 45_000,
  globalSetup: "./tests/browser/setup.ts",
  globalTeardown: "./tests/browser/teardown.ts",
  use: {
    baseURL: "http://127.0.0.1:3103",
    viewport: { width: 1440, height: 1100 },
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {},
    trace: "retain-on-failure",
  },
  webServer: {
    command: "pnpm exec next dev --webpack --port 3103 --hostname 127.0.0.1",
    url: "http://127.0.0.1:3103",
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      RIP_X_E2E: "1",
      DATABASE_URL: process.env.TEST_DATABASE_URL ?? "",
      DATABASE_URL_UNPOOLED: process.env.TEST_DATABASE_URL ?? "",
      X_API_BEARER_TOKEN: "", OPENAI_API_KEY: "", BLOB_READ_WRITE_TOKEN: "", BLOB_STORE_ID: "",
    },
  },
});
