import jwt from 'jsonwebtoken';
import { verifyAccessToken } from '../services/token.service.js';
import ApiError from '../utils/ApiError.js';

/**
 * Auth Middleware (Blueprint Section 6.1 & 7.1)
 * Header: Authorization: Bearer <accessToken>
 */
export function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new ApiError(401, 'AUTH_REQUIRED', 'Authorization token required'));
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = verifyAccessToken(token);
    req.user = {
      id: payload.sub,
      name: payload.name,
    };
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return next(new ApiError(401, 'TOKEN_EXPIRED', 'Access token expired'));
    }
    return next(new ApiError(401, 'AUTH_REQUIRED', 'Invalid access token'));
  }
}

export default authenticate;
