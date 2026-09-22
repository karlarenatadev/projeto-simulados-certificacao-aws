import { expect, test } from "@playwright/test";
import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const { renderPublicConfig } = require("../scripts/public-runtime-config.cjs");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const prefix = "/projeto-simulados-certificacao-aws/";
const configured = {
  PUBLIC_BUILD_TARGET: "pages",
  GOOGLE_CLIENT_ID: "fixture.apps.googleusercontent.com",
  PUBLIC_API_BASE_URL: "https://api.example.test",
};

test("browser receives the emitted runtimeConfig.js artifact", async ({
  page,
}) => {
  const expected = {};
  vm.runInNewContext(
    await fs.readFile(path.join(root, "public/js/runtimeConfig.js"), "utf8"),
    expected,
  );
  await page.route("**/runtime-artifact.html", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: '<!doctype html><html><head><script src="./js/runtimeConfig.js"></script></head><body></body></html>',
    }),
  );
  await page.goto("runtime-artifact.html");
  const actual = await page.evaluate(() => window.__APP_CONFIG__);
  expect(actual).toEqual(expected.__APP_CONFIG__);
  if (process.env.PUBLIC_BUILD_TARGET === "pages") {
    expect(actual.googleClientId).toBe(process.env.GOOGLE_CLIENT_ID.trim());
    expect(actual.apiBaseUrl).toBe(process.env.PUBLIC_API_BASE_URL.trim());
    expect(actual.googleClientId).not.toBe("");
    expect(actual.apiBaseUrl).not.toBe("");
  }
});

// Simulates deployment revisions using the unchanged SW source. This server
// never touches an installed profile, external OAuth or production services.
async function fixtureServer() {
  const sw = await fs.readFile(
    path.join(root, "src/frontend/pwa/sw.js"),
    "utf8",
  );
  const revision = { config: false, worker: false };
  const server = http.createServer(async (req, res) => {
    const pathname = new URL(req.url, "http://localhost").pathname;
    if (!pathname.startsWith(prefix)) {
      res.writeHead(404).end();
      return;
    }
    const relative = pathname.slice(prefix.length);
    let body;
    try {
      if (relative === "fixture.html") {
        body =
          '<!doctype html><html><head><script src="./js/runtimeConfig.js"></script></head><body><div id="google-login-container"></div></body></html>';
      } else if (relative === "js/runtimeConfig.js") {
        body = renderPublicConfig(revision.config ? configured : {});
      } else if (relative === "sw.js") {
        body = sw.replaceAll(
          "__CACHE_VERSION__",
          revision.worker ? "config-new-fixture" : "config-old-fixture",
        );
      } else {
        const target = path.resolve(root, "public", relative || "index.html");
        if (!target.startsWith(path.join(root, "public") + path.sep))
          throw new Error("invalid path");
        body = await fs.readFile(target);
      }
      res.writeHead(200, {
        "Content-Type": relative.endsWith(".js")
          ? "text/javascript"
          : relative.endsWith(".json")
            ? "application/json"
            : relative.endsWith(".css")
              ? "text/css"
              : "text/html",
        "Cache-Control": "no-store",
      });
      res.end(body);
    } catch {
      res.writeHead(404).end();
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  return {
    revision,
    url: `http://127.0.0.1:${server.address().port}${prefix}fixture.html`,
    close: () =>
      new Promise((resolve) => {
        server.close(resolve);
        server.closeAllConnections();
      }),
  };
}

async function controlWithOldWorker(page, fixture) {
  await page.goto(fixture.url);
  await page.evaluate(async () => {
    await navigator.serviceWorker.register("./sw.js");
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller)
      await new Promise((resolve) =>
        navigator.serviceWorker.addEventListener("controllerchange", resolve, {
          once: true,
        }),
      );
  });
  await page.reload();
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const cached = await caches.match(
          new URL("./js/runtimeConfig.js", location.href),
        );
        return cached?.text();
      }),
    )
    .toContain('"googleClientId":""');
}

test("generated public config reaches GIS and API client under the Pages subpath", async ({
  page,
}) => {
  const fixture = await fixtureServer();
  try {
    fixture.revision.config = true;
    await page.goto(fixture.url);
    const result = await page.evaluate(async () => {
      let received;
      globalThis.google = {
        accounts: {
          id: {
            initialize: (options) => {
              received = options.client_id;
            },
            renderButton: () => {},
          },
        },
      };
      const { initializeGoogleLogin } =
        await import("./js/services/googleIdentity.js");
      const { getApiBaseUrl } = await import("./js/services/apiConfig.js");
      await initializeGoogleLogin();
      return { received, api: getApiBaseUrl(), config: window.__APP_CONFIG__ };
    });
    expect(result).toEqual({
      received: configured.GOOGLE_CLIENT_ID,
      api: configured.PUBLIC_API_BASE_URL,
      config: {
        googleClientId: configured.GOOGLE_CLIENT_ID,
        apiBaseUrl: configured.PUBLIC_API_BASE_URL,
        allowDevEmailLogin: false,
      },
    });
  } finally {
    await fixture.close();
  }
});

test("existing SW can serve old config once then use the refreshed cache on the second load", async ({
  page,
}) => {
  const fixture = await fixtureServer();
  try {
    await controlWithOldWorker(page, fixture);
    fixture.revision.config = true;
    // Hold the worker revision constant to model delayed update discovery.
    await page.reload();
    expect(
      await page.evaluate(() => window.__APP_CONFIG__.googleClientId),
    ).toBe("");
    await expect
      .poll(() =>
        page.evaluate(async () => {
          const cached = await caches.match(
            new URL("./js/runtimeConfig.js", location.href),
          );
          return cached?.text();
        }),
      )
      .toContain(configured.GOOGLE_CLIENT_ID);
    await page.reload();
    expect(
      await page.evaluate(() => window.__APP_CONFIG__.googleClientId),
    ).toBe(configured.GOOGLE_CLIENT_ID);
  } finally {
    await fixture.close();
  }
});

test("after a new worker activates the next load uses the new runtime config", async ({
  page,
}) => {
  const fixture = await fixtureServer();
  try {
    await controlWithOldWorker(page, fixture);
    fixture.revision.config = true;
    fixture.revision.worker = true;
    await page.evaluate(async () => {
      const changed = new Promise((resolve) =>
        navigator.serviceWorker.addEventListener("controllerchange", resolve, {
          once: true,
        }),
      );
      const registration = await navigator.serviceWorker.getRegistration();
      await registration.update();
      await changed;
    });
    await page.reload();
    expect(
      await page.evaluate(() => window.__APP_CONFIG__.googleClientId),
    ).toBe(configured.GOOGLE_CLIENT_ID);
    expect(await page.evaluate(() => caches.keys())).not.toContain(
      "cloudacademy-a3-config-old-fixture",
    );
  } finally {
    await fixture.close();
  }
});
