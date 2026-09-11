/** @jest-environment jsdom */

import { readFileSync } from "node:fs";
import { initializeUI } from "../src/frontend/js/i18n/initUI.js";

const homeHtml = readFileSync(
  new URL("../src/frontend/pages/index.html", import.meta.url),
  "utf8",
);
const appSource = readFileSync(
  new URL("../src/frontend/js/app.js", import.meta.url),
  "utf8",
);
const homeDocument = new DOMParser().parseFromString(homeHtml, "text/html");

describe("Learning Hub navigation and platform guide", () => {
  test.each([
    ["home-start-simulation", "simulados.html"],
    ["home-start-journey", "jornada.html"],
    ["home-start-diagnostic", "diagnostico.html"],
  ])("%s is a semantic multipage link to %s", (id, destination) => {
    const cta = homeDocument.getElementById(id);

    expect(cta).not.toBeNull();
    expect(cta.tagName).toBe("A");
    expect(cta.getAttribute("href")).toBe(`./${destination}`);
    expect(cta.getAttribute("data-app-route")).toBe(destination);
    expect(cta.hasAttribute("onclick")).toBe(false);
    expect(cta.getAttribute("aria-label")).toBeTruthy();
    expect(cta.getAttribute("title")).toBeTruthy();
    expect(cta.getAttribute("data-i18n-aria-label")).toBeTruthy();
    expect(cta.getAttribute("data-i18n-title")).toBeTruthy();
  });

  test("home quick-start CTAs no longer depend on legacy SPA screens", () => {
    const startSection = homeDocument.getElementById("hub-start");
    const source = startSection.outerHTML;

    expect(source).not.toContain("showLearningHubQuickStart");
    expect(source).not.toContain('showScreen("start")');
    expect(source).not.toContain('showScreen("jornada")');
    expect(source).not.toContain("certification-select");
    expect(startSection.querySelector("#btn-start-journey")).toBeNull();
    expect(startSection.querySelector("#btn-start-diagnostic")).toBeNull();
  });

  test("guide represents every current Phase A destination", () => {
    const expectedFeatures = [
      "simulations",
      "journey",
      "diagnostic",
      "flashcards",
      "tips",
      "practice",
      "labs",
      "resources",
      "sprint",
      "pomodoro",
    ];
    const guide = homeDocument.getElementById("hub-guide");

    expectedFeatures.forEach((feature) => {
      expect(
        guide.querySelector(`[data-guide-feature="${feature}"]`),
      ).not.toBeNull();
    });
    expect(
      guide.querySelectorAll("[data-guide-feature]").length,
    ).toBeGreaterThanOrEqual(expectedFeatures.length);
    expect(
      guide.querySelectorAll(".lh-feature-desc:not([data-i18n])"),
    ).toHaveLength(0);
  });

  test("translates home navigation and guide content between PT-BR and EN", () => {
    const startSection = homeDocument.getElementById("hub-start");
    const guide = homeDocument.getElementById("hub-guide");
    document.body.innerHTML = `${startSection.outerHTML}${guide.outerHTML}`;

    initializeUI("en");
    expect(
      document.querySelector("#home-start-simulation span").textContent,
    ).toBe("Simulate now");
    expect(
      document
        .getElementById("home-start-diagnostic")
        .getAttribute("aria-label"),
    ).toBe("Open the knowledge X-Ray");
    expect(
      document.querySelector(
        '[data-guide-feature="diagnostic"] .lh-feature-name',
      ).textContent,
    ).toBe("X-Ray / Diagnostic");
    expect(
      document.querySelector('[data-guide-feature="tips"] .lh-feature-name')
        .textContent,
    ).toBe("Tips");
    expect(
      document.querySelector(
        '[data-guide-feature="pomodoro"] .lh-feature-desc',
      ).textContent,
    ).toBe("Open the focus session available in the platform header.");

    initializeUI("pt");
    expect(
      document.querySelector("#home-start-simulation span").textContent,
    ).toBe("Simular agora");
    expect(
      document
        .getElementById("home-start-diagnostic")
        .getAttribute("aria-label"),
    ).toBe("Abrir o Raio-X de conhecimento");
    expect(
      document.querySelector(
        '[data-guide-feature="diagnostic"] .lh-feature-name',
      ).textContent,
    ).toBe("Raio-X / Diagnóstico");
  });

  test("mistakes is informative and does not expose the obsolete hash route", () => {
    const mistakes = homeDocument.querySelector(
      '[data-guide-feature="mistakes"]',
    );

    expect(mistakes.tagName).toBe("ARTICLE");
    expect(mistakes.hasAttribute("href")).toBe(false);
    expect(mistakes.hasAttribute("onclick")).toBe(false);
    expect(homeHtml).not.toContain("simulados.html#mistakes");
  });

  test("Pomodoro guide control opens the existing widget through one module listener", () => {
    const pomodoro = homeDocument.getElementById("home-guide-pomodoro");
    const binding = 'bindClick("home-guide-pomodoro", togglePomodoroWidget);';

    expect(pomodoro.tagName).toBe("BUTTON");
    expect(pomodoro.getAttribute("type")).toBe("button");
    expect(pomodoro.hasAttribute("onclick")).toBe(false);
    expect(appSource.split(binding)).toHaveLength(2);
  });
});
