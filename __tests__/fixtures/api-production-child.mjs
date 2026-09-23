import { startServer } from '../../backend/api/server.js';
import { closeDatabase, createUser } from '../../backend/database/db.js';
import { createSessionToken } from '../../backend/api/services/sessionToken.js';

const server = await startServer();
process.send({ ready: true, port: server.address().port });
process.on('message', async (message) => {
  if (message === 'close-db') {
    await closeDatabase();
    process.send({ closed: true });
  } else if (message === 'seed') {
    const user = await createUser('ProductionPersistenceProbe');
    process.send({ userId: user.id, token: createSessionToken(user.id) });
  } else if (['SIGINT', 'SIGTERM'].includes(message)) {
    // Windows process.kill does not deliver POSIX signals. Exercise the same handler.
    process.emit(message);
  }
});
