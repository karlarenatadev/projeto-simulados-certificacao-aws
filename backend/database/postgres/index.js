import pg from "pg";
import { AsyncLocalStorage } from "node:async_hooks";
import { setTimeout, clearTimeout } from "node:timers";
import { readPostgresConfig } from "./config.js";
import {
  PostgresAdapterError,
  classifyPostgresError,
  connectionUnusable,
} from "./errors.js";

export { readPostgresConfig } from "./config.js";
export { PostgresAdapterError } from "./errors.js";

function misuse(code) {
  return new PostgresAdapterError("usage", code, "executor");
}

function queryConfig(text, values) {
  if (typeof text !== "string" || !text.trim() || !Array.isArray(values)) {
    throw misuse("PG_INVALID_QUERY");
  }
  // Misuse guard, not an SQL security sandbox. Transaction control is private.
  const command = text.replace(/\/\*[\s\S]*?\*\/|--[^\n]*/g, "").trim();
  if (
    /^(BEGIN|START\s+TRANSACTION|COMMIT|END|ROLLBACK|ABORT|SAVEPOINT|RELEASE|PREPARE\s+TRANSACTION)\b/i.test(
      command,
    )
  ) {
    throw misuse("PG_TRANSACTION_CONTROL");
  }
  // Extended protocol rejects multiple statements, even without parameters.
  return { text, values, queryMode: "extended" };
}

/** Creates a lazy, isolated pool. Importing this module opens no connection. */
export function createPostgresAdapter({ env = process.env } = {}) {
  const config = readPostgresConfig(env);
  const pool = new pg.Pool({
    ...config.pool,
    types: {
      getTypeParser(oid, format) {
        // Local parser; do not mutate pg's global registry or coerce int8 to Number.
        if (oid === 20 && format !== "binary") return (value) => value;
        return pg.types.getTypeParser(oid, format);
      },
    },
  });
  const context = new AsyncLocalStorage();
  const leases = new Set();
  let state = "open";
  let closing;
  let lastPoolError = null;
  pool.on("error", (error) => {
    // pg removes the idle broken client. Keep only sanitized diagnostic fields.
    lastPoolError = classifyPostgresError(error, "idle");
  });

  function assertAvailable() {
    if (state !== "open") throw misuse("PG_POOL_CLOSED");
    if (context.getStore()) throw misuse("PG_USE_RESERVED_EXECUTOR");
  }

  async function reserve(work) {
    assertAvailable();
    if (typeof work !== "function") throw misuse("PG_INVALID_CALLBACK");
    let client;
    try {
      client = await pool.connect();
    } catch (error) {
      throw classifyPostgresError(error, "connect");
    }
    if (state !== "open") {
      client.release(true);
      throw misuse("PG_POOL_CLOSED");
    }
    let released = false;
    let broken = false;
    let firstFailure = null;
    let connectionError = null;
    const onError = (error) => {
      broken = true;
      connectionError = classifyPostgresError(error, "connection");
    };
    client.on("error", onError);
    function release(destroy = false) {
      if (released) return;
      released = true;
      leases.delete(release);
      client.release(destroy || broken);
      client.removeListener("error", onError);
    }
    leases.add(release);
    async function run(query, phase = "query") {
      if (released) throw misuse("PG_EXECUTOR_RELEASED");
      if (connectionError) throw connectionError;
      if (broken) throw firstFailure;
      try {
        return await client.query(query);
      } catch (error) {
        const failure = classifyPostgresError(error, phase);
        firstFailure ||= failure;
        broken ||= connectionUnusable(failure);
        throw failure;
      }
    }
    const executor = Object.freeze({
      query(text, values = []) {
        return run(queryConfig(text, values));
      },
      async executeQuery(text, values = []) {
        return (await this.query(text, values)).rows;
      },
    });
    try {
      const result = await context.run(true, () =>
        work({
          executor,
          run,
          failure: () => firstFailure,
          unusable: () => broken,
          discard: () => {
            broken = true;
          },
        }),
      );
      if (connectionError) throw connectionError;
      return result;
    } finally {
      release();
    }
  }

  function withClient(work) {
    if (typeof work !== "function")
      return Promise.reject(misuse("PG_INVALID_CALLBACK"));
    return reserve(({ executor }) => work(executor));
  }

  function query(text, values = []) {
    // Reserving even for standalone queries lets timeout/shutdown discard safely.
    return withClient((executor) => executor.query(text, values));
  }

  async function executeQuery(text, values = []) {
    return (await query(text, values)).rows;
  }

  function transaction(work) {
    if (typeof work !== "function")
      return Promise.reject(misuse("PG_INVALID_CALLBACK"));
    return reserve(async ({ executor, run, failure, unusable, discard }) => {
      let began = false;
      let committing = false;
      try {
        await run("BEGIN", "begin");
        began = true;
        const result = await work(executor);
        // PostgreSQL can answer COMMIT with ROLLBACK after a swallowed SQL error.
        if (failure()) throw failure();
        committing = true;
        const committed = await run("COMMIT", "commit");
        if (committed.command !== "COMMIT") throw misuse("PG_NOT_COMMITTED");
        return result;
      } catch (error) {
        if (
          committing &&
          error instanceof PostgresAdapterError &&
          (connectionUnusable(error) || error.kind === "timeout")
        ) {
          error.commitOutcome = "unknown";
        }
        if (began && !unusable()) {
          try {
            await run("ROLLBACK", "rollback");
          } catch (rollbackError) {
            discard();
            // Do not mask the original failure; no raw driver diagnostics attached.
            if (error instanceof PostgresAdapterError)
              error.rollbackCode = rollbackError.code;
          }
        }
        throw error;
      }
    });
  }

  function close() {
    if (closing) return closing;
    state = "closing";
    let timer;
    const ended = pool.end().then(() => {
      state = "closed";
    });
    const deadline = new Promise((_, reject) => {
      timer = setTimeout(() => {
        for (const release of leases) release(true);
        reject(
          new PostgresAdapterError(
            "timeout",
            "PG_SHUTDOWN_TIMEOUT",
            "shutdown",
          ),
        );
      }, config.shutdownTimeoutMs);
    });
    closing = Promise.race([ended, deadline]).finally(() =>
      clearTimeout(timer),
    );
    return closing;
  }

  return Object.freeze({
    query,
    executeQuery,
    withClient,
    transaction,
    close,
    stats: () => ({
      state,
      total: pool.totalCount,
      idle: pool.idleCount,
      waiting: pool.waitingCount,
      lastPoolError,
    }),
  });
}
