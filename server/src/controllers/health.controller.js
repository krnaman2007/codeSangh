import { sendSuccess } from '../utils/respond.js';

/**
 * GET /api/v1/health
 * Public liveness probe endpoint (Blueprint section 7.3)
 */
export const getHealth = (req, res) => {
  return sendSuccess(res, {
    status: 'ok',
    time: new Date().toISOString(),
  });
};
