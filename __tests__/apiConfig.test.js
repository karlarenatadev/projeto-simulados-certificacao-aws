import { resolveApiBaseUrl } from "../src/frontend/js/services/apiConfig.js";

test.each(["127.0.0.1", "localhost"])(
  "local %s preserves the browser host on port 3001",
  (hostname) => {
    expect(resolveApiBaseUrl({ hostname, protocol: "http:" })).toBe(
      `http://${hostname}:3001`,
    );
  },
);
test("production uses only a configured backend, never implicit visitor loopback", () => {
  const hostname = "karlarenatadev.github.io";
  expect(resolveApiBaseUrl({ hostname })).toBe("");
  expect(
    resolveApiBaseUrl({ hostname, configuredUrl: "https://api.example.com/" }),
  ).toBe("https://api.example.com");
  for (const configuredUrl of [
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    "javascript:alert(1)",
    "https://user:secret@example.com",
  ]) {
    expect(resolveApiBaseUrl({ hostname, configuredUrl })).toBe("");
  }
});
test("explicit offline remains disabled even with configured API", () => {
  expect(
    resolveApiBaseUrl({
      hostname: "localhost",
      configuredUrl: "https://api.example.com",
      forceOffline: true,
    }),
  ).toBe("");
});
