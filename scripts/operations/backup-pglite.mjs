// Offline encrypted backup. Stop the API service before running; this script
// opens the PGlite data directory exclusively and refuses incomplete settings.
import { createHash, randomUUID } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdir, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import {
  basename,
  dirname,
  isAbsolute,
  relative,
  resolve,
  sep,
} from "node:path";
import { spawn } from "node:child_process";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

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
const outputRelativeToDb = relative(dataDir, outputDir);
if (
  !isAbsolute(dataDirInput) ||
  outputRelativeToDb === "" ||
  (!outputRelativeToDb.startsWith(`..${sep}`) && outputRelativeToDb !== "..")
) {
  throw new Error("Backup output must be outside DB_DATA_DIR");
}
await stat(dataDir);
await mkdir(outputDir, { recursive: true, mode: 0o700 });

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
  const { rename } = await import("node:fs/promises");
  await rename(partialPath, finalPath);
} catch (error) {
  age.kill();
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
