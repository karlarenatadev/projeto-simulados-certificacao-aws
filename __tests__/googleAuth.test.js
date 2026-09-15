/** @jest-environment node */

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  jest,
  test,
} from "@jest/globals";

const verifyIdToken = jest.fn();
jest.unstable_mockModule("google-auth-library", () => ({
  OAuth2Client: jest.fn(() => ({ verifyIdToken })),
}));

process.env.GOOGLE_CLIENT_ID = "client.apps.googleusercontent.com";
const { verifyGoogleIdToken } =
  await import("../backend/api/services/googleIdentity.js");
const {
  closeDatabase,
  initializeDatabase,
  resolveGoogleIdentity,
  upsertUserByEmail,
  updateUser,
} = await import("../backend/database/db.js");

describe("Google OIDC verification", () => {
  beforeEach(() => verifyIdToken.mockReset());
  const futureExp = Math.floor(Date.now() / 1000) + 3600;

  test("requires a verified token, audience and corporate domain", async () => {
    verifyIdToken.mockResolvedValue({
      getPayload: () => ({
        sub: "google-1",
        email: "person@a3data.com.br",
        email_verified: true,
        iss: "https://accounts.google.com",
        aud: "client.apps.googleusercontent.com",
        exp: futureExp,
      }),
    });
    await expect(verifyGoogleIdToken("signed-token")).resolves.toMatchObject({
      sub: "google-1",
    });

    verifyIdToken.mockResolvedValue({
      getPayload: () => ({
        sub: "google-2",
        email: "person@example.com",
        email_verified: true,
        iss: "https://accounts.google.com",
        aud: "client.apps.googleusercontent.com",
        exp: futureExp,
      }),
    });
    await expect(verifyGoogleIdToken("signed-token")).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  test("rejects unverified credentials", async () => {
    verifyIdToken.mockResolvedValue({
      getPayload: () => ({
        sub: "google-3",
        email: "person@a3data.com.br",
        email_verified: false,
        iss: "https://accounts.google.com",
        exp: futureExp,
      }),
    });
    await expect(verifyGoogleIdToken("signed-token")).rejects.toMatchObject({
      statusCode: 401,
    });
  });

  test("rejects an audience that differs from configured client", async () => {
    verifyIdToken.mockResolvedValue({
      getPayload: () => ({
        sub: "google-audience",
        email: "person@a3data.com.br",
        email_verified: true,
        iss: "https://accounts.google.com",
        aud: "another-client",
        exp: futureExp,
      }),
    });
    await expect(verifyGoogleIdToken("signed-token")).rejects.toMatchObject({
      statusCode: 401,
    });
  });
});

describe("Google identity linking", () => {
  const suffix = Date.now();
  const email = `google-link-${suffix}@a3data.com.br`;

  beforeEach(async () => {
    delete process.env.DB_DATA_DIR;
    await initializeDatabase({ environment: "test" });
  });

  afterEach(async () => {
    await closeDatabase();
  });

  test("links an existing user and preserves role, then resolves by subject", async () => {
    const { user: existing } = await upsertUserByEmail(email);
    await updateUser(existing.id, { role: "VALIDATOR" });
    const first = await resolveGoogleIdentity({
      subject: "subject-link",
      email,
      profile: { full_name: "Verified User" },
    });
    const second = await resolveGoogleIdentity({
      subject: "subject-link",
      email: `renamed-${suffix}@a3data.com.br`,
    });
    expect(first.user.id).toBe(existing.id);
    expect(first.user.role).toBe("VALIDATOR");
    expect(first.linked).toBe(true);
    expect(second.user.id).toBe(existing.id);
    expect(second.user.role).toBe("VALIDATOR");
  });

  test("creates a new student and rejects conflicting subject", async () => {
    const created = await resolveGoogleIdentity({
      subject: "subject-new",
      email: `new-${suffix}@a3data.com.br`,
    });
    expect(created.created).toBe(true);
    expect(created.user.role).toBe("STUDENT");
    await expect(
      resolveGoogleIdentity({
        subject: "subject-other",
        email: `new-${suffix}@a3data.com.br`,
      }),
    ).rejects.toMatchObject({ statusCode: 409 });
  });
});
