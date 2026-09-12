import { expect, test } from "@playwright/test";
import { installConsoleGuard, openAuthenticated } from "./helpers/app.js";

test("sidebar and Platform Guide open the same Pomodoro on desktop and mobile", async ({
  page,
}) => {
  const guard = installConsoleGuard(page);
  await openAuthenticated(page, "index.html");

  const sidebarTrigger = page.locator("#sidebar-btn-pomodoro");
  const guideTrigger = page.locator("#home-guide-pomodoro");
  const widget = page.locator("#pomodoro-widget");
  const display = page.locator("#pomodoro-display");

  await expect(sidebarTrigger).toBeVisible();
  await expect(sidebarTrigger).toHaveAttribute(
    "aria-label",
    "Abrir sessão de foco Pomodoro",
  );
  await sidebarTrigger.click();
  await expect(widget).toBeVisible();
  await expect(widget).toHaveAttribute("aria-hidden", "false");

  await page.locator("#btn-pomodoro-toggle").click();
  await expect(page.locator("#btn-pomodoro-toggle")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect.poll(async () => display.textContent()).not.toBe("15:00");

  await page.locator("#btn-pomodoro-toggle").click();
  const pausedAt = await display.textContent();
  await page.waitForTimeout(1_100);
  await expect(display).toHaveText(pausedAt);

  await page.locator("#btn-pomodoro-toggle").click();
  await page.locator('[data-i18n-aria-label="pomodoro_reset"]').click();
  await expect(display).toHaveText("15:00");
  await page.locator('[data-i18n-aria-label="pomodoro_close"]').click();
  await expect(widget).toBeHidden();

  await expect(guideTrigger).toBeVisible();
  await guideTrigger.click();
  await expect(widget).toBeVisible();
  await expect(page.locator("#pomodoro-widget")).toHaveCount(1);
  await page.locator('[data-i18n-aria-label="pomodoro_close"]').click();

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(sidebarTrigger).toBeVisible();
  await sidebarTrigger.click();
  await expect(widget).toBeVisible();
  const bounds = await widget.boundingBox();
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(390);

  guard.assertClean();
});
