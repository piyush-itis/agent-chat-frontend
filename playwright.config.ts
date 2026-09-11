import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
  },
  webServer: process.env.PLAYWRIGHT_SKIP_WEBSERVER
    ? undefined
    : {
        command: "pnpm --filter frontend dev",
        cwd: "..",
        url: "http://localhost:3000/sign-in",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
