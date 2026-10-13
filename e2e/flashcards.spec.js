import { expect, test } from "@playwright/test";
import { installConsoleGuard, openAuthenticated } from "./helpers/app.js";

test("card interaction is ready on deck initialization and remains bound once", async ({
  page,
}) => {
  await openAuthenticated(page, "flashcards.html");
  const card = page.locator("#flashcard-container");
  await expect(card).toHaveAttribute("data-flip-bound", "true");
  await page.evaluate(() => {
    window.startFlashcards();
    window.startFlashcards();
  });
  await card.press("Enter");
  await expect(card).toHaveClass(/flipped/);
  await card.press("Space");
  await expect(card).not.toHaveClass(/flipped/);
  await card.click();
  await expect(card).toHaveClass(/flipped/);
});

test("flashcards show all certifications and switch the viewed deck", async ({
  page,
}) => {
  const guard = installConsoleGuard(page);
  await openAuthenticated(page, "flashcards.html");
  const picker = page.locator("#flashcard-certification-picker");
  await expect(picker).toBeVisible();
  const options = page.locator(
    "#flashcard-certification-options .fc-certification-option",
  );
  await expect(options).toHaveCount(4);
  await page
    .locator("#flashcard-certification-options .fc-certification-option")
    .filter({ hasText: "SAA-C03" })
    .click();
  await expect(
    page.locator(
      "#flashcard-certification-options .fc-certification-option.is-viewing",
    ),
  ).toContainText("SAA-C03");
  await expect(page.locator("#flashcard-active-certification")).toContainText(
    "CLF-C02",
  );
  guard.assertClean();
});

test("AIF machine learning deck exposes the four reviewed concepts in PT and EN", async ({
  page,
}) => {
  const guard = installConsoleGuard(page);
  await openAuthenticated(page, "flashcards.html");
  await page
    .locator("#flashcard-certification-options .fc-certification-option")
    .filter({ hasText: "AIF-C01" })
    .click();
  await page.locator("#flashcard-category").selectOption("fundamentals-ai-ml");

  await expect(page.locator("#flashcard-counter")).toContainText("/ 18");
  await expect(page.locator("#flashcard-term")).not.toHaveText("");

  await page.locator("#btn-language").click();
  await expect(page.locator("#flashcard-term")).not.toHaveText("");
  guard.assertClean();
});
