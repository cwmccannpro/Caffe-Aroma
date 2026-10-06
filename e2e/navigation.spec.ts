import { expect, test } from "@playwright/test";

test.describe("mobile menu", () => {
  test("opens from the hamburger, lists every destination and closes after you navigate", async ({ page }, info) => {
    test.skip(info.project.name !== "mobile", "the hamburger only exists on phone-sized screens");
    await page.goto("/?gl=off");

    const open = page.getByRole("button", { name: "Open menu" });
    await expect(open).toBeVisible();
    await expect(open).toHaveAttribute("aria-expanded", "false");
    await open.click();

    const menu = page.getByRole("dialog", { name: "Menu" });
    await expect(menu).toBeVisible();
    await expect(open).toHaveAttribute("aria-expanded", "true");
    for (const name of ["Menu & order", "Tonight", "Our story", "Visit"]) await expect(menu.getByRole("link", { name })).toBeVisible();
    await expect(menu.getByRole("link", { name: /Order ahead/ })).toBeVisible();
    await expect(menu.getByRole("link", { name: /\(716\) 884-4522/ })).toHaveAttribute("href", "tel:+17168844522");

    await menu.getByRole("link", { name: "Tonight" }).click();
    await expect(menu).toBeHidden();
    await expect(page.locator("#tonight")).toBeInViewport();
    // the page must not be left scroll-locked
    expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe("");
  });

  test("Escape closes it and focus returns to the page", async ({ page }, info) => {
    test.skip(info.project.name !== "mobile", "phone only");
    await page.goto("/?gl=off");
    await page.getByRole("button", { name: "Open menu" }).click();
    await expect(page.getByRole("dialog", { name: "Menu" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Menu" })).toBeHidden();
    expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe("");
  });

  test("desktop shows the inline links and no hamburger", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop", "desktop only");
    await page.goto("/?gl=off");
    await expect(page.getByRole("button", { name: "Open menu" })).toBeHidden();
    await expect(page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "Tonight" })).toBeVisible();
  });
});

test.describe("scroll snapping", () => {
  test("home sections snap into place instead of resting in between", async ({ page }) => {
    await page.goto("/?gl=off");
    const snapType = await page.evaluate(() => getComputedStyle(document.documentElement).scrollSnapType);
    expect(snapType).toContain("mandatory");

    const vh = await page.evaluate(() => window.innerHeight);
    // stop somewhere awkward inside the walk through the day: it must settle on a whole screen
    for (const f of [1.3, 2.45, 3.6, 4.4]) {
      await page.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), Math.round(vh * f));
      await expect
        .poll(async () => {
          const y = await page.evaluate(() => window.scrollY);
          return Math.abs(((y + vh / 2) % vh) - vh / 2);
        }, { message: `scroll offset ${f}vh should settle on a snap point` })
        .toBeLessThan(3);
    }
  });

  test("from Plan your visit down the page scrolls freely, all the way to the footer", async ({ page }) => {
    await page.goto("/?gl=off");
    const tail = await page.evaluate(() => document.getElementById("info")!.getBoundingClientRect().top + window.scrollY);
    const max = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
    // stop at awkward offsets inside the tail (fractions of its real length): nothing may pull the page onto a section boundary
    for (const f of [0.083, 0.31, 0.57, 0.86]) {
      const y = Math.round(tail + (max - tail) * f);
      await page.evaluate((top) => window.scrollTo({ top, behavior: "instant" }), y);
      await page.waitForTimeout(700);
      const now = await page.evaluate(() => window.scrollY);
      expect(Math.abs(now - y), `${Math.round(f * 100)}% of the way down the free-scrolling part should stay put`).toBeLessThan(3);
    }
    // and the very end of the page (the footer) is reachable, not snapped away
    await page.evaluate((top) => window.scrollTo({ top, behavior: "instant" }), max);
    await page.waitForTimeout(700);
    expect(await page.evaluate(() => Math.abs(window.innerHeight + window.scrollY - document.documentElement.scrollHeight))).toBeLessThan(3);
    await expect(page.getByRole("contentinfo")).toBeInViewport();
  });

  test("between the last scene and Plan your visit it still snaps to a whole screen", async ({ page }) => {
    await page.goto("/?gl=off");
    const vh = await page.evaluate(() => window.innerHeight);
    const tail = await page.evaluate(() => document.getElementById("info")!.getBoundingClientRect().top + window.scrollY);
    await page.evaluate((top) => window.scrollTo({ top, behavior: "instant" }), Math.round(tail - vh * 0.45));
    await expect
      .poll(async () => {
        const y = await page.evaluate(() => window.scrollY);
        return Math.min(Math.abs(y - (tail - vh)), Math.abs(y - tail));
      })
      .toBeLessThan(3);
  });

  test("other pages are not snapped", async ({ page }) => {
    await page.goto("/order");
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollSnapType)).toBe("none");
  });
});

test.describe("section links", () => {
  test("the header links scroll to their section and keep the URL in sync", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop", "phones use the menu, covered above");
    await page.goto("/?gl=off");
    const nav = page.getByRole("navigation", { name: "Primary" });
    await nav.getByRole("link", { name: "Visit" }).click();
    await expect(page.locator("#visit")).toBeInViewport();
    await expect(page).toHaveURL(/#visit$/);
    await nav.getByRole("link", { name: "Our story" }).click();
    await expect(page.locator("#story")).toBeInViewport();
  });

  test("a section link from another page lands on that section", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop", "desktop nav");
    await page.goto("/order");
    await page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "Tonight" }).click();
    await expect(page).toHaveURL(/\/#tonight$/);
    await expect(page.locator("#tonight")).toBeInViewport();
  });

  test("a shared /#visit link opens at the visit section", async ({ page }) => {
    await page.goto("/?gl=off#visit");
    await expect(page.locator("#visit")).toBeInViewport();
  });
});
