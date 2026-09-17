import { expect, test } from "@playwright/test";

for (const hostname of ["127.0.0.1", "localhost"]) {
  test(`Google API request preserves ${hostname} (actual final request URL)`, async ({
    page,
    baseURL,
  }) => {
    const frontend = new URL(baseURL);
    frontend.hostname = hostname;
    // Intercept only the backend boundary; inspect the final URL chosen by apiService.
    let requested;
    await page.route("**/api/auth/google", async (route) => {
      requested = route.request().url();
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: '{"error":"credential_required"}',
      });
    });
    await page.goto(new URL("flashcards.html", frontend).href);
    await page.evaluate(async () => {
      const { apiService } = await import("./js/services/api.js");
      try {
        await apiService.loginWithGoogle("");
      } catch {
        /* Expected fixture rejection. */
      }
    });
    expect(requested).toBe(`http://${hostname}:3001/api/auth/google`);
  });
}
