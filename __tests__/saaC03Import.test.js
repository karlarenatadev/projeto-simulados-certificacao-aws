import fs from "node:fs";
import { jest } from "@jest/globals";
import { QuizEngine } from "../src/frontend/js/quizEngine.js";
import {
  StorageManager,
  storageManager,
} from "../src/frontend/js/storageManager.js";
import {
  extractLetterReferences,
  remapExplanationLetters,
} from "../src/frontend/js/utils/explanationLetters.js";
import { certificationPaths } from "../src/frontend/js/data.js";

const read = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const bank = (certId, suffix = "") =>
  read(`data/questions/${certId}${suffix}.json`);
const manifest = read("data/taxonomy/certification-manifest.json");

const isImported = (q) => q.source?.origin?.includes("Skill Builder");
const ptAll = bank("saa-c03");
const enAll = bank("saa-c03-en");
const pt = ptAll.filter(isImported);
const en = enAll.filter(isImported);
const byItem = (list) => new Map(list.map((q) => [q.source.item, q]));
const ptByItem = byItem(pt);
const enByItem = byItem(en);

const LETTER_INDEX = { A: 0, B: 1, C: 2, D: 3, E: 4 };
const originalIndexes = (q) =>
  q.source.originalAnswer.match(/[A-E]/g).map((l) => LETTER_INDEX[l]);
const asArray = (correct) => (Array.isArray(correct) ? correct : [correct]);

