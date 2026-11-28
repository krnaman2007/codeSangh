// server/src/middleware/rateLimiter.js
// Rate limiters for DevSync API (Blueprint Section 7.13 & Page 35)

import rateLimit from 'express-rate-limit';
import ApiError from '../utils/ApiError.js';

/**
 * Rate limiter for POST /api/v1/projects/:projectId/ai/complete
 * Enforces 60 requests per minute per user (Blueprint Page 35: 429 RATE_LIMITED)
 */
export const aiCompleteRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  keyGenerator: (req) => req.user?.id || req.ip,
  handler: (req, res, next) => {
    next(new ApiError(429, 'RATE_LIMITED', 'Too many code completion requests. Limit is 60 per minute.'));
  },
  standardHeaders: true,
  legacyHeaders: false,
});
