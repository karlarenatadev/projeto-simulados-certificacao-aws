import { renderLeaderboardRows } from "../src/frontend/js/gamificacao/leaderboard.js";
import { renderValidationQuestion } from "../src/frontend/validation/js/validationUI.js";

describe("HTML sink hardening", () => {
  beforeEach(() => {
    document.body.replaceChildren();
    window.__xss = false;
  });

  test("leaderboard renders display names as text", () => {
    const list = document.createElement("ul");
    document.body.appendChild(list);

    renderLeaderboardRows(
      list,
      [
        {
          name: '<img src=x onerror="window.__xss = true">',
          score: 95,
          userId: "1",
        },
        { name: "<b>Karla</b>", score: 90, userId: "2" },
      ],
      null,
      null,
      "pt",
    );

    expect(list.querySelector("img")).toBeNull();
    expect(list.querySelector("b")).toBeNull();
    expect(window.__xss).toBe(false);
    expect(list.textContent).toContain(
      '<img src=x onerror="window.__xss = true">',
    );
    expect(list.textContent).toContain("<b>Karla</b>");
    expect(list.textContent).toContain("95%");
  });

  test("validation question data stays outside the HTML parser", () => {
    const card = renderValidationQuestion(
      {
        id: "q-1",
        certification: "<script>window.__xss = true</script>",
        domain: "Security",
        question_text: '<img src=x onerror="window.__xss = true">',
        options: [
          { id: "<b>A</b>", text: "<script>window.__xss = true</script>" },
        ],
      },
      { approve: "Approve", reject: "Reject" },
    );

    expect(card.querySelector("script")).toBeNull();
    expect(card.querySelector("img")).toBeNull();
    expect(card.querySelector("b")).toBeNull();
    expect(window.__xss).toBe(false);
    expect(card.textContent).toContain("<script>window.__xss = true</script>");
    expect(card.querySelector('[data-action="approve"]')).not.toBeNull();
    expect(card.querySelector('[data-action="reject"]')).not.toBeNull();
  });
});
