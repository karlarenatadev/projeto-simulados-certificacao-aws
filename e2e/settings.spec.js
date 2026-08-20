import { expect, test } from "@playwright/test";
import { installConsoleGuard, openAuthenticated } from "./helpers/app.js";

test("settings dark mode updates form controls and persists after reload", async ({ page }) => {
  const guard = installConsoleGuard(page);
  await openAuthenticated(page, "settings.html");
  await page.waitForLoadState("networkidle");
  const darkMode = page.locator("#setting-dark-mode");
  await expect(darkMode).toBeAttached();
  await expect(darkMode).not.toBeChecked();
  await page.locator('label[aria-label="Ativar tema escuro"]').click();
  await expect(darkMode).toBeChecked();
  await page.locator("#settings-btn-save").click();
  await expect.poll(() => page.locator("html").evaluate((element) => element.classList.contains("dark"))).toBe(true);
  const inputBackground = await page.locator("#setting-display-name").evaluate((element) => getComputedStyle(element).backgroundColor);
  const selectBackground = await page.locator("#setting-pomodoro").evaluate((element) => getComputedStyle(element).backgroundColor);
  expect(inputBackground).not.toBe("rgb(255, 255, 255)");
  expect(selectBackground).not.toBe("rgb(255, 255, 255)");
  await page.reload();
  await expect(darkMode).toBeChecked();
  guard.assertClean();
});
