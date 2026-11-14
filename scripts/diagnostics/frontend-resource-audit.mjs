// Browser footprint only: no external traffic and no production API.
import { chromium } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import { createPublicServer } from "../../e2e/serve-public.mjs";

const server = createPublicServer().listen(0, "127.0.0.1");
await new Promise((resolve) => server.once("listening", resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
let browser;
try {
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ serviceWorkers: "block" });
  const blocked = new Set();
  await context.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (url.origin === origin) return route.continue();
    blocked.add(url.origin);
    return route.abort();
  });
  await context.addInitScript(() => {
    sessionStorage.setItem("force_offline", "true");
    localStorage.setItem(
      "cloudacademy_session",
      JSON.stringify({
        user: {
          id: "synthetic-footprint",
          name: "Synthetic",
          role: "STUDENT",
          provider: "local",
          certification: "clf-c02",
          language: "pt",
        },
        authenticationMode: "offline",
        provider: "local",
        version: 1,
      }),
    );
  });
  const results = [];
  for (const path of [
    "index.html",
    "simulados.html",
    "diagnostico.html",
    "flashcards.html",
    "cases.html",
    "laboratorios.html",
  ]) {
    const page = await context.newPage();
    await page.goto(`${origin}/${path}`, { waitUntil: "networkidle" });
    const cdp = await context.newCDPSession(page);
    await cdp.send("Performance.enable");
    const metrics = Object.fromEntries(
      (await cdp.send("Performance.getMetrics")).metrics.map((item) => [
        item.name,
        item.value,
      ]),
    );
    const resources = await page.evaluate(() => {
      const entries = performance.getEntriesByType("resource");
      const sameOrigin = entries.filter(
        (entry) => new URL(entry.name).origin === location.origin,
      );
      const counts = new Map();
      for (const entry of sameOrigin)
        counts.set(entry.name, (counts.get(entry.name) || 0) + 1);
      return {
        requests: sameOrigin.length,
        encodedBodyBytes: sameOrigin.reduce((n, e) => n + e.encodedBodySize, 0),
        transferBytes: sameOrigin.reduce((n, e) => n + e.transferSize, 0),
        duplicateResources: [...counts]
          .filter(([, count]) => count > 1)
          .map(([url, count]) => ({ path: new URL(url).pathname, count })),
        navigation: performance
          .getEntriesByType("navigation")
          .map((n) => ({
            domContentLoadedMs: n.domContentLoadedEventEnd,
            loadMs: n.loadEventEnd,
            transferBytes: n.transferSize,
          })),
      };
    });
    results.push({
      path,
      jsHeapUsedBytes: metrics.JSHeapUsedSize,
      jsHeapTotalBytes: metrics.JSHeapTotalSize,
      domNodes: metrics.Nodes,
      ...resources,
    });
    await page.close();
  }
  await writeFile(
    new URL(
      "../../docs/audits/evidence/2026-10-13/frontend-resources.json",
      import.meta.url,
    ),
    JSON.stringify(
      {
        recordedAt: new Date().toISOString(),
        results,
        blockedOrigins: [...blocked],
        limitations:
          "Local offline session; external CDNs/API and service worker blocked. JS heap is not browser RSS. Resources exclude the HTML navigation itself, shown separately. No server compression.",
      },
      null,
      2,
    ) + "\n",
  );
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
