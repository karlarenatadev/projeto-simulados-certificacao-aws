import { expect, test } from "@playwright/test";
import { installConsoleGuard, openAuthenticated } from "./helpers/app.js";

const domains = [
  ["Fundamentals of AI and ML", "fundamentals-ai-ml", 3],
  ["Fundamentals of Generative AI", "fundamentals-genai", 4],
  ["Guidelines for Responsible AI", "guidelines-responsible-ai", 2],
];

function fixtureQuestions() {
  return domains.flatMap(([label, domain, correctCount]) =>
    Array.from({ length: 4 }, (_, index) => ({
      id: `diagnostic-${domain}-${index + 1}`,
      certId: "aif-c01",
      certification: "AIF-C01",
      domain: label,
      question: `${domain}-${index + 1}`,
      options: ["Correct", "Wrong", "Other", "Another"],
      correct_answer: 0,
      validation: { status: "approved" },
      shouldBeCorrect: index < correctCount,
    })),
  );
}

test("diagnostic result uses one multi-domain projection and preserves certification", async ({
  page,
}) => {
  test.setTimeout(60_000);
  const guard = installConsoleGuard(page);
  await page.route("**/data/questions/aif-c01.json", async (route) => {
    const questions = fixtureQuestions().map(
      ({ shouldBeCorrect, ...question }) => ({
        ...question,
        metadata: { shouldBeCorrect },
      }),
    );
    await route.fulfill({ json: questions });
  });

  await openAuthenticated(page, "diagnostico.html", {
    language: "pt",
    user: {
      id: "diagnostic-result-user",
      email: "diagnostic-result@example.test",
      name: "Diagnostic Result User",
      certification: "aif-c01",
      language: "pt",
    },
  });
  await page.locator("#certification-select").selectOption("aif-c01");
  await page.locator("#btn-start-diagnostic").click();
  await expect(page.locator("#screen-quiz")).toBeVisible();
  await expect(page.locator("#btn-submit")).toHaveCount(0);

  const seenByDomain = new Map();
  for (let index = 0; index < 12; index += 1) {
    const question = await page.evaluate(() => {
      const entry = Object.entries(localStorage).find(([key]) =>
        key.includes("active_session_"),
      );
      const session = entry ? JSON.parse(entry[1]) : null;
      return session?.questions?.[session.currentIndex] || null;
    });
    expect(question).not.toBeNull();
    const domain = String(question.domain || "");
    const seen = seenByDomain.get(domain) || 0;
    seenByDomain.set(domain, seen + 1);
    const shouldBeCorrect = domain.includes("fundamentals-ai-ml")
      ? seen < 3
      : domain.includes("guidelines-responsible-ai")
        ? seen < 2
        : true;
    const correctIndex = Number(question.correct);
    const answerIndex = shouldBeCorrect
      ? correctIndex
      : (correctIndex + 1) % question.options.length;
    await page.locator(`#option-${answerIndex}`).click();
    if (index < 11) {
      await expect(page.locator("#btn-next")).toBeEnabled();
      await expect(page.locator("#btn-finish")).toBeHidden();
      await page.locator("#btn-next").click();
    } else {
      await expect(page.locator("#btn-next")).toBeHidden();
      await expect(page.locator("#btn-finish")).toBeVisible();
      await expect(page.locator("#btn-finish")).toBeEnabled();
      await page.locator("#btn-finish").click();
    }
  }

  await expect(page.locator("#screen-results")).toBeVisible();
  await expect(page.locator("#screen-results")).toContainText("50%");
  await expect(page.locator("#screen-results")).toContainText("75%");
  await expect(page.locator("#screen-results")).toContainText("100%");
  await expect(page.locator("#screen-results")).not.toContainText(
    "Ainda não há dados suficientes",
  );
  await expect(page.locator("#screen-results")).toContainText(
    "Guidelines for Responsible AI".replace(
      "Guidelines for Responsible AI",
      "Diretrizes para IA Responsável",
    ),
  );

  await page.getByRole("button", { name: /Ver minha Jornada/i }).click();
  await expect(page).toHaveURL(/jornada\.html\?cert=aif-c01/);
  await expect(page.locator("#jornada-cert-title")).toContainText(/AIF-C01/i);
  guard.assertClean();
});
