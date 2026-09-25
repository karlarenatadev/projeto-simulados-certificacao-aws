const NETWORK_CODES = new Set([
  "ECONNREFUSED",
  "ECONNRESET",
  "EPIPE",
  "ENOTFOUND",
  "EAI_AGAIN",
  "ENETUNREACH",
  "EHOSTUNREACH",
]);

export class PostgresAdapterError extends Error {
  constructor(kind, code, phase) {
    super(`PostgreSQL ${kind} failure during ${phase}`);
    this.name = "PostgresAdapterError";
    this.kind = kind;
    this.code = code;
    this.phase = phase;
  }
}

/** Retain safe SQLSTATE/category, never driver detail, SQL, parameters or cause. */
export function classifyPostgresError(error, phase) {
  if (error instanceof PostgresAdapterError) return error;
  const suppliedCode = typeof error?.code === "string" ? error.code : "";
  const code =
    /^[0-9A-Z]{5}$/.test(suppliedCode) ||
    NETWORK_CODES.has(suppliedCode) ||
    suppliedCode === "ETIMEDOUT"
      ? suppliedCode
      : "";
  if (code.startsWith("28"))
    return new PostgresAdapterError("authentication", code, phase);
  if (code === "57014") return new PostgresAdapterError("timeout", code, phase);
  if (
    code === "ETIMEDOUT" ||
    /^(Query read timeout|timeout exceeded when trying to connect|Connection terminated due to connection timeout)$/.test(
      error?.message || "",
    )
  ) {
    return new PostgresAdapterError(
      "timeout",
      code || "PG_CLIENT_TIMEOUT",
      phase,
    );
  }
  if (
    NETWORK_CODES.has(code) ||
    code.startsWith("08") ||
    ["57P01", "57P02", "57P03"].includes(code) ||
    /^Connection terminated|^Client has encountered a connection error/.test(
      error?.message || "",
    )
  ) {
    return new PostgresAdapterError(
      "connection",
      code || "PG_CONNECTION_LOST",
      phase,
    );
  }
  if (code.startsWith("23"))
    return new PostgresAdapterError("constraint", code, phase);
  if (["40001", "40P01", "55P03"].includes(code))
    return new PostgresAdapterError("conflict", code, phase);
  return new PostgresAdapterError(
    "query",
    /^[0-9A-Z]{5}$/.test(code) ? code : "PG_QUERY_FAILED",
    phase,
  );
}

export function connectionUnusable(error) {
  return (
    error.kind === "connection" ||
    error.kind === "authentication" ||
    (error.kind === "timeout" && error.code !== "57014")
  );
}
