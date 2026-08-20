import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { startPublicServer } from "./serve-public.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cli = path.join(root, "node_modules", "@playwright", "test", "cli.js");
const server = await startPublicServer();

const child = spawn(process.execPath, [cli, "test", ...process.argv.slice(2)], {
  cwd: root,
  env: { ...process.env, PLAYWRIGHT_EXTERNAL_SERVER: "1" },
  stdio: "inherit",
  windowsHide: true,
});

const close = () => server.close();
child.once("exit", (code, signal) => {
  close();
  process.exitCode = typeof code === "number" ? code : 1;
  if (signal) process.stderr.write(`Playwright terminated by ${signal}\n`);
});
child.once("error", (error) => {
  close();
  console.error("Failed to start Playwright:", error.message);
  process.exitCode = 1;
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => {
    child.kill(signal);
    close();
  });
}
