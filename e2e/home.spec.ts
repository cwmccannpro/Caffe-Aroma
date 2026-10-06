import { expect, test } from "@playwright/test";

test.describe("home", () => {
  test("loads with the headline and a working clock dial", async ({ page }) => {
    // no 3D here: the dial and the page theme must work on their own (and stay fast on a slow software renderer)
    await page.goto("/?gl=off");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Coffee by");

    // the dial is a real keyboard-operable slider: End = midnight, Home = 6 AM
    const dial = page.getByRole("slider", { name: /Time of day/ });
    await dial.focus();
    await page.keyboard.press("End");
    await expect(dial).toHaveAttribute("aria-valuenow", "24");
    await page.keyboard.press("Home");
    await expect(dial).toHaveAttribute("aria-valuenow", "6");
    await expect(dial).toHaveAttribute("aria-valuetext", /6 AM/);

    // the page theme follows the dial: dark at midnight, light at midday
    await page.getByRole("button", { name: "12p" }).click();
    await expect.poll(() => page.evaluate(() => Number(getComputedStyle(document.documentElement).getPropertyValue("--night")))).toBeLessThan(0.05);
    await page.getByRole("button", { name: "12a" }).click();
    await expect.poll(() => page.evaluate(() => Number(getComputedStyle(document.documentElement).getPropertyValue("--night")))).toBeGreaterThan(0.95);
  });

  test("starts the 3D scene (lightest tier) without any page errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error" && !/favicon|Failed to load resource/.test(m.text())) errors.push(m.text());
    });
    await page.goto("/?q=lite");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Coffee by");
    // the canvas mounts once the page has loaded and the browser is idle
    await expect(page.locator("canvas")).toHaveCount(1, { timeout: 30_000 });
    await page.waitForTimeout(4000);
    expect(errors, errors.join(" | ")).toEqual([]);
  });

  test("works without WebGL (poster fallback) and keeps every action available", async ({ page }) => {
    await page.goto("/?gl=off");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator("canvas")).toHaveCount(0);
    await expect(page.getByRole("link", { name: /Order ahead/ }).first()).toBeVisible();
    await page.getByRole("link", { name: /Order ahead/ }).first().click();
    await expect(page).toHaveURL(/\/order/);
  });

  test("publishes structured data for local search", async ({ page }) => {
    await page.goto("/");
    const ld = await page.locator('script[type="application/ld+json"]').first().textContent();
    const data = JSON.parse(ld!);
    expect(data.address.streetAddress).toBe("957 Elmwood Ave");
    expect(data.openingHoursSpecification).toHaveLength(7);
    expect(data.aggregateRating.reviewCount).toBe(718);
  });
});
