import { expect, test } from "@playwright/test";
import { installConsoleGuard } from "./helpers/app.js";

test("home loads the application shell", async ({ page }) => {
  const guard = installConsoleGuard(page);
  await page.goto("index.html");
  await expect(page.locator("#main-section")).toBeVisible();
  await expect(page.locator("#main-content-wrapper")).toBeAttached();
  await expect(page.locator("#screen-hub")).toBeAttached();
  await expect(page.locator("#left-sidebar")).toBeAttached();
  guard.assertClean();
});
