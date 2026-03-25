import path from "node:path"
import { test } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"

const mockWalletScript = path.resolve(__dirname, "helpers/mock-ethereum.js")

async function expectNoSeriousA11yViolations(page: import("@playwright/test").Page) {
  const results = await new AxeBuilder({ page })
    .disableRules(["color-contrast", "button-name", "label"])
    .analyze()
  const violations = results.violations.filter(
    (violation) => violation.impact === "critical" || violation.impact === "serious"
  )

  test.expect(violations, `a11y violations: ${violations.map((v) => v.id).join(", ")}`).toEqual([])
}

test("关键页面无严重无障碍问题", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("e2e_owner_mode", "0")
    window.localStorage.setItem("e2e_referrer_bound", "1")
  })
  await page.addInitScript({ path: mockWalletScript })

  await page.goto("/")
  await page.waitForLoadState("networkidle")
  await expectNoSeriousA11yViolations(page)

  await page.getByRole("button", { name: /Nodes|节点/i }).first().click()
  await expectNoSeriousA11yViolations(page)

  await page.getByRole("button", { name: /Swap|兑换/i }).first().click()
  await expectNoSeriousA11yViolations(page)
})
