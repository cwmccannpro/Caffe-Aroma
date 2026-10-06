import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const DAY = new Date("2026-10-06T16:00:00Z"); // 12:00 PM in Buffalo: light theme
const NIGHT = new Date("2026-10-07T01:30:00Z"); // 9:30 PM in Buffalo: dark theme

async function scan(page: Page, label: string) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    // the 3D canvas is decorative (aria-hidden) and its pixels aren't DOM-colored text
    .exclude("canvas")
    .analyze();
  const summary = results.violations.map((v) => `${v.id} (${v.impact}): ${v.help}\n   ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join("\n   ")}`);
  expect(summary, `${label}\n${summary.join("\n")}`).toEqual([]);
}

for (const [mode, time] of [
  ["day", DAY],
  ["night", NIGHT],
] as const) {
  test.describe(`accessibility (${mode} theme)`, () => {
    test("home", async ({ page }) => {
      await page.clock.install({ time });
      await page.goto("/?gl=off");
      await page.waitForTimeout(1200);
      await scan(page, `home ${mode}`);
    });

    test("order, with the item sheet open", async ({ page }) => {
      await page.clock.install({ time });
      await page.goto("/order");
      await page.waitForTimeout(800);
      await scan(page, `order ${mode}`);
      await page.locator('button.menu-card[aria-label^="Latte"]').click();
      await expect(page.locator("dialog.sheet[open]")).toBeVisible();
      await page.waitForTimeout(600);
      await scan(page, `item sheet ${mode}`);
    });

    test("checkout", async ({ page }) => {
      await page.clock.install({ time });
      await page.goto("/order");
      await page.locator('button.menu-card[aria-label^="Biscotti"]').first().click();
      const bar = page.getByRole("button", { name: /View order/ });
      if (await bar.isVisible()) await bar.click();
      await page.getByRole("link", { name: /^Checkout/ }).first().click();
      await expect(page.getByRole("heading", { name: "Checkout" })).toBeVisible();
      await page.waitForTimeout(600);
      await scan(page, `checkout ${mode}`);
    });
  });
}
