import { expect, test } from "@playwright/test";
import { installConsoleGuard, openAuthenticated } from "./helpers/app.js";

test("simulator exposes all certifications and persists a switch locally", async ({ page }) => {
  const guard = installConsoleGuard(page);
  await openAuthenticated(page, "simulados.html");
  const select = page.locator("#certification-select");
  await expect(select).toBeVisible();
  await expect(select.locator("option")).toHaveCount(4);
  await select.selectOption("saa-c03");
  await expect(select).toHaveValue("saa-c03");
  await expect.poll(async () => page.evaluate(() => JSON.parse(localStorage.getItem("cloudacademy_session")).user.certification)).toBe("saa-c03");
  guard.assertClean();
});
