/** @jest-environment node */
import { afterEach, expect, test } from "@jest/globals";
import { mkdtemp, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  assertBackupPaths,
  assertResolvedBackupOutsideDatabase,
  assertRestoreTargetDoesNotExist,
} from "../scripts/operations/backupGuards.mjs";

let root;
afterEach(async () => {
  if (root) await rm(root, { recursive: true, force: true });
  root = undefined;
});

test("requires absolute backup paths and refuses output inside the database", async () => {
  root = await mkdtemp(join(tmpdir(), "cloudacademy-backup-guard-"));
  const db = join(root, "database");
  const output = join(root, "database", "backup");
  await mkdir(output, { recursive: true });
  expect(() => assertBackupPaths("relative-db", output)).toThrow(
    "absolute paths",
  );
  expect(() => assertBackupPaths(db, output)).toThrow("outside DB_DATA_DIR");
  await expect(assertResolvedBackupOutsideDatabase(db, output)).rejects.toThrow(
    "resolve outside DB_DATA_DIR",
  );
});

test("refuses restore into an existing path and accepts a new isolated path", async () => {
  root = await mkdtemp(join(tmpdir(), "cloudacademy-restore-guard-"));
  const existing = join(root, "existing");
  const fresh = join(root, "fresh");
  await mkdir(existing);
  await expect(assertRestoreTargetDoesNotExist(existing)).rejects.toThrow(
    "already exists",
  );
  await expect(assertRestoreTargetDoesNotExist(fresh)).resolves.toBeUndefined();
});
