import { readFileSync } from "node:fs";

const page = (name) =>
  readFileSync(
    new URL(`../src/frontend/pages/${name}.html`, import.meta.url),
    "utf8",
  );

test("Exam Tips has the same PWA theme color as the other app pages", () => {
  const canonical = page("index").match(
    /<meta name="theme-color" content="([^"]+)"/,
  )[1];
  expect(canonical).toBe("#001863");
  for (const name of ["dicas-prova", "simulados", "flashcards", "jornada"]) {
    expect(page(name)).toContain(
      `<meta name="theme-color" content="${canonical}" />`,
    );
  }
});
