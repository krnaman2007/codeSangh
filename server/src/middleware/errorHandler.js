import ApiError from '../utils/ApiError.js';
import env from '../config/env.js';

/**
 * Central Error Handler Middleware (Blueprint Section 7.1, 7.13 & Page 14 Error mapping)
 */
export function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || 500;
  let code = err.code || 'SERVER_ERROR';
  let message = err.message || 'An unexpected error occurred';
  let details = err.details || [];

  // Prisma Error Mappings (Section 5.7 & Page 14)
  if (err.code === 'P2002') {
    // Unique constraint violation (e.g. users.email)
    statusCode = 409;
    const target = err.meta?.target;
    if (Array.isArray(target) && target.includes('email')) {
      code = 'EMAIL_TAKEN';
      message = 'An account with this email already exists';
    } else {
      code = 'NAME_CONFLICT';
      message = 'Resource already exists';
    }
  } else if (err.code === 'P2025') {
    statusCode = 404;
    code = 'NOT_FOUND';
    message = 'Resource not found';
  } else if (err.code === 'P2003') {
    statusCode = 400;
    code = 'FOREIGN_KEY_VIOLATION';
    message = 'Invalid relation reference';
  } else if (err.code === 'P2028') {
    statusCode = 503;
    code = 'TRANSACTION_TIMEOUT';
    message = 'Database transaction timed out';
  }

  if (statusCode === 500) {
    console.error('[Unhandled Server Error]', err);
    if (env.NODE_ENV === 'production') {
      message = 'Internal server error';
    }
  }

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      ...(details.length > 0 && { details }),
      ...(env.NODE_ENV === 'development' && statusCode === 500 && { stack: err.stack }),
    },
  });
}

export default errorHandler;
