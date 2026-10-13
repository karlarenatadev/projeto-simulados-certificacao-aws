// Decrypts to memory and restores only into a new, explicitly named directory.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { lstat, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const encryptedPath = process.env.BACKUP_ENCRYPTED_PATH?.trim();
const identityFile = process.env.BACKUP_AGE_IDENTITY_FILE?.trim();
const restoreDirInput = process.env.RESTORE_DATA_DIR?.trim();
if (!encryptedPath || !identityFile || !restoreDirInput) {
  throw new Error(
    "BACKUP_ENCRYPTED_PATH, BACKUP_AGE_IDENTITY_FILE and RESTORE_DATA_DIR are required",
  );
}
const restoreDir = resolve(restoreDirInput);
assert.ok(restoreDirInput && restoreDirInput === restoreDir);
try {
  await lstat(restoreDir);
  throw new Error(
    "RESTORE_DATA_DIR already exists; choose a new isolated path",
  );
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}

const age = spawn(
  "age",
  ["-d", "-i", resolve(identityFile), resolve(encryptedPath)],
  {
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  },
);
const chunks = [];
let stderr = "";
age.stdout.on("data", (chunk) => chunks.push(chunk));
age.stderr.setEncoding("utf8");
age.stderr.on("data", (chunk) => (stderr += chunk));
const code = await new Promise((accept, reject) => {
  age.once("error", reject);
  age.once("exit", accept);
});
if (code !== 0)
  throw new Error(`age decryption failed (${code}): ${stderr.trim()}`);

const archive = Buffer.concat(chunks);
if (!archive.length) throw new Error("Decrypted archive is empty");
const { PGlite } = await import("@electric-sql/pglite");
const database = await PGlite.create({
  dataDir: restoreDir,
  loadDataDir: new Blob([archive]),
});
try {
  await database.waitReady;
  const expectedTables = [
    "users",
    "user_identities",
    "quiz_history",
    "answers",
    "user_module_state",
  ];
  const result = await database.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema='public'",
  );
  const tables = new Set(result.rows.map((row) => row.table_name));
  for (const table of expectedTables)
    assert.ok(tables.has(table), `Missing table ${table}`);
  const counts = {};
  for (const table of expectedTables) {
    const rows = await database.query(
      `SELECT count(*)::int AS count FROM "${table}"`,
    );
    counts[table] = rows.rows[0].count;
  }
  await database.query("SELECT 1");
  console.log(
    JSON.stringify({
      result: "PASS",
      archiveBytes: archive.length,
      schemaTablesPresent: expectedTables.length,
      rowCounts: counts,
      restoreDataDir: restoreDir,
      restoreRetainedForInspection: true,
    }),
  );
} finally {
  await database.close();
}
