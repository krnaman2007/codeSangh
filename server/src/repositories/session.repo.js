import prisma from '../db/prisma.js';

/**
 * Creates a new session
 */
export async function createSession(data, db = prisma) {
  return db.session.create({
    data: {
      userId: data.userId,
      tokenHash: data.tokenHash,
      userAgent: data.userAgent || null,
      ip: data.ip || null,
      expiresAt: data.expiresAt,
    },
  });
}

/**
 * Finds session by SHA-256 token hash including user relation
 */
export async function findSessionByTokenHash(tokenHash) {
  return prisma.session.findUnique({
    where: { tokenHash },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          avatarColor: true,
          preferences: true,
        },
      },
    },
  });
}

/**
 * Marks a session as revoked
 */
export async function revokeSession(id, db = prisma) {
  return db.session.update({
    where: { id },
    data: { revokedAt: new Date() },
  });
}

/**
 * Revokes all sessions for a user (used during theft detection / password change)
 */
export async function revokeAllUserSessions(userId, db = prisma) {
  return db.session.updateMany({
    where: {
      userId,
      revokedAt: null,
    },
    data: { revokedAt: new Date() },
  });
}

/**
 * Atomically revokes old session and creates a new session (refresh token rotation)
 */
export async function rotateSession(oldSessionId, newSessionData) {
  return prisma.$transaction(async (tx) => {
    // Revoke old session
    await tx.session.update({
      where: { id: oldSessionId },
      data: { revokedAt: new Date() },
    });

    // Create new session
    return tx.session.create({
      data: {
        userId: newSessionData.userId,
        tokenHash: newSessionData.tokenHash,
        userAgent: newSessionData.userAgent || null,
        ip: newSessionData.ip || null,
        expiresAt: newSessionData.expiresAt,
      },
    });
  });
}

/**
 * Deletes expired sessions (hourly cron cleanup)
 */
export async function deleteExpiredSessions() {
  return prisma.session.deleteMany({
    where: {
      expiresAt: { lt: new Date() },
    },
  });
}
