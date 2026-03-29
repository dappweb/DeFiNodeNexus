import type { Page } from "@playwright/test"
import { expect, test } from "@playwright/test"
import path from "node:path"

const mockWalletScript = path.resolve(__dirname, "helpers/mock-ethereum.js")

async function connectWallet(page: Page) {
  const connectedAddress = page.getByText(/0x1111\.\.\.1111/i).first()
  if (await connectedAddress.isVisible().catch(() => false)) return

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

async function openNodesTab(page: Page) {
  await page.getByRole("button", { name: /Nodes|节点/i }).first().click()
  await expect(page.getByRole("button", { name: /Buy NFT-A|购买 NFT-A/i })).toBeVisible()
}

async function openEarningsTab(page: Page) {
  await page.getByRole("button", { name: /Earnings|收益/i }).first().click()
  await expect(page.getByText(/Withdrawable \(TOT\)|可提取收益/i).first()).toBeVisible()
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript({ path: mockWalletScript })
  await page.goto("/")
  await page.waitForLoadState("networkidle")
})

test("NFTA 购买流程可执行", async ({ page }) => {
  await connectWallet(page)
  await openNodesTab(page)

  await page.getByText(/创世荣耀|NFTA #1/i).first().click()
  await page.getByRole("button", { name: /Buy NFT-A|购买 NFT-A/i }).click()
  await expect(page.getByText(/NFT-A Purchase Success|购买 NFTA 成功/i).first()).toBeVisible()

  await page.getByRole("tab", { name: /My Nodes|我的节点/i }).click()
  await expect(page.getByText(/节点 #1|Node #1/i).first()).toBeVisible()
})

test("NFTB 购买流程可执行", async ({ page }) => {
  await connectWallet(page)
  await openNodesTab(page)

  await page.getByRole("tab", { name: /NFT-B/i }).click()
  await page.getByText(/普通权杖|NFTB #1/i).first().click()
  await page.getByRole("button", { name: /Buy NFT-B|购买 NFT-B/i }).click()
  await expect(page.getByText(/NFT-B Purchase Success|购买 NFTB 成功/i).first()).toBeVisible()

  await page.getByRole("tab", { name: /My Nodes|我的节点/i }).click()
  await expect(page.getByText(/节点 #1|Node #1/i).first()).toBeVisible()
})

test("领取收益与提现流程可执行", async ({ page }) => {
  await connectWallet(page)
  await openNodesTab(page)

  await page.getByText(/创世荣耀|NFTA #1/i).first().click()
  await page.getByRole("button", { name: /Buy NFT-A|购买 NFT-A/i }).click()
  await expect(page.getByText(/NFT-A Purchase Success|购买 NFTA 成功/i).first()).toBeVisible()

  await page.getByRole("tab", { name: /NFT-B/i }).click()
  await page.getByText(/普通权杖|NFTB #1/i).first().click()
  await page.getByRole("button", { name: /Buy NFT-B|购买 NFT-B/i }).click()
  await expect(page.getByText(/NFT-B Purchase Success|购买 NFTB 成功/i).first()).toBeVisible()

  await page.getByRole("tab", { name: /My Nodes|我的节点/i }).click()
  await page.getByRole("button", { name: /Claim NFT-A Earnings|领取 NFT-A 收益/i }).click()
  await expect(page.getByText(/NFT-A Earnings Claimed|NFT-A 收益已领取/i).first()).toBeVisible()

  await page.getByRole("button", { name: /Claim NFT-B Dividends|领取 NFT-B 分红/i }).click()
  await expect(page.getByText(/NFT-B Dividends Claimed|NFT-B 分红已领取/i).first()).toBeVisible()

  await openEarningsTab(page)
  await page.getByRole("button", { name: /Withdraw All|全部提取/i }).click()
  await expect(page.getByText(/Withdraw Success|提现成功/i).first()).toBeVisible()
  await expect(page.getByText(/Withdraw|提现/i).first()).toBeVisible()
})
