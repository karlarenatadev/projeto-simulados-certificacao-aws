import { expect, test } from "@playwright/test";

async function fixture(
  page,
  {
    id = "A",
    local = false,
    expiresIn = -1000,
    resultUser = "A",
    owner = null,
    status = "unclaimed",
    failSync = false,
    language = "pt",
  } = {},
) {
  const states = new Map(),
    requests = [];
  const server = { owner, status, failSync };
  await page.route("**/js/runtimeConfig.js*", (route) =>
    route.fulfill({
      contentType: "text/javascript",
      body: 'window.__APP_CONFIG__={googleClientId:"fixture.apps.googleusercontent.com"};',
    }),
  );
  await page.route("https://accounts.google.com/gsi/client", (route) =>
    route.fulfill({
      contentType: "text/javascript",
      body: `let config; window.google={accounts:{id:{initialize(c){config=c},renderButton(node){const b=document.createElement('button');b.textContent='Google fixture';b.onclick=()=>config.callback({credential:'fixture'});node.append(b)}}}};`,
    }),
  );
  await page.route("**/api/**", async (route) => {
    const req = route.request(),
      url = new URL(req.url()),
      body = req.postDataJSON();
    const current = req.headers().authorization?.replace("Bearer fixture-", "");
    requests.push({ path: url.pathname, method: req.method(), body, current });
    const send = (data, status = 200) =>
      route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(
          status < 400 ? { success: true, data } : { error: data },
        ),
      });
    if (url.pathname === "/api/auth/google")
      return send({
        id: resultUser,
        email: "fixture@a3data.com.br",
        role: "STUDENT",
        access_token: `fixture-${resultUser}`,
        expires_in: 28800,
      });
    if (url.pathname.includes("/local-links")) {
      if (server.owner && server.owner !== current)
        return send("local_identity_already_linked", 409);
      if (url.pathname.endsWith("/claim")) {
        server.owner = current;
        server.status = "pending";
      }
      if (url.pathname.endsWith("/complete")) {
        expect(body.receipts).toHaveLength(20);
        server.status = "completed";
      }
      return send({
        status: server.status,
        ownedByCurrentUser: !!server.owner,
        migrationVersion: 1,
      });
    }
    if (url.pathname.includes("/state/")) {
      const key = `${current}:${url.pathname}:${body?.certification || url.searchParams.get("certification")}`;
      if (req.method() === "PUT") {
        if (server.failSync) return send("offline", 503);
        states.set(key, {
          state_json: body.state,
          version: (body.version || 0) + 1,
        });
      }
      return send(states.get(key) || null);
    }
    if (url.pathname === "/api/auth/me" || url.pathname === "/api/me/profile")
      return send({
        id: current,
        role: "STUDENT",
        preferences: { language, certification: "clf-c02" },
      });
    return send([]);
  });
  await page.addInitScript(
    ({ id, local, expiresIn, language }) => {
      if (localStorage.getItem("cloudacademy_session")) return;
      localStorage.setItem(
        "cloudacademy_session",
        JSON.stringify({
          user: { id, role: "student", language, certification: "clf-c02" },
          provider: local ? "local" : "google",
          authenticationMode: local ? "offline" : "online",
          accessToken: local ? null : `fixture-${id}`,
          expiresAt: new Date(Date.now() + expiresIn).toISOString(),
        }),
      );
      localStorage.setItem(
        `aws_sim_user:${id}:mistakes`,
        JSON.stringify({
          "clf-c02": {
            q1: {
              questionId: "q1",
              certId: "clf-c02",
              wrongCount: 2,
              resolved: false,
              question: "Source progress",
            },
          },
        }),
      );
    },
    { id, local, expiresIn, language },
  );
  return { requests, server };
}
async function signIn(page) {
  const openDialog = page.locator("#auth-session-dialog[open]");
  const context = (await openDialog.count())
    ? openDialog
    : page.locator("#auth-session-notice");
  await context
    .getByRole("button", { name: "Entrar novamente", exact: true })
    .click();
  await Promise.all([
    page.waitForNavigation({ waitUntil: "domcontentloaded" }),
    page.getByRole("button", { name: "Google fixture" }).click(),
  ]);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("cloudacademy_session"))
            .authenticationMode,
      ),
    )
    .toBe("online");
  await expect(page.locator("#auth-session-dialog")).not.toBeVisible();
}
test("clock expiry -> accessible offline continuation; no remote sync", async ({
  page,
}) => {
  await page.clock.install();
  const { requests } = await fixture(page, { expiresIn: 60000 });
  await page.goto("flashcards.html");
  await expect(page.locator("#auth-session-notice")).toBeAttached();
  await page.clock.runFor(61000);
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Sua sessão expirou." }),
  ).toBeVisible();
  await expect(
    page.getByRole("dialog").getByRole("button", { name: "Entrar novamente" }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("button", { name: "Continuar offline" }),
  ).toBeFocused();
  await page.screenshot({ path: "test-results/auth-expired-desktop.png" });
  await page.getByRole("button", { name: "Continuar offline" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("cloudacademy_session")).user.id,
    ),
  ).toBe("A");
  expect(
    requests.filter(
      (r) => r.path.includes("/me/state") || r.path.includes("local-links"),
    ),
  ).toEqual([]);
});
test("English mobile expiry supports keyboard continuation", async ({
  page,
}) => {
  await fixture(page, { language: "en" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("flashcards.html");
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("button", { name: "Sign in again" }),
  ).toBeFocused();
  await expect(
    dialog.getByRole("button", { name: "Continue offline" }),
  ).toBeVisible();
  await page.screenshot({ path: "test-results/auth-expired-mobile-en.png" });
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("cloudacademy_session"))
          .authenticationMode,
    ),
  ).toBe("offline-expired");
});
for (const resultUser of ["A", "B"]) {
  test(`expired A -> Google ${resultUser}: namespace isolation`, async ({
    page,
  }) => {
    const { requests } = await fixture(page, { resultUser });
    await page.goto("flashcards.html");
    await expect(page.getByRole("dialog")).toBeVisible();
    await signIn(page);
    expect(
      await page.evaluate(
        () => JSON.parse(localStorage.getItem("cloudacademy_session")).user.id,
      ),
    ).toBe(resultUser);
    expect(requests.filter((r) => r.path.includes("local-links"))).toEqual([]);
    const writes = requests.filter((r) => r.method === "PUT");
    if (resultUser === "A")
      expect(writes.some((r) => JSON.stringify(r.body).includes("q1"))).toBe(
        true,
      );
    else
      expect(writes.some((r) => JSON.stringify(r.body).includes("q1"))).toBe(
        false,
      );
    expect(
      await page.evaluate(() =>
        localStorage.getItem("aws_sim_user:A:mistakes"),
      ),
    ).toContain("q1");
  });
}
test("GIS local -> A pending, refresh resumes and completes compatible scopes", async ({
  page,
}) => {
  const { server, requests } = await fixture(page, {
    id: "local_source",
    local: true,
    failSync: true,
  });
  await page.goto("flashcards.html");
  await signIn(page);
  await expect(page.locator("#auth-session-notice")).toContainText(
    "aguarda sincronização",
  );
  expect(server.status).toBe("pending");
  server.failSync = false;
  await page.reload();
  await expect.poll(() => server.status).toBe("completed");
  await expect(page.locator("#auth-session-notice")).toContainText(
    "compatível foi sincronizado",
  );
  expect(
    requests.findIndex((r) => r.path.endsWith("/auth/google")),
  ).toBeLessThan(requests.findIndex((r) => r.path.endsWith("/claim")));
  expect(
    await page.evaluate(() =>
      localStorage.getItem("aws_sim_user:local_source:mistakes"),
    ),
  ).toContain("q1");
});
test("GIS B conflict keeps B authenticated; mobile dark notice has no owner details", async ({
  page,
}) => {
  const { requests } = await fixture(page, {
    id: "local_source",
    local: true,
    resultUser: "B",
    owner: "A",
    status: "completed",
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("flashcards.html");
  await signIn(page);
  await page.evaluate(() => document.documentElement.classList.add("dark"));
  await expect(page.locator("#auth-session-notice")).toContainText(
    "outra conta",
  );
  const geometry = await page
    .locator("#auth-session-notice")
    .evaluate((node) => {
      const box = node.getBoundingClientRect(),
        css = getComputedStyle(node);
      return {
        contained: box.x >= 0 && box.right <= innerWidth,
        x: box.x,
        width: box.width,
        viewport: innerWidth,
        sizing: css.boxSizing,
        padding: css.padding,
      };
    });
  expect(geometry, JSON.stringify(geometry)).toMatchObject({ contained: true });
  await expect(
    page.getByRole("button", { name: "Continuar com esta conta" }),
  ).toBeVisible();
  expect(requests.filter((r) => r.method === "PUT")).toEqual([]);
  await page.screenshot({ path: "test-results/auth-conflict-mobile.png" });
});
