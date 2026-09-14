import { jest } from "@jest/globals";
import { QuizEngine } from "../src/frontend/js/quizEngine.js";

describe("QuizEngine - contratos online e offline", () => {
  const domains = [{ id: "cloud", name: "Cloud Concepts" }];

  test("carrega questao publica online sem answer key e preserva a fonte autoritativa", async () => {
    const engine = new QuizEngine();
    const publicQuestion = {
      id: "api-question",
      certification: "clf-c02",
      language: "pt",
      domain: "cloud",
      difficulty: "easy",
      question_text: "Qual servico fornece computacao sob demanda?",
      options: [
        { id: "A", text: "EC2" },
        { id: "B", text: "S3" },
      ],
      selection_count: 1,
    };

    const result = await engine.loadQuestions(
      "clf-c02",
      domains,
      { quantity: 1, difficulty: "all", topic: "", mode: "exam" },
      "pt",
      [publicQuestion],
    );

    expect(result.success).toBe(true);
    expect(engine.state.source).toBe("online");
    expect(engine.state.authoritative).toBe(true);
    expect(engine.state.questions[0].correct).toBeUndefined();
    expect(engine.state.questions[0].explanation).toBe("");
    expect(JSON.stringify(engine.state.questions[0])).not.toMatch(
      /answerKey|correct_answer/,
    );
  });

  test("carrega e corrige questao local com answer key sem depender da API", async () => {
    const engine = new QuizEngine();
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            id: "local-question",
            certification: "clf-c02",
            language: "pt",
            domain: "cloud",
            difficulty: "easy",
            question: "Qual servico fornece armazenamento?",
            options: ["EC2", "S3"],
            correct: 1,
            explanation: "S3 e armazenamento de objetos.",
            validation: { status: "validated" },
          },
        ],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          "clf-c02": { allowedDomains: ["Cloud Concepts", "cloud"] },
        }),
      });

    const result = await engine.loadQuestions(
      "clf-c02",
      domains,
      { quantity: 1, difficulty: "all", topic: "", mode: "exam" },
      "pt",
    );

    expect(result.success).toBe(true);
    expect(engine.state.source).toBe("local");
    const correctIndex = engine.state.questions[0].options.indexOf("S3");
    expect(engine.submitAnswer(correctIndex).isCorrect).toBe(true);
  });

  test("nao substitui conjunto online invalido por um novo dataset local", async () => {
    const engine = new QuizEngine();
    global.fetch = jest.fn();

    const result = await engine.loadQuestions(
      "clf-c02",
      domains,
      { quantity: 1, difficulty: "all", topic: "", mode: "exam" },
      "pt",
      [
        {
          id: "incomplete-api-question",
          certification: "clf-c02",
          language: "pt",
          question_text: "Sem opcoes publicas",
          options: [],
        },
      ],
    );

    expect(result.success).toBe(false);
    expect(result.message).toBe("Invalid question set returned by the API.");
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
