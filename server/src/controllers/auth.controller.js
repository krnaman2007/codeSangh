import bcrypt from 'bcryptjs';
import env from '../config/env.js';
import {
  createUser,
  findUserByEmail,
  findUserWithPasswordByEmail,
  findUserById,
  updateLastLogin,
} from '../repositories/user.repo.js';
import {
  createSession,
  findSessionByTokenHash,
  revokeSession,
  revokeAllUserSessions,
  rotateSession,
} from '../repositories/session.repo.js';
import {
  generateAccessToken,
  generateRefreshToken,
  hashToken,
  getRefreshTokenExpiresAt,
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
} from '../services/token.service.js';
import { getRandomColor } from '../utils/colors.js';
import { sendSuccess } from '../utils/respond.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';

/**
 * POST /api/v1/auth/register (Endpoint #3)
 * Creates account and logs user in immediately.
 */
export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  // Check if email already registered
  const existingUser = await findUserByEmail(email);
  if (existingUser) {
    throw new ApiError(409, 'EMAIL_TAKEN', 'An account with this email already exists');
  }

  // Hash password using bcrypt (12 rounds as per Blueprint)
  const passwordHash = await bcrypt.hash(password, env.BCRYPT_ROUNDS);

  // Assign random avatarColor from palette
  const avatarColor = getRandomColor();

  // Create user
  const user = await createUser({
    name,
    email,
    passwordHash,
    avatarColor,
  });

  // Generate tokens
  const accessToken = generateAccessToken(user);
  const rawRefreshToken = generateRefreshToken();
  const tokenHash = hashToken(rawRefreshToken);
  const expiresAt = getRefreshTokenExpiresAt();

  // Store session in DB
  await createSession({
    userId: user.id,
    tokenHash,
    userAgent: req.headers['user-agent'],
    ip: req.ip,
    expiresAt,
  });

  // Set httpOnly cookie
  setRefreshTokenCookie(res, rawRefreshToken);

  return sendSuccess(
    res,
    {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarColor: user.avatarColor,
      },
      accessToken,
    },
    201
  );
});

/**
 * POST /api/v1/auth/login (Endpoint #4)
 * Authenticates user and issues access token + refresh cookie.
 */
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Find user by email
  const user = await findUserWithPasswordByEmail(email);
  if (!user) {
    // Same error message for unknown email and wrong password (Blueprint Section 6.1)
    throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }

  // Verify password
  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }

  // Update last login timestamp
  await updateLastLogin(user.id);

  // Generate tokens
  const accessToken = generateAccessToken(user);
  const rawRefreshToken = generateRefreshToken();
  const tokenHash = hashToken(rawRefreshToken);
  const expiresAt = getRefreshTokenExpiresAt();

  // Create session
  await createSession({
    userId: user.id,
    tokenHash,
    userAgent: req.headers['user-agent'],
    ip: req.ip,
    expiresAt,
  });

  // Set refresh cookie
  setRefreshTokenCookie(res, rawRefreshToken);

  return sendSuccess(
    res,
    {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarColor: user.avatarColor,
      },
      accessToken,
    },
    200
  );
});

/**
 * POST /api/v1/auth/refresh (Endpoint #5)
 * Exchanges refresh cookie for new access token and rotates the refresh token.
 */
export const refresh = asyncHandler(async (req, res) => {
  const rawRefreshToken = req.cookies?.refreshToken;

  if (!rawRefreshToken) {
    throw new ApiError(401, 'AUTH_REQUIRED', 'Refresh token required');
  }

  const tokenHash = hashToken(rawRefreshToken);
  const session = await findSessionByTokenHash(tokenHash);

  if (!session) {
    clearRefreshTokenCookie(res);
    throw new ApiError(401, 'AUTH_REQUIRED', 'Invalid refresh token');
  }

  // Theft Detection: Re-use of a revoked token revokes all sessions of that user (Blueprint Section 6.1)
  if (session.revokedAt) {
    await revokeAllUserSessions(session.userId);
    clearRefreshTokenCookie(res);
    throw new ApiError(401, 'AUTH_REQUIRED', 'Revoked token re-used. All sessions have been terminated.');
  }

  // Check if expired
  if (new Date() > new Date(session.expiresAt)) {
    await revokeSession(session.id);
    clearRefreshTokenCookie(res);
    throw new ApiError(401, 'AUTH_REQUIRED', 'Refresh token has expired');
  }

  // Token rotation: Revoke old session and create a new session
  const newRawRefreshToken = generateRefreshToken();
  const newTokenHash = hashToken(newRawRefreshToken);
  const newExpiresAt = getRefreshTokenExpiresAt();

  await rotateSession(session.id, {
    userId: session.userId,
    tokenHash: newTokenHash,
    userAgent: req.headers['user-agent'],
    ip: req.ip,
    expiresAt: newExpiresAt,
  });

  // Set rotated refresh cookie
  setRefreshTokenCookie(res, newRawRefreshToken);

  // Generate new access token
  const accessToken = generateAccessToken(session.user);

  return sendSuccess(
    res,
    {
      accessToken,
      user: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        avatarColor: session.user.avatarColor,
      },
    },
    200
  );
});

/**
 * POST /api/v1/auth/logout (Endpoint #6)
 * Revokes current session and clears refresh cookie.
 */
export const logout = asyncHandler(async (req, res) => {
  const rawRefreshToken = req.cookies?.refreshToken;

  if (rawRefreshToken) {
    const tokenHash = hashToken(rawRefreshToken);
    const session = await findSessionByTokenHash(tokenHash);
    if (session) {
      await revokeSession(session.id);
    }
  }

  clearRefreshTokenCookie(res);
  return res.status(204).send();
});

/**
 * GET /api/v1/auth/me (Endpoint #7)
 * Returns current authenticated user and preferences.
 */
export const getMe = asyncHandler(async (req, res) => {
  const user = await findUserById(req.user.id);

  if (!user) {
    throw new ApiError(404, 'NOT_FOUND', 'User not found');
  }

  return sendSuccess(
    res,
    {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarColor: user.avatarColor,
        preferences: user.preferences,
      },
    },
    200
  );
});
