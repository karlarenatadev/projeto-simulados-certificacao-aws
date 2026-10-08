import { startServer } from "../../backend/api/server.js";

try {
  const server = await startServer();
  process.send?.({ port: server.address().port });
} catch {
  process.send?.({ error: "startup failed" });
  process.disconnect?.();
  process.exitCode = 1;
}

process.on("message", (message) => {
  if (message === "shutdown") process.emit("SIGTERM");
});
