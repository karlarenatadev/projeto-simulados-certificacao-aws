// Offline encrypted backup. Stop the API service before running; this script
// opens the PGlite data directory exclusively and refuses incomplete settings.
import { createHash, randomUUID } from "node:crypto";
import { createWriteStream } from "node:fs";
import { link, stat, unlink } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { spawn } from "node:child_process";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import {
  assertBackupPaths,
  assertResolvedBackupOutsideDatabase,
} from "./backupGuards.mjs";

const dataDirInput = process.env.DB_DATA_DIR?.trim();
const outputDirInput = process.env.BACKUP_OUTPUT_DIR?.trim();
const recipient = process.env.BACKUP_AGE_RECIPIENT?.trim();
if (!dataDirInput || !outputDirInput || !recipient) {
  throw new Error(
    "DB_DATA_DIR, BACKUP_OUTPUT_DIR and BACKUP_AGE_RECIPIENT are required",
  );
}

const dataDir = resolve(dataDirInput);
const outputDir = resolve(outputDirInput);
assertBackupPaths(dataDirInput, outputDirInput);
await stat(dataDir);
await stat(outputDir);
await assertResolvedBackupOutsideDatabase(dataDir, outputDir);

const { PGlite } = await import("@electric-sql/pglite");
const database = await PGlite.create({ dataDir });
let archive;
try {
  await database.waitReady;
  await database.syncToFs();
  const dump = await database.dumpDataDir("gzip");
  archive = Buffer.from(await dump.arrayBuffer());
} finally {
  await database.close();
}

const now = new Date().toISOString().replaceAll(/[:.]/g, "-");
const finalName = `cloudacademy-pglite-${now}-${randomUUID()}.tar.gz.age`;
const partialPath = resolve(outputDir, `.${finalName}.partial`);
const finalPath = resolve(outputDir, finalName);
const age = spawn("age", ["-r", recipient], {
  stdio: ["pipe", "pipe", "pipe"],
  windowsHide: true,
});
let stderr = "";
age.stderr.setEncoding("utf8");
age.stderr.on("data", (chunk) => (stderr += chunk));
const result = new Promise((resolveExit, rejectExit) => {
  age.once("error", rejectExit);
  age.once("exit", (code) =>
    code === 0
      ? resolveExit()
      : rejectExit(
          new Error(`age encryption failed (${code}): ${stderr.trim()}`),
        ),
  );
});
try {
  await Promise.all([
    pipeline(Readable.from([archive]), age.stdin),
    pipeline(
      age.stdout,
      createWriteStream(partialPath, { flags: "wx", mode: 0o600 }),
    ),
    result,
  ]);
  // A hard link publishes atomically and fails if finalPath already exists.
  // Both paths are in the same output directory/filesystem.
  await link(partialPath, finalPath);
  await unlink(partialPath);
} catch (error) {
  age.kill();
  await unlink(partialPath).catch(() => {});
  throw error;
}

const encrypted = await import("node:fs/promises").then(({ readFile }) =>
  readFile(finalPath),
);
console.log(
  JSON.stringify({
    result: "PASS",
    file: basename(finalPath),
    encryptedBytes: encrypted.length,
    sha256: createHash("sha256").update(encrypted).digest("hex"),
    plaintextArchiveRetained: false,
    note: "Upload this encrypted artifact to the approved off-host backup destination and apply its retention policy.",
  }),
);
