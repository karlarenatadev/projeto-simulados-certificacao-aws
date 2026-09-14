import { expect, test } from "@playwright/test";
import { installConsoleGuard, openAuthenticated } from "./helpers/app.js";

async function startForDomain(page, domainId, language = "pt") {
  await openAuthenticated(page, "simulados.html", {
    language,
    certification: "aif-c01",
  });
  await page.locator("#certification-select").selectOption("aif-c01");
  await expect(page.locator("#topic-filter option")).toHaveCount(6);
  await page.locator("#topic-filter").selectOption(domainId);
  await page
    .locator('label:has(input[name="question-quantity"][value="5"])')
    .click();
  await page
    .locator('label:has(input[name="quiz-mode"][value="review"])')
    .click();
  await page.locator("#btn-start-quiz").click();
  await expect(page.locator("#screen-quiz")).toBeVisible();
}

test("AIF Applications of Foundation Models filter starts a matching quiz", async ({
  page,
}) => {
  const guard = installConsoleGuard(page);
  await startForDomain(page, "applications-foundation-models");
  await expect(page.locator("#question-category")).toContainText(
    "Applications",
  );
  const domains = await page.evaluate(() => {
    const entry = Object.entries(localStorage).find(([key]) =>
      key.includes("active_session_"),
    );
    return entry ? JSON.parse(entry[1]).questions.map((q) => q.domain) : [];
  });
  expect(domains.length).toBeGreaterThan(0);
  expect(
    domains.every((domain) =>
      /Applications of Foundation Models/i.test(domain),
    ),
  ).toBe(true);
  expect(guard.errors()).toEqual([]);
});

test("AIF Security Governance filter starts a matching English quiz", async ({
  page,
}) => {
  const guard = installConsoleGuard(page);
  await startForDomain(page, "security-compliance-governance", "en");
  await expect(page.locator("#question-category")).toContainText("Security");
  const domains = await page.evaluate(() => {
    const entry = Object.entries(localStorage).find(([key]) =>
      key.includes("active_session_"),
    );
    return entry ? JSON.parse(entry[1]).questions.map((q) => q.domain) : [];
  });
  expect(domains.length).toBeGreaterThan(0);
  expect(
    domains.every((domain) =>
      /Security, Compliance, and Governance for AI Solutions/i.test(domain),
    ),
  ).toBe(true);
  const question = await page.locator("#question-text").textContent();
  expect(question).toBeTruthy();
  expect(guard.errors()).toEqual([]);
});
