import {
  calculateSprintProgress,
  getDayStatus,
  getNextAvailableDay,
  mergeSprintProgress,
  normalizeSprintProgress,
} from "../src/frontend/js/sprintProgress.js";
import { SPRINT_MAPS } from "../src/frontend/js/gamificacao/sprintManager.js";

describe("sprintProgress", () => {
  test("cada certificação possui exatamente os dias 1 a 14", () => {
    for (const days of Object.values(SPRINT_MAPS)) {
      expect(
        Object.keys(days)
          .map(Number)
          .sort((a, b) => a - b),
      ).toEqual(Array.from({ length: 14 }, (_, index) => index + 1));
    }
  });

  test("usuário novo começa no dia 1 disponível e progresso 0/14", () => {
    const state = normalizeSprintProgress({});
    expect(calculateSprintProgress(state)).toMatchObject({
      completed: 0,
      total: 14,
      currentDay: 1,
      nextAvailableDay: 1,
      percentage: 0,
    });
    expect(getDayStatus(1, state)).toBe("available");
    expect(getDayStatus(2, state)).toBe("locked");
  });

  test("não deriva o próximo dia pela quantidade quando há lacuna", () => {
    const state = normalizeSprintProgress({ completedStages: ["1", "3"] });
    expect(calculateSprintProgress(state)).toMatchObject({
      completed: 2,
      currentDay: 2,
      nextAvailableDay: 2,
    });
    expect(getDayStatus(2, state)).toBe("available");
    expect(getDayStatus(4, state)).toBe("locked");
  });

  test("conclusão é idempotente e não cria dia 15", () => {
    const state = mergeSprintProgress(
      { completedStages: Array.from({ length: 14 }, (_, i) => String(i + 1)) },
      { completedStages: ["14", "15"] },
    );
    expect(state.completedStages).toHaveLength(14);
    expect(getNextAvailableDay(state)).toBeNull();
    expect(calculateSprintProgress(state).currentDay).toBe(14);
  });

  test("merge preserva histórico dos dois dispositivos e recalcula disponibilidade", () => {
    const merged = mergeSprintProgress(
      { completedStages: ["1", "2"] },
      { completedStages: ["1", "3"] },
    );
    expect(merged.completedStages).toEqual(["1", "2", "3"]);
    expect(getNextAvailableDay(merged)).toBe(4);
  });

  test("valores inválidos não geram progresso artificial", () => {
    const state = normalizeSprintProgress({
      completedStages: [null, "", "0", "15", "x"],
    });
    expect(state.completedStages).toEqual([]);
    expect(calculateSprintProgress(state).percentage).toBe(0);
  });
});
