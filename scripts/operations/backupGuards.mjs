import { lstat, realpath } from "node:fs/promises";
import { isAbsolute, relative, sep } from "node:path";

export function assertBackupPaths(dataDirInput, outputDirInput) {
  if (!isAbsolute(dataDirInput) || !isAbsolute(outputDirInput)) {
    throw new Error("DB_DATA_DIR and BACKUP_OUTPUT_DIR must be absolute paths");
  }
  const outputRelativeToDb = relative(dataDirInput, outputDirInput);
  if (
    outputRelativeToDb === "" ||
    (!outputRelativeToDb.startsWith(`..${sep}`) && outputRelativeToDb !== "..")
  ) {
    throw new Error("Backup output must be outside DB_DATA_DIR");
  }
}

export async function assertResolvedBackupOutsideDatabase(dataDir, outputDir) {
  const [realDataDir, realOutputDir] = await Promise.all([
    realpath(dataDir),
    realpath(outputDir),
  ]);
  const outputRelativeToDb = relative(realDataDir, realOutputDir);
  if (
    outputRelativeToDb === "" ||
    (!outputRelativeToDb.startsWith(`..${sep}`) && outputRelativeToDb !== "..")
  ) {
    throw new Error("Backup output must resolve outside DB_DATA_DIR");
  }
}

export async function assertRestoreTargetDoesNotExist(restoreDir) {
  try {
    await lstat(restoreDir);
    throw new Error(
      "RESTORE_DATA_DIR already exists; choose a new isolated path",
    );
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}
