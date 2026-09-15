import { describe, expect, test } from "@jest/globals";
import { projectReviewDeck } from "../src/frontend/js/reviewDeckProjection.js";

describe("review deck projection", () => {
  const cards = [
    {
      questionId: "q1",
      certId: "clf-c02",
      domain: "security-and-compliance",
      question: "Q1",
    },
    {
      questionId: "q2",
      certId: "clf-c02",
      domain: "cloud-concepts",
      question: "Q2",
      reviewStatus: "mastered",
      reviewCount: 2,
    },
    {
      questionId: "q3",
      certId: "aif-c01",
      domain: "fundamentals-ai-ml",
      question: "Q3",
    },
  ];

  test("normalizes legacy cards and summarizes status", () => {
    expect(
      projectReviewDeck(cards, { certification: "clf-c02", status: "all" }),
    ).toMatchObject({ total: 2, pending: 1, mastered: 1 });
  });

  test("filters certification, domain and status without changing cards", () => {
    expect(
      projectReviewDeck(cards, { certification: "aif-c01", status: "pending" })
        .records,
    ).toHaveLength(1);
    expect(
      projectReviewDeck(cards, {
        certification: "clf-c02",
        domain: "conceitos-cloud",
        status: "mastered",
      }).records[0].questionId,
    ).toBe("q2");
    expect(cards).toHaveLength(3);
  });
});
