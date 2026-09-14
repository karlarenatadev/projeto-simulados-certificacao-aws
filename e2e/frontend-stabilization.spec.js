import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { installConsoleGuard, openAuthenticated } from "./helpers/app.js";

async function seedMistakes(page, count = 1) {
  await page.evaluate(async (total) => {
    const { storageManager } = await import("./js/storageManager.js");
    const questions = await fetch("./data/questions/clf-c02.json").then(
      (response) => response.json(),
    );
    for (let index = 0; index < total; index += 1) {
      const question = questions[index];
      const wrong = Array.isArray(question.correct)
        ? []
        : (question.correct + 1) % question.options.length;
      storageManager.recordMistake(question, wrong, { certId: "clf-c02" });
    }
  }, count);
}

for (const [certificationId, stageId] of [
  ["clf-c02", "clf-1"],
  ["saa-c03", "saa-1"],
]) {
  test(`Jornada opens the first ${certificationId} stage while the second stays locked`, async ({
    page,
  }) => {
    const guard = installConsoleGuard(page);
    const dialogs = [];
    page.on("dialog", async (dialog) => {
      dialogs.push(dialog.message());
      await dialog.dismiss();
    });
    await openAuthenticated(page, "index.html", {
      certification: certificationId,
    });
    await page.locator("#sidebar-btn-journey").click();
    await expect(page).toHaveURL(/jornada\.html$/);
    const nodes = page.locator("#gamificacao-trail .trail-node");
    await expect(nodes).toHaveCount(5);
    await expect(nodes.nth(0)).toHaveClass(/active/);
    await expect(nodes.nth(1)).toHaveClass(/locked/);
    await nodes.nth(0).click();
    await expect(page).toHaveURL(/simulados\.html\?mode=mission/);
    await expect(page).toHaveURL(
      new RegExp(`stageId=${stageId}.*cert=${certificationId}`),
    );
    await expect(page.locator("#screen-quiz")).toBeVisible();
    await expect(page.locator("#question-text")).not.toBeEmpty();
    expect(dialogs.join(" ")).not.toMatch(/bloqueado|locked/i);
    guard.assertClean();
  });
}

test("Erros sidebar opens a clear empty state without a quiz or TypeError", async ({
  page,
}) => {
  const guard = installConsoleGuard(page);
  await openAuthenticated(page, "index.html");
  await expect(page.locator("#sidebar-btn-mistakes")).toBeVisible();
  await page.locator("#sidebar-btn-mistakes").click();
  await expect(page).toHaveURL(/simulados\.html\?mode=mistakes$/);
  await expect(page.locator("#mistakes-feature-notice")).toBeVisible();
  await expect(page.locator("#mistakes-feature-notice")).toContainText(
    "Nenhum erro pendente",
  );
  await expect(page.locator("#screen-quiz")).toBeHidden();
  await page.reload();
  await expect(page.locator("#mistakes-feature-notice")).toBeVisible();
  guard.assertClean();
});

test("Erros sidebar opens saved questions without a legacy DOM container", async ({
  page,
}) => {
  const guard = installConsoleGuard(page);
  await openAuthenticated(page, "index.html");
  await seedMistakes(page, 2);
  await page.reload();
  await page.locator("#sidebar-btn-mistakes").click();
  await expect(page).toHaveURL(/simulados\.html\?mode=mistakes$/);
  await expect(page.locator("#screen-quiz")).toBeVisible();
  await expect(page.locator("#question-text")).not.toBeEmpty();
  await expect(page.locator("#mistakes-feature-notice")).toBeHidden();
  await page.reload();
  await expect(page.locator("#screen-quiz")).toBeVisible();
  guard.assertClean();
});

test("legacy review card has clean text and readable type on desktop and mobile", async ({
  page,
}) => {
  const guard = installConsoleGuard(page);
  await openAuthenticated(page, "flashcards.html");
  await page.evaluate(async () => {
    const { StorageManager } = await import("./js/storageManager.js");
    const key = new StorageManager()._getKey("clf-c02_review_deck");
    const question =
      "Uma empresa precisa escolher serviços AWS. ".repeat(10) + "(Escolha 2)";
    localStorage.setItem(
      key,
      JSON.stringify([
        {
          questionId: "legacy-card",
          certId: "clf-c02",
          domain: "Cloud Concepts",
          question: `<span class="text-base font-normal leading-relaxed block">${question}</span>`,
          options: ["EC2", "S3"],
          correct: 0,
          explanation: "Primeira linha.\nSegunda linha.",
        },
      ]),
    );
  });
  await page.reload();
  await page.locator("#flashcard-category").selectOption("review-deck");
  await expect(page.locator("#flashcard-term")).toContainText("(Escolha 2)");
  await expect(page.locator("#flashcard-term")).not.toContainText("</span>");
  await expect(page.locator("#flashcard-term")).not.toContainText(
    'class="text-base',
  );
  await expect(page.locator("#flashcard-container")).toHaveClass(
    /is-review-deck/,
  );
  const desktopSize = await page
    .locator("#flashcard-term")
    .evaluate((element) => parseFloat(getComputedStyle(element).fontSize));
  expect(desktopSize).toBeLessThanOrEqual(21);
  const downloadPromise = page.waitForEvent("download");
  await page.locator(".fc-btn-export").click();
  const download = await downloadPromise;
  const ankiCsv = await readFile(await download.path(), "utf8");
  expect(ankiCsv).toContain("(Escolha 2)");
  expect(ankiCsv).not.toContain("</span>");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => window.innerWidth)).toBe(390);
  const mobileSize = await page
    .locator("#flashcard-term")
    .evaluate((element) => parseFloat(getComputedStyle(element).fontSize));
  expect(mobileSize).toBeLessThanOrEqual(20);
  guard.assertClean();
});

test("Dicas shares the canonical blue PWA theme color", async ({ page }) => {
  const guard = installConsoleGuard(page);
  await openAuthenticated(page, "index.html");
  const canonical = await page
    .locator('meta[name="theme-color"]')
    .getAttribute("content");
  await page.locator("#sidebar-btn-exam-tips").click();
  await expect(page).toHaveURL(/dicas-prova\.html$/);
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute(
    "content",
    canonical,
  );
  expect(canonical).toBe("#001863");
  guard.assertClean();
});
