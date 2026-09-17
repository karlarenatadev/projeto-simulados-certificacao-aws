import fs from "node:fs";
import process from "node:process";
import { PGlite } from "@electric-sql/pglite";

const dataDir = process.env.RECOVERY_DATA_DIR;
const dumpPath = process.env.RECOVERY_DUMP_PATH;
if (!dataDir) throw new Error("RECOVERY_DATA_DIR is required");
const db = await PGlite.create({ dataDir });
const tables = await db.query(
  "select table_name from information_schema.tables where table_schema='public' order by table_name",
);
console.log(
  JSON.stringify({ tables: tables.rows.map((row) => row.table_name) }),
);
for (const table of [
  "users",
  "user_identities",
  "user_module_state",
  "local_identity_links",
]) {
  try {
    const result = await db.query(
      `select count(*)::int as count from ${table}`,
    );
    console.log(`${table}=${result.rows[0].count}`);
  } catch {
    console.log(`${table}=MISSING`);
  }
}
if (dumpPath) {
  const dump = await db.dumpDataDir();
  fs.writeFileSync(dumpPath, Buffer.from(await dump.arrayBuffer()));
  console.log(`DUMP_BYTES=${fs.statSync(dumpPath).size}`);
}
await db.close();
