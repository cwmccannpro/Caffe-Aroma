import { expect, test } from "@playwright/test";

test.describe("the storefront hero and the day that follows", () => {
  test("says plainly that the cafe is open daily 6 AM to 12 AM, and where it is", async ({ page }, info) => {
    await page.goto("/?gl=off");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Coffee by");
    await expect(page.getByText("Open daily 6 AM – 12 AM").first()).toBeVisible();
    test.skip(info.project.name !== "desktop", "the address line is desktop-only in the hero; phones get it in the info section");
    await expect(page.getByRole("link", { name: /957 Elmwood Ave/ }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "(716) 884-4522" }).first()).toHaveAttribute("href", "tel:+17168844522");
  });

  test("walks through the door to 6 AM, midday, golden hour, after dark and last call, in that order", async ({ page }) => {
    await page.goto("/?gl=off");
    const titles = ["Come on in.", "First pour.", "Make it your office.", "Golden hour, live music.", "After dark.", "Last call is midnight."];
    const found = await page.evaluate(() => [...document.querySelectorAll("#top h2")].map((h) => h.textContent?.trim()));
    expect(found).toEqual(titles);
  });

  test("the golden-hour chapter sends you to the live-music schedule", async ({ page }) => {
    await page.goto("/?gl=off");
    const vh = await page.evaluate(() => window.innerHeight);
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), vh * 4);
    const cta = page.getByRole("link", { name: "Check the schedule" });
    await expect(cta).toBeVisible();
    await cta.click();
    await expect(page).toHaveURL(/#tonight$/);
    await expect(page.locator("#tonight")).toBeInViewport();
    await expect(page.getByRole("heading", { name: "Check the schedule" })).toBeVisible();
    await expect(page.getByRole("link", { name: /This week on Instagram/ })).toHaveAttribute("href", /instagram\.com\/the_caffe_elmwood/);
  });

  test("the still is the storefront until you are through the door, then the room", async ({ page }) => {
    const bad: string[] = [];
    page.on("response", (r) => {
      if (r.url().includes("/posters/") && r.status() >= 400) bad.push(`${r.status()} ${r.url()}`);
    });
    await page.goto("/?gl=off");
    const html = page.locator("html");
    await expect(html).toHaveAttribute("data-scene", "ext");
    await expect.poll(() => page.evaluate(() => getComputedStyle(document.querySelector(".poster-bg")!).backgroundImage)).toContain("/posters/ext-");
    const vh = await page.evaluate(() => window.innerHeight);
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), vh * 2);
    await expect(html).toHaveAttribute("data-scene", "int");
    await expect.poll(() => page.evaluate(() => getComputedStyle(document.querySelector(".poster-bg")!).backgroundImage)).toContain("/posters/tod-");
    expect(bad, bad.join("\n")).toEqual([]);
  });
});

test.describe("practical info at a glance", () => {
  test("hours, address, phone, directions and ordering are all one tap away", async ({ page }) => {
    await page.goto("/?gl=off");
    const info = page.locator("#info");
    await expect(info.getByText("Daily, 6 AM – 12 AM")).toBeVisible();
    await expect(info.getByText("957 Elmwood Ave", { exact: true })).toBeVisible();
    await expect(info.getByRole("link", { name: "Get directions" })).toHaveAttribute("href", /google\.com\/maps/);
    await expect(info.getByRole("link", { name: "Call the cafe" })).toHaveAttribute("href", "tel:+17168844522");
    await expect(info.getByRole("link", { name: "Start an order" })).toHaveAttribute("href", /^\/order\/?$/);
    for (const label of ["Patio seating", "Live music & open mic", "Order ahead for pickup"]) await expect(info.getByRole("listitem").filter({ hasText: label })).toBeVisible();
  });

  test("the visit section lists every day, marks today, and names the neighbour", async ({ page }) => {
    await page.goto("/?gl=off#visit");
    const visit = page.locator("#visit");
    await expect(visit.getByRole("row")).toHaveCount(7);
    await expect(visit.getByText("Today", { exact: true })).toBeVisible();
    await expect(visit.getByText(/Next to Talking Leaves Books/)).toBeVisible();
    await expect(visit.getByText("Good to know")).toBeVisible();
  });

  test("local-search data lists the patio and Wi-Fi as features", async ({ page }) => {
    await page.goto("/");
    const ld = JSON.parse((await page.locator('script[type="application/ld+json"]').first().textContent())!);
    const names = ld.amenityFeature.map((a: { name: string }) => a.name);
    expect(names).toContain("Patio seating");
    expect(names).toContain("Wi-Fi");
  });
});
