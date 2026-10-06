import { expect, test, type Page } from "@playwright/test";

// October 6, 2026 (a Tuesday). Buffalo is on EDT (UTC-4).
const OPEN_MORNING = new Date("2026-10-06T14:00:00Z"); // 10:00 AM in Buffalo
const CLOSED_OVERNIGHT = new Date("2026-10-06T07:00:00Z"); // 3:00 AM in Buffalo

async function fillContact(page: Page) {
  await page.locator("#name").fill("Maya");
  await page.locator("#phone").fill("7165550123");
}

/** Opens the cart (a bottom bar on phones, a side panel on desktop) and goes to checkout. */
async function goToCheckout(page: Page) {
  const bar = page.getByRole("button", { name: /View order/ });
  if (await bar.isVisible()) await bar.click();
  await page.getByRole("link", { name: /^Checkout/ }).first().click();
  await expect(page).toHaveURL(/\/order\/checkout/);
}

test.describe("ordering", () => {
  test("a customer orders a customized cappuccino and the counter board receives and advances it", async ({ page, context }) => {
    await page.clock.install({ time: OPEN_MORNING });
    await page.goto("/order");
    // scoped to the page: the header's (closed) mobile menu holds a second copy of the status chip
    await expect(page.getByRole("main").getByText("Open until 12 AM")).toBeVisible();

    await page.locator('button.menu-card[aria-label^="Cappuccino"]').click();
    const sheet = page.locator("dialog.sheet[open]");
    await expect(sheet.getByRole("heading", { name: "Cappuccino" })).toBeVisible();
    // Clover pricing: medium $5.00 + oat $1.40 + vanilla $0.75
    await sheet.getByRole("radio", { name: /^Oat/ }).click();
    await sheet.getByRole("checkbox", { name: /^Vanilla/ }).click();
    await expect(sheet.getByRole("button", { name: /Add to order/ })).toContainText("$7.15");
    await sheet.getByRole("button", { name: /Add to order/ }).click();

    await goToCheckout(page);
    await expect(page.getByRole("heading", { name: "Checkout" })).toBeVisible();
    await expect(page.getByText("Medium · Oat · Vanilla")).toBeVisible();

    // open for business: ASAP is selectable
    await expect(page.getByRole("radio", { name: /As soon as possible/ })).toBeEnabled();

    await fillContact(page);
    await page.getByRole("button", { name: /Pay with Apple Pay/ }).last().click();
    const wallet = page.locator("dialog.sheet[open]");
    await expect(wallet.getByText(/Apple Pay · demo/i)).toBeVisible();
    await wallet.getByRole("button", { name: /Confirm with Face ID/ }).click();

    await expect(page).toHaveURL(/\/order\/track\//);
    await expect(page.getByRole("heading", { name: "We've got your order" })).toBeVisible();
    const orderNumber = (await page.getByText(/^A-\d+$/).first().textContent())!.trim();

    // the counter board, in a second window of the same browser
    const staff = await context.newPage();
    await staff.goto("/staff");
    await staff.locator("#pin").fill("1995");
    await staff.keyboard.press("Enter");
    const card = staff.getByRole("article", { name: new RegExp(`Order ${orderNumber} for Maya`) });
    await expect(card).toBeVisible();
    await expect(card).toContainText("Medium · Oat · Vanilla");
    await card.getByRole("button", { name: "Start making" }).click();

    // ...and the customer's tracker follows along without a reload
    await expect(page.getByRole("heading", { name: "Brewing now" })).toBeVisible();
    await staff.getByRole("article", { name: new RegExp(`Order ${orderNumber}`) }).getByRole("button", { name: "Mark ready" }).click();
    await expect(page.getByRole("heading", { name: "It's ready!" })).toBeVisible();
  });

  test("alcohol is 21+: forces for-here and requires an ID acknowledgment", async ({ page }) => {
    await page.clock.install({ time: OPEN_MORNING });
    await page.goto("/order");
    await page.locator('button.menu-card[aria-label^="Abita"]').click(); // no options, adds straight away
    await goToCheckout(page);

    await expect(page.getByText("ID check")).toBeVisible();
    const toGo = page.getByRole("radio", { name: "To go" }).first();
    await expect(toGo).toBeDisabled();
    await expect(page.getByRole("radio", { name: "For here" }).first()).toHaveAttribute("aria-checked", "true");

    await fillContact(page);
    await page.getByRole("button", { name: /Pay with Apple Pay/ }).last().click();
    await expect(page.getByText("Please confirm you're 21 or older.")).toBeVisible();
    await expect(page.locator("dialog[open]")).toHaveCount(0); // no payment sheet opened
  });

  test("when the cafe is closed you can still schedule for opening time", async ({ page }) => {
    await page.clock.install({ time: CLOSED_OVERNIGHT });
    await page.goto("/order");
    await expect(page.getByText(/We.re closed right now\./).first()).toBeVisible();
    await page.locator('button.menu-card[aria-label^="Biscotti"]').first().click();
    await goToCheckout(page);
    await expect(page.getByRole("radio", { name: /As soon as possible/ })).toBeDisabled();
    await expect(page.getByRole("radio", { name: /Schedule for later/ })).toHaveAttribute("aria-checked", "true");
    await expect(page.getByText(/Today at 6 AM/)).toBeVisible();
  });

  test("a declined card shows an error and does not create an order", async ({ page }) => {
    await page.clock.install({ time: OPEN_MORNING });
    await page.goto("/order");
    await page.locator('button.menu-card[aria-label^="Biscotti"]').first().click();
    await goToCheckout(page);
    await fillContact(page);
    await page.getByRole("radio", { name: "Card" }).click();
    await page.locator("#cc-number").fill("4000000000000002");
    await page.locator("#cc-exp").fill("1230");
    await page.locator("#cc-csc").fill("123");
    await page.locator("#cc-zip").fill("14222");
    await page.getByRole("button", { name: /Place order/ }).last().click();
    await expect(page.getByText("Your card was declined. Try a different card.")).toBeVisible();
    await expect(page).toHaveURL(/\/order\/checkout/);
  });

  test("pausing online ordering from the counter blocks checkout", async ({ page, context }) => {
    await page.clock.install({ time: OPEN_MORNING });
    await page.goto("/order");
    await page.locator('button.menu-card[aria-label^="Biscotti"]').first().click();

    const staff = await context.newPage();
    await staff.goto("/staff");
    await staff.locator("#pin").fill("1995");
    await staff.keyboard.press("Enter");
    await staff.getByRole("switch", { name: /Pause online ordering/ }).click();

    await expect(page.getByText(/Online ordering is paused/).first()).toBeVisible();
  });
});
