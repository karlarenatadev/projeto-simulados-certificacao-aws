import { expect, test } from "@playwright/test";
import { installConsoleGuard, openAuthenticated } from "./helpers/app.js";

test("PWA registers under the current path and keeps Exam Tips usable offline", async ({
  page,
  context,
}) => {
  const guard = installConsoleGuard(page);
  await openAuthenticated(page, "dicas-prova.html", { language: "pt" });

  await expect(
    page.locator("#exam-tips-grid .exam-tip-card").first(),
  ).toBeVisible();
  await page.evaluate(() => navigator.serviceWorker.ready);

  const pwaState = await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    const manifestResponse = await fetch("./manifest.json");
    const manifest = await manifestResponse.json();
    return {
      scope: registration.scope,
      manifestStart: manifest.start_url,
      manifestScope: manifest.scope,
      controller: Boolean(navigator.serviceWorker.controller),
    };
  });

  expect(pwaState.scope).toMatch(/\/$/);
  expect(pwaState.manifestStart).toBe("./index.html");
  expect(pwaState.manifestScope).toBe("./");

  // The first visit installs the worker. Reload once online so module imports
  // are controlled and cached before the offline assertion.
  await page.reload();
  await expect(
    page.locator("#exam-tips-grid .exam-tip-card").first(),
  ).toBeVisible();
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.locator("#exam-tips-grid .exam-tip-card").first(),
  ).toBeVisible();
  await expect(page.locator("#exam-tips-count")).toHaveText(/dicas/);
  await context.setOffline(false);
  guard.assertClean();
});
