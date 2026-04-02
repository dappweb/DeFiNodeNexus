import type { Page } from "@playwright/test"
import { expect, test } from "@playwright/test"
import path from "node:path"

const mockWalletScript = path.resolve(__dirname, "helpers/mock-ethereum.js")

async function connectWallet(page: Page) {
  const connectedAddress = page.getByText(/0x1111\.\.\.1111/i).first()
  if (await connectedAddress.isVisible().catch(() => false)) {
    return
  }

  const connectButton = page.getByRole("button", { name: /Connect Wallet|连接钱包/i }).first()
  if (await connectButton.isVisible().catch(() => false)) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await connectButton.click({ timeout: 5000 })
        break
      } catch (error) {
        if (attempt === 2) throw error
        await page.waitForTimeout(300)
      }
    }
  } else {
    await page.evaluate(async () => {
      await window.ethereum?.request({ method: "eth_requestAccounts" })
    })
  }

  await expect(connectedAddress).toBeVisible()
}

async function openSwapTab(page: Page) {
  await page.getByRole("button", { name: /Swap|兑换/i }).first().click()
  await expect(page.locator('input[type="number"]').first()).toBeVisible()
}

async function fillSwapAmount(page: Page, amount: string) {
  const amountInput = page.locator('input[type="number"]').first()
  await amountInput.fill(amount)
}

async function openHome(page: Page) {
  await page.goto("/", { waitUntil: "domcontentloaded" })
  await expect(page.getByRole("button", { name: /Swap|兑换/i }).first()).toBeVisible({ timeout: 20000 })
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript({ path: mockWalletScript })
  await openHome(page)
})

test("钱包连接流程可执行", async ({ page }) => {
  await connectWallet(page)
  await expect(page.getByText("Sepolia", { exact: true })).toBeVisible()
})

test("交易提交流程可执行", async ({ page }) => {
  await connectWallet(page)
  await openSwapTab(page)
  await fillSwapAmount(page, "100")

  await page.getByRole("button", { name: /Buy TOT|买入 TOT/i }).click()
  await expect(page.getByText(/Buy Success|买入成功/i).first()).toBeVisible()
})

test("交易失败后可重试成功", async ({ page }) => {
  await connectWallet(page)
  await openSwapTab(page)
  await fillSwapAmount(page, "100")

  await page.evaluate(() => {
    ;(window as { __E2E_WALLET__?: { setNextTxFail: (value?: boolean) => void } }).__E2E_WALLET__?.setNextTxFail(true)
  })

  await page.getByRole("button", { name: /Buy TOT|买入 TOT/i }).click()
  await expect(page.getByText(/Buy Failed|买入失败/i).first()).toBeVisible()

  await page.getByRole("button", { name: /Buy TOT|买入 TOT/i }).click()
  await expect(page.getByText(/Buy Success|买入成功/i).first()).toBeVisible()
})