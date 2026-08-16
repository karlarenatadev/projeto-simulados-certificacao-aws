import { expect, test } from "@playwright/test";
import { installConsoleGuard, openAuthenticated } from "./helpers/app.js";

test("settings dark mode updates form controls and persists after reload", async ({ page }) => {
  const guard = installConsoleGuard(page);
  await openAuthenticated(page, "settings.html");
  const darkMode = page.locator("#setting-dark-mode");
  await expect(darkMode).toBeAttached();
  await darkMode.evaluate((element) => {
    element.checked = true;
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await page.locator("#settings-btn-save").click();
  console.log(await page.evaluate(() => ({
    checked: document.querySelector("#setting-dark-mode")?.checked,
    theme: localStorage.getItem("aws_sim_theme"),
    htmlClass: document.documentElement.className,
    displayName: document.querySelector("#setting-display-name")?.value,
    readyState: document.readyState,
    save: document.querySelector("#settings-btn-save")?.outerHTML,
  })));
  console.log("guard", guard.errors());
  await expect.poll(() => page.locator("html").evaluate((element) => element.classList.contains("dark"))).toBe(true);
  const inputBackground = await page.locator("#setting-display-name").evaluate((element) => getComputedStyle(element).backgroundColor);
  const selectBackground = await page.locator("#setting-pomodoro").evaluate((element) => getComputedStyle(element).backgroundColor);
  expect(inputBackground).not.toBe("rgb(255, 255, 255)");
  expect(selectBackground).not.toBe("rgb(255, 255, 255)");
  await page.reload();
  await expect(darkMode).toBeChecked();
  guard.assertClean();
});
