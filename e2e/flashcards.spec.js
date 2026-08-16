import { expect, test } from "@playwright/test";
import { installConsoleGuard, openAuthenticated } from "./helpers/app.js";

test("flashcards show all certifications and switch the viewed deck", async ({ page }) => {
  const guard = installConsoleGuard(page);
  await openAuthenticated(page, "flashcards.html");
  const picker = page.locator("#flashcard-certification-picker");
  await expect(picker).toBeVisible();
  const options = page.locator("#flashcard-certification-options .fc-certification-option");
  await expect(options).toHaveCount(4);
  await page.locator("#flashcard-certification-options .fc-certification-option").filter({ hasText: "SAA-C03" }).click();
  await expect(page.locator("#flashcard-certification-options .fc-certification-option.is-viewing")).toContainText("SAA-C03");
  await expect(page.locator("#flashcard-active-certification")).toContainText("CLF-C02");
  guard.assertClean();
});
