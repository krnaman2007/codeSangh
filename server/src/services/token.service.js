import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import env from '../config/env.js';

/**
 * Token Service implementing Blueprint Section 6.1 (Token Strategy)
 */

/**
 * Generates short-lived Access Token (15 min)
 * Payload: { sub: userId, name }
 */
export function generateAccessToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      name: user.name,
    },
    env.JWT_ACCESS_SECRET,
    {
      expiresIn: env.JWT_ACCESS_EXPIRES,
    }
  );
}

/**
 * Generates random 64-byte string for refresh token
 */
export function generateRefreshToken() {
  return crypto.randomBytes(64).toString('hex');
}

/**
 * Generates SHA-256 hash of refresh token to store in sessions table
 */
export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Verifies JWT access token
 */
export function verifyAccessToken(token) {
  return jwt.verify(token, env.JWT_ACCESS_SECRET);
}

/**
 * Computes expiration date for a new refresh token (default: 7 days)
 */
export function getRefreshTokenExpiresAt() {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + env.REFRESH_TOKEN_DAYS);
  return expiresAt;
}

/**
 * Sets httpOnly refresh token cookie on path /api/v1/auth
 */
export function setRefreshTokenCookie(res, rawToken) {
  const maxAgeMs = env.REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000;
  res.cookie('refreshToken', rawToken, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/v1/auth',
    maxAge: maxAgeMs,
  });
}

/**
 * Clears httpOnly refresh token cookie
 */
export function clearRefreshTokenCookie(res) {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/v1/auth',
  });
}
