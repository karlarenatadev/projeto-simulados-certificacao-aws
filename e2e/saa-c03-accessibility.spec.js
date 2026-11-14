import fs from "node:fs";
import { expect, test } from "@playwright/test";
import { installConsoleGuard, openAuthenticated } from "./helpers/app.js";

// Itens com alternativas longas, incluindo multipla selecao (itens 6 e 27).
const ITEMS = [6, 27, 2];

const questions = () =>
  JSON.parse(fs.readFileSync("data/questions/saa-c03.json", "utf8")).filter(
    (question) => ITEMS.includes(question.source?.item),
  );

async function startQuiz(page) {
  const body = JSON.stringify(questions());
  await page.route("**/data/questions/saa-c03.json", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body }),
  );
  await openAuthenticated(page, "simulados.html", {
    certification: "saa-c03",
  });
  await page
    .locator('label:has(input[name="question-quantity"][value="5"])')
    .click();
  await page.locator("#btn-start-quiz").click();
  await expect(page.locator("#screen-quiz")).toBeVisible();
  await expect(page.locator("#option-0")).toBeVisible();
}

async function currentQuestion(page) {
  const session = await page.evaluate(() => {
    const entry = Object.entries(localStorage).find(([key]) =>
      key.includes("active_session_"),
    );
    return entry ? JSON.parse(entry[1]) : null;
  });
  expect(session).not.toBeNull();
  return session.questions[session.currentIndex];
}

test("SAA-C03: simulado pode ser respondido somente pelo teclado", async ({
  page,
}) => {
  const guard = installConsoleGuard(page);
  await startQuiz(page);

  const question = await currentQuestion(page);
  const multi = Array.isArray(question.correct);
  const correct = multi ? question.correct : [question.correct];

  // Semantica exposta para tecnologias assistivas
  const group = page.locator("#options-container");
  await expect(group).toHaveAttribute("role", multi ? "group" : "radiogroup");
  const options = page.locator("#options-container .a3-option");
  await expect(options).toHaveCount(question.options.length);
  for (let index = 0; index < question.options.length; index++) {
    const option = page.locator(`#option-${index}`);
    await expect(option).toHaveAttribute("role", multi ? "checkbox" : "radio");
    await expect(option).toHaveAttribute("tabindex", "0");
    await expect(option).toHaveAttribute("aria-checked", "false");
  }

  // Tab percorre as alternativas em ordem
  await page.locator("#option-0").focus();
  await expect(page.locator("#option-0")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.locator("#option-1")).toBeFocused();
  await page.locator("#option-0").focus();

  // Seleciona as corretas usando Space/Enter
  for (const [position, index] of correct.entries()) {
    await page.locator(`#option-${index}`).focus();
    await page.keyboard.press(position % 2 === 0 ? "Space" : "Enter");
    if (position < correct.length - 1) {
      await expect(page.locator(`#option-${index}`)).toHaveAttribute(
        "aria-checked",
        "true",
      );
      await expect(page.locator("#explanation-box")).toBeHidden();
    }
  }

  await expect(page.locator("#explanation-box")).toBeVisible();
  await expect(page.locator("#explanation-box h4")).toContainText("Correto");
  // Foco visivel: o outline e aplicado ao elemento focado
  await page.locator("#option-0").focus();
  const outline = await page
    .locator("#option-0")
    .evaluate((el) => getComputedStyle(el).outlineStyle);
  expect(outline).not.toBe("none");

  guard.assertClean();
});

test("SAA-C03: layout mobile sem rolagem horizontal e com alvos de toque adequados", async ({
  page,
}) => {
  const guard = installConsoleGuard(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await startQuiz(page);

  const metrics = await page.evaluate(() => {
    const doc = document.documentElement;
    const cards = [
      ...document.querySelectorAll("#options-container .a3-option"),
    ];
    const offenders = [
      ...document.querySelectorAll("#screen-quiz, #screen-quiz *"),
    ]
      .filter((el) => el.getBoundingClientRect().right > doc.clientWidth + 1)
      .filter((el) => getComputedStyle(el).position !== "fixed")
      .slice(0, 6)
      .map(
        (el) =>
          `${el.tagName.toLowerCase()}#${el.id}.${String(el.className).slice(0, 40)}`,
      );
    return {
      offenders,
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
      cards: cards.map((card) => {
        const rect = card.getBoundingClientRect();
        return { left: rect.left, right: rect.right, height: rect.height };
      }),
    };
  });

  expect(metrics.cards.length).toBeGreaterThanOrEqual(4);
  expect(metrics.offenders, "elementos fora da largura").toEqual([]);
  // O cabecalho global (menu do usuario) estoura a largura em 390px; e tratado a parte.
  for (const card of metrics.cards) {
    expect(card.left).toBeGreaterThanOrEqual(0);
    expect(card.right).toBeLessThanOrEqual(metrics.clientWidth);
    expect(card.height).toBeGreaterThanOrEqual(44);
  }

  // Responder em viewport mobile exibe feedback legivel, sem estourar a largura
  const question = await currentQuestion(page);
  const correct = Array.isArray(question.correct)
    ? question.correct
    : [question.correct];
  for (const index of correct) {
    await page.locator(`#option-${index}`).click();
  }
  await expect(page.locator("#explanation-box")).toBeVisible();
  const after = await page.evaluate(() => {
    const quiz = document.getElementById("screen-quiz");
    return { scrollWidth: quiz.scrollWidth, clientWidth: quiz.clientWidth };
  });
  expect(after.scrollWidth).toBeLessThanOrEqual(after.clientWidth);

  guard.assertClean();
});
