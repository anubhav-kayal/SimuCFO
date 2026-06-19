require('dotenv').config();
const app = require('./app');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  logger.info('Server started', { port: PORT, url: `http://localhost:${PORT}` });
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    logger.error('Port already in use', { port: PORT });
    process.exit(1);
  } else {
    logger.error('Server error', { error: error.message });
  }
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection', { reason });
});

function gracefulShutdown(signal) {
  logger.info('Shutdown signal received', { signal });
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10_000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
