import { startServer } from "../../backend/api/server.js";
try {
  const server = await startServer();
  process.send({ port: server.address().port });
  process.on("message", (message) => {
    if (message === "shutdown") process.emit("SIGTERM");
  });
} catch {
  process.send({ error: "startup failed" });
  process.exit(1);
}
