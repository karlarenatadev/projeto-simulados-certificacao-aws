import { OAuth2Client } from "google-auth-library";

const GOOGLE_ISSUERS = new Set([
  "accounts.google.com",
  "https://accounts.google.com",
]);

export function getAllowedAuthDomains() {
  return new Set(
    String(process.env.AUTH_ALLOWED_DOMAINS || "a3data.com.br,a3data.com")
      .split(",")
      .map((domain) => domain.trim().toLowerCase())
      .filter(Boolean),
  );
}

export async function verifyGoogleIdToken(credential) {
  const clientId = String(process.env.GOOGLE_CLIENT_ID || "").trim();
  if (!clientId) {
    const error = new Error("Google authentication is not configured");
    error.statusCode = 503;
    throw error;
  }
  if (!credential || typeof credential !== "string") {
    const error = new Error("Google credential is required");
    error.statusCode = 400;
    throw error;
  }

  let payload;
  try {
    const ticket = await new OAuth2Client(clientId).verifyIdToken({
      idToken: credential,
      audience: clientId,
    });
    payload = ticket.getPayload();
  } catch {
    const error = new Error("Invalid Google credential");
    error.statusCode = 401;
    throw error;
  }

  if (!payload?.sub || !payload.email || payload.email_verified !== true) {
    const error = new Error(
      "Google credential is missing verified identity claims",
    );
    error.statusCode = 401;
    throw error;
  }
  if (!GOOGLE_ISSUERS.has(payload.iss)) {
    const error = new Error("Invalid Google issuer");
    error.statusCode = 401;
    throw error;
  }
  if (payload.aud !== clientId) {
    const error = new Error("Google credential audience is invalid");
    error.statusCode = 401;
    throw error;
  }
  if (
    !Number.isFinite(Number(payload.exp)) ||
    Number(payload.exp) <= Math.floor(Date.now() / 1000)
  ) {
    const error = new Error("Google credential is expired");
    error.statusCode = 401;
    throw error;
  }

  const email = String(payload.email).trim().toLowerCase();
  const domain = email.split("@")[1];
  if (!domain || !getAllowedAuthDomains().has(domain)) {
    const error = new Error("Email domain is not authorized");
    error.statusCode = 403;
    throw error;
  }
  if (
    payload.hd &&
    !getAllowedAuthDomains().has(String(payload.hd).toLowerCase())
  ) {
    const error = new Error("Hosted domain is not authorized");
    error.statusCode = 403;
    throw error;
  }

  return payload;
}
