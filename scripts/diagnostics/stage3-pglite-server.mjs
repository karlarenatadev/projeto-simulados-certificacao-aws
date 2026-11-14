// Isolated synthetic server process used only by the stage 3 Linux harness.
import assert from "node:assert/strict";

assert.equal(process.env.NODE_ENV, "test");
assert.equal(process.env.DB_ENGINE, "pglite");
assert.equal(process.env.CLOUDACADEMY_PERF_DIAGNOSTICS, "1");
assert.ok(
  process.env.DB_DATA_DIR,
  "DB_DATA_DIR must point to an ephemeral directory",
);

const database = await import("../../backend/database/db.js");
await database.initializeDatabase();
for (let index = 0; index < 40; index++) {
  await database.insertQuestion({
    certification: "CLF-C02",
    language: "pt",
    source_question_id: `stage3-synthetic-${index}`,
    domain: "faturamento",
    difficulty: "easy",
    question_text: `Synthetic performance fixture ${index}`,
    options: ["First", "Second", "Third", "Fourth"],
    correct_answer: [0],
    explanation: "Synthetic fixture; not educational content.",
    validation_status: "APPROVED",
  });
}
await database.closeDatabase();

const { startServer } = await import("../../backend/api/server.js");
await startServer();
process.stdout.write("STAGE3_SYNTHETIC_SERVER_READY\n");
