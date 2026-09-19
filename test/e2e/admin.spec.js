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
  await expect(page.locator('[data-source-raw-tab]')).toHaveText(["节点结果", "过滤节点", "未过滤节点"]);
  await expect(page.locator("#sourceRawFilteredContent")).toHaveAttribute("aria-label", "过滤节点");
  await expect(page.locator("#sourceRawRawContent")).toHaveAttribute("aria-label", "未过滤节点");
  await expect(page.locator("#customApiDialog")).not.toBeVisible();
  await page.getByRole("button", { name: "新建优选 API" }).click();
  await expect(page.locator("#customApiDialog")).toBeVisible();
  await expect.poll(() => page.locator("#newCustomApiPath").evaluate((input) => getComputedStyle(input).boxShadow)).toBe("none");
  // 数据源选择器：订阅源 + API 源 + 手动优选（优选域名未配置时不显示）。
  await expect(page.locator("#newCustomApiSources input[type=checkbox]")).toHaveCount(3);
  await expect(page.locator("#newCustomApiSources .source-group-title")).toHaveCount(3);
  await expect(page.locator("#newCustomApiSources .source-group-title").last()).toHaveText("手动优选 · 1");
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
  await expect(page.locator("#newCustomApiSources input[type=checkbox]:checked")).toHaveCount(3);
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
  const customApiSearch = page.locator("#customApiSearch");
  await customApiSearch.fill(customPath);
  await expect(page.locator("#customApisList .row")).toHaveCount(1);
  await expect(page).toHaveURL(new RegExp("customQ=" + customPath));
  await customApiSearch.fill("not-found-custom-api");
  await expect(page.locator("#customApisList .row")).toHaveCount(0);
  await expect(page.locator("#customApisList")).toContainText("没有匹配的优选 API");
  await customApiSearch.fill("");
  await expect(page.locator("#customApisList .row")).toHaveCount(initialApiCount + 1);
  await expect(page).toHaveURL(/\/admin\/custom-apis$/);
  await expect(page.locator("#saveCustomApisButton")).toHaveCount(0);
  await expect(page.locator("#customApiSaveStatus")).toHaveCount(0);
  const apiSwitch = page.locator("#customApisList .source-switch input").last();
  await expect(apiSwitch).toBeChecked();
  await page.locator("#customApisList .source-switch").last().click();
  await expect(apiSwitch).not.toBeChecked();
  await expect.poll(async () => page.evaluate(async (path) => {
    const response = await fetch('/api/custom-apis', { cache: 'no-store' });
    return (await response.json())[path]?.enabled;
  }, customPath)).toBe(false);
  await page.locator("#customApisList .custom-api-row").last().getByRole("button", { name: "✎ 编辑" }).click();
  await expect(page.locator("#customApiEditDialog")).toBeVisible();
  // 编辑面板数据源：订阅源 + API 源 + 手动优选。
  await expect(page.locator("#editCustomApiSources input[type=checkbox]")).toHaveCount(3);
  await page.locator("#editCustomApiSources").getByRole("button", { name: "清空" }).click();
  await page.locator("#editCustomApiSources input[type=checkbox]").nth(1).check();
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
  await expect(page.locator('[data-source-raw-tab="nodes"]')).toHaveAttribute("aria-selected", "true");
  await expect(page.locator('[data-source-raw-tab="raw"]')).toHaveAttribute("aria-selected", "false");
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

test("applies per-view blacklist and remark filters from the view dialog", async ({ page }, testInfo) => {
  // 服务端对同一数据源的检测有冷却时间，两个项目并行打开同一个源的查看弹窗会互相触发限流，只在桌面项目执行。
  test.skip(testInfo.project.name === "mobile", "同一数据源的检测冷却无法并行覆盖");
  await login(page);
  await page.goto("/admin/manage");
  await expect(page.locator("#apisSection")).toBeVisible();
  await page.locator("#apisList .row").first().getByRole("button", { name: /查看/ }).click();
  await expect(page.locator("#sourceRawDialog")).toBeVisible();
  await expect(page.locator("#sourceRawFiltersPanel")).toBeVisible();
  await expect(page.locator("#sourceRawFilterBadge")).toBeHidden();
  await expect(page.locator("#sourceRawContent")).toContainText("2.2.2.2:443#api");
  await expect(page.locator("#sourceRawContent")).toContainText("3.3.3.3:443#api");

  await page.locator("#sourceRawFiltersPanel summary").click();
  await page.locator("#sourceRawBlacklistInput").fill("2.2.2.2");
  await expect(page.locator("#sourceRawBlacklistMeta")).toHaveText("1 条");
  await page.locator("#applySourceRawFiltersButton").click();
  await expect(page.locator("#sourceRawFilterBadge")).toBeVisible();
  await expect(page.locator("#sourceRawContent")).toContainText("3.3.3.3:443#api");
  await expect(page.locator("#sourceRawContent")).not.toContainText("2.2.2.2:443#api");
  await page.locator('[data-source-raw-tab="filtered"]').click();
  await expect(page.locator("#sourceRawFilteredContent")).toContainText("2.2.2.2:443#api");
  // 过滤节点旁标注命中的规则（默认黑名单为空，这里展示本次查看的独立规则）
  await expect(page.locator("#sourceRawFilteredContent .source-raw-node-rule").first()).toHaveText("黑名单：2.2.2.2");
  await expect(page.locator("#sourceRawFilterStatus")).toContainText("仅对当前查看生效");

  // 独立规则只作用于当前查看，设置页里的全局黑名单保持不变。
  const globalBlacklist = await page.evaluate(async () => (await (await fetch("/api/blacklist", { cache: "no-store" })).json()));
  expect(globalBlacklist).toEqual([]);

  await page.locator("#resetSourceRawFiltersButton").click();
  await expect(page.locator("#sourceRawFilterBadge")).toBeHidden();
  await page.locator('[data-source-raw-tab="nodes"]').click();
  await expect(page.locator("#sourceRawContent")).toContainText("2.2.2.2:443#api");
  await page.locator("#sourceRawDialog .dialog-close").click();
  await expect(page.locator("#sourceRawDialog")).not.toBeVisible();
});

