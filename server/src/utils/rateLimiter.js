import { LIMITS } from '../constants/limits.js';
import ApiError from './ApiError.js';

// In-memory sliding window rate tracker: Map<userId, timestamp[]>
const userRunTimestamps = new Map();

/**
 * Checks and enforces the execution rate limit (10 runs / min / user)
 *
 * @param {string} userId - Authenticated user UUID
 */
export function enforceRunRateLimit(userId) {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute

  const timestamps = userRunTimestamps.get(userId) || [];
  // Filter out timestamps outside the 1-minute window
  const recentTimestamps = timestamps.filter((t) => now - t < windowMs);

  if (recentTimestamps.length >= LIMITS.RUN_RATE_LIMIT) {
    throw new ApiError(
      429,
      'RATE_LIMIT_EXCEEDED',
      `Execution rate limit exceeded: maximum ${LIMITS.RUN_RATE_LIMIT} runs per minute`
    );
  }

  recentTimestamps.push(now);
  userRunTimestamps.set(userId, recentTimestamps);
}

/**
 * Reset rate limit tracker (useful for testing)
 */
export function resetRunRateLimiter() {
  userRunTimestamps.clear();
}
