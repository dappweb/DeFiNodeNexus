import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";
import path from "node:path";

const mockWalletScript = path.resolve(__dirname, "helpers/mock-ethereum.js")

async function connectWallet(page: Page) {
  const connectedAddress = page.getByText(/0x1111\.\.\.1111/i).first()
  if (await connectedAddress.isVisible().catch(() => false)) {
    return
  }

  const connectButton = page.getByRole("button", { name: /Connect Wallet|连接钱包/i }).first()
  if (await connectButton.isVisible().catch(() => false)) {
    await connectButton.click()
  } else {
    await page.evaluate(async () => {
      await window.ethereum?.request({ method: "eth_requestAccounts" })
    })
  }

  await expect(connectedAddress).toBeVisible()
}

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
  await page.goto("/", { waitUntil: "domcontentloaded" })
  await expect(page.getByRole("button", { name: /Home|主页|Swap|兑换|Nodes|节点/i }).first()).toBeVisible({ timeout: 20000 })
}

test("推荐绑定流程可执行", async ({ page }) => {
  await bootstrap(page, { owner: false, referrerBound: false })

  await expect(page.getByRole("heading", { name: /Bind Referrer|绑定推荐人/i })).toBeVisible()

  const referrerInput = page.getByPlaceholder(/0x\.{3}|0x.../i)
  await referrerInput.fill("0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb")

  await page.getByRole("button", { name: /Confirm & Activate|确认并激活/i }).click()

  await expect(page.getByText(/Referrer Bound Successfully|推荐人绑定成功/i).first()).toBeVisible()
  await expect(page.getByRole("button", { name: /Confirm & Activate|确认并激活/i })).toHaveCount(0)
})

test("推荐绑定可清理粘贴的隐藏回车字符", async ({ page }) => {
  await bootstrap(page, { owner: false, referrerBound: false })

  await expect(page.getByRole("heading", { name: /Bind Referrer|绑定推荐人/i })).toBeVisible()

  const referrerInput = page.getByPlaceholder(/0x\.{3}|0x.../i)
  await referrerInput.evaluate((node) => {
    const input = node as HTMLInputElement
    input.value = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb\r"
    input.dispatchEvent(new Event("input", { bubbles: true }))
  })

  await expect(referrerInput).toHaveValue("0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb")

  await page.getByRole("button", { name: /Confirm & Activate|确认并激活/i }).click()

  await expect(page.getByText(/Referrer Bound Successfully|推荐人绑定成功/i).first()).toBeVisible()
  await expect(page.getByText(/invalid ENS name|请输入有效的钱包地址/i)).toHaveCount(0)
})

test("管理员参数配置流程可执行", async ({ page }) => {
  await bootstrap(page, { owner: true, referrerBound: true })

  page.on("dialog", async (dialog) => {
    await dialog.accept()
  })

  await connectWallet(page)

  const adminNav = page.getByRole("button", { name: /Admin|管理/i }).first()
  if (await adminNav.isVisible().catch(() => false)) {
    await adminNav.click()
  }

  await expect(page.getByText(/管理员面板|Admin/i).first()).toBeVisible()

  await page.getByPlaceholder("TOF领取费率 bps").fill("200")
  const updateButton = page.getByRole("button", { name: /更新TOF领取费率/i })
  await expect(updateButton).toBeEnabled()
  await updateButton.click()

  await expect(page.getByText(/成功/i).first()).toBeVisible()
})

test("owner 作为根节点无需绑定推荐人", async ({ page }) => {
  await bootstrap(page, { owner: true, referrerBound: false })

  await expect(page.getByRole("heading", { name: /Bind Referrer|绑定推荐人/i })).toHaveCount(0)
})
