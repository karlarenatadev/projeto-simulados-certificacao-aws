import { expect, test } from "@playwright/test";

test.describe("public local-first access", () => {
  test("starts a local student session without Google or API calls", async ({
    page,
  }) => {
    const authRequests = [];
    page.on("request", (request) => {
      if (request.url().includes("/api/auth/")) authRequests.push(request.url());
    });

    await page.goto("index.html");
    const continueButton = page.getByRole("button", {
      name: "Continuar estudando sem conta",
    });
    await expect(continueButton).toBeVisible();
    await expect(page.locator("#google-login-section")).toBeHidden();

    await continueButton.click();
    await expect(page.locator("#login-overlay")).toBeHidden();
    await expect(page.locator("#cloud-sidebar-toggle")).toBeAttached();
    const session = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("cloudacademy_session")),
    );
    expect(session.authenticationMode).toBe("offline");
    expect(session.provider).toBe("local");
    expect(session.user.role.toLowerCase()).toBe("student");
    expect(authRequests).toEqual([]);
  });

  test("keeps the local session and progress after reload", async ({ page }) => {
    await page.goto("index.html");
    await page
      .getByRole("button", { name: "Continuar estudando sem conta" })
      .click();
    const snapshot = await page.evaluate(() => {
      const session = JSON.parse(localStorage.getItem("cloudacademy_session"));
      localStorage.setItem(
        `aws_sim_user:${session.user.id}:local-first-regression`,
        JSON.stringify({ completed: true }),
      );
      return { id: session.user.id };
    });

    await page.reload();
    await expect(page.locator("#login-overlay")).toBeHidden();
    await expect
      .poll(() =>
        page.evaluate(
          (id) =>
            JSON.parse(
              localStorage.getItem(`aws_sim_user:${id}:local-first-regression`),
            )?.completed,
          snapshot.id,
        ),
      )
      .toBe(true);
    expect(
      await page.evaluate(
        () => JSON.parse(localStorage.getItem("cloudacademy_session")).user.id,
      ),
    ).toBe(snapshot.id);
  });
});
