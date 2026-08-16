import { expect, test } from "@playwright/test";
import { installConsoleGuard, openAuthenticated } from "./helpers/app.js";

for (const language of ["pt", "en"]) {
  test(`diagnostic starts in ${language.toUpperCase()} without runtime errors`, async ({ page }) => {
    const guard = installConsoleGuard(page);
    await openAuthenticated(page, "diagnostico.html", { language });
    await page.locator("#certification-select").selectOption("clf-c02");
    await page.locator("#btn-start-diagnostic").click();
    await expect(page.locator("#screen-quiz")).toBeVisible();
    await expect(page.locator("#question-text")).not.toBeEmpty();
    expect(await page.locator("#question-text").textContent()).not.toMatch(/apiService\.getConfiguredApiUrl/i);
    guard.assertClean();
  });
}
