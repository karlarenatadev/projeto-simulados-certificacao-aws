import { expect, test } from "@playwright/test";
import { installConsoleGuard, seedOfflineSession } from "./helpers/app.js";

const representativeCases = [
  { certification: "CLF", slug: "iam-least-privilege" },
  { certification: "SAA", slug: "redshift-data-warehouse" },
  { certification: "DVA", slug: "ci-cd-pipeline" },
  { certification: "AIF", slug: "bedrock-chatbot" },
];

for (const { certification, slug } of representativeCases) {
  test(`${certification} migrated Case reaches 100% essential-service coverage`, async ({ page }) => {
    const guard = installConsoleGuard(page);
    await seedOfflineSession(page);
    await page.goto(`case-view.html?slug=${slug}`);
    await expect(page.locator("#case-main-title")).toBeVisible();
    await page.locator("#tab-btn-builder").click();

    const required = await page.evaluate(() => window._caseData.builder.required_services);
    for (const service of required) {
      await expect(page.locator(`#aws-service-palette [data-slug="${service}"]`)).toBeVisible();
      await page.locator(`#aws-service-palette [data-slug="${service}"]`).click();
    }

    await expect(page.locator("#drawflow .drawflow-node")).toHaveCount(required.length);
    await page.locator("#builder-btn-verify").click();
    await expect(page.locator("#builder-score-pct")).toHaveText("100%");
    await expect(page.locator("#builder-result-lists")).not.toContainText("Faltando");
    await expect(page.locator('#builder-result-lists img[src^="fa-"]')).toHaveCount(0);
    guard.assertClean();
  });
}
