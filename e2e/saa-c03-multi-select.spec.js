import fs from "node:fs";
import { expect, test } from "@playwright/test";
import { installConsoleGuard, openAuthenticated } from "./helpers/app.js";

const MULTI_SELECT_ITEMS = [4, 6, 27, 31, 32];

const multiSelectQuestions = () =>
  JSON.parse(fs.readFileSync("data/questions/saa-c03.json", "utf8")).filter(
    (question) => MULTI_SELECT_ITEMS.includes(question.source?.item),
  );

async function readActiveSession(page) {
  return page.evaluate(() => {
    const entry = Object.entries(localStorage).find(([key]) =>
      key.includes("active_session_"),
    );
    return entry ? JSON.parse(entry[1]) : null;
  });
}

async function currentQuestion(page) {
  const session = await readActiveSession(page);
  expect(session).not.toBeNull();
  return session.questions[session.currentIndex];
}

test("SAA-C03 multi-select: so pontua com o conjunto exato e registra o erro", async ({
  page,
}) => {
  const guard = installConsoleGuard(page);
  const questions = multiSelectQuestions();
  expect(questions).toHaveLength(MULTI_SELECT_ITEMS.length);

  // O simulador SAA-C03 recebe apenas as 5 questoes de multipla selecao.
  await page.route("**/data/questions/saa-c03.json", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(questions),
    }),
  );

  await openAuthenticated(page, "simulados.html", {
    certification: "saa-c03",
  });
  await expect(page.locator("#certification-select")).toHaveValue("saa-c03");
  await page
    .locator('label:has(input[name="question-quantity"][value="5"])')
    .click();
  await page.locator("#btn-start-quiz").click();
  await expect(page.locator("#screen-quiz")).toBeVisible();
  await expect(page.locator("#total-q-num")).toHaveText("5");

  // Questao 1: uma correta a menos + uma errada => nao conta
  const first = await currentQuestion(page);
  const correct = first.correct;
  expect(Array.isArray(correct)).toBe(true);
  const wrongIndex = first.options.findIndex(
    (_, index) => !correct.includes(index),
  );

  // Selecao incompleta nao envia a resposta
  await page.locator(`#option-${correct[0]}`).click();
  await expect(page.locator("#explanation-box")).toBeHidden();

  if (correct.length > 2) {
    await page.locator(`#option-${correct[1]}`).click();
    await expect(page.locator("#explanation-box")).toBeHidden();
  }
  await page.locator(`#option-${wrongIndex}`).click();
  await expect(page.locator("#explanation-box")).toBeVisible();
  await expect(page.locator("#explanation-box h4")).toContainText("Incorreto");

  const afterFirst = await readActiveSession(page);
  expect(afterFirst.answers).toHaveLength(1);
  expect(afterFirst.score).toBe(0);

  // Recarregar a pagina preserva a resposta registrada
  await page.reload();
  await page.waitForLoadState("domcontentloaded");
  await expect(page.locator("#btn-start-quiz")).toContainText("Retomar");
  await page.locator("#btn-start-quiz").click();
  await page.locator("#modal-btn-confirm").click();
  await expect(page.locator("#screen-quiz")).toBeVisible();
  await expect(page.locator("#explanation-box h4")).toContainText("Incorreto");
  expect((await readActiveSession(page)).answers).toHaveLength(1);

  // Questoes 2 a 5: conjunto exato => correto
  await page.locator("#btn-next").click();
  for (let number = 2; number <= 5; number++) {
    await expect(page.locator("#current-q-num")).toHaveText(String(number));
    const question = await currentQuestion(page);
    for (const index of question.correct) {
      await page.locator(`#option-${index}`).click();
    }
    await expect(page.locator("#explanation-box h4")).toContainText("Correto");
    if (number < 5) await page.locator("#btn-next").click();
  }

  await expect(page.locator("#btn-finish")).toBeEnabled();
  await page.locator("#btn-finish").click();
  await expect(page.locator("#screen-results")).toBeVisible();

  const stored = await page.evaluate(() => {
    const read = (suffix) => {
      const entry = Object.entries(localStorage).find(([key]) =>
        key.endsWith(suffix),
      );
      return entry ? JSON.parse(entry[1]) : null;
    };
    return { history: read(":history"), mistakes: read(":mistakes") };
  });

  expect(stored.history).toHaveLength(1);
  expect(stored.history[0].score).toBe(4);
  const sessionMistakes = Object.values(stored.mistakes["saa-c03"] || {});
  expect(sessionMistakes).toHaveLength(1);
  expect(sessionMistakes[0].resolved).toBe(false);
  expect(Array.isArray(sessionMistakes[0].selectedAnswer)).toBe(true);
  expect(sessionMistakes[0].selectedAnswer).toHaveLength(correct.length);
  expect(stored.mistakes["clf-c02"]).toBeUndefined();

  // Revisao de erros: o banco passa a conter somente a questao errada, entao
  // acertar nela deve marcar o erro como resolvido (storageManager.resolveMistake).
  const missedId = sessionMistakes[0].questionId;
  const missed = questions.find((question) => question.questionId === missedId);
  expect(missed).toBeDefined();
  await page.unroute("**/data/questions/saa-c03.json");
  await page.route("**/data/questions/saa-c03.json", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([missed]),
    }),
  );
  await page.goto("simulados.html");
  await page.waitForLoadState("domcontentloaded");
  await page.locator("#cloud-sidebar-toggle").waitFor({ state: "attached" });
  await expect(page.locator("#btn-practice-mistakes")).toBeVisible();
  await page.locator("#btn-practice-mistakes").click();
  await expect(page.locator("#screen-quiz")).toBeVisible();
  // A revisao nao persiste sessao ativa: identifica a questao pelas alternativas exibidas.
  const shown = await page
    .locator("#options-container .a3-option-text")
    .allInnerTexts();
  const reviewed = questions.find((question) =>
    question.options.every((option) => shown.some((text) => text.includes(option))),
  );
  expect(reviewed).toBeDefined();
  const correctTexts = reviewed.correct.map((index) => reviewed.options[index]);
  const toClick = shown
    .map((text, index) => (correctTexts.some((c) => text.includes(c)) ? index : -1))
    .filter((index) => index >= 0);
  expect(toClick).toHaveLength(reviewed.correct.length);
  for (const index of toClick) {
    await page.locator(`#option-${index}`).click();
  }
  await expect(page.locator("#explanation-box h4")).toContainText("Correto");

  await expect
    .poll(() =>
      page.evaluate(() => {
        const entry = Object.entries(localStorage).find(([key]) =>
          key.endsWith(":mistakes"),
        );
        const store = entry ? JSON.parse(entry[1]) : {};
        return Object.values(store["saa-c03"] || {}).map(
          (mistake) => mistake.resolved,
        );
      }),
    )
    .toEqual([true]);

  guard.assertClean();
});
