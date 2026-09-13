import { jest } from "@jest/globals";
import { quizManager } from "../src/frontend/js/quizManager.js";
import { storageManager } from "../src/frontend/js/storageManager.js";

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(body),
  };
}

describe("quizManager remote lifecycle", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    localStorage.clear();
    global.fetch = jest.fn();
    quizManager.currentQuizId = "remote-quiz-1";
    quizManager.currentUserId = "user-1";
    quizManager.isAPIAvailable = true;
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "warn").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  test("replays an unacknowledged answer after refresh before finishing", async () => {
    const key = storageManager.getUserScopedKey("ans_remote-quiz-1_question-1");
    localStorage.setItem(
      key,
      JSON.stringify({
        quiz_id: "remote-quiz-1",
        question_id: "question-1",
        user_answer: 0,
        time_secs: 3,
        synced: false,
      }),
    );
    global.fetch
      .mockResolvedValueOnce(
        jsonResponse({ success: true, data: { answer_id: "answer-1" } }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          success: true,
          data: {
            quiz_id: "remote-quiz-1",
            status: "completed",
            completed_at: "2026-09-12",
          },
        }),
      );

    quizManager.currentQuizId = null;
    quizManager.currentQuizId = "remote-quiz-1";
    const result = await quizManager.finishQuiz();

    expect(result.status).toBe("completed");
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(global.fetch.mock.calls[0][0]).toContain(
      "/api/quiz/remote-quiz-1/answer",
    );
    expect(global.fetch.mock.calls[1][0]).toContain(
      "/api/quiz/remote-quiz-1/finish",
    );
    expect(JSON.parse(localStorage.getItem(key)).synced).toBe(true);
  });

  test("does not finish remotely when an answer remains unsynchronized", async () => {
    const key = storageManager.getUserScopedKey("ans_remote-quiz-1_question-1");
    localStorage.setItem(
      key,
      JSON.stringify({
        quiz_id: "remote-quiz-1",
        question_id: "question-1",
        user_answer: 0,
        synced: false,
      }),
    );
    global.fetch.mockRejectedValue(new Error("Network error"));

    expect(await quizManager.finishQuiz()).toBeNull();
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch.mock.calls[0][0]).toContain("/answer");
    expect(JSON.parse(localStorage.getItem(key)).synced).toBe(false);
  });

  test("an in-flight answer keeps its original quiz ID if another quiz starts", async () => {
    let acknowledge;
    global.fetch.mockImplementation(
      () =>
        new Promise((resolve) => {
          acknowledge = resolve;
        }),
    );

    const write = quizManager.recordAnswer({
      question_id: "question-1",
      user_answer: 0,
      time_secs: 2,
    });
    quizManager.currentQuizId = "remote-quiz-2";
    acknowledge(
      jsonResponse({ success: true, data: { answer_id: "answer-1" } }),
    );
    expect(await write).toBe(true);

    const oldKey = storageManager.getUserScopedKey(
      "ans_remote-quiz-1_question-1",
    );
    const newKey = storageManager.getUserScopedKey(
      "ans_remote-quiz-2_question-1",
    );
    expect(JSON.parse(localStorage.getItem(oldKey)).synced).toBe(true);
    expect(localStorage.getItem(newKey)).toBeNull();
    expect(global.fetch.mock.calls[0][0]).toContain(
      "/api/quiz/remote-quiz-1/answer",
    );
  });

  test("local-only completion remains available without any API call", async () => {
    quizManager.currentQuizId = "local_quiz_1";
    quizManager.isAPIAvailable = false;

    expect(await quizManager.finishQuiz()).toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test("mistakes review remains local even while the API is available", async () => {
    const review = await quizManager.startQuiz(
      "clf-c02",
      2,
      "pt",
      "mistakes-review",
    );

    expect(review.fromAPI).toBe(false);
    expect(review.quizId).toMatch(/^local_quiz_/);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test("explicit discard uses the existing remote quiz ID", async () => {
    global.fetch.mockResolvedValue(
      jsonResponse({
        success: true,
        data: { quiz_id: "remote-quiz-1", status: "abandoned" },
      }),
    );

    const abandoned = await quizManager.abandonQuiz("remote-quiz-1");
    expect(abandoned.status).toBe("abandoned");
    expect(global.fetch.mock.calls[0][0]).toContain(
      "/api/quiz/remote-quiz-1/abandon",
    );
  });
});
