import { expect, test } from "@playwright/test";
import { installConsoleGuard, openAuthenticated } from "./helpers/app.js";

const pages = [
  "simulados.html",
  "jornada.html",
  "diagnostico.html",
  "flashcards.html",
  "dicas-prova.html",
  "laboratorios.html",
  "cases.html",
  "resources.html",
  "study-sprint.html",
  "profile.html",
  "settings.html",
];

test("direct access to canonical pages is stable", async ({ page }) => {
  const guard = installConsoleGuard(page);
  for (const target of pages) {
    await openAuthenticated(page, target);
    await expect(page.locator("#cloud-sidebar-toggle")).toBeAttached();
    await expect(page.locator("body")).toBeVisible();
  }
  guard.assertClean();
});

test("public sidebar destinations and local actions work", async ({ page }) => {
  const guard = installConsoleGuard(page);
  await openAuthenticated(page, "index.html");

  const destinations = [
    ["sidebar-btn-hub", /\/index\.html$/],
    ["sidebar-btn-quiz", /\/simulados\.html$/],
    ["sidebar-btn-journey", /\/jornada\.html$/],
    ["sidebar-btn-diagnostic", /\/diagnostico\.html$/],
  ];

  const hrefs = {
    "sidebar-btn-flashcards": "flashcards.html",
    "sidebar-btn-exam-tips": "dicas-prova.html",
    "sidebar-btn-cases": "cases.html",
    "sidebar-btn-labs": "laboratorios.html",
    "sidebar-btn-sprint": "study-sprint.html",
    "sidebar-btn-resources": "resources.html",
    "sidebar-btn-mistakes": "erros.html",
  };
  for (const [id, target] of Object.entries(hrefs))
    await expect(page.locator(`#${id}`)).toHaveAttribute(
      "href",
      new RegExp(target),
    );

  for (const [id, url] of destinations) {
    const isolated = await page.context().newPage();
    const isolatedGuard = installConsoleGuard(isolated);
    await openAuthenticated(isolated, "index.html");
    await isolated.locator(`#${id}`).waitFor({ state: "attached" });
    const isolatedOverlay = isolated.locator("#app-boot-overlay");
    if (await isolatedOverlay.count())
      await isolatedOverlay.waitFor({ state: "detached" });
    await isolated.locator(`#${id}`).click({ noWaitAfter: true });
    await expect(isolated).toHaveURL(url);
    isolatedGuard.assertClean();
    await isolated.close();
  }

  await page.goto("index.html");
  const overlay = page.locator("#app-boot-overlay");
  if (await overlay.count()) await overlay.waitFor({ state: "detached" });
  await page.locator("#sidebar-btn-mistakes").waitFor({ state: "visible" });
  await page.locator("#sidebar-btn-mistakes").scrollIntoViewIfNeeded();
  await page.locator("#sidebar-btn-mistakes").click();
  await expect(page).toHaveURL(/\/erros\.html$/);
  await expect(page.locator("#mistakes-summary")).toBeVisible();

  await page.goto("index.html");
  await page.locator("#cloud-sidebar-toggle").waitFor({ state: "attached" });
  await page.locator("#sidebar-btn-pomodoro").waitFor({ state: "visible" });
  await page.locator("#sidebar-btn-pomodoro").click();
  await expect(page.locator("#pomodoro-widget")).toBeVisible();
  await page.locator('[data-i18n-aria-label="pomodoro_close"]').click();

  await page.locator("#sidebar-collapse-btn").click();
  await expect(page.locator("#sidebar-collapse-btn")).toHaveAttribute(
    "aria-expanded",
    "false",
  );

  guard.assertClean();
});

test("home CTAs preserve canonical destinations", async ({ page }) => {
  const guard = installConsoleGuard(page);
  await openAuthenticated(page, "index.html");
  const ctas = [
    ["#home-start-simulation", /\/simulados\.html$/],
    ["#home-start-journey", /\/jornada\.html$/],
    ["#home-start-diagnostic", /\/diagnostico\.html$/],
  ];
  for (const [selector, url] of ctas) {
    await page.goto("index.html");
    await page.locator(selector).click();
    await expect(page).toHaveURL(url);
  }
  guard.assertClean();
});

test("cases and builder navigation keep the selected case", async ({
  page,
}) => {
  const guard = installConsoleGuard(page);
  await openAuthenticated(page, "cases.html");
  const first = page.locator("#cases-grid a[href*='case-view.html']").first();
  await expect(first).toBeVisible();
  const href = await first.getAttribute("href");
  await first.click();
  await expect(page).toHaveURL(/case-view\.html\?id=/);
  await expect(page.locator("#case-main-title")).toBeVisible();
  if (href)
    expect(page.url()).toContain(
      new URL(href, "http://127.0.0.1:4173/").search,
    );
  guard.assertClean();
});
