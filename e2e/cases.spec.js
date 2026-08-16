import { expect, test } from "@playwright/test";
import { installConsoleGuard, openAuthenticated, toggleLanguage } from "./helpers/app.js";

test("cases list and detail localize between Portuguese and English", async ({ page }) => {
  const guard = installConsoleGuard(page);
  await openAuthenticated(page, "cases.html");
  const firstCase = page.locator("#cases-grid a[href*='case-view.html']").first();
  await expect(firstCase).toBeVisible();
  await firstCase.click();
  await expect(page.locator("#case-main-title")).toBeVisible();
  const portugueseTitle = await page.locator("#case-main-title").textContent();
  await toggleLanguage(page);
  await expect(page.locator("#case-main-title")).not.toHaveText(portugueseTitle || "");
  guard.assertClean();
});
