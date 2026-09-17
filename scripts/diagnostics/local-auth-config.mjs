import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

const root = fileURLToPath(new URL("../../", import.meta.url));
config({ path: path.join(root, ".env"), quiet: true });
const context = {};
vm.runInNewContext(
  fs.readFileSync(path.join(root, "public/js/runtimeConfig.js"), "utf8"),
  context,
  { timeout: 1000 },
);
const backend = String(process.env.GOOGLE_CLIENT_ID || "").trim();
const frontend = context.__APP_CONFIG__?.googleClientId || "";
const equal = !!backend && frontend === backend;
console.log(
  JSON.stringify({
    googleClientIdConfigured: !!frontend,
    frontendBackendEqual: equal,
    expressPort: Number(process.env.PORT || 3001),
  }),
);
if (!equal) {
  console.error(
    "GOOGLE_RUNTIME_CONFIG_MISMATCH: rebuild with the same root environment as Express.",
  );
  process.exitCode = 1;
}
