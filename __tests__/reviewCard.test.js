import {
  createReviewDeckTerm,
  normalizeLegacyReviewQuestion,
} from "../src/frontend/js/utils/reviewCard.js";
import { StorageManager } from "../src/frontend/js/storageManager.js";

const storageManager = new StorageManager();

describe("review deck card model", () => {
  beforeEach(() => localStorage.clear());

  const question = {
    questionId: "review-1",
    question: "Qual serviço usar? (Escolha 2)\nCompare A < B e C > D.",
    options: ["EC2", "Lambda", "S3"],
    correct: [0, 1],
    explanation: "Use <strong>apenas como código</strong>.\nSegunda linha.",
    domain: "Cloud Concepts",
  };

  test("new cards keep structured text without presentation wrappers", () => {
    storageManager.addReviewQuestion("clf-c02", question);
    const saved = storageManager.getReviewDeck("clf-c02")[0];
    expect(saved.question).toBe(question.question);
    expect(saved.options).toEqual(question.options);
    expect(saved.correct).toEqual([0, 1]);
    expect(saved.explanation).toBe(question.explanation);
    expect(saved.question).not.toContain('class="text-base');
  });

  test("known legacy wrapper migrates lazily and leaves technical markup alone", () => {
    const key = storageManager._getKey("clf-c02_review_deck");
    localStorage.setItem(
      key,
      JSON.stringify([
        {
          ...question,
          question: `<span class="text-base font-normal leading-relaxed block">${question.question}</span>`,
        },
      ]),
    );
    expect(storageManager.getReviewDeck("clf-c02")[0].question).toBe(
      question.question,
    );
    expect(JSON.parse(localStorage.getItem(key))[0].question).toBe(
      question.question,
    );
    expect(normalizeLegacyReviewQuestion("A < B and <span>code</span>")).toBe(
      "A < B and <span>code</span>",
    );
    expect(normalizeLegacyReviewQuestion("<span>unrelated</span>")).toBe(
      "<span>unrelated</span>",
    );
  });

  test.each([
    ["pt", "Resposta:", "Explicação:"],
    ["en", "Answer:", "Explanation:"],
  ])(
    "%s view and Anki source contain readable plain text",
    (language, answer, explanation) => {
      const term = createReviewDeckTerm(question, language);
      expect(term.term).toContain("(Escolha 2)\nCompare A < B e C > D.");
      expect(term.definition).toContain(answer);
      expect(term.definition).toContain(explanation);
      expect(term.definition).toContain("EC2\n• Lambda");
      expect(term.definition).toContain("Segunda linha.");
      expect(term.definition).not.toContain("<br>");
      expect(term.definition).not.toContain("<strong>Resposta");
    },
  );

  test("long question is not truncated by model normalization", () => {
    const longQuestion =
      "Uma empresa precisa decidir entre serviços AWS. ".repeat(25);
    expect(
      createReviewDeckTerm({ ...question, question: longQuestion }).term,
    ).toBe(longQuestion);
  });
});
