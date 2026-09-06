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
  await expect(page.locator("#customApiDialog")).not.toBeVisible();
  await page.getByRole("button", { name: "新建优选 API" }).click();
  await expect(page.locator("#customApiDialog")).toBeVisible();
  await expect.poll(() => page.locator("#newCustomApiPath").evaluate((input) => getComputedStyle(input).boxShadow)).toBe("none");
  await expect(page.locator("#newCustomApiSources input[type=checkbox]")).toHaveCount(2);
  await expect(page.locator("#newCustomApiSources .source-group-title")).toHaveCount(2);
  await expect(page.locator("#newCustomApiSources .source-option").first()).not.toContainText("订阅源 ·");
  await expect(page.locator("#newCustomApiSources .source-option").last()).not.toContainText("API 源 ·");
  await expect(page.locator("#newCustomApiSources")).not.toContainText("已启用");
  await expect(page.locator("#newCustomApiSources")).not.toContainText("已禁用");
  await expect(page.locator("#newCustomApiSources input[type=checkbox]:checked")).toHaveCount(0);
  await page.locator("#newCustomApiSources").getByRole("button", { name: "清空" }).click();
  await page.locator("#newCustomApiSources").getByRole("button", { name: "仅显示已选" }).click();
  await expect(page.locator("#newCustomApiSources input[type=checkbox]")).toHaveCount(0);
  await page.locator("#newCustomApiSources").getByRole("button", { name: "仅显示已选" }).click();
  await expect(page.locator("#newCustomApiSources input[type=checkbox]:checked")).toHaveCount(0);
  await page.locator("#newCustomApiSources").getByRole("button", { name: "全选" }).click();
  await expect(page.locator("#newCustomApiSources input[type=checkbox]:checked")).toHaveCount(2);
  await page.locator("#newCustomApiSources").getByRole("button", { name: "清空" }).click();
  await page.locator("#newCustomApiPath").fill("bad path");
  await expect(page.locator("#newCustomApiPathHint")).toHaveClass(/error/);
  const customPath = "preview-api-" + Date.now().toString(36) + "-" + testInfo.project.name;
  await page.locator("#newCustomApiPath").fill(customPath);
  await page.locator("#newCustomApiSources input[type=checkbox]").first().check();
  const initialApiCount = await page.locator("#customApisList .row").count();
  await page.getByRole("button", { name: "创建 API" }).click();
  await expect(page.locator("#customApiDialog")).not.toBeVisible();
  await expect(page.locator("#customApisList .row")).toHaveCount(initialApiCount + 1);
  await expect(page.locator("#customApiSaveStatus")).toHaveText("有未保存的修改");
  await page.locator("#customApisList .custom-api-row").last().getByRole("button", { name: "✎ 编辑" }).click();
  await expect(page.locator("#customApiEditDialog")).toBeVisible();
  await expect(page.locator("#editCustomApiSources input[type=checkbox]")).toHaveCount(2);
  await page.locator("#editCustomApiSources").getByRole("button", { name: "清空" }).click();
  await page.locator("#editCustomApiSources input[type=checkbox]").last().check();
  await page.locator("#saveCustomApiEditButton").click();
  await expect(page.locator("#customApiEditDialog")).not.toBeVisible();
  await expect(page.locator("#customApiSaveStatus")).toHaveText("配置已保存");
  const savedConfig = await page.evaluate(async (path) => {
    const response = await fetch('/api/custom-apis', { cache: 'no-store' });
    const data = await response.json();
    return data[path];
  }, customPath);
  expect(savedConfig.sourceMode).toBe("selected");
  expect(savedConfig.sources).toHaveLength(1);
  expect(savedConfig.sources[0].type).toBe("apis");
});

test("edits and saves the blacklist from settings", async ({ page }, testInfo) => {
  await login(page);
  await page.locator('a[data-nav-page="settings"]').click();
  await expect(page).toHaveURL(/\/admin\/settings$/);
  await expect(page.locator("#blacklistSettings")).toBeVisible();
  const addedWord = "e2e-blacklist-" + Date.now().toString(36) + "-" + testInfo.project.name;
  await page.locator("#newBlacklistWord").fill(addedWord);
  await page.locator("#addBlacklistButton").click();
  await expect(page.locator("#blacklistList input").last()).toHaveValue(addedWord);
  await expect(page.locator("#blacklistSaveStatus")).toHaveText("有未保存的修改");
  await page.locator("#blacklistList input").last().fill(addedWord + "-编辑");
  await expect(page.locator("#blacklistList input").last()).toHaveValue(addedWord + "-编辑");
  await page.locator("#blacklistList .blacklist-row").last().getByRole("button", { name: "删除" }).click();
  await page.locator("#saveBlacklistButton").click();
  await expect(page.locator("#blacklistSaveStatus")).toHaveText("配置已保存");
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
