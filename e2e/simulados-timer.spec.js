import { expect, test } from "@playwright/test";
import { installConsoleGuard, openAuthenticated } from "./helpers/app.js";

function timerSeconds(value) {
  const parts = value.split(":").map(Number);
  return parts.length === 3
    ? parts[0] * 3600 + parts[1] * 60 + parts[2]
    : parts[0] * 60 + parts[1];
}

async function getActiveSession(page) {
  return page.evaluate(() => {
    const entry = Object.entries(localStorage).find(([key]) =>
      key.includes("active_session_"),
    );
    return entry ? JSON.parse(entry[1]) : null;
  });
}

async function answerCurrentQuestion(page, shouldBeCorrect) {
  const question = await page.evaluate(() => {
    const entry = Object.entries(localStorage).find(([key]) =>
      key.includes("active_session_"),
    );
    const session = entry ? JSON.parse(entry[1]) : null;
    return session?.questions?.[session.currentIndex] || null;
  });
  expect(question).not.toBeNull();

  const correct = Array.isArray(question.correct)
    ? question.correct
    : [question.correct];
  let selections = [...correct];

  if (!shouldBeCorrect) {
    const wrongIndex = question.options.findIndex(
      (_, index) => !correct.includes(index),
    );
    expect(wrongIndex).toBeGreaterThanOrEqual(0);
    selections = [wrongIndex, ...correct.slice(1)];
  }

  for (const index of selections) {
    await page.locator(`#option-${index}`).click();
  }
}

test("simulator validates on selection, restores answers, and finishes once", async ({
  page,
}) => {
  const guard = installConsoleGuard(page);
  await openAuthenticated(page, "simulados.html");
  await page.locator("#sidebar-btn-pomodoro").click();
  await expect(page.locator("#pomodoro-widget")).toBeVisible();
  await page.locator('[data-i18n-aria-label="pomodoro_close"]').click();
  await page
    .locator('label:has(input[name="question-quantity"][value="5"])')
    .click();
  await page.locator("#btn-start-quiz").click();

  await expect(page.locator("#screen-quiz")).toBeVisible();
  await expect(page.locator("#timer-container")).toBeVisible();
  await expect(page.locator("#quiz-timer")).not.toHaveText("00:00");
  await expect(page.locator("#question-category")).not.toHaveText("Categoria");
  await expect(page.locator("#question-difficulty")).toBeVisible();
  await expect(page.locator("#total-q-num")).toHaveText("5");

  await expect(page.locator("#btn-cancel")).toHaveCount(0);
  await expect(page.locator("#btn-prev")).toHaveCount(0);
  await expect(page.locator("#btn-submit")).toHaveCount(0);
  await expect(page.locator("#btn-next")).toBeVisible();
  await expect(page.locator("#btn-next")).toBeDisabled();
  await expect(page.locator("#btn-finish")).toBeHidden();

  const initialTimer = timerSeconds(
    await page.locator("#quiz-timer").textContent(),
  );
  await expect
    .poll(
      async () => timerSeconds(await page.locator("#quiz-timer").textContent()),
      { timeout: 4_000, intervals: [200, 500, 1000] },
    )
    .toBeLessThan(initialTimer);

  const desktopLayout = await page
    .locator(".quiz-question-meta")
    .evaluate((meta) => {
      const info = meta
        .querySelector(".quiz-question-meta-info")
        .getBoundingClientRect();
      const actions = meta
        .querySelector(".quiz-question-meta-actions")
        .getBoundingClientRect();
      return {
        height: meta.getBoundingClientRect().height,
        sameRow: Math.abs(info.top - actions.top) < 4,
      };
    });
  expect(desktopLayout.height).toBeLessThan(60);
  expect(desktopLayout.sameRow).toBe(true);

  await answerCurrentQuestion(page, false);
  await expect(page.locator("#explanation-box")).toBeVisible();
  await expect(page.locator("#explanation-box h4")).toContainText("Incorreto");
  await expect(page.locator("#options-container .a3-option-wrong")).toHaveCount(
    1,
  );
  await expect(page.locator("#btn-next")).toBeEnabled();

  const firstSavedSession = await getActiveSession(page);
  expect(firstSavedSession.answers).toHaveLength(1);
  expect(firstSavedSession.score).toBe(0);

  await page.reload();
  await page.waitForLoadState("domcontentloaded");
  await expect(page.locator("#sidebar-btn-quiz")).toHaveClass(/is-active/);
  await expect(page.locator("#btn-start-quiz")).toContainText("Retomar");
  await page.locator("#btn-start-quiz").click();
  await page.locator("#modal-btn-confirm").click();
  await expect(page.locator("#screen-quiz")).toBeVisible();
  await expect(page.locator("#current-q-num")).toHaveText("1");
  await expect(page.locator("#explanation-box h4")).toContainText("Incorreto");
  await expect(page.locator("#btn-next")).toBeEnabled();
  expect((await getActiveSession(page)).answers).toHaveLength(1);

  await page.locator("#btn-next").evaluate((button) => {
    button.click();
    button.click();
  });
  await expect(page.locator("#current-q-num")).toHaveText("2");
  expect((await getActiveSession(page)).answers).toHaveLength(1);

  await answerCurrentQuestion(page, true);
  await expect(page.locator("#explanation-box h4")).toContainText("Correto");
  await expect(
    page.locator("#options-container .a3-option-correct"),
  ).not.toHaveCount(0);
  await page.locator("#btn-next").click();

  for (const questionNumber of [3, 4]) {
    await expect(page.locator("#current-q-num")).toHaveText(
      String(questionNumber),
    );
    await answerCurrentQuestion(page, true);
    await page.locator("#btn-next").click();
  }

  await expect(page.locator("#current-q-num")).toHaveText("5");
  await expect(page.locator("#btn-next")).toBeHidden();
  await expect(page.locator("#btn-finish")).toBeVisible();
  await expect(page.locator("#btn-finish")).toBeDisabled();

  await answerCurrentQuestion(page, true);
  await expect(page.locator("#btn-finish")).toBeEnabled();
  await page.locator("#btn-finish").evaluate((button) => {
    button.click();
    button.click();
  });
  await expect(page.locator("#screen-results")).toBeVisible();

  const history = await page.evaluate(() => {
    const entry = Object.entries(localStorage).find(([key]) =>
      key.endsWith(":history"),
    );
    return entry ? JSON.parse(entry[1]) : [];
  });
  expect(history).toHaveLength(1);

  await page.setViewportSize({ width: 390, height: 844 });
  const mobileLayout = await page.evaluate(() => {
    const element = document.querySelector(".quiz-question-meta");
    return {
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
      height: element.getBoundingClientRect().height,
    };
  });
  expect(mobileLayout.scrollWidth).toBeLessThanOrEqual(
    mobileLayout.clientWidth,
  );
  expect(mobileLayout.height).toBeLessThanOrEqual(130);

  guard.assertClean();
});
