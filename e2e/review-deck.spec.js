import { expect, test } from "@playwright/test";
import { installConsoleGuard, openAuthenticated } from "./helpers/app.js";

test("Meu Deck de Revisão mostra resumo, filtros e status pessoal", async ({
  page,
}) => {
  const guard = installConsoleGuard(page);
  await openAuthenticated(page, "flashcards.html");
  await page.evaluate(() => {
    const key =
      Object.keys(localStorage).find((item) =>
        item.endsWith(":clf-c02_review_deck"),
      ) || "aws_sim_user:e2e-smoke-user:clf-c02_review_deck";
    localStorage.setItem(
      key,
      JSON.stringify([
        {
          questionId: "deck-1",
          certId: "clf-c02",
          domain: "cloud-concepts",
          question: "Q1",
          options: ["A"],
          correct: 0,
        },
        {
          questionId: "deck-2",
          certId: "clf-c02",
          domain: "security-and-compliance",
          question: "Q2",
          options: ["A"],
          correct: 0,
          reviewStatus: "mastered",
          reviewCount: 1,
        },
        {
          questionId: "deck-3",
          certId: "aif-c01",
          domain: "fundamentals-ai-ml",
          question: "Q3",
          options: ["A"],
          correct: 0,
        },
      ]),
    );
  });
  await page.reload();
  await page.locator("#flashcard-category").selectOption("review-deck");
  await expect(page.locator("#review-deck-summary")).toBeVisible();
  await expect(page.locator("#review-deck-total")).toHaveText("2");
  await expect(page.locator("#review-deck-pending")).toHaveText("1");
  await expect(page.locator("#review-deck-mastered-btn")).toBeDisabled();
  await page.locator("#flashcard-container").press("Enter");
  await expect(page.locator("#review-deck-mastered-btn")).toBeEnabled();
  await page.locator("#review-deck-mastered-btn").click();
  await expect(page.locator("#review-deck-pending")).toHaveText("0");
  guard.assertClean();
});
