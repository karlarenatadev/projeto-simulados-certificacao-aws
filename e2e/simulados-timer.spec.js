import { expect, test } from "@playwright/test";
import { installConsoleGuard, openAuthenticated } from "./helpers/app.js";

function timerSeconds(value) {
  const parts = value.split(":").map(Number);
  return parts.length === 3
    ? parts[0] * 3600 + parts[1] * 60 + parts[2]
    : parts[0] * 60 + parts[1];
}

test("simulator timer, flag, progress, and responsive metadata remain functional", async ({ page }) => {
  const guard = installConsoleGuard(page);
  await openAuthenticated(page, "simulados.html");
  await page.locator('label:has(input[name="question-quantity"][value="5"])').click();
  await page.locator("#btn-start-quiz").click();

  await expect(page.locator("#screen-quiz")).toBeVisible();
  await expect(page.locator("#timer-container")).toBeVisible();
  await expect(page.locator("#quiz-timer")).not.toHaveText("00:00");
  await expect(page.locator("#question-category")).not.toHaveText("Categoria");
  await expect(page.locator("#question-difficulty")).toBeVisible();
  await expect(page.locator("#total-q-num")).toHaveText("5");

  const initialTimer = timerSeconds(await page.locator("#quiz-timer").textContent());
  await expect.poll(async () => timerSeconds(await page.locator("#quiz-timer").textContent()), {
    timeout: 4_000,
    intervals: [200, 500, 1000],
  }).toBeLessThan(initialTimer);

  await page.locator("#btn-flag").click();
  await expect(page.locator("#btn-flag")).toHaveAttribute("aria-pressed", "true");

  const desktopLayout = await page.locator(".quiz-question-meta").evaluate((meta) => {
    const info = meta.querySelector(".quiz-question-meta-info").getBoundingClientRect();
    const actions = meta.querySelector(".quiz-question-meta-actions").getBoundingClientRect();
    return { height: meta.getBoundingClientRect().height, sameRow: Math.abs(info.top - actions.top) < 4 };
  });
  expect(desktopLayout.height).toBeLessThan(60);
  expect(desktopLayout.sameRow).toBe(true);

  await page.locator("#options-container .a3-option").first().click();
  await page.locator("#btn-submit").click();
  await page.locator("#btn-next").click();
  await expect(page.locator("#current-q-num")).toHaveText("2");
  await expect(page.locator("#btn-flag")).toHaveAttribute("aria-pressed", "false");

  const afterNavigationTimer = timerSeconds(await page.locator("#quiz-timer").textContent());
  expect(afterNavigationTimer).toBeLessThanOrEqual(initialTimer);

  await page.locator("#btn-prev").click();
  await expect(page.locator("#current-q-num")).toHaveText("1");
  await expect(page.locator("#btn-flag")).toHaveAttribute("aria-pressed", "true");

  const persistedSession = await page.evaluate(() => {
    const entry = Object.entries(localStorage).find(([key]) => key.includes("active_session_"));
    return entry ? JSON.parse(entry[1]) : null;
  });
  expect(persistedSession).not.toBeNull();
  expect(persistedSession.reviewQuestionIds).toHaveLength(1);
  expect(persistedSession.timeRemaining).toBeGreaterThan(0);

  await page.reload();
  const persistedAfterReload = await page.evaluate(() =>
    Object.entries(localStorage).some(([key, value]) => {
      if (!key.includes("active_session_")) return false;
      const session = JSON.parse(value);
      return session.reviewQuestionIds?.length === 1 && session.timeRemaining > 0;
    }),
  );
  expect(persistedAfterReload).toBe(true);

  await page.setViewportSize({ width: 390, height: 844 });
  const mobileLayout = await page.evaluate(() => ({
    meta: (() => {
      const element = document.querySelector(".quiz-question-meta");
      return {
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth,
        height: element.getBoundingClientRect().height,
      };
    })(),
  }));
  expect(mobileLayout.meta.scrollWidth).toBeLessThanOrEqual(mobileLayout.meta.clientWidth);
  expect(mobileLayout.meta.height).toBeLessThanOrEqual(130);

  guard.assertClean();
});
