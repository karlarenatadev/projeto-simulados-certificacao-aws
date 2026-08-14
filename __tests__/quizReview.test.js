import {
  buildReviewSummary,
  getReviewIndexes,
  migrateLegacyReviewFlags,
  toggleReviewQuestion,
} from "../src/frontend/js/quizReview.js";

const questions = [{ id: "q1" }, { id: "q2" }, { id: "q3" }];

describe("Quiz review state", () => {
  test("toggle marca e desmarca uma questão por ID estável", () => {
    const marked = toggleReviewQuestion([], "q1");
    expect(marked).toEqual(["q1"]);
    expect(toggleReviewQuestion(marked, "q1")).toEqual([]);
  });

  test("navegação resolve as questões marcadas sem usar índices persistidos", () => {
    expect(getReviewIndexes(["q1", "q3"], questions)).toEqual([0, 2]);
    expect(getReviewIndexes(["q3"], questions)).toEqual([2]);
  });

  test("migra sessão legada baseada em índices", () => {
    expect(migrateLegacyReviewFlags([1], questions)).toEqual(["q2"]);
  });

  test("resumo conta respostas e marcações independentemente", () => {
    const answers = [{ ...questions[0], userSelection: 0 }, { ...questions[1], userSelection: 1 }];
    expect(buildReviewSummary(questions, answers, ["q1", "q3"])).toEqual({
      total: 3,
      answered: 2,
      unanswered: 1,
      marked: 2,
    });
  });

  test("sessões de certificações distintas mantêm conjuntos de IDs independentes", () => {
    const clf = toggleReviewQuestion([], "q1");
    const saa = toggleReviewQuestion([], "q2");
    expect(clf).toEqual(["q1"]);
    expect(saa).toEqual(["q2"]);
  });
});
