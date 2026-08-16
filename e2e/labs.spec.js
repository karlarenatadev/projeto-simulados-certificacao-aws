import { expect, test } from "@playwright/test";
import { installConsoleGuard, openAuthenticated } from "./helpers/app.js";

test("labs load the catalog from the relative asset path and support filters", async ({ page }) => {
  const guard = installConsoleGuard(page);
  let catalogResponse;
  page.on("response", (response) => {
    if (response.url().endsWith("/data/labs/labs.json")) catalogResponse = response;
  });
  await openAuthenticated(page, "laboratorios.html");
  await expect(page.locator("#labs-grid .case-card")).toHaveCount(4);
  await expect.poll(() => catalogResponse?.status()).toBe(200);
  expect(new URL(catalogResponse.url()).pathname).toBe("/data/labs/labs.json");

  const certification = page.locator("#filter-certification");
  for (const [value, count] of [["CLF-C02", 4], ["SAA-C03", 4], ["DVA-C02", 5], ["AIF-C01", 5]]) {
    await certification.selectOption(value);
    await expect(page.locator("#labs-grid .case-card")).toHaveCount(count);
  }
  await expect(page.locator("#filter-service option")).not.toHaveCount(1);
  await expect(page.locator("#filter-difficulty option")).toHaveCount(4);
  await expect(page.locator("#filter-domain option")).not.toHaveCount(1);
  await expect(page.locator("#labs-grid a[target='_blank']").first()).toHaveAttribute("href", /^https:\/\/(explore\.)?skillbuilder\.aws\//);
  guard.assertClean();
});

test("labs completion survives a reload in the same certification context", async ({ page }) => {
  const guard = installConsoleGuard(page);
  await openAuthenticated(page, "laboratorios.html");
  const completeButton = page.locator(".btn-mark-completed").first();
  await completeButton.click();
  await expect(page.locator("#labs-grid .case-card").first()).toContainText(/conclu|completed/i);
  await page.reload();
  await expect(page.locator("#labs-grid .case-card").first()).toContainText(/conclu|completed/i);
  guard.assertClean();
});
