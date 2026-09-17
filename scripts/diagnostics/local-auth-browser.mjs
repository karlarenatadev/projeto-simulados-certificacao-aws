// Read-only local transport probe. Never supplies a real Google credential.
import { chromium } from "@playwright/test";
import { config } from "dotenv";
config({ quiet: true });
const expectedClientId = String(process.env.GOOGLE_CLIENT_ID || "").trim();
const browser = await chromium.launch({ headless: true });
try {
  for (const hostname of ["127.0.0.1", "localhost"]) {
    const page = await browser.newPage();
    let originNotAllowed = false,
      coopWarning = false,
      googleButton403 = false;
    page.on("console", (message) => {
      const text = message.text();
      originNotAllowed ||= text.includes("origin is not allowed");
      coopWarning ||= text.includes("Cross-Origin-Opener-Policy");
    });
    page.on("response", (response) => {
      const url = new URL(response.url());
      googleButton403 ||=
        url.hostname === "accounts.google.com" &&
        url.pathname.includes("button") &&
        response.status() === 403;
    });
    await page.goto(`http://${hostname}:8080`, {
      waitUntil: "domcontentloaded",
    });
    await page.waitForFunction(() => !!globalThis.__APP_CONFIG__);
    await page.waitForTimeout(4000);
    const result = await page.evaluate(async (expected) => {
      const { getApiBaseUrl } = await import("/js/services/apiConfig.js");
      const base = getApiBaseUrl();
      let health, corsOrigin, googlePost;
      try {
        const response = await fetch(`${base}/api/health`);
        health = response.status;
        corsOrigin = response.type;
      } catch {
        health = "connection-failed";
      }
      try {
        const response = await fetch(`${base}/api/auth/google`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        });
        googlePost = response.status; // Expected 400: only transport, not real login.
      } catch {
        googlePost = "connection-failed";
      }
      return {
        origin: location.origin,
        googleClientIdConfigured: !!globalThis.__APP_CONFIG__.googleClientId,
        frontendBackendEqual:
          !!expected && globalThis.__APP_CONFIG__.googleClientId === expected,
        apiBaseUrl: base,
        health,
        corsResponseType: corsOrigin,
        googlePost,
        gisLoaded: !!globalThis.google?.accounts?.id,
      };
    }, expectedClientId);
    console.log(
      JSON.stringify({
        ...result,
        originNotAllowed,
        googleButton403,
        coopWarning,
      }),
    );
    await page.close();
  }
} finally {
  await browser.close();
}
