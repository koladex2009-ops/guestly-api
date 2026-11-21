const http = require('http');
const app = require('./app');
const env = require('./config/env');
const logger = require('./config/logger');
const { connectDb, disconnectDb } = require('./config/db');

async function startServer() {
  await connectDb();

  if (env.NODE_ENV !== 'test') require('./jobs/expireBookings').start();

  const server = http.createServer(app);
  server.listen(env.PORT, () => {
    logger.info(`Server listening on port ${env.PORT}`);
  });

  let shuttingDown = false;
  const shutdown = (signal) => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    logger.info(`${signal} received; shutting down gracefully`);
    server.close(async (error) => {
      if (error) {
        logger.error('HTTP server shutdown failed', { error: error.message });
        process.exitCode = 1;
      }
      try {
        await disconnectDb();
      } catch (disconnectError) {
        logger.error('MongoDB shutdown failed', { error: disconnectError.message });
        process.exitCode = 1;
      }
      process.exit();
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

startServer().catch((error) => {
  logger.error('Server startup failed', { error: error.message });
  process.exit(1);
});

