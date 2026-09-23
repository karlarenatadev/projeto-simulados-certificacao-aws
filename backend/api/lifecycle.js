import { safeError } from './services/operationalLogging.js';

export function installShutdown(
  server,
  {
    closeDatabase,
    onDraining,
    signals = process,
    exit = (code) => process.exit(code),
    drainMs = 10_000,
    deadlineMs = 15_000,
  },
) {
  let stopping;
  let exitCode = 0;
  const handlers = new Map();
  const removeHandlers = () => {
    for (const [signal, handler] of handlers)
      signals.removeListener(signal, handler);
  };
  function shutdown(code = 0) {
    exitCode = Math.max(exitCode, code);
    if (stopping) return stopping;
    onDraining();
    stopping = (async () => {
      const deadline = setTimeout(() => exit(1), deadlineMs);
      const drain = setTimeout(() => server.closeAllConnections(), drainMs);
      try {
        await new Promise((resolve, reject) => {
          server.close((error) => (error ? reject(error) : resolve()));
          server.closeIdleConnections();
        });
        clearTimeout(drain);
        await closeDatabase();
        exit(exitCode);
      } catch (error) {
        console.error('API shutdown failed', safeError(error));
        exit(1);
      } finally {
        clearTimeout(drain);
        clearTimeout(deadline);
        removeHandlers();
      }
    })();
    return stopping;
  }
  for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
    handlers.set(signal, () => {
      void shutdown();
    });
  }
  for (const signal of ['uncaughtException', 'unhandledRejection']) {
    handlers.set(signal, (error) => {
      console.error(`API ${signal}`, safeError(error));
      void shutdown(1);
    });
  }
  for (const [signal, handler] of handlers) signals.on(signal, handler);
  return shutdown;
}
