import http from 'http';
import app from './app.js';
import env from './config/env.js';
import { connectDB, disconnectDB } from './config/prisma.js';

const PORT = env.PORT || 5000;

// Create HTTP server instance
const server = http.createServer(app);

// Start server and connect to database
async function startServer() {
  // Start listening immediately so health check and other non-blocking services are accessible
  server.listen(PORT, () => {
    console.log(`🚀 Server running in ${env.NODE_ENV} mode on port ${PORT}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/api/v1/health`);
  });

  // Attempt database connection
  try {
    await connectDB();
  } catch (error) {
    console.warn(`⚠️ Warning: Database connection failed on startup: ${error.message}`);
    console.warn('⚠️ Health check and in-memory endpoints remain operational while database retries.');
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
