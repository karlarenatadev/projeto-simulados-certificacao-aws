import { expect, test } from "@playwright/test";
import {
  installConsoleGuard,
  openAuthenticated,
  toggleLanguage,
} from "./helpers/app.js";

test("exam tips filters and language switch work on mobile-sized viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const guard = installConsoleGuard(page);
  await openAuthenticated(page, "dicas-prova.html", { language: "pt" });

  await expect(
    page.locator("#exam-tips-grid .exam-tip-card").first(),
  ).toBeVisible();
  await expect(page.locator("#exam-tips-count")).toHaveText("143 dicas");
  await page.locator("#exam-tips-certification").selectOption("SAA-C03");
  await expect(page.locator("#exam-tips-grid .exam-tip-card")).toHaveCount(38);
  await expect(page.locator("#exam-tips-domain option")).toContainText([
    "Design de Arquiteturas Resilientes",
  ]);
  await page.locator("#exam-tips-certification").selectOption("CLF-C02");
  await page.locator('.exam-tips-type-button[data-type="comparison"]').click();
  await expect(page.locator("#exam-tips-grid .exam-tip-card")).toHaveCount(13);
  await page.locator("#exam-tips-search").fill("CloudTrail");
  await expect(page.locator("#exam-tips-grid")).toContainText("CloudWatch");
  await page.locator("#exam-tips-clear").click();
  await page.locator("#exam-tips-search").fill("term-that-does-not-exist");
  await expect(page.locator("#exam-tips-feedback")).toBeVisible();
  await expect(page.locator("#exam-tips-grid .exam-tip-card")).toHaveCount(0);
  await page.locator("#exam-tips-clear").click();
  await page.locator("#theme-toggle").click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await expect(page.locator(".exam-tip-card").first()).toHaveCSS(
    "background-color",
    "rgb(16, 27, 74)",
  );
  await toggleLanguage(page);
  await expect(page.locator('h1[data-i18n="exam_tips_title"]')).toHaveText(
    "Exam Tips",
  );
  await expect(page.locator("#exam-tips-search")).toHaveAttribute(
    "placeholder",
    /Search service/,
  );
  guard.assertClean();
});
