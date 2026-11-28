import prisma from '../db/prisma.js';

/**
 * Connects to the database and verifies connectivity.
 * Retries once on connection errors (P1001 / P1017) to account for Neon serverless compute cold starts.
 */
export async function connectDB(retries = 1) {
  try {
    await prisma.$connect();
    console.log('Successfully connected to Neon PostgreSQL database via Prisma.');
  } catch (error) {
    if (retries > 0 && (error.code === 'P1001' || error.code === 'P1017')) {
      console.warn('Neon compute is waking up (cold start). Retrying connection in 2 seconds...');
      await new Promise((resolve) => setTimeout(resolve, 2000));
      return connectDB(retries - 1);
    }
    console.error('Failed to connect to database:', error.message);
    throw error;
  }
}

/**
 * Graceful disconnect from Prisma
 */
export async function disconnectDB() {
  await prisma.$disconnect();
}

export { prisma };
export default prisma;
