import { test, expect, type Page } from "@playwright/test";

const adminEmail = process.env.E2E_ADMIN_EMAIL || "admin@example.com";
const adminPassword = process.env.E2E_ADMIN_PASSWORD || "admin123";

async function login(page: Page) {
  await page.goto("/login");
  await page.fill("#email", adminEmail);
  await page.fill("#password", adminPassword);
  await page.getByRole("button", { name: "登录" }).click();
  await expect(page).toHaveURL(/\/$/);
}

async function fillRichPost(page: Page, title: string) {
  await page.route("**/api/upload", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ url: "/uploads/e2e-mock.webp" }),
    });
  });

  await page.goto("/write");

  await page.fill("#post-title", title);

  const editor = page.locator(".ProseMirror").first();
  await editor.click();
  await editor.type("这是一篇由 Playwright 自动创建的关键路径文章。\n\n正文包含文本、表格、图片和视频。", {
    delay: 5,
  });

  await page.getByPlaceholder("输入标签，回车添加").fill("自动化");
  await page.keyboard.press("Enter");
  await page.getByPlaceholder("输入标签，回车添加").fill("e2e");
  await page.keyboard.press("Enter");

  page.once("dialog", (dialog) => dialog.accept("4x5"));
  await page.locator('button[title="插入表格"]').first().click();
  await expect(editor.locator("table")).toBeVisible();
  await expect(editor.locator("table tr")).toHaveCount(4);
  await expect(editor.locator("table tr").first().locator("th,td")).toHaveCount(5);

  const chooserPromise = page.waitForEvent("filechooser");
  await page.locator('button[title="插入图片"]').first().click();
  const chooser = await chooserPromise;
  await chooser.setFiles("public/favicon.svg");
  await expect(editor.locator("img")).toBeVisible();

  page.once("dialog", (dialog) =>
    dialog.accept("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=43s")
  );
  await page.locator('button[title="插入视频"]').first().click();
  const iframe = editor.locator("iframe").last();
  await expect(iframe).toHaveAttribute(
    "src",
    /youtube-nocookie\.com\/embed\/dQw4w9WgXcQ\?start=43/
  );
}

test.describe("关键作者发布流", () => {
  test("保存草稿：完整富文本内容可进入草稿箱", async ({ page }) => {
    const title = `E2E 草稿 ${Date.now()}`;

    await login(page);
    await fillRichPost(page, title);

    await page.getByRole("button", { name: "保存草稿" }).click();
    await expect(page).toHaveURL(/\/edit\//);

    await page.goto("/drafts");
    await expect(page.getByRole("link", { name: title })).toBeVisible();
  });

  test("发布文章：完整富文本内容发布后在首页可见", async ({ page }) => {
    const title = `E2E 发布 ${Date.now()}`;

    await login(page);
    await fillRichPost(page, title);

    await page.getByRole("button", { name: "发布" }).click();
    await expect(page).toHaveURL(/\/edit\//);
    await expect(page.getByText("已发布")).toBeVisible();

    await page.goto("/");
    await expect(page.getByRole("link", { name: title })).toBeVisible();
  });
});
