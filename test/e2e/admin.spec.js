import { test, expect } from "@playwright/test";

async function login(page) {
  await page.goto("/");
  if (await page.locator('input[name="password"]').count()) {
    await page.locator('input[name="password"]').fill("secret");
    await page.locator('button[type="submit"]').click();
  }
  await expect(page.locator(".admin-nav")).toBeVisible();
}

test("loads the dashboard and switches theme", async ({ page }) => {
  await login(page);
  await expect(page.locator("#nodesContainer")).toBeVisible();
  const wasDark = await page.locator("body").evaluate((body) => body.classList.contains("dark"));
  await page.locator("#themeSwitch").click();
  await expect.poll(() => page.locator("body").evaluate((body) => body.classList.contains("dark"))).toBe(!wasDark);
});

test("navigates to the custom API page and selects data sources", async ({ page }) => {
  await login(page);
  await page.locator('a[data-nav-page="customApis"]').click();
  await expect(page).toHaveURL(/\/admin\/custom-apis$/);
  await expect(page.locator("#customApiSection")).toBeVisible();
  await expect(page.locator("#newCustomApiSources input[type=checkbox]")).toHaveCount(2);
  await page.locator("#newCustomApiPath").fill("preview-api");
  await page.locator("#newCustomApiSources input[type=checkbox]").first().check();
  await page.getByRole("button", { name: "新建 API" }).click();
  await expect(page.locator("#customApisList .row")).toHaveCount(1);
});

test("logs out from the dashboard", async ({ page }) => {
  await login(page);
  await page.locator("#logoutButton").click();
  await expect(page.locator('input[name="password"]')).toBeVisible();
});

test.describe("mobile navigation", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true });

  test("keeps all navigation items inside the viewport", async ({ page }) => {
    await login(page);
    const nav = page.locator(".admin-nav");
    await expect(nav).toBeVisible();
    const box = await nav.boundingBox();
    expect(box.width).toBeLessThanOrEqual(390);
    await expect(page.locator('a[data-nav-page="settings"]')).toBeVisible();
  });
});
