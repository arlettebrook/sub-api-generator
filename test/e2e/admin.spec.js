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
  const scrollTopButton = page.locator("#scrollTopButton");
  await expect(scrollTopButton).toBeHidden();
  await page.evaluate(() => {
    const spacer = document.createElement("div");
    spacer.id = "e2e-scroll-spacer";
    spacer.style.height = "1800px";
    document.body.appendChild(spacer);
    window.scrollTo(0, 600);
  });
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(180);
  await expect(scrollTopButton).toBeVisible();
  await scrollTopButton.click();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(2);
  await page.locator("#e2e-scroll-spacer").evaluate((element) => element.remove());
  await page.locator('a[data-nav-page="customApis"]').click();
  await expect(page).toHaveURL(/\/admin\/custom-apis$/);
  await expect(page.locator("#customApiSection")).toBeVisible();
  await page.evaluate(() => {
    const spacer = document.createElement("div");
    spacer.id = "e2e-scroll-spacer";
    spacer.style.height = "1800px";
    document.body.appendChild(spacer);
    window.scrollTo(0, 600);
  });
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(180);
  await expect(page.locator("#scrollTopButton")).toBeVisible();
  await page.locator("#scrollTopButton").click();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(2);
  await page.locator("#e2e-scroll-spacer").evaluate((element) => element.remove());
  await page.locator('a[data-nav-page="overview"]').click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.locator("#nodesContainer")).toBeVisible();
  await page.evaluate(() => {
    const preview = document.querySelector("#previewSection");
    const raw = document.createElement("pre");
    raw.className = "preview-api-data";
    raw.style.height = "48px";
    raw.style.overflow = "auto";
    raw.textContent = Array.from({ length: 40 }, (_, index) => "node-" + index).join("\n");
    const spacer = document.createElement("div");
    spacer.id = "e2e-scroll-spacer";
    spacer.style.height = "1800px";
    preview.append(raw, spacer);
    raw.scrollTop = 220;
    window.scrollTo(0, 600);
  });
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(120);
  await expect.poll(() => page.locator("#previewSection .preview-api-data").evaluate((element) => element.scrollTop)).toBe(220);
  await page.locator("#scrollTopButton").click();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(2);
  await expect.poll(() => page.locator("#previewSection .preview-api-data").evaluate((element) => element.scrollTop)).toBe(0);
  await page.locator("#e2e-scroll-spacer").evaluate((element) => element.remove());
  await page.locator("#previewSection .preview-api-data").evaluate((element) => element.remove());
  await expect(page.locator("#previewApiSelect")).toBeHidden();
  await expect(page.locator("[data-preview-mode]")).toHaveCount(2);
  await page.locator('[data-preview-mode="api"]').click();
  await expect(page.locator('[data-preview-mode="api"]')).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  await expect(page.locator('[data-preview-mode="api"]')).toHaveAttribute("aria-pressed", "true");
  await page.locator('[data-preview-mode="nodes"]').click();
  const wasDark = await page.locator("body").evaluate((body) => body.classList.contains("dark"));
  await page.locator("#themeSwitch").click();
  await expect.poll(() => page.locator("body").evaluate((body) => body.classList.contains("dark"))).toBe(!wasDark);
});

