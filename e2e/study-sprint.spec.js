import { expect, test } from "@playwright/test";
import {
  installConsoleGuard,
  openAuthenticated,
  seedOfflineSession,
} from "./helpers/app.js";

test("Sprint começa no Dia 1, conclui e preserva o progresso", async ({
  page,
}) => {
  const guard = installConsoleGuard(page);
  await seedOfflineSession(page, { certification: "clf-c02" });
  await page.addInitScript(() => {
    localStorage.setItem(
      "aws_sim_sprint_state_clf-c02",
      JSON.stringify({ completedStages: [], unlockedStages: ["1"] }),
    );
  });
  await openAuthenticated(page, "study-sprint.html");
  await page.waitForFunction(() => typeof window.getPill === "function");

  await expect(page.locator("#sprint-progress-text")).toHaveText("0%");
  await expect(page.locator("#sprint-current-day-label")).toContainText(
    "Dia 1",
  );
  await page.waitForFunction(() =>
    /P[íi]lula|Pill/i.test(
      document.getElementById("sprint-start-btn")?.textContent || "",
    ),
  );
  await page.locator("#sprint-start-btn").click();
  await expect(page.locator("#sprint-reader-overlay:not(.hidden)")).toBeVisible();
  await page.getByRole("button", { name: /Marcar Pílula|Mark Pill/i }).click();
  await expect(page.locator("#sprint-progress-text")).toHaveText("7%");
  await page.reload();
  await expect(page.locator("#sprint-progress-text")).toHaveText("7%");
  guard.assertClean();
});
