import { runMigrations } from "../../backend/database/migrations/runner.js";

const controller = new AbortController();
const interrupt = () => controller.abort();
process.once("SIGINT", interrupt);
process.once("SIGTERM", interrupt);
try {
  console.log(
    JSON.stringify(await runMigrations({ signal: controller.signal })),
  );
} catch (error) {
  // No raw pg/URL/fs messages or credentials in CLI diagnostics.
  console.error(
    JSON.stringify({
      code: error.code?.startsWith("F2_") ? error.code : "F2_MIGRATION_FAILED",
      kind: error.kind,
      phase: error.phase,
      commitOutcome: error.commitOutcome,
    }),
  );
  process.exitCode = 1;
} finally {
  process.removeListener("SIGINT", interrupt);
  process.removeListener("SIGTERM", interrupt);
}
