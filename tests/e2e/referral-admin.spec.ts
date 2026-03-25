import path from "node:path"
import { expect, test } from "@playwright/test"
import type { Page } from "@playwright/test"

const mockWalletScript = path.resolve(__dirname, "helpers/mock-ethereum.js")

async function bootstrap(page: Page, options?: { owner?: boolean; referrerBound?: boolean }) {
  const owner = options?.owner ? "1" : "0"
  const referrerBound = options?.referrerBound === false ? "0" : "1"

  await page.addInitScript(
    ({ ownerMode, referrerMode }) => {
      window.localStorage.setItem("e2e_owner_mode", ownerMode)
      window.localStorage.setItem("e2e_referrer_bound", referrerMode)
    },
    { ownerMode: owner, referrerMode: referrerBound }
  )

  await page.addInitScript({ path: mockWalletScript })
  await page.goto("/")
  await page.waitForLoadState("networkidle")
}

test("推荐绑定流程可执行", async ({ page }) => {
  await bootstrap(page, { owner: false, referrerBound: false })

  await expect(page.getByText(/Bind Referrer|绑定推荐人/i)).toBeVisible()

  const referrerInput = page.getByPlaceholder(/0x\.{3}|0x.../i)
  await referrerInput.fill("0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb")

  await page.getByRole("button", { name: /Confirm & Activate|确认并激活/i }).click()

  await expect(page.getByText(/Referrer Bound Successfully|推荐人绑定成功/i).first()).toBeVisible()
  await expect(page.getByText(/Bind Referrer|绑定推荐人/i)).toHaveCount(0)
})

test("管理员参数配置流程可执行", async ({ page }) => {
  await bootstrap(page, { owner: true, referrerBound: true })

  page.on("dialog", async (dialog) => {
    await dialog.accept()
  })

  const connectButton = page.getByRole("button", { name: /Connect Wallet|连接钱包/i }).first()
  if (await connectButton.isVisible().catch(() => false)) {
    await connectButton.click()
  }

  const adminNav = page.getByRole("button", { name: /Admin|管理/i }).first()
  if (await adminNav.isVisible().catch(() => false)) {
    await adminNav.click()
  }

  await expect(page.getByText(/Owner 管理员面板/i)).toBeVisible()

  await page.getByPlaceholder("TOF 销毁比例 (bps)").fill("650")
  await page.getByPlaceholder("TOF 领取手续费 (bps)").fill("200")
  const updateButton = page.getByRole("button", { name: "更新 TOF 参数" })
  await expect(updateButton).toBeEnabled()
  await updateButton.click()

  await expect(page.getByText(/交易成功/i).first()).toBeVisible()
  await expect(page.getByText("更新 TOF 参数").first()).toBeVisible()
})