test("navigates to the custom API page and selects data sources", async ({ page }, testInfo) => {
  await login(page);
  await page.evaluate(() => { window.__spaNavigationMarker = "kept"; });
  await page.locator('a[data-nav-page="customApis"]').click();
  await expect(page).toHaveURL(/\/admin\/custom-apis$/);
  await expect.poll(() => page.evaluate(() => window.__spaNavigationMarker)).toBe("kept");
  await expect(page.locator("#customApiSection")).toBeVisible();
  await expect(page.locator("#sourceRawCacheStatus")).toHaveCount(1);
  await expect(page.locator("#sourceRawSourceSort")).toHaveCount(1);
  await expect(page.locator("#sourceRawRawContent")).toHaveAttribute("aria-label", "未过滤节点");
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
  await expect(page.locator("#saveCustomApisButton")).toHaveCount(0);
  await expect(page.locator("#customApiSaveStatus")).toHaveCount(0);
  const apiSwitch = page.locator("#customApisList .custom-api-switch input").last();
  await expect(apiSwitch).toBeChecked();
  await page.locator("#customApisList .custom-api-switch").last().click();
  await expect(apiSwitch).not.toBeChecked();
  await expect.poll(async () => page.evaluate(async (path) => {
    const response = await fetch('/api/custom-apis', { cache: 'no-store' });
    return (await response.json())[path]?.enabled;
  }, customPath)).toBe(false);
  await page.locator("#customApisList .custom-api-row").last().getByRole("button", { name: "✎ 编辑" }).click();
  await expect(page.locator("#customApiEditDialog")).toBeVisible();
  await expect(page.locator("#editCustomApiSources input[type=checkbox]")).toHaveCount(2);
  await page.locator("#editCustomApiSources").getByRole("button", { name: "清空" }).click();
  await page.locator("#editCustomApiSources input[type=checkbox]").last().check();
  await page.locator("#saveCustomApiEditButton").click();
  await expect(page.locator("#customApiEditDialog")).not.toBeVisible();
  const savedConfig = await page.evaluate(async (path) => {
    const response = await fetch('/api/custom-apis', { cache: 'no-store' });
    const data = await response.json();
    return data[path];
  }, customPath);
  expect(savedConfig.sourceMode).toBe("selected");
  expect(savedConfig.sources).toHaveLength(1);
  expect(savedConfig.sources[0].type).toBe("apis");
  const createdRow = page.locator("#customApisList .custom-api-row").last();
  await createdRow.getByRole("button", { name: "查看" }).click();
  await expect(page.locator("#sourceRawDialog")).toBeVisible();
  await expect(page.locator("html")).toHaveClass(/source-raw-scroll-locked/);
  await expect(page.locator("#sourceRawSourceSort")).toHaveValue("config");
  await expect(page.locator(".source-raw-source-stats").first()).toContainText("原始");
  await expect(page.locator("#sourceRawHistoryPanel")).toBeVisible();
  await page.locator("#sourceRawSourceSort").selectOption("count");
  await page.locator("#sourceRawSearch").fill("2.2.2.2");
  await page.locator('[data-source-raw-tab="raw"]').click();
  const rawSourceGroup = page.locator("#sourceRawRawContent .source-raw-source-group").first();
  const rawSourceHeading = rawSourceGroup.locator(".source-raw-source-heading");
  await rawSourceGroup.locator(".source-raw-source-header").click({ position: { x: 12, y: 28 } });
  await expect(rawSourceHeading).toHaveAttribute("aria-expanded", "false");
  await page.locator("#sourceRawDialog .dialog-close").click();
  await expect(page.locator("#sourceRawDialog")).not.toBeVisible();
  await createdRow.getByRole("button", { name: "查看" }).click();
  await page.locator("#sourceRawDialog .source-raw-body").evaluate((element) => {
    const spacer = document.createElement("div");
    spacer.style.height = "1200px";
    spacer.dataset.e2eScrollSpacer = "true";
    element.appendChild(spacer);
    element.scrollTop = 240;
  });
  await expect.poll(() => page.locator("#sourceRawDialog .source-raw-body").evaluate((element) => element.scrollTop)).toBe(240);
  await page.locator("#sourceRawDialog .dialog-close").click();
  await createdRow.getByRole("button", { name: "查看" }).click();
  await expect.poll(() => page.locator("#sourceRawDialog .source-raw-body").evaluate((element) => element.scrollTop)).toBe(0);
  await expect(page.locator("#sourceRawSearch")).toHaveValue("2.2.2.2");
  await expect(page.locator("#sourceRawSourceSort")).toHaveValue("count");
  await expect(page.locator('[data-source-raw-tab="raw"]')).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("#sourceRawRawContent .source-raw-source-heading").first()).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("#sourceRawHistoryPanel")).toContainText("原始");
  await page.locator("#sourceRawHistoryPanel summary").click();
  await page.locator("#sourceRawHistoryList .source-raw-history-view").first().click();
  await expect(page.locator("#sourceRawHistoryDialog")).toBeVisible();
  await expect(page.locator("#sourceRawHistoryDialogContent")).toContainText("2.2.2.2");
  await expect(page.locator("#sourceRawHistoryDialogContent")).toHaveCSS("white-space", "pre-wrap");
  await expect(page.locator("#sourceRawHistoryDialogContent")).toHaveText(/2\.2\.2\.2:443#api\s+3\.3\.3\.3:443#api/);
  await page.locator('[data-source-history-tab="raw"]').click();
  await expect(page.locator("#sourceRawHistoryDialogContent")).toContainText("2.2.2.2");
  await page.locator("#sourceRawHistoryDialog .dialog-close").click();
  await expect(page.locator("#sourceRawHistoryDialog")).not.toBeVisible();
  await page.locator("#sourceRawDialog .dialog-close").click();
  await createdRow.getByRole("button", { name: "🗑 删除" }).click();
  await expect(page.locator("#customApiDeleteDialog")).toBeVisible();
  await page.getByRole("button", { name: "取消" }).last().click();
  await expect(page.locator("#customApiDeleteDialog")).not.toBeVisible();
  await expect(page.locator("#customApisList .custom-api-row")).toHaveCount(initialApiCount + 1);
  await page.locator("#customApisList .custom-api-row").last().getByRole("button", { name: "🗑 删除" }).click();
  await page.getByRole("button", { name: "确认删除" }).click();
  await expect(page.locator("#customApisList .custom-api-row")).toHaveCount(initialApiCount);
  await expect.poll(async () => page.evaluate(async (path) => {
    const response = await fetch('/api/custom-apis', { cache: 'no-store' });
    return Object.prototype.hasOwnProperty.call(await response.json(), path);
  }, customPath)).toBe(false);
});

test("edits and saves the blacklist from settings", async ({ page }, testInfo) => {
  await login(page);
  await page.locator('a[data-nav-page="settings"]').click();
  await expect(page).toHaveURL(/\/admin\/settings$/);
  await expect(page.locator("#blacklistSettings")).toBeVisible();
  await page.locator('#blacklistSettings .settings-edit-button').click();
  await expect(page.locator('#blacklistDialog')).toBeVisible();
  const addedWord = "e2e-blacklist-" + Date.now().toString(36) + "-" + testInfo.project.name;
  await page.locator("#newBlacklistWord").fill(addedWord);
  await page.locator("#addBlacklistButton").click();
  await expect(page.locator("#blacklistList input").last()).toHaveValue(addedWord);
  await page.locator("#blacklistSearch").fill(addedWord.slice(0, 18));
  await expect(page.locator("#blacklistList .blacklist-row")).toHaveCount(1);
  await page.locator("#blacklistSearch").fill("");
  await expect.poll(() => page.locator("#blacklistList input").evaluateAll((inputs, expected) => inputs.some((input) => input.value === expected), addedWord)).toBe(true);
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
