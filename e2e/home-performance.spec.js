import { expect, test } from "@playwright/test";
import { installConsoleGuard, openAuthenticated } from "./helpers/app.js";

async function answerCurrentQuestion(page) {
  await expect
    .poll(() =>
      page.evaluate(() => {
        const currentNumber = Number(
          document.getElementById("current-q-num")?.textContent,
        );
        const entry = Object.entries(localStorage).find(([key]) =>
          key.includes("active_session_"),
        );
        const session = entry ? JSON.parse(entry[1]) : null;
        return (
          currentNumber > 0 &&
          session?.currentIndex === currentNumber - 1 &&
          Boolean(session.questions?.[session.currentIndex])
        );
      }),
    )
    .toBe(true);
  const question = await page.evaluate(() => {
    const entry = Object.entries(localStorage).find(([key]) =>
      key.includes("active_session_"),
    );
    const session = entry ? JSON.parse(entry[1]) : null;
    return session?.questions?.[session.currentIndex] || null;
  });
  expect(question).not.toBeNull();

  const selections = Array.isArray(question.correct)
    ? question.correct
    : [question.correct];
  for (const index of selections) {
    await page.locator(`#option-${index}`).click();
  }
}

test("home sem histórico sai de loading com recomendação inicial", async ({
  page,
}) => {
  const guard = installConsoleGuard(page);
  await openAuthenticated(page, "index.html");

  await expect(page.locator("#sidebar-pct-text")).toHaveText("0%");
  await expect(page.locator("#sidebar-cert-status")).toHaveText("Não iniciada");
  await expect(page.locator("#study-now-compact")).toHaveAttribute(
    "data-state",
    "ready",
  );
  await expect(page.locator("#study-now-compact")).toBeVisible();
  await expect(page.locator("#study-now-compact")).toContainText(
    "Faça seu primeiro simulado",
  );
  await expect(page.locator("#study-now-compact a")).toHaveAttribute(
    "href",
    /simulados\.html\?cert=clf-c02$/,
  );
  guard.assertClean();
});

test("home atualiza timeline, readiness e recomendação após um simulado", async ({
  page,
}) => {
  test.setTimeout(60_000);
  const guard = installConsoleGuard(page);
  await openAuthenticated(page, "simulados.html");
  await page
    .locator('label:has(input[name="question-quantity"][value="5"])')
    .click();
  await page.locator("#btn-start-quiz").click();

  for (let questionNumber = 1; questionNumber <= 5; questionNumber += 1) {
    await expect(page.locator("#current-q-num")).toHaveText(
      String(questionNumber),
    );
    await answerCurrentQuestion(page);
    if (questionNumber < 5) {
      await page.locator("#btn-next").click();
    }
  }
  await page.locator("#btn-finish").click();
  await expect(page.locator("#screen-results")).toBeVisible();

  await page.goto("index.html");
  await expect(page.locator("#sidebar-cert-status")).not.toHaveText(
    "Não iniciada",
  );
  await expect(page.locator("#study-now-compact")).toHaveAttribute(
    "data-state",
    "ready",
  );
  await expect(page.locator("#study-now-compact")).not.toContainText(
    "Carregando",
  );
  await expect
    .poll(() =>
      page.evaluate(
        () => window.performanceLineChartInstance?.data?.datasets?.[0]?.data,
      ),
    )
    .toHaveLength(1);

  await page.evaluate(() => {
    const session = JSON.parse(localStorage.getItem("cloudacademy_session"));
    const historyKey = `aws_sim_user:${encodeURIComponent(session.user.id)}:history`;
    localStorage.setItem(
      historyKey,
      JSON.stringify([
        { certId: "saa-c03", percentage: 99, date: "2026-09-04T12:00:00Z" },
        { certId: "clf-c02", percentage: 80, date: "2026-09-03T12:00:00Z" },
        { certId: "clf-c02", percentage: 70, date: "2026-09-02T12:00:00Z" },
        { certId: "clf-c02", percentage: 50, date: "2026-09-01T12:00:00Z" },
      ]),
    );
  });
  await page.reload();

  await expect
    .poll(() =>
      page.evaluate(
        () => window.performanceLineChartInstance?.data?.datasets?.[0]?.data,
      ),
    )
    .toEqual([50, 70, 80]);
  expect(
    await page.evaluate(() => {
      const session = JSON.parse(localStorage.getItem("cloudacademy_session"));
      const historyKey = `aws_sim_user:${encodeURIComponent(session.user.id)}:history`;
      return JSON.parse(localStorage.getItem(historyKey)).map(
        (attempt) => attempt.percentage,
      );
    }),
  ).toEqual([99, 80, 70, 50]);

  guard.assertClean();
});
