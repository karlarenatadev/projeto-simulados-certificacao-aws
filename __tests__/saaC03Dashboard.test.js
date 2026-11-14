import fs from "node:fs";
import { QuizEngine } from "../src/frontend/js/quizEngine.js";
import {
  StorageManager,
  storageManager,
} from "../src/frontend/js/storageManager.js";
import { LearningAnalytics } from "../src/frontend/js/analytics/learningAnalytics.js";
import { getDomainDefinition } from "../src/frontend/js/domainTaxonomy.js";

const bank = JSON.parse(fs.readFileSync("data/questions/saa-c03.json", "utf8"));
const byItem = new Map(
  bank.filter((q) => q.source?.origin).map((q) => [q.source.item, q]),
);

const DOMAINS = {
  secure: "Design Secure Architectures",
  resilient: "Design Resilient Architectures",
  performance: "Design High-Performing Architectures",
  cost: "Design Cost-Optimized Architectures",
};

/** Executa um simulado controlado: [{ item, answer: "right" | "wrong" | "partial" }] */
function runAttempt(plan, attemptId) {
  const engine = new QuizEngine(70);
  engine.resetState();
  engine.state.attemptId = attemptId;
  engine.state.certId = "saa-c03";
  engine.state.mode = "exam";
  engine.state.questions = plan.map(({ item }) =>
    engine._shuffleOptions(engine._normalizeQuestion(byItem.get(item))),
  );
  Object.values(DOMAINS).forEach((domain) => {
    engine.state.domainScores[domain] = { total: 0, correct: 0 };
  });

  plan.forEach(({ answer }, index) => {
    engine.state.currentIndex = index;
    const q = engine.state.questions[index];
    const correct = Array.isArray(q.correct) ? q.correct : [q.correct];
    const wrong = q.options
      .map((_, i) => i)
      .filter((i) => !correct.includes(i));
    let selection;
    if (answer === "right")
      selection = Array.isArray(q.correct) ? correct : correct[0];
    else if (answer === "partial")
      selection = [correct[0], wrong[0]].slice(0, correct.length);
    else selection = Array.isArray(q.correct) ? [wrong[0]] : wrong[0];
    engine.submitAnswer(selection);
  });
  return engine.getFinalResults();
}

