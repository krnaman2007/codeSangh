const http = require('http');
const app = require('./app');
const env = require('./config/env');
const { connectDB, disconnectDB } = require('./config/prisma');

const PORT = env.PORT || 5000;

// Create HTTP server instance
const server = http.createServer(app);

// Start server after connecting to database
async function startServer() {
  try {
    // Connect to Neon PostgreSQL via Prisma Client
    await connectDB();

    server.listen(PORT, () => {
      console.log(`🚀 Server running in ${env.NODE_ENV} mode on port ${PORT}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/api/v1/health`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
}

// Graceful shutdown handlers
async function gracefulShutdown(signal) {
  console.log(`\nReceived ${signal}. Shutting down gracefully...`);
  server.close(async () => {
    console.log('HTTP server closed.');
    try {
      await disconnectDB();
      console.log('Database connection closed.');
      process.exit(0);
    } catch (err) {
      console.error('Error during database disconnection:', err);
      process.exit(1);
    }
  });

  // Force shutdown if stuck
  setTimeout(() => {
    console.error('Forced shutdown due to timeout.');
    process.exit(1);
  }, 10000);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

startServer();
