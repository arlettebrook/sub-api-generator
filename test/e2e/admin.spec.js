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

test("navigates to the custom API page and selects data sources", async ({ page }, testInfo) => {
  await login(page);
  await page.locator('a[data-nav-page="customApis"]').click();
  await expect(page).toHaveURL(/\/admin\/custom-apis$/);
  await expect(page.locator("#customApiSection")).toBeVisible();
  await expect(page.locator("#newCustomApiSources input[type=checkbox]")).toHaveCount(2);
  await page.locator("#newCustomApiSources").getByRole("button", { name: "清空" }).click();
  await expect(page.locator("#newCustomApiSources input[type=checkbox]:checked")).toHaveCount(0);
  await page.locator("#newCustomApiSources").getByRole("button", { name: "全选" }).click();
  await expect(page.locator("#newCustomApiSources input[type=checkbox]:checked")).toHaveCount(2);
  await page.locator("#newCustomApiPath").fill("bad path");
  await expect(page.locator("#newCustomApiPathHint")).toHaveClass(/error/);
  const customPath = "preview-api-" + Date.now().toString(36) + "-" + testInfo.project.name;
  await page.locator("#newCustomApiPath").fill(customPath);
  await page.locator("#newCustomApiSources input[type=checkbox]").first().check();
  const initialApiCount = await page.locator("#customApisList .row").count();
  await page.getByRole("button", { name: "新建 API" }).click();
  await expect(page.locator("#customApisList .row")).toHaveCount(initialApiCount + 1);
  await expect(page.locator("#customApiSaveStatus")).toHaveText("有未保存的修改");
  await page.locator("#saveCustomApisButton").click();
  await expect(page.locator("#customApiSaveStatus")).toHaveText("配置已保存");
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