describe("SAA-C03: importacao das 35 questoes", () => {
  test("importa 35 questoes em PT e 35 em EN, itens 1 a 35 sem repeticao", () => {
    expect(pt).toHaveLength(35);
    expect(en).toHaveLength(35);
    const items = [...ptByItem.keys()].sort((a, b) => a - b);
    expect(items).toEqual(Array.from({ length: 35 }, (_, i) => i + 1));
  });

  test("nao cria ids nem textos duplicados no banco", () => {
    for (const list of [ptAll, enAll]) {
      const ids = list.map((q) => q.questionId);
      expect(new Set(ids).size).toBe(ids.length);
      const texts = list.map((q) => q.question.trim().toLowerCase());
      expect(new Set(texts).size).toBe(texts.length);
    }
  });

  test("usa o schema existente e dominios oficiais do manifesto", () => {
    const allowed = manifest["saa-c03"].allowedDomains;
    for (const q of [...pt, ...en]) {
      expect(q.certId).toBe("saa-c03");
      expect(q.questionId).toMatch(/^saa-c03-[0-9a-f]{8}$/);
      expect(q.examCode).toBe(manifest["saa-c03"].examCode);
      expect(allowed).toContain(q.domain);
      expect(manifest["saa-c03"].allowedDifficulties).toContain(q.difficulty);
      expect(q.validation.status).toBe("validated");
      expect(q.explanation.length).toBeGreaterThan(20);
      expect(q.services.length).toBeGreaterThan(0);
      for (const s of q.services) {
        expect(s.service_id && s.service_name && s.service_slug).toBeTruthy();
      }
    }
  });

  test("distribui as questoes pelos quatro dominios", () => {
    const counts = {};
    for (const q of pt) counts[q.domain] = (counts[q.domain] || 0) + 1;
    expect(counts).toEqual({
      "Design Secure Architectures": 11,
      "Design Resilient Architectures": 7,
      "Design High-Performing Architectures": 9,
      "Design Cost-Optimized Architectures": 8,
    });
  });

  test("gabaritos conferem com o original recebido e indices sao validos", () => {
    for (const q of [...pt, ...en]) {
      const expected = originalIndexes(q);
      expect(asArray(q.correct)).toEqual(expected);
      const unique = new Set(expected);
      expect(unique.size).toBe(expected.length);
      for (const index of expected) {
        expect(index).toBeLessThan(q.options.length);
      }
    }
  });

  test("identifica 5 questoes de multipla selecao com a quantidade pedida no enunciado", () => {
    const multi = pt.filter((q) => Array.isArray(q.correct));
    expect(multi.map((q) => q.source.item).sort((a, b) => a - b)).toEqual([
      4, 6, 27, 31, 32,
    ]);
    const words = { DUAS: 2, TRÊS: 3 };
    for (const q of multi) {
      const word = q.question.match(/Selecione (DUAS|TRÊS)/)?.[1];
      expect(q.correct).toHaveLength(words[word]);
    }
    const singles = pt.filter((q) => !Array.isArray(q.correct));
    expect(singles).toHaveLength(30);
    for (const q of singles) expect(q.question).not.toMatch(/Selecione/);
  });

  test("PT e EN sao equivalentes em dominio, gabarito e alternativas", () => {
    for (const [item, p] of ptByItem) {
      const e = enByItem.get(item);
      expect(e.correct).toEqual(p.correct);
      expect(e.domain).toBe(p.domain);
      expect(e.options).toHaveLength(p.options.length);
      expect(e.questionId).not.toBe(p.questionId);
    }
  });

  test("nao ha crases soltas, rotulos de letra nas alternativas ou campos vazios", () => {
    for (const q of [...pt, ...en]) {
      const text = [q.question, ...q.options, q.explanation].join(" ");
      expect(text).not.toContain("`");
      for (const option of q.options) {
        expect(option.trim()).toBe(option);
        expect(option).not.toMatch(/^[A-E]\)\s/);
        expect(option.length).toBeGreaterThan(3);
      }
    }
  });

  test("preserva rastreabilidade e registra divergencias tecnicas encontradas", () => {
    const withNotes = pt
      .filter((q) => q.source.reviewNotes?.length)
      .map((q) => q.source.item);
    expect(withNotes).toEqual(
      expect.arrayContaining([2, 10, 16, 17, 19, 26, 29, 30, 31, 32, 34]),
    );
    expect(ptByItem.get(34).explanation).toContain("Nota de revisão técnica");
    expect(enByItem.get(34).explanation).toContain("Technical review note");
    // nenhuma resposta foi alterada: gabarito final == gabarito original
    expect(pt.every((q) => q.source.originalAnswer)).toBe(true);
  });

  test("nao contamina os bancos das demais certificacoes", () => {
    const expectedCounts = {
      "clf-c02": 394,
      "dva-c02": 284,
      "aif-c01": 306,
    };
    for (const [certId, count] of Object.entries(expectedCounts)) {
      for (const suffix of ["", "-en"]) {
        const list = bank(certId, suffix);
        expect(list).toHaveLength(count);
        expect(list.some(isImported)).toBe(false);
        expect(list.every((q) => q.certId === certId)).toBe(true);
      }
    }
    expect(ptAll).toHaveLength(320);
    expect(enAll).toHaveLength(320);
    expect(ptAll.every((q) => q.certId === "saa-c03")).toBe(true);
  });
});

