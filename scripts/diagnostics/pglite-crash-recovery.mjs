// Crash recovery probe using a unique synthetic data directory only.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const script = fileURLToPath(import.meta.url);

if (process.argv[2] === "--worker") {
  const { PGlite } = await import("@electric-sql/pglite");
  const database = await PGlite.create({ dataDir: process.argv[3] });
  await database.exec(
    "CREATE TABLE crash_probe (id integer PRIMARY KEY, payload text NOT NULL); INSERT INTO crash_probe VALUES (1, 'committed-before-crash');",
  );
  await database.syncToFs();
  await database.exec(
    "BEGIN; INSERT INTO crash_probe VALUES (2, 'must-rollback-after-crash');",
  );
  await database.syncToFs();
  process.stdout.write("READY\n");
  await new Promise(() => {});
}

assert.equal(process.argv.length, 2, "No database path argument is accepted");
const temporary = await mkdtemp(join(tmpdir(), "cloudacademy-pglite-crash-"));
const dataDir = join(temporary, "synthetic-db");
const child = spawn(process.execPath, [script, "--worker", dataDir], {
  cwd: process.cwd(),
  stdio: ["ignore", "pipe", "pipe"],
  windowsHide: true,
});
let stdout = "";
let stderr = "";
child.stdout.setEncoding("utf8");
child.stdout.on("data", (chunk) => (stdout += chunk));
child.stderr.setEncoding("utf8");
child.stderr.on("data", (chunk) => (stderr += chunk));

try {
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error("PGlite worker timed out")),
      60_000,
    );
    child.once("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.stdout.on("data", () => {
      if (stdout.includes("READY\n")) {
        clearTimeout(timeout);
        resolve();
      }
    });
  });
  child.kill("SIGKILL");
  const exit = await new Promise((resolve) => child.once("exit", resolve));
  assert.notEqual(
    exit,
    0,
    "Worker should be terminated without graceful shutdown",
  );

  const { PGlite } = await import("@electric-sql/pglite");
  const recovered = await PGlite.create({ dataDir });
  const rows = await recovered.query(
    "SELECT id, payload FROM crash_probe ORDER BY id",
  );
  assert.deepEqual(rows.rows, [{ id: 1, payload: "committed-before-crash" }]);
  await recovered.exec(
    "INSERT INTO crash_probe VALUES (3, 'write-after-recovery');",
  );
  await recovered.syncToFs();
  await recovered.close();

  const restarted = await PGlite.create({ dataDir });
  const finalRows = await restarted.query(
    "SELECT id, payload FROM crash_probe ORDER BY id",
  );
  assert.deepEqual(finalRows.rows, [
    { id: 1, payload: "committed-before-crash" },
    { id: 3, payload: "write-after-recovery" },
  ]);
  await restarted.close();
  console.log(
    JSON.stringify({
      result: "PASS",
      forcedProcessTermination: true,
      committedTransactionRecovered: true,
      openTransactionRolledBack: true,
      postRecoveryWritePersisted: true,
      syntheticDataDir: dataDir,
      stderr: stderr.trim() || undefined,
      limitations:
        "Synthetic process kill on local filesystem; does not simulate disk/controller failure, host loss or AWS snapshot restore.",
    }),
  );
} catch (error) {
  child.kill("SIGKILL");
  throw error;
}
