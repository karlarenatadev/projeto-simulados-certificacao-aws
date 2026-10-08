import pg from "pg";
import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { runMigrations } from "../../backend/database/migrations/runner.js";
import {
  readMigrationTarget,
  assertMigrationTarget,
} from "../../backend/database/migrations/target.js";

export async function runApiContracts({
  url,
  token,
  cwd,
  suiteName = null,
  setChild,
}) {
  const adminEnv = {
    NODE_ENV: "test",
    PG_MIGRATIONS_TEST_URL: url,
    PG_MIGRATIONS_TEST_TOKEN: token,
  };
  const target = readMigrationTarget(adminEnv);
  await runMigrations({ env: adminEnv });
  const admin = new pg.Client(target.pool);
  const password = randomBytes(24).toString("hex");
  const runtimeUrl = new URL(url);
  runtimeUrl.username = "cloudacademy_f3_runtime";
  runtimeUrl.password = password;
  try {
    await admin.connect();
    await assertMigrationTarget(admin, target);
    // Hex generated locally; never log the statement/credential. No role inheritance.
    await admin.query(`CREATE ROLE cloudacademy_f3_runtime LOGIN PASSWORD '${password}'
      NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS`);
    await admin.query(`REVOKE CREATE,TEMP ON DATABASE cloudacademy_f2_test FROM PUBLIC;
      REVOKE CREATE ON SCHEMA public FROM PUBLIC;
      GRANT CONNECT ON DATABASE cloudacademy_f2_test TO cloudacademy_f3_runtime;
      GRANT USAGE ON SCHEMA public,cloudacademy_migrations TO cloudacademy_f3_runtime;
      GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO cloudacademy_f3_runtime;
      GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA public TO cloudacademy_f3_runtime;
      GRANT SELECT ON cloudacademy_migrations.history TO cloudacademy_f3_runtime`);
    const suites = [
      "postgresApi.integration",
      "api.integration",
      "accountPersistence",
      "gamificationSyncApi",
      "api.access",
      "authRoles",
      "auth401",
      "googleAuth",
      "googleAuthRoute",
      "localLinks",
      "casesEvaluateAuth",
      "postgresQuizConcurrency.integration",
      "postgresAdminRbacConcurrency.integration",
    ];
    if (suiteName && !suites.includes(suiteName)) {
      throw new Error("Unknown PostgreSQL API suite selection");
    }
    const selectedSuites = suiteName ? [suiteName] : suites;
    let failed = false;
    for (const suite of selectedSuites) {
      await assertMigrationTarget(admin, target);
      const { rows } = await admin.query(
        "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename",
      );
      const tables = rows.map(
        ({ tablename }) => `public."${tablename.replaceAll('"', '""')}"`,
      );
      await admin.query(
        `TRUNCATE ${tables.join(",")} RESTART IDENTITY CASCADE`,
      );
      console.log(`F3 real PostgreSQL contract suite: ${suite}`);
      const child = spawn(
        process.execPath,
        [
          "--experimental-vm-modules",
          "node_modules/jest/bin/jest.js",
          "--runInBand",
          "--runTestsByPath",
          `__tests__/${suite}.test.js`,
        ],
        {
          cwd,
          stdio: "inherit",
          env: {
            ...process.env,
            NODE_ENV: "test",
            DB_ENGINE: "postgres-test",
            DATABASE_URL: runtimeUrl.href,
            PG_RUNTIME_TEST_TOKEN: token,
            DB_CONNECTION_TIMEOUT_MS: "500",
            PG_ADAPTER_INTEGRATION: "0",
            PG_MIGRATIONS_INTEGRATION: "0",
            // These suites use a separate connection for isolated fault/concurrency orchestration.
            PG_F3_ADMIN_URL: [
              "postgresApi.integration",
              "postgresQuizConcurrency.integration",
              "postgresAdminRbacConcurrency.integration",
            ].includes(suite)
              ? url
              : "",
          },
        },
      );
      setChild(child);
      const code = await new Promise((resolve, reject) => {
        child.once("error", reject);
        child.once("exit", (value) => resolve(value ?? 1));
      });
      failed ||= code !== 0;
    }
    return failed ? 1 : 0;
  } finally {
    await admin.end();
  }
}
