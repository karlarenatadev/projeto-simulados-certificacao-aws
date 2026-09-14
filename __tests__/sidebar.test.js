/** @jest-environment jsdom */

import { beforeEach, describe, expect, test } from "@jest/globals";
import {
  ADMIN_MENU_STORAGE_KEY,
  buildSidebar,
  renderUserMenu,
} from "../src/frontend/js/shell.js";
import { initializeUI } from "../src/frontend/js/i18n/initUI.js";
import { storageManager } from "../src/frontend/js/storageManager.js";

describe("role-aware administrative sidebar", () => {
  beforeEach(() => {
    document.body.innerHTML =
      '<nav id="left-sidebar"><div class="left-sidebar-nav"></div></nav>';
    document.body.className = "";
    localStorage.clear();
    window.history.replaceState({}, "", "/index.html");
  });

  test("STUDENT has no validation or admin group", () => {
    buildSidebar({ role: "STUDENT" });
    expect(document.getElementById("sidebar-btn-validation")).toBeNull();
    expect(document.getElementById("sidebar-admin-toggle")).toBeNull();
    expect(document.getElementById("sidebar-btn-users")).toBeNull();
    expect(document.getElementById("sidebar-btn-history")).toBeNull();
  });

  test("Erros is a visible route to the real quiz UI, including with no mistakes", () => {
    buildSidebar({ role: "STUDENT" });
    const item = document.getElementById("sidebar-btn-mistakes");
    expect(item.tagName).toBe("A");
    expect(item.getAttribute("href")).toBe("/simulados.html?mode=mistakes");
    expect(item.classList.contains("hidden")).toBe(false);
    expect(item.getAttribute("aria-label")).toBeTruthy();

    window.history.replaceState(
      {},
      "",
      "/projeto-simulados-certificacao-aws/index.html",
    );
    buildSidebar({ role: "STUDENT" });
    expect(
      document.getElementById("sidebar-btn-mistakes").getAttribute("href"),
    ).toBe("/projeto-simulados-certificacao-aws/simulados.html?mode=mistakes");
  });

  test("Erros badge reads the saved count on pages that only load the shell", () => {
    storageManager.recordMistake(
      { questionId: "error-1", question: "Q", options: ["A", "B"], correct: 0 },
      1,
      { certId: "clf-c02" },
    );
    window.history.replaceState({}, "", "/dicas-prova.html");
    buildSidebar({ role: "STUDENT" });
    expect(document.getElementById("sidebar-mistakes-count").textContent).toBe(
      "1",
    );
  });

  test.each([
    ["pt", "Dicas", "Dicas de prova e certificação"],
    ["en", "Tips", "Exam and certification tips"],
  ])(
    "renders the Exam Tips item in %s with an accessible description",
    (language, visualLabel, accessibleLabel) => {
      localStorage.setItem("language", language);
      buildSidebar({ role: "STUDENT" });

      const item = document.getElementById("sidebar-btn-exam-tips");
      expect(item.tagName).toBe("A");
      expect(item.querySelector(".left-sidebar-item-label").textContent).toBe(
        visualLabel,
      );
      expect(item.getAttribute("aria-label")).toBe(accessibleLabel);
      expect(item.getAttribute("title")).toBe(accessibleLabel);

      document.body.classList.add("sidebar-closed");
      expect(item.getAttribute("aria-label")).toBe(accessibleLabel);
    },
  );

  test("updates the Exam Tips labels without rebuilding the sidebar", () => {
    buildSidebar({ role: "STUDENT" });
    const item = document.getElementById("sidebar-btn-exam-tips");

    initializeUI("en");
    expect(item.querySelector(".left-sidebar-item-label").textContent).toBe(
      "Tips",
    );
    expect(item.getAttribute("aria-label")).toBe("Exam and certification tips");
    expect(item.getAttribute("title")).toBe("Exam and certification tips");

    initializeUI("pt");
    expect(item.querySelector(".left-sidebar-item-label").textContent).toBe(
      "Dicas",
    );
    expect(item.getAttribute("aria-label")).toBe(
      "Dicas de prova e certificação",
    );
    expect(item.getAttribute("title")).toBe("Dicas de prova e certificação");
  });

  test.each([
    ["pt", "Pomodoro", "Abrir sessão de foco Pomodoro"],
    ["en", "Pomodoro", "Open the Pomodoro focus session"],
  ])(
    "exposes the Pomodoro tool in %s with an accessible label",
    (language, visualLabel, accessibleLabel) => {
      localStorage.setItem("language", language);
      document.body.insertAdjacentHTML(
        "beforeend",
        '<div id="pomodoro-widget" class="hidden" aria-hidden="true"><button id="btn-pomodoro-toggle"></button><span id="pomodoro-display"></span></div>',
      );
      buildSidebar({ role: "STUDENT" });

      const item = document.getElementById("sidebar-btn-pomodoro");
      const sprint = document.getElementById("sidebar-btn-sprint");
      const mistakes = document.getElementById("sidebar-btn-mistakes");
      expect(item.tagName).toBe("BUTTON");
      expect(item.querySelector(".left-sidebar-item-label").textContent).toBe(
        visualLabel,
      );
      expect(item.getAttribute("aria-label")).toBe(accessibleLabel);
      expect(item.getAttribute("title")).toBe(accessibleLabel);
      expect(
        sprint.compareDocumentPosition(item) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      expect(
        item.compareDocumentPosition(mistakes) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();

      item.click();
      expect(
        document.getElementById("pomodoro-widget").classList.contains("hidden"),
      ).toBe(false);
      document.body.classList.add("sidebar-closed");
      expect(item.getAttribute("aria-label")).toBe(accessibleLabel);
    },
  );

  test("VALIDATOR sees Validation and History without the admin group", () => {
    buildSidebar({ role: "VALIDATOR" });
    expect(document.getElementById("sidebar-btn-validation")).not.toBeNull();
    expect(document.getElementById("sidebar-btn-history")).not.toBeNull();
    expect(document.getElementById("sidebar-admin-toggle")).toBeNull();
    expect(document.getElementById("sidebar-btn-users")).toBeNull();
  });

  test("ADMIN gets a collapsible group with real page destinations", () => {
    window.history.replaceState({}, "", "/validation/users.html");
    buildSidebar({ role: "ADMIN" });
    const toggle = document.getElementById("sidebar-admin-toggle");
    const users = document.getElementById("sidebar-btn-users");
    expect(toggle).not.toBeNull();
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(toggle.getAttribute("aria-controls")).toBe("sidebar-admin-menu");
    expect(users.getAttribute("href")).toBe("/validation/users.html");
    expect(users.tagName).toBe("A");
    expect(users.querySelector("i").className).toContain("fa-users");
    expect(
      document.querySelector("#sidebar-btn-validation i").className,
    ).toContain("fa-circle-check");
    expect(
      document.querySelector("#sidebar-btn-history i").className,
    ).toContain("fa-clock-rotate-left");
    expect(
      document.querySelector("#sidebar-btn-profile i").className,
    ).toContain("fa-circle-user");
    expect(
      document.querySelector("#sidebar-btn-settings i").className,
    ).toContain("fa-sliders");
    expect(users.classList.contains("is-active")).toBe(true);
    expect(
      document.getElementById("sidebar-btn-validation").getAttribute("href"),
    ).toBe("/validation/valid.html");
    expect(
      document.getElementById("sidebar-btn-profile").getAttribute("href"),
    ).toBe("/profile.html");
    expect(
      document.getElementById("sidebar-btn-settings").getAttribute("href"),
    ).toBe("/settings.html");
    toggle.click();
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(localStorage.getItem(ADMIN_MENU_STORAGE_KEY)).toBe("true");
  });

  test("Users link points to the dedicated page from Validation", () => {
    window.history.replaceState({}, "", "/validation/valid.html");
    buildSidebar({ role: "ADMIN" });
    expect(
      document.getElementById("sidebar-btn-users").getAttribute("href"),
    ).toBe("/validation/users.html");
    expect(window.location.pathname).toBe("/validation/valid.html");
    expect(window.location.hash).toBe("");
  });

  test("ADMIN preference is restored while active route remains visible", () => {
    localStorage.setItem(ADMIN_MENU_STORAGE_KEY, "true");
    buildSidebar({ role: "ADMIN" });
    expect(
      document
        .getElementById("sidebar-admin-toggle")
        .getAttribute("aria-expanded"),
    ).toBe("false");
    expect(document.getElementById("sidebar-admin-menu").hidden).toBe(true);
  });
});

describe("secure user menu rendering", () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="user-menu-container"></div>';
    localStorage.clear();
  });

  test("renders profile values as text and preserves the menu structure", () => {
    renderUserMenu({
      nickname: "Karla Renata",
      full_name: "Karla Renata",
      email: "karla@a3data.com.br",
      role: "STUDENT",
    });

    expect(document.querySelector(".a3-user-name").textContent).toBe(
      "Karla Renata",
    );
    expect(document.querySelector(".a3-dropdown-email").textContent).toBe(
      "karla@a3data.com.br",
    );
    expect(document.querySelector(".a3-user-menu")).not.toBeNull();
    expect(document.getElementById("user-menu-profile")).not.toBeNull();
    expect(document.getElementById("user-menu-settings")).not.toBeNull();
    expect(document.getElementById("user-menu-logout")).not.toBeNull();
  });

  test.each([
    "<b>Karla</b>",
    '<img src=x onerror="window.__xss = true">',
    "Karla & Renata <AWS>",
  ])("does not parse profile HTML payload %s", (payload) => {
    renderUserMenu({
      nickname: payload,
      email: "user@a3data.com.br",
      role: "ADMIN",
    });

    expect(document.querySelector(".a3-user-name").textContent).toBe(payload);
    expect(document.querySelector(".a3-dropdown-name").textContent).toBe(
      payload,
    );
    expect(document.querySelector("img")).toBeNull();
    expect(document.querySelector("b")).toBeNull();
    expect(window.__xss).toBeUndefined();
  });

  test("sets title through the DOM API and keeps quotes as text", () => {
    const displayName = 'Karla "Cloud"';
    renderUserMenu({ nickname: displayName, email: "user@a3data.com.br" });

    const name = document.querySelector(".a3-user-name");
    expect(name.textContent).toBe(displayName);
    expect(name.title).toBe(displayName);
  });

  test.each([
    ["STUDENT", "a3-role-student"],
    ["VALIDATOR", "a3-role-validator"],
    ["ADMIN", "a3-role-admin"],
  ])("preserves the safe role class for %s", (role, expectedClass) => {
    renderUserMenu({ email: "user@a3data.com.br", role });

    expect(
      document.querySelector(".a3-user-role").classList.contains(expectedClass),
    ).toBe(true);
  });

  test("keeps the existing fallback for empty profile values and Unicode initials", () => {
    renderUserMenu({ nickname: "", full_name: "", email: "ø@a3data.com.br" });

    expect(document.querySelector(".a3-user-name").textContent).toBe(
      "ø@a3data.com.br",
    );
    expect(document.querySelector(".a3-avatar").textContent).toBe("Ø");
  });
});
