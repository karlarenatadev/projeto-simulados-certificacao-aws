import { readFileSync } from "node:fs";

const activePages = [
  "index.html",
  "simulados.html",
  "diagnostico.html",
  "flashcards.html",
  "study-now.html",
  "jornada.html",
  "study-sprint.html",
  "laboratorios.html",
  "cases.html",
  "case-view.html",
  "resources.html",
  "profile.html",
  "settings.html",
  "simulator-hub.html",
  "simulator-room.html",
];

const pageSource = (name) =>
  readFileSync(new URL(`../src/frontend/pages/${name}`, import.meta.url), "utf8");

describe("consistência visual global", () => {
  test("as 15 páginas principais usam o shell com tema e sidebar", () => {
    activePages.forEach((page) => {
      const html = pageSource(page);
      if (!["simulator-hub.html", "simulator-room.html"].includes(page)) {
        expect(html).toMatch(/\{\{HEADER|a3-header/);
      }
      if (page !== "case-view.html") {
        if (["simulator-hub.html", "simulator-room.html"].includes(page)) {
          expect(html).toContain("theme-toggle");
        } else {
          expect(html).toContain("has-left-sidebar");
          expect(html).toMatch(/\{\{SIDEBAR|left-sidebar/);
        }
      }
    });
  });

  test("as páginas administrativas usam o CSS tokenizado compartilhado", () => {
    ["valid.html", "users.html", "history.html"].forEach((page) => {
      const html = readFileSync(
        new URL(`../src/frontend/validation/${page}`, import.meta.url),
        "utf8",
      );
      expect(html).toContain("../css/style.css");
      expect(html).toContain("css/admin.css");
    });
  });

  test("tokens e componentes possuem tema, controles e foco acessível", () => {
    const tokens = readFileSync(new URL("../src/frontend/styles/tokens.css", import.meta.url), "utf8");
    const themes = readFileSync(new URL("../src/frontend/styles/themes.css", import.meta.url), "utf8");
    const forms = readFileSync(new URL("../src/frontend/styles/components/forms.css", import.meta.url), "utf8");
    const admin = readFileSync(new URL("../src/frontend/validation/css/admin.css", import.meta.url), "utf8");

    expect(tokens).toContain("--a3-sidebar-bg");
    expect(tokens).toContain("--a3-control-bg");
    expect(themes).toContain("--a3-control-disabled");
    expect(forms).toContain(":focus-visible");
    expect(admin).toContain(".admin-table tbody tr:hover");
    expect(admin).toContain("var(--a3-surface-raised)");
    expect(admin).toContain(".btn-danger");
    expect(admin).toContain(":focus-visible");
  });

  test("a validação não depende mais do CSS legado dark-only", () => {
    expect(pageSource("../validation/valid.html")).not.toContain("valid.css");
  });
});
