/** @jest-environment node */
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  jest,
  test,
} from "@jest/globals";
import { randomUUID } from "node:crypto";
import { createServer } from "node:net";
import { setTimeout as delay } from "node:timers/promises";
import {
  createPostgresAdapter,
  readPostgresConfig,
} from "../backend/database/postgres/index.js";

const integration =
  process.env.PG_ADAPTER_INTEGRATION === "1" ? describe : describe.skip;
const database = "cloudacademy_f1_test";
const schema = `f1_adapter_${randomUUID().replaceAll("-", "")}`;
const table = `${schema}.entries`;
const adapters = new Set();
let base;
let owner;
let created = false;
jest.setTimeout(20_000);

function adapter(overrides = {}) {
  const db = createPostgresAdapter({ env: { ...base, ...overrides } });
  adapters.add(db);
  return db;
}

function deferred() {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

async function assertTestDatabase(db) {
  const [identity] = await db.executeQuery(
    "SELECT current_database() AS db, session_user AS owner, current_setting('server_version_num')::int AS version",
  );
  if (
    identity.db !== database ||
    identity.owner !== database ||
    identity.version < 160000 ||
    identity.version >= 170000
  ) {
    throw new Error(
      "Refusing fixtures/cleanup: expected dedicated PostgreSQL 16 test database and owner",
    );
  }
  return identity;
}

integration(
  "PostgreSQL 16 real integration (explicit opt-in; no PGlite)",
  () => {
    beforeAll(async () => {
      base = {
        NODE_ENV: "test",
        DATABASE_URL: process.env.PG_ADAPTER_TEST_URL,
        DB_POOL_MAX: "2",
        DB_CONNECTION_TIMEOUT_MS: "1000",
        DB_STATEMENT_TIMEOUT_MS: "1000",
        DB_QUERY_TIMEOUT_MS: "2000",
      };
      const config = readPostgresConfig(base);
      if (
        config.pool.host !== "127.0.0.1" ||
        config.pool.database !== database ||
        config.pool.user !== database
      ) {
        throw new Error(
          "Refusing non-test endpoint; PG_ADAPTER_TEST_URL must identify the dedicated loopback database/user",
        );
      }
      owner = createPostgresAdapter({ env: base });
      const identity = await assertTestDatabase(owner);
      console.info(
        `Real PostgreSQL version_num=${identity.version}; database=${database}; fixtures=${schema}`,
      );
      await owner.executeQuery(`CREATE SCHEMA ${schema}`);
      created = true;
      await owner.executeQuery(
        `CREATE TABLE ${table} (id uuid PRIMARY KEY, note text NOT NULL)`,
      );
    });

    afterEach(async () => {
      await Promise.all(
        [...adapters].map((db) =>
          db.close().catch((error) => {
            if (error.code !== "PG_SHUTDOWN_TIMEOUT") throw error;
          }),
        ),
      );
      adapters.clear();
    });

    afterAll(async () => {
      if (!owner) return;
      try {
        if (created) {
          await assertTestDatabase(owner);
          if (!/^f1_adapter_[a-f0-9]{32}$/.test(schema))
            throw new Error("Unsafe fixture schema");
          await owner.executeQuery(`DROP SCHEMA ${schema} CASCADE`);
        }
      } finally {
        await owner.close();
      }
    });

    test("connects, SELECT 1 returns rows; positional parameters are data", async () => {
      const db = adapter();
      expect(await db.executeQuery("SELECT 1 AS one")).toEqual([{ one: 1 }]);
      const value = "'; DROP TABLE anything; --";
      const result = await db.query(
        "SELECT $1::text AS value, $2::int AS number",
        [value, 42],
      );
      expect(result.rows).toEqual([{ value, number: 42 }]);
      expect(result.command).toBe("SELECT");
    });

    test("invalid credentials remain authentication failures with no leaked details", async () => {
      const url = new URL(base.DATABASE_URL);
      url.password = randomUUID();
      const db = adapter({ DATABASE_URL: url.toString() });
      const error = await db
        .executeQuery("SELECT 1")
        .catch((failure) => failure);
      expect(error).toMatchObject({
        kind: "authentication",
        code: "28P01",
        phase: "connect",
      });
      expect(String(error)).not.toContain(url.password);
      expect(JSON.stringify(error)).not.toContain(url.toString());
    });

    test("TLS negotiation failure remains a connection error", async () => {
      // Same disposable loopback database; production configuration requires TLS.
      // The fixture server has no TLS certificate and must not be accepted silently.
      const db = adapter({ NODE_ENV: "production" });
      await expect(db.executeQuery("SELECT 1")).rejects.toMatchObject({
        kind: "connection",
        phase: "connect",
        code: "PG_CONNECT_FAILED",
      });
    });

    test("two simultaneously reserved clients have distinct backend PIDs", async () => {
      const db = adapter();
      const both = deferred();
      let acquired = 0;
      const reserve = () =>
        db.withClient(async (client) => {
          const { rows } = await client.query("SELECT pg_backend_pid() AS pid");
          if (++acquired === 2) both.resolve();
          await both.promise;
          return rows[0].pid;
        });
      const pids = await Promise.all([reserve(), reserve()]);
      expect(new Set(pids).size).toBe(2);
      expect(db.stats()).toMatchObject({ total: 2, idle: 2, waiting: 0 });
    });

    test("COMMIT uses one PID/transaction ID; another client cannot see uncommitted data", async () => {
      const db = adapter();
      const id = randomUUID();
      const inserted = deferred();
      const observed = deferred();
      const trace = {};
      await Promise.all([
        db.transaction(async (tx) => {
          const first = (
            await tx.query(
              "SELECT pg_backend_pid() AS pid, txid_current() AS xid",
            )
          ).rows[0];
          await tx.query(`INSERT INTO ${table} VALUES ($1, $2)`, [
            id,
            "committed",
          ]);
          inserted.resolve();
          await observed.promise;
          const second = (
            await tx.query(
              "SELECT pg_backend_pid() AS pid, txid_current() AS xid",
            )
          ).rows[0];
          expect(second).toEqual(first);
          trace.transaction = first;
        }),
        db.withClient(async (other) => {
          await inserted.promise;
          try {
            trace.observerPid = (
              await other.query("SELECT pg_backend_pid() AS pid")
            ).rows[0].pid;
            expect(
              (await other.query(`SELECT * FROM ${table} WHERE id=$1`, [id]))
                .rows,
            ).toEqual([]);
          } finally {
            observed.resolve();
          }
        }),
      ]);
      expect(trace.observerPid).not.toBe(trace.transaction.pid);
      expect(
        await db.executeQuery(`SELECT note FROM ${table} WHERE id=$1`, [id]),
      ).toEqual([{ note: "committed" }]);
      console.info(
        `COMMIT verified: tx_pid=${trace.transaction.pid}, xid=${trace.transaction.xid}, observer_pid=${trace.observerPid}; invisible before commit, one row after.`,
      );
    });

    test("SQL error triggers ROLLBACK and the single client is reusable", async () => {
      const db = adapter({ DB_POOL_MAX: "1" });
      const id = randomUUID();
      let pid;
      await expect(
        db.transaction(async (tx) => {
          pid = (await tx.query("SELECT pg_backend_pid() AS pid")).rows[0].pid;
          await tx.query(`INSERT INTO ${table} VALUES ($1,$2)`, [
            id,
            "must-rollback",
          ]);
          await tx.query("SELECT 1/0");
        }),
      ).rejects.toMatchObject({ code: "22012", kind: "query" });
      expect(
        await db.executeQuery(`SELECT * FROM ${table} WHERE id=$1`, [id]),
      ).toEqual([]);
      expect(
        (await db.executeQuery("SELECT pg_backend_pid() AS pid"))[0].pid,
      ).toBe(pid);
      expect(db.stats()).toMatchObject({ total: 1, idle: 1, waiting: 0 });
      console.info(
        `ROLLBACK verified: pid=${pid}; zero persisted rows; same client reusable.`,
      );
    });

    test("swallowing a SQL failure cannot report a successful transaction", async () => {
      const db = adapter();
      const id = randomUUID();
      await expect(
        db.transaction(async (tx) => {
          await tx.query(`INSERT INTO ${table} VALUES ($1,$2)`, [
            id,
            "must-rollback",
          ]);
          await tx.query("SELECT 1/0").catch(() => {});
          return "false-success";
        }),
      ).rejects.toMatchObject({ code: "22012" });
      expect(
        await db.executeQuery(`SELECT * FROM ${table} WHERE id=$1`, [id]),
      ).toEqual([]);
    });

    test("callback error rolls back; finally releases the client; escaped executor expires", async () => {
      const db = adapter({ DB_POOL_MAX: "1" });
      const id = randomUUID();
      let escaped;
      const failure = new Error("application-error");
      await expect(
        db.transaction(async (tx) => {
          escaped = tx;
          await tx.query(`INSERT INTO ${table} VALUES ($1,$2)`, [
            id,
            "must-rollback",
          ]);
          throw failure;
        }),
      ).rejects.toBe(failure);
      expect(
        await db.executeQuery(`SELECT * FROM ${table} WHERE id=$1`, [id]),
      ).toEqual([]);
      await expect(escaped.query("SELECT 1")).rejects.toMatchObject({
        code: "PG_EXECUTOR_RELEASED",
      });
      await expect(
        db.withClient(() => {
          throw failure;
        }),
      ).rejects.toBe(failure);
      expect(await db.executeQuery("SELECT 1 AS one")).toEqual([{ one: 1 }]);
    });

    test("global queries/nested reservations are rejected inside transaction callbacks", async () => {
      const db = adapter();
      for (const wrong of [
        () => db.query("SELECT 1"),
        () => db.executeQuery("SELECT 1"),
        () => db.transaction(() => {}),
        () => db.withClient(() => {}),
      ]) {
        await expect(db.transaction(wrong)).rejects.toMatchObject({
          code: "PG_USE_RESERVED_EXECUTOR",
        });
      }
      expect(db.stats()).toMatchObject({ idle: 1, waiting: 0 });
      await expect(db.executeQuery("SELECT 1; SELECT 2")).rejects.toMatchObject(
        { code: "42601" },
      );
      await expect(
        db.executeQuery("/* comment */ BEGIN"),
      ).rejects.toMatchObject({ code: "PG_TRANSACTION_CONTROL" });
    });

    test("JSONB, UUID, int8 and int8 arrays preserve type/precision and JSON serialization", async () => {
      const db = adapter();
      const id = randomUUID();
      const payload = { nested: { ok: true }, values: [null, 1, "text"] };
      const [row] = await db.executeQuery(
        "SELECT $1::uuid AS id, $2::jsonb AS payload, $3::bigint AS revision, ARRAY[$3::bigint] AS revisions",
        [id, payload, "9223372036854775807"],
      );
      expect(row).toEqual({
        id,
        payload,
        revision: "9223372036854775807",
        revisions: ["9223372036854775807"],
      });
      expect(JSON.parse(JSON.stringify(row))).toEqual(row);
    });

    test("server statement timeout cancels SQL, rolls back and releases the client", async () => {
      const db = adapter({
        DB_POOL_MAX: "1",
        DB_STATEMENT_TIMEOUT_MS: "80",
        DB_QUERY_TIMEOUT_MS: "500",
      });
      const id = randomUUID();
      await expect(
        db.transaction(async (tx) => {
          await tx.query(`INSERT INTO ${table} VALUES ($1,$2)`, [
            id,
            "timeout-rollback",
          ]);
          await tx.query("SELECT pg_sleep(3)");
        }),
      ).rejects.toMatchObject({ kind: "timeout", code: "57014" });
      expect(
        await db.executeQuery(`SELECT * FROM ${table} WHERE id=$1`, [id]),
      ).toEqual([]);
      expect(await db.executeQuery("SELECT 1 AS one")).toEqual([{ one: 1 }]);
    });

    test("client read deadline discards the connection rather than returning active SQL to pool", async () => {
      const db = adapter({
        DB_POOL_MAX: "1",
        DB_STATEMENT_TIMEOUT_MS: "80",
        DB_QUERY_TIMEOUT_MS: "200",
      });
      let pid;
      await expect(
        db.transaction(async (tx) => {
          pid = (await tx.query("SELECT pg_backend_pid() AS pid")).rows[0].pid;
          // Only this transaction; exercise the client/network fallback deadline.
          await tx.query("SET LOCAL statement_timeout = '5s'");
          await tx.query("SELECT pg_sleep(3)");
        }),
      ).rejects.toMatchObject({ kind: "timeout", code: "PG_CLIENT_TIMEOUT" });
      expect(
        (await db.executeQuery("SELECT pg_backend_pid() AS pid"))[0].pid,
      ).not.toBe(pid);
    });

    test("pool acquisition is bounded when its single client is reserved", async () => {
      const db = adapter({ DB_POOL_MAX: "1", DB_CONNECTION_TIMEOUT_MS: "100" });
      const acquired = deferred();
      const release = deferred();
      const held = db.withClient(async () => {
        acquired.resolve();
        await release.promise;
      });
      await acquired.promise;
      try {
        await expect(db.executeQuery("SELECT 1")).rejects.toMatchObject({
          kind: "timeout",
          phase: "connect",
        });
      } finally {
        release.resolve();
        await held;
      }
      expect(await db.executeQuery("SELECT 1 AS one")).toEqual([{ one: 1 }]);
    });

    test("refused connection is classified without masquerading as authentication", async () => {
      const server = createServer();
      await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
      const port = server.address().port;
      await new Promise((resolve) => server.close(resolve));
      const url = new URL(base.DATABASE_URL);
      url.port = String(port);
      const db = adapter({
        DATABASE_URL: url.toString(),
        DB_CONNECTION_TIMEOUT_MS: "200",
      });
      await expect(db.executeQuery("SELECT 1")).rejects.toMatchObject({
        kind: "connection",
        code: "ECONNREFUSED",
        phase: "connect",
      });
    });

    test("TCP peer that never responds to PostgreSQL handshake hits connection timeout", async () => {
      const sockets = new Set();
      const server = createServer((socket) => {
        sockets.add(socket);
        socket.on("error", () => {});
      });
      await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
      const url = new URL(base.DATABASE_URL);
      url.port = String(server.address().port);
      const db = adapter({
        DATABASE_URL: url.toString(),
        DB_CONNECTION_TIMEOUT_MS: "100",
      });
      try {
        await expect(db.executeQuery("SELECT 1")).rejects.toMatchObject({
          kind: "timeout",
          phase: "connect",
        });
      } finally {
        for (const socket of sockets) socket.destroy();
        await new Promise((resolve) => server.close(resolve));
      }
    });

    test("idle backend loss is handled and a later query gets a new connection", async () => {
      const db = adapter({ DB_POOL_MAX: "1" });
      const [{ pid }] = await db.executeQuery("SELECT pg_backend_pid() AS pid");
      await owner.executeQuery("SELECT pg_terminate_backend($1)", [pid]);
      for (
        let attempt = 0;
        attempt < 50 && !db.stats().lastPoolError;
        attempt++
      )
        await delay(10);
      expect(db.stats().lastPoolError).toMatchObject({
        kind: "connection",
        phase: "idle",
      });
      expect(
        (await db.executeQuery("SELECT pg_backend_pid() AS pid"))[0].pid,
      ).not.toBe(pid);
    });

    test("lost connection during transaction rolls back and is discarded", async () => {
      const db = adapter({ DB_POOL_MAX: "1" });
      const id = randomUUID();
      let pid;
      await expect(
        db.transaction(async (tx) => {
          pid = (await tx.query("SELECT pg_backend_pid() AS pid")).rows[0].pid;
          await tx.query(`INSERT INTO ${table} VALUES ($1,$2)`, [
            id,
            "connection-rollback",
          ]);
          await owner.executeQuery("SELECT pg_terminate_backend($1)", [pid]);
          await delay(30);
          await tx.query("SELECT 1");
        }),
      ).rejects.toMatchObject({ kind: "connection" });
      expect(
        await owner.executeQuery(`SELECT * FROM ${table} WHERE id=$1`, [id]),
      ).toEqual([]);
      expect(
        (await db.executeQuery("SELECT pg_backend_pid() AS pid"))[0].pid,
      ).not.toBe(pid);
    });

    test("shutdown drains an active transaction and rejects new reservations", async () => {
      const db = adapter();
      const acquired = deferred();
      const finish = deferred();
      const running = db.transaction(async (tx) => {
        acquired.resolve();
        await finish.promise;
        return (await tx.query("SELECT 1 AS one")).rows;
      });
      await acquired.promise;
      const closing = db.close();
      expect(db.close()).toBe(closing);
      try {
        await expect(db.query("SELECT 1")).rejects.toMatchObject({
          code: "PG_POOL_CLOSED",
        });
      } finally {
        finish.resolve();
      }
      expect(await running).toEqual([{ one: 1 }]);
      await closing;
      expect(db.stats()).toMatchObject({ state: "closed", total: 0 });
    });

    test("shutdown deadline destroys a stuck reservation and reports timeout", async () => {
      const db = adapter({ DB_SHUTDOWN_TIMEOUT_MS: "100" });
      const acquired = deferred();
      const finish = deferred();
      const held = db.withClient(async () => {
        acquired.resolve();
        await finish.promise;
      });
      await acquired.promise;
      try {
        await expect(db.close()).rejects.toMatchObject({
          kind: "timeout",
          code: "PG_SHUTDOWN_TIMEOUT",
        });
      } finally {
        finish.resolve();
        await held;
      }
      expect(db.stats().total).toBe(0);
    });
  },
);
