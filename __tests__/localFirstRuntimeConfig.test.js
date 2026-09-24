import { createRequire } from "node:module";

const load = createRequire(import.meta.url);
const {
  createPublicConfig,
  renderPublicConfig,
} = load("../scripts/public-runtime-config.cjs");

describe("local-first public runtime configuration", () => {
  test("does not require a backend", () => {
    expect(createPublicConfig({ PUBLIC_BUILD_TARGET: "local-first" })).toEqual(
      {
        googleClientId: "",
        apiBaseUrl: "",
        allowDevEmailLogin: false,
        localFirst: true,
      },
    );
  });

  test("connected distribution builds remain strict", () => {
    expect(() => createPublicConfig({ PUBLIC_BUILD_TARGET: "pages" })).toThrow(
      /GOOGLE_CLIENT_ID/,
    );
    expect(
      createPublicConfig({
        PUBLIC_BUILD_TARGET: "pages",
        GOOGLE_CLIENT_ID: "client.apps.googleusercontent.com",
        PUBLIC_API_BASE_URL: "https://api.example.test",
      }),
    ).toEqual({
      googleClientId: "client.apps.googleusercontent.com",
      apiBaseUrl: "https://api.example.test",
      allowDevEmailLogin: false,
    });
  });

  test("artifact contains no private configuration", () => {
    const artifact = renderPublicConfig({ PUBLIC_BUILD_TARGET: "local-first" });
    expect(artifact).toContain('"localFirst":true');
    expect(artifact).not.toContain("AUTH_SESSION_SECRET");
  });
});
