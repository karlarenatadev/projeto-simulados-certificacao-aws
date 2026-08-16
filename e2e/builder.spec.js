import { expect, test } from "@playwright/test";
import { installConsoleGuard, seedOfflineSession } from "./helpers/app.js";

test("pilot anti-DDoS builder uses contextual palette and reaches full service score", async ({ page }) => {
  const guard = installConsoleGuard(page);
  await seedOfflineSession(page);
  await page.goto("case-view.html?slug=blog-estatico-ddos");
  await page.waitForLoadState("domcontentloaded");
  await expect(page.locator("#case-main-title")).toContainText("Blog");

  await page.locator("#tab-btn-builder").click();
  await expect(page.locator('#aws-service-palette [data-slug="amazon-s3"]')).toBeVisible();
  await expect(page.locator('#aws-service-palette [data-slug="amazon-cloudfront"]')).toBeVisible();
  await expect(page.locator("#aws-service-palette .palette-item")).toHaveCount(8);

  await page.locator('#aws-service-palette [data-slug="amazon-s3"]').click();
  await page.locator('#aws-service-palette [data-slug="amazon-cloudfront"]').click();
  await expect(page.locator("#drawflow .drawflow-node")).toHaveCount(2);

  await page.locator("#builder-btn-verify").click();
  await expect(page.locator("#builder-score-pct")).toHaveText("100%");
  await expect(page.locator("#builder-result-lists")).not.toContainText("Faltando");
  await expect(page.locator('#builder-result-lists img[src^="fa-"]')).toHaveCount(0);
  guard.assertClean();
});