describe("SAA-C03: indicadores com dados controlados", () => {
  beforeEach(() => localStorage.clear());

  // Tentativa 1: 6 questoes -> 3 corretas (50%)
  //   Seguro 2/2, Resiliente 1/2, Alto Desempenho 0/2
  const attempt1 = [
    { item: 1, answer: "right" }, // Seguro
    { item: 2, answer: "right" }, // Seguro
    { item: 12, answer: "right" }, // Resiliente
    { item: 13, answer: "wrong" }, // Resiliente
    { item: 19, answer: "wrong" }, // Alto Desempenho
    { item: 20, answer: "wrong" }, // Alto Desempenho
  ];
  // Tentativa 2: 4 questoes -> 3 corretas (75%)
  //   Custos 2/2, Seguro 1/2 (multipla: a selecao parcial nao conta)
  const attempt2 = [
    { item: 26, answer: "right" }, // Custos
    { item: 28, answer: "right" }, // Custos
    { item: 4, answer: "right" }, // Seguro, multipla
    { item: 6, answer: "partial" }, // Seguro, multipla incompleta/errada
  ];

  test("resultado de cada simulado reflete acertos e erros por dominio", () => {
    const first = runAttempt(attempt1, "a1");
    expect(first.score).toBe(3);
    expect(first.total).toBe(6);
    expect(first.percentage).toBe(50);
    expect(first.domainScores[DOMAINS.secure]).toEqual({
      total: 2,
      correct: 2,
    });
    expect(first.domainScores[DOMAINS.resilient]).toEqual({
      total: 2,
      correct: 1,
    });
    expect(first.domainScores[DOMAINS.performance]).toEqual({
      total: 2,
      correct: 0,
    });
    expect(first.domainScores[DOMAINS.cost]).toEqual({ total: 0, correct: 0 });

    const second = runAttempt(attempt2, "a2");
    expect(second.percentage).toBe(75);
    expect(second.domainScores[DOMAINS.secure]).toEqual({
      total: 2,
      correct: 1,
    });
    expect(second.domainScores[DOMAINS.cost]).toEqual({ total: 2, correct: 2 });
  });

  test("perfil agrega apenas dados reais: media, dominios e simulados", async () => {
    expect(
      await storageManager.saveQuizResult(runAttempt(attempt1, "a1")),
    ).toBe(true);
    expect(
      await storageManager.saveQuizResult(runAttempt(attempt2, "a2")),
    ).toBe(true);

    const profile = new LearningAnalytics(storageManager).getLearningProfile(
      "saa-c03",
    );
    expect(profile.overview.examsTaken).toBe(2);
    expect(profile.overview.averageScore).toBe(63); // (50 + 75) / 2 = 62,5 -> 63

    const score = (domain) =>
      profile.domains.find(
        (d) => d.id === getDomainDefinition("saa-c03", domain)?.domainId,
      )?.score;
    // Agregado entre os dois simulados
    expect(score(DOMAINS.secure)).toBe(75); // 3 de 4
    expect(score(DOMAINS.resilient)).toBe(50); // 1 de 2
    expect(score(DOMAINS.performance)).toBe(0); // 0 de 2
    expect(score(DOMAINS.cost)).toBe(100); // 2 de 2
    expect(profile.domains).toHaveLength(4);
    // Ordenado do pior para o melhor
    expect(profile.domains.map((d) => d.score)).toEqual([0, 50, 75, 100]);
  });

  test("salvar o mesmo simulado duas vezes nao duplica o historico nem as estatisticas", async () => {
    const result = runAttempt(attempt1, "a1");
    expect(await storageManager.saveQuizResult(result)).toBe(true);
    expect(await storageManager.saveQuizResult({ ...result })).toBe(false);
    expect(storageManager.getHistory()).toHaveLength(1);

    const profile = new LearningAnalytics(storageManager).getLearningProfile(
      "saa-c03",
    );
    expect(profile.overview.examsTaken).toBe(1);
    expect(profile.overview.averageScore).toBe(50);
  });

  test("indicadores sobrevivem a um reload e nao contaminam outra certificacao", async () => {
    await storageManager.saveQuizResult(runAttempt(attempt1, "a1"));
    await storageManager.saveQuizResult(runAttempt(attempt2, "a2"));

    const reloaded = new StorageManager();
    const analytics = new LearningAnalytics(reloaded);
    expect(analytics.getLearningProfile("saa-c03").overview.examsTaken).toBe(2);

    const clf = analytics.getLearningProfile("clf-c02");
    expect(clf.overview.examsTaken).toBe(0);
    expect(clf.domains).toEqual([]);
  });

  test("estado vazio nao produz NaN nem dominios inventados", () => {
    const profile = new LearningAnalytics(storageManager).getLearningProfile(
      "saa-c03",
    );
    expect(profile.overview).toMatchObject({
      examsTaken: 0,
      averageScore: 0,
      readiness: 0,
    });
    expect(profile.domains).toEqual([]);
  });

  test("erros registrados e resolvidos alteram a contagem de pendentes", () => {
    const first = runAttempt(attempt1, "a1");
    const missed = first.answers.filter((a) => !a.isCorrect);
    expect(missed).toHaveLength(3);
    missed.forEach((q) =>
      storageManager.recordMistake(q, q.userSelection, { certId: "saa-c03" }),
    );
    expect(storageManager.getMistakes("saa-c03")).toHaveLength(3);

    storageManager.resolveMistake(missed[0], "saa-c03");
    expect(storageManager.getMistakes("saa-c03")).toHaveLength(2);
    expect(storageManager.getAllMistakes("saa-c03")).toHaveLength(3);
    expect(storageManager.getMistakes("clf-c02")).toHaveLength(0);
  });
});