describe("SAA-C03: simulado, correcao e estatisticas", () => {
  const domainsConfig = certificationPaths["saa-c03"].domains;

  const loadSimulado = async (quantity = 320, filters = {}) => {
    global.fetch = jest.fn(async (url) => {
      const file = String(url).replace(/^\//, "");
      if (!fs.existsSync(file)) return { ok: false };
      return { ok: true, json: async () => read(file) };
    });
    const engine = new QuizEngine(70);
    const result = await engine.loadQuestions(
      "saa-c03",
      domainsConfig,
      { difficulty: "all", quantity, mode: "exam", ...filters },
      "pt",
    );
    return { engine, result };
  };

  test("simulado geral do SAA-C03 inclui as 35 questoes importadas e so elas do SAA", async () => {
    const { engine, result } = await loadSimulado();
    expect(result.success).toBe(true);
    const ids = new Set(engine.state.questions.map((q) => q.id));
    for (const q of pt) expect(ids.has(q.questionId)).toBe(true);
    expect(engine.state.questions.every((q) => q.certId === "saa-c03")).toBe(
      true,
    );
  });

  test("simulado SAA-C03 filtrado por dominio traz questoes importadas do dominio", async () => {
    const domain = domainsConfig.find(
      (d) => d.englishName === "Design Secure Architectures",
    );
    expect(domain).toBeDefined();
    const { engine, result } = await loadSimulado(500, { topic: domain.id });
    expect(result.success).toBe(true);
    const importedInDomain = pt.filter(
      (q) => q.domain === "Design Secure Architectures",
    );
    const ids = new Set(engine.state.questions.map((q) => q.id));
    for (const q of importedInDomain) expect(ids.has(q.questionId)).toBe(true);
    expect(
      engine.state.questions.every(
        (q) => q.domain === "Design Secure Architectures",
      ),
    ).toBe(true);
  });

  test("corrige multipla selecao: so conta quando o conjunto exato e escolhido", () => {
    const source = ptByItem.get(27);
    const engine = new QuizEngine(70);
    const shuffled = engine._shuffleOptions(engine._normalizeQuestion(source));
    const correct = [...shuffled.correct];
    const wrong = [0, 1, 2, 3].find((i) => !correct.includes(i));

    const run = (selection) => {
      engine.resetState();
      engine.state.questions = [shuffled];
      engine.state.certId = "saa-c03";
      engine.state.domainScores = { [source.domain]: { total: 0, correct: 0 } };
      const result = engine.submitAnswer(selection);
      return { result, state: engine.state };
    };

    expect(run([...correct].reverse()).result.isCorrect).toBe(true);
    expect(run([...correct].reverse()).state.score).toBe(1);
    expect(run(correct.slice(0, 2)).result.isCorrect).toBe(false);
    expect(run([...correct, wrong]).result.isCorrect).toBe(false);
    expect(run([wrong]).result.isCorrect).toBe(false);
    expect(run([]).result.isCorrect).toBe(false);
    expect(run(correct[0]).result.isCorrect).toBe(false);

    const partial = run(correct.slice(0, 2));
    expect(partial.state.score).toBe(0);
    expect(partial.state.domainScores[source.domain]).toEqual({
      total: 1,
      correct: 0,
    });
  });

  test("corrige cada uma das 35 questoes aceitando o gabarito e rejeitando selecao errada", () => {
    const engine = new QuizEngine(70);
    for (const source of pt) {
      const q = engine._shuffleOptions(engine._normalizeQuestion(source));
      const correct = asArray(q.correct);
      const incorrect = q.options
        .map((_, i) => i)
        .filter((i) => !correct.includes(i));

      engine.resetState();
      engine.state.questions = [q];
      engine.state.domainScores = { [q.domain]: { total: 0, correct: 0 } };
      const right = engine.submitAnswer(
        Array.isArray(q.correct) ? correct : correct[0],
      );
      expect(right.isCorrect).toBe(true);

      engine.resetState();
      engine.state.questions = [q];
      engine.state.domainScores = { [q.domain]: { total: 0, correct: 0 } };
      const wrong = engine.submitAnswer(
        Array.isArray(q.correct) ? [incorrect[0]] : incorrect[0],
      );
      expect(wrong.isCorrect).toBe(false);
    }
  });

  test("estatisticas por dominio somam apenas respostas reais, sem duplicar ao trocar a resposta", () => {
    const engine = new QuizEngine(70);
    const picks = [1, 2, 4, 12].map((item) => ptByItem.get(item));
    engine.state.questions = picks.map((s) =>
      engine._shuffleOptions(engine._normalizeQuestion(s)),
    );
    engine.state.certId = "saa-c03";
    engine.state.domainScores = {};
    for (const s of picks) {
      engine.state.domainScores[s.domain] ||= { total: 0, correct: 0 };
    }

    engine.state.questions.forEach((q, index) => {
      engine.state.currentIndex = index;
      const correct = asArray(q.correct);
      // acerta os itens 1 e 2, erra os demais
      const hit = index < 2;
      const pick = hit
        ? Array.isArray(q.correct)
          ? correct
          : correct[0]
        : Array.isArray(q.correct)
          ? [q.options.findIndex((_, i) => !correct.includes(i))]
          : q.options.findIndex((_, i) => !correct.includes(i));
      engine.submitAnswer(pick);
    });

    expect(engine.state.score).toBe(2);
    expect(engine.state.answers).toHaveLength(4);

    // troca a resposta da primeira questao: nao duplica nem infla o total
    engine.state.currentIndex = 0;
    const q0 = engine.state.questions[0];
    const wrongPick = q0.options.findIndex(
      (_, i) => !asArray(q0.correct).includes(i),
    );
    engine.submitAnswer(wrongPick);
    expect(engine.state.answers).toHaveLength(4);
    expect(engine.state.score).toBe(1);

    const totals = Object.values(engine.state.domainScores).reduce(
      (acc, d) => ({ total: acc.total + d.total, correct: acc.correct + d.correct }),
      { total: 0, correct: 0 },
    );
    expect(totals).toEqual({ total: 4, correct: 1 });
  });
});

describe("SAA-C03: erros, resolucao e persistencia", () => {
  beforeEach(() => localStorage.clear());

  const multiQuestion = () => {
    const engine = new QuizEngine(70);
    return engine._shuffleOptions(engine._normalizeQuestion(ptByItem.get(6)));
  };

  test("storageManager expoe resolveMistake e removeMistake", () => {
    expect(typeof storageManager.resolveMistake).toBe("function");
    expect(typeof storageManager.removeMistake).toBe("function");
  });

  test("registra erro de multipla selecao com a selecao completa e resolve ao acertar", () => {
    const q = multiQuestion();
    const wrongSelection = [
      q.options.findIndex((_, i) => !q.correct.includes(i)),
    ];

    const record = storageManager.recordMistake(q, wrongSelection, {
      certId: "saa-c03",
      source: "exam",
    });
    expect(record).not.toBeNull();
    expect(record.selectedAnswer).toEqual(wrongSelection);
    expect(record.correctAnswer).toEqual(q.correct);
    expect(record.correctAnswerText).toHaveLength(2);
    expect(storageManager.getMistakes("saa-c03")).toHaveLength(1);

    // errar de novo atualiza o mesmo registro
    storageManager.recordMistake(q, wrongSelection, { certId: "saa-c03" });
    const [again] = storageManager.getMistakes("saa-c03");
    expect(again.wrongCount).toBe(2);
    expect(storageManager.getMistakes("saa-c03")).toHaveLength(1);

    expect(storageManager.resolveMistake(q, "saa-c03")).toBe(true);
    expect(storageManager.getMistakes("saa-c03")).toHaveLength(0);
    expect(storageManager.getAllMistakes("saa-c03")[0].resolved).toBe(true);
    expect(storageManager.removeMistake(q.id, "saa-c03")).toBe(true);
  });

  test("resolveMistake devolve false para questao ou certificacao inexistente", () => {
    expect(storageManager.resolveMistake("nao-existe", "saa-c03")).toBe(false);
    expect(storageManager.resolveMistake("x", "")).toBe(false);
  });

  test("erros sobrevivem a um reload e nao vazam para outra certificacao", () => {
    const q = multiQuestion();
    storageManager.recordMistake(q, [0], { certId: "saa-c03" });

    const reloaded = new StorageManager();
    expect(reloaded.getMistakes("saa-c03")).toHaveLength(1);
    expect(reloaded.getMistakes("saa-c03")[0].questionId).toBe(q.id);
    expect(reloaded.getMistakes("clf-c02")).toHaveLength(0);

    expect(reloaded.resolveMistake(q, "saa-c03")).toBe(true);
    expect(new StorageManager().getMistakes("saa-c03")).toHaveLength(0);
  });

  test("revisao de erros carrega a questao de multipla selecao preservando o gabarito", () => {
    const q = multiQuestion();
    storageManager.recordMistake(q, [0], { certId: "saa-c03" });
    const engine = new QuizEngine(70);
    const result = engine.loadMistakesByDomain(
      storageManager.getMistakes("saa-c03"),
      "saa-c03",
      [],
      [],
    );
    expect(result).toMatchObject({ success: true, totalQuestions: 1 });
    const reviewed = engine.state.questions[0];
    expect(reviewed.correct).toEqual(q.correct);
    expect(reviewed.options).toEqual(q.options);
  });

  test("historico de simulado persiste apos reload", () => {
    storageManager.saveQuizResult({
      certId: "saa-c03",
      mode: "exam",
      score: 1,
      total: 2,
      percentage: 50,
      attemptId: "attempt-saa35",
      date: new Date().toISOString(),
    });
    const history = new StorageManager().getHistory();
    expect(history.filter((h) => h.attemptId === "attempt-saa35")).toHaveLength(
      1,
    );
  });
});

describe("explicacoes que citam letras de alternativas", () => {
  test("remapeia letras conforme a nova ordem das alternativas", () => {
    // A->2, B->0, C->1, D->3
    const map = [2, 0, 1, 3];
    expect(
      remapExplanationLetters("A) um. B) dois. C) tres. D) quatro.", map),
    ).toBe("C) um. A) dois. B) tres. D) quatro.");
    expect(remapExplanationLetters("Corretas (A e D).", map)).toBe(
      "Corretas (C e D).",
    );
    expect(remapExplanationLetters("A e B) estao erradas", map)).toBe(
      "A e C) estao erradas",
    );
    expect(remapExplanationLetters("A, C e D) erradas", map)).toBe(
      "B, C e D) erradas",
    );
    expect(remapExplanationLetters("A está incorreta", map)).toBe(
      "C está incorreta",
    );
    expect(remapExplanationLetters("A is incorrect", map)).toBe(
      "C is incorrect",
    );
    expect(remapExplanationLetters("veja a alternativa B", map)).toBe(
      "veja a alternativa A",
    );
  });

  test("converte cada letra uma unica vez, mesmo quando casa com dois formatos", () => {
    // A->1, B->2, C->0: "(opção A)" casa com "opção A" e com "A)"
    const map = [1, 2, 0, 3];
    expect(remapExplanationLetters("Snapshots (opção A) e DMS (opção C).", map)).toBe(
      "Snapshots (opção B) e DMS (opção A).",
    );
    expect(remapExplanationLetters("Veja (alternativa B) e A) e C).", map)).toBe(
      "Veja (alternativa C) e B) e A).",
    );
  });

  test("em todos os bancos, as letras citadas continuam apontando para a mesma alternativa apos embaralhar", () => {
    const engine = new QuizEngine(70);
    let checked = 0;
    for (const certId of ["clf-c02", "saa-c03", "dva-c02", "aif-c01"]) {
      for (const suffix of ["", "-en"]) {
        for (const source of bank(certId, suffix)) {
          const before = extractLetterReferences(source.explanation);
          if (before.length === 0) continue;
          for (let run = 0; run < 8; run++) {
            const shuffled = engine._shuffleOptions(
              engine._normalizeQuestion(source),
            );
            const after = extractLetterReferences(shuffled.explanation);
            expect(after).toHaveLength(before.length);
            const target = (letters, options) =>
              letters.map((l) => options[LETTER_INDEX[l]]).sort();
            expect(target(after, shuffled.options)).toEqual(
              target(before, source.options),
            );
          }
          checked++;
        }
      }
    }
    expect(checked).toBeGreaterThan(100);
  });

  test("nao altera texto sem ordem trocada nem siglas com letras A-E", () => {
    expect(remapExplanationLetters("A) um", [0, 1, 2, 3])).toBe("A) um");
    const text = "Use o S3 Standard-IA (SSE-S3) e AMI) sem mudar.";
    expect(remapExplanationLetters(text, [3, 2, 1, 0])).toBe(text);
    expect(remapExplanationLetters(undefined, [1, 0])).toBeUndefined();
  });

  test("embaralhar opcoes mantem as letras da explicacao coerentes com o gabarito", () => {
    const source = ptByItem.get(6); // correta: A e D, explicacao cita (A) e (D)
    const engine = new QuizEngine(70);
    for (let run = 0; run < 25; run++) {
      const q = engine._shuffleOptions(engine._normalizeQuestion(source));
      const cited = [...q.explanation.matchAll(/\(([A-E])\)/g)].map((m) =>
        "ABCDE".indexOf(m[1]),
      );
      expect(cited.sort()).toEqual([...q.correct].sort());
    }
  });
});