test("logs out from the dashboard", async ({ page }) => {
  await login(page);
  await page.locator("#logoutButton").click();
  await expect(page.locator('input[name="password"]')).toBeVisible();
});

test.describe("manual preferred editor", () => {
  test.use({ permissions: ["clipboard-read", "clipboard-write"] });

  test("sorts, saves, copies, and append-pastes manual preferred entries", async ({ page }, testInfo) => {
    // 手动优选在服务端只有一个 KV 槽位，两个项目并行跑会互相覆盖，只在桌面项目执行。
    test.skip(testInfo.project.name !== "chromium", "手动优选测试依赖共享 KV 状态，仅在桌面项目运行");
    // 完整覆盖排序/保存/刷新/追加/复制/覆盖/清空/撤销，流程较长，放宽单用例时限。
    test.setTimeout(90_000);
    await login(page);
    await page.locator('a[data-nav-page="manage"]').click();
    await expect(page).toHaveURL(/\/admin\/manage$/);
    await expect(page.locator("#preferredManualSection")).toBeVisible();

    const textarea = page.locator("#preferredManualText");
    const marker = "e2e-" + testInfo.project.name;
    const unsorted = [
      "104.156.239.27:443#" + marker,
      "104.156.239.15:443#" + marker,
      "2.2.2.2:8443#" + marker,
    ];
    await textarea.fill(unsorted.join("\n"));
    await expect(page.locator("#preferredManualStats")).toHaveText("共 3 条");

    // 一键排序：按 IPv4 各段数值排序，不按字符串比较。
    await page.locator("#preferredManualSortButton").click();
    await expect(textarea).toHaveValue([
      "2.2.2.2:8443#" + marker,
      "104.156.239.15:443#" + marker,
      "104.156.239.27:443#" + marker,
    ].join("\n"));

    // 保存后刷新页面，内容应从服务端回读（保持排序后的顺序）。
    await page.locator("#preferredManualSaveButton").click();
    await expect(page.locator("#toast")).toContainText("手动优选已保存");
    await expect(page.locator("#preferredManualSaveButton")).toBeDisabled();
    const sorted = [
      "2.2.2.2:8443#" + marker,
      "104.156.239.15:443#" + marker,
      "104.156.239.27:443#" + marker,
    ];
    await page.reload();
    await expect(page.locator("#preferredManualText")).toHaveValue(sorted.join("\n"));

    // 追加粘贴：新条目追加，已存在条目跳过。
    await page.evaluate(async (existing) => {
      await navigator.clipboard.writeText([existing, "5.6.7.8:443#new-" + existing.split("#")[1]].join("\n"));
    }, "104.156.239.15:443#" + marker);
    await page.locator("#preferredManualAppendButton").click();
    await expect(textarea).toHaveValue([
      "2.2.2.2:8443#" + marker,
      "104.156.239.15:443#" + marker,
      "104.156.239.27:443#" + marker,
      "5.6.7.8:443#new-" + marker,
    ].join("\n"));
    await expect(page.locator("#toast")).toContainText("已追加 1 条，跳过 1 条重复");

    // 复制：剪贴板内容与文本框一致（Windows 剪贴板会把换行规范成 CRLF，先归一再比较）。
    await page.locator("#preferredManualSaveButton").click();
    await expect(page.locator("#toast")).toContainText("手动优选已保存");
    await page.evaluate(async () => { await navigator.clipboard.writeText("cleared"); });
    await page.locator("#preferredManualCopyButton").click();
    await expect.poll(async () => (await page.evaluate(() => navigator.clipboard.readText())).replace(/\r\n/g, "\n"))
      .toBe(await textarea.inputValue());

    // 覆盖粘贴：用剪贴板内容整体替换（带确认弹窗，自动接受）。
    page.on("dialog", (dialog) => dialog.accept());
    const savedValue = await textarea.inputValue();
    await page.evaluate(async (suffix) => {
      await navigator.clipboard.writeText(["7.7.7.7:443#over-" + suffix, "8.8.8.8:443#over-" + suffix].join("\n"));
    }, marker);
    await page.locator("#preferredManualOverwriteButton").click();
    await expect(textarea).toHaveValue([
      "7.7.7.7:443#over-" + marker,
      "8.8.8.8:443#over-" + marker,
    ].join("\n"));
    await expect(page.locator("#toast")).toContainText("已用剪贴板内容覆盖，共 2 条");

    // 一键清空：确认后清空文本框，撤销按钮可用。
    await page.locator("#preferredManualClearButton").click();
    await expect(textarea).toHaveValue("");
    await expect(page.locator("#preferredManualStats")).toHaveText("共 0 条");
    await expect(page.locator("#preferredManualClearButton")).toBeDisabled();
    await expect(page.locator("#preferredManualUndoButton")).toBeEnabled();

    // 撤销更改：恢复到上次保存的版本。
    await page.locator("#preferredManualUndoButton").click();
    await expect(textarea).toHaveValue(savedValue);
    await expect(page.locator("#preferredManualUndoButton")).toBeDisabled();
    await expect(page.locator("#toast")).toContainText("已恢复到上次保存的版本");
  });
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
