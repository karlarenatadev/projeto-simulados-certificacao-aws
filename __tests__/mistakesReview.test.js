import { QuizEngine } from "../src/frontend/js/quizEngine.js";
import { storageManager } from "../src/frontend/js/storageManager.js";

const makeMistake = (questionId, certId = "clf-c02") => ({
  questionId,
  certId,
  domain: "Cloud Concepts",
  question: `Question ${questionId}`,
  options: ["Correct", "Wrong"],
  correctAnswer: 0,
  selectedAnswer: 1,
  explanation: "Explanation",
});

describe("mistakes review fallback", () => {
  beforeEach(() => localStorage.clear());

  test("zero mistakes does not create an empty quiz", () => {
    const engine = new QuizEngine();
    const result = engine.loadMistakesByDomain([], "clf-c02", [], []);
    expect(result.success).toBe(false);
    expect(engine.state.questions).toEqual([]);
  });

  test.each([1, 3])(
    "%s saved mistakes without legacy validation metadata remain reviewable",
    (count) => {
      const engine = new QuizEngine();
      const mistakes = Array.from({ length: count }, (_, index) =>
        makeMistake(`q-${index}`),
      );
      const result = engine.loadMistakesByDomain(mistakes, "clf-c02", [], []);
      expect(result).toMatchObject({ success: true, totalQuestions: count });
      expect(engine.state.questions.every((q) => q.correct === 0)).toBe(true);
      expect(engine.state.questions.every((q) => q.certId === "clf-c02")).toBe(
        true,
      );
    },
  );

  test("score zero is not mistaken for missing correct answer and certs stay separate", () => {
    const clf = makeMistake("clf-zero");
    const saa = makeMistake("saa-zero", "saa-c03");
    storageManager.recordMistake({ ...clf, correct: 0 }, 1, {
      certId: "clf-c02",
    });
    storageManager.recordMistake({ ...saa, correct: 0 }, 1, {
      certId: "saa-c03",
    });
    expect(storageManager.getMistakes("clf-c02")).toHaveLength(1);
    expect(storageManager.getMistakes("saa-c03")).toHaveLength(1);
    expect(storageManager.getMistakes("clf-c02")[0].correctAnswer).toBe(0);
  });
});
