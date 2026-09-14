import { readdirSync } from "node:fs";
import { resolve } from "node:path";

test("mantem uma unica capitalizacao canonica para QuizEngine", () => {
  const directory = resolve(process.cwd(), "src/frontend/js");
  const engineFiles = readdirSync(directory).filter(
    (file) => file.toLowerCase() === "quizengine.js",
  );

  expect(engineFiles).toEqual(["quizEngine.js"]);
});
