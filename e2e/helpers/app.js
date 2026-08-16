import { expect } from "@playwright/test";

export const offlineUser = {
  id: "e2e-smoke-user",
  email: "e2e-smoke@example.test",
  name: "E2E Smoke User",
  role: "STUDENT",
  provider: "local",
  certification: "clf-c02",
  language: "pt",
};

export async function seedOfflineSession(page, overrides = {}) {
  const user = { ...offlineUser, ...overrides };
  await page.addInitScript((session) => {
    if (!window.localStorage.getItem("cloudacademy_session")) {
      window.localStorage.setItem("cloudacademy_session", JSON.stringify(session));
    }
  }, {
    user,
    authenticationMode: "offline",
    provider: "local",
    version: 1,
  });
}

export function installConsoleGuard(page) {
  const fatalErrors = [];
  page.on("pageerror", (error) => fatalErrors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const text = message.text();
    const expectedOfflineFallback = /Failed to get case(?:s)?\:.*Failed to fetch/i.test(text);
    if (!expectedOfflineFallback && /ReferenceError|TypeError|SyntaxError|Unhandled|is not defined|Failed to load module/i.test(text)) {
      fatalErrors.push(`console.error: ${text}`);
    }
  });
  return {
    errors: () => [...fatalErrors],
    assertClean: () => expect(fatalErrors, "fatal browser errors").toEqual([]),
  };
}

export async function openAuthenticated(page, path, session = {}) {
  await seedOfflineSession(page, session);
  await page.goto(path);
  await page.waitForLoadState("domcontentloaded");
  // Protected pages boot the shell asynchronously after DOMContentLoaded.
  // Waiting for its injected toggle avoids racing the page's real listeners.
  await page.locator("#cloud-sidebar-toggle").waitFor({ state: "attached" });
  const activeSidebarId = path.includes("diagnostico")
    ? "sidebar-btn-diagnostic"
    : path.includes("simulados")
      ? "sidebar-btn-quiz"
      : path.includes("flashcards")
        ? "sidebar-btn-flashcards"
        : null;
  if (activeSidebarId) await page.locator(`#${activeSidebarId}.is-active`).waitFor({ state: "attached" });
  if (activeSidebarId) {
    await page.waitForFunction(() =>
      performance.getEntriesByType("resource").some((entry) => /\/api\//i.test(entry.name)),
    );
  }
}

export async function toggleLanguage(page) {
  const appOwnsLanguageToggle = await page.evaluate(() => typeof window.toggleLanguage === "function");
  if (appOwnsLanguageToggle) {
    await page.locator("#btn-language").click();
  } else {
    await Promise.all([
      page.waitForNavigation({ waitUntil: "domcontentloaded" }),
      page.locator("#btn-language").click(),
    ]);
  }
  await expect.poll(async () => page.evaluate(() => JSON.parse(localStorage.getItem("cloudacademy_session")).user.language)).toBe("en");
}

export async function expectNoFatalErrors(guard) {
  guard.assertClean();
}
