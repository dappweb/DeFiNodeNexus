import { defineConfig, devices } from "@playwright/test"

const baseURL = "http://127.0.0.1:9002"

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : 1,
  reporter: [["list"], ["html", { open: "never" }]],
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL,
    actionTimeout: 15_000,
    navigationTimeout: 60_000,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure"
  },
  webServer: {
    command: "npm run dev",
    url: baseURL,
    env: {
      ...process.env,
      NEXT_PUBLIC_NEXUS_ADDRESS: "0x1111111111111111111111111111111111111111",
      NEXUS_ADDRESS: "0x1111111111111111111111111111111111111111",
      NEXT_PUBLIC_SWAP_ADDRESS: "0x2222222222222222222222222222222222222222",
      SWAP_ADDRESS: "0x2222222222222222222222222222222222222222",
      NEXT_PUBLIC_TOT_ADDRESS: "0x3333333333333333333333333333333333333333",
      TOT_TOKEN_ADDRESS: "0x3333333333333333333333333333333333333333",
      NEXT_PUBLIC_TOF_ADDRESS: "0x4444444444444444444444444444444444444444",
      TOF_TOKEN_ADDRESS: "0x4444444444444444444444444444444444444444",
      NEXT_PUBLIC_USDT_ADDRESS: "0x5555555555555555555555555555555555555555",
      USDT_TOKEN_ADDRESS: "0x5555555555555555555555555555555555555555"
    },
    reuseExistingServer: true,
    timeout: 120000
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ]
})