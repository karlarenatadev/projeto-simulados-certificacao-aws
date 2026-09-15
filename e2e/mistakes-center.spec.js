import { expect, test } from "@playwright/test";
import { installConsoleGuard, openAuthenticated } from "./helpers/app.js";

async function seedMistakes(page) {
  await page.evaluate(() => {
    const key =
      Object.keys(localStorage).find((item) => item.endsWith(":mistakes")) ||
      "aws_sim_user:e2e-smoke-user:mistakes";
    const now = new Date().toISOString();
    localStorage.setItem(
      key,
      JSON.stringify({
        "clf-c02": {
          clf1: {
            questionId: "clf1",
            certification: "clf-c02",
            domain: "security-and-compliance",
            question: "Protect data?",
            selectedAnswer: 1,
            correctAnswer: 0,
            explanation: "Use least privilege.",
            wrongCount: 3,
            lastWrongAt: now,
            firstWrongAt: now,
            resolved: false,
          },
          clf2: {
            questionId: "clf2",
            certification: "clf-c02",
            domain: "cloud-concepts",
            question: "Cloud model?",
            wrongCount: 1,
            lastWrongAt: now,
            resolved: false,
          },
          clf3: {
            questionId: "clf3",
            certification: "clf-c02",
            domain: "security-and-compliance",
            question: "Resolved question",
            wrongCount: 2,
            lastWrongAt: now,
            resolved: true,
            resolvedAt: now,
          },
        },
        "aif-c01": {
          aif1: {
            questionId: "aif1",
            certification: "aif-c01",
            domain: "fundamentals-ai-ml",
            question: "Model question",
            wrongCount: 1,
            lastWrongAt: now,
            resolved: false,
          },
        },
      }),
    );
  });
  await page.reload();
  await expect(page.locator("#mistakes-summary")).toBeVisible();
}

test("Central de Erros resume, filtra e abre detalhes", async ({ page }) => {
  const guard = installConsoleGuard(page);
  await openAuthenticated(page, "erros.html");
  await seedMistakes(page);
  await expect(page.locator("#mistakes-summary")).toContainText("3");
  await expect(page.locator("#mistakes-list article")).toHaveCount(3);
  await page.locator("#mistakes-cert").selectOption("aif-c01");
  await expect(page.locator("#mistakes-list article")).toHaveCount(1);
  await page.locator("#mistakes-status").selectOption("resolved");
  await expect(page.locator("#mistakes-list article")).toHaveCount(0);
  await page.locator("#mistakes-clear-filters").click();
  await page.locator("#mistakes-list details summary").first().click();
  await expect(page.locator("#mistakes-list details").first()).toBeVisible();
  await expect(page.locator("#mistakes-practice")).toHaveAttribute(
    "href",
    /simulados\.html\?mode=mistakes/,
  );
  guard.assertClean();
});
