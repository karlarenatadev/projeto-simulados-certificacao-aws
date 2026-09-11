import { expect, test } from "@playwright/test";
import { installConsoleGuard, openAuthenticated } from "./helpers/app.js";

async function expectHome(page) {
  await expect(page).toHaveURL(/\/index\.html$/);
  await expect(page.locator("#screen-hub")).toBeVisible();
}

async function returnToHome(page) {
  await page.locator("#sidebar-btn-hub").click();
  await expectHome(page);
}

test("Comece por aqui navigates to each canonical multipage destination", async ({
  page,
}) => {
  const guard = installConsoleGuard(page);
  await openAuthenticated(page, "index.html", { language: "pt" });
  await expectHome(page);
  await expect(page.locator("#hub-guide .lh-metrics-card")).toBeVisible();
  await expect(page.locator("#hub-guide [data-guide-feature]")).toHaveCount(12);

  await page.locator("#home-start-simulation").click();
  await expect(page).toHaveURL(/\/simulados\.html$/);
  await expect(page.locator("#sidebar-btn-quiz.is-active")).toBeAttached();

  await returnToHome(page);
  await page.locator("#home-start-journey").click();
  await expect(page).toHaveURL(/\/jornada\.html$/);
  await expect(page.locator("#sidebar-btn-journey.is-active")).toBeAttached();

  await returnToHome(page);
  await page.locator("#home-start-diagnostic").click();
  await expect(page).toHaveURL(/\/diagnostico\.html$/);
  await expect(
    page.locator("#sidebar-btn-diagnostic.is-active"),
  ).toBeAttached();

  const unexpectedErrors = guard
    .errors()
    .filter(
      (message) =>
        !/Failed to get leaderboard: TypeError: Failed to fetch/.test(message),
    );
  expect(unexpectedErrors, "unexpected fatal browser errors").toEqual([]);
});
