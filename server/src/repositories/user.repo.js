import prisma from '../db/prisma.js';

// Safe user fields (never returns passwordHash as per Blueprint Section 5.1 & 13.2)
const USER_SAFE_SELECT = {
  id: true,
  name: true,
  email: true,
  avatarColor: true,
  preferences: true,
  createdAt: true,
  updatedAt: true,
};

/**
 * Creates a new user
 */
export async function createUser({ name, email, passwordHash, avatarColor }) {
  return prisma.user.create({
    data: {
      name,
      email: email.toLowerCase(),
      passwordHash,
      avatarColor,
    },
    select: USER_SAFE_SELECT,
  });
}

/**
 * Finds user by email without passwordHash
 */
export async function findUserByEmail(email) {
  return prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: USER_SAFE_SELECT,
  });
}

/**
 * Finds user by email INCLUDING passwordHash (for login / password verification)
 */
export async function findUserWithPasswordByEmail(email) {
  return prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });
}

/**
 * Finds user by ID without passwordHash
 */
export async function findUserById(id) {
  return prisma.user.findUnique({
    where: { id },
    select: USER_SAFE_SELECT,
  });
}

/**
 * Finds user by ID WITH passwordHash (for password change verification)
 */
export async function findUserWithPasswordById(id) {
  return prisma.user.findUnique({
    where: { id },
  });
}

/**
 * Updates user last_login_at timestamp
 */
export async function updateLastLogin(id) {
  return prisma.user.update({
    where: { id },
    data: { lastLoginAt: new Date() },
  });
}

/**
 * Updates user profile (name, avatarColor, preferences)
 * Merges preferences key-by-key for known keys only (Blueprint Section 7.4)
 */
export async function updateUserProfile(id, updateData) {
  const existing = await prisma.user.findUnique({
    where: { id },
    select: { preferences: true },
  });

  const data = {};
  if (updateData.name !== undefined) data.name = updateData.name;
  if (updateData.avatarColor !== undefined) data.avatarColor = updateData.avatarColor;

  if (updateData.preferences !== undefined) {
    const currentPrefs = (typeof existing?.preferences === 'object' && existing.preferences !== null)
      ? existing.preferences
      : { aiSuggestions: true, suggestionDelayMs: 400 };

    const merged = { ...currentPrefs };
    if (typeof updateData.preferences.aiSuggestions === 'boolean') {
      merged.aiSuggestions = updateData.preferences.aiSuggestions;
    }
    if (typeof updateData.preferences.suggestionDelayMs === 'number') {
      merged.suggestionDelayMs = updateData.preferences.suggestionDelayMs;
    }
    data.preferences = merged;
  }

  return prisma.user.update({
    where: { id },
    data,
    select: {
      id: true,
      name: true,
      email: true,
      avatarColor: true,
    },
  });
}

/**
 * Updates passwordHash for user
 */
export async function updatePassword(id, passwordHash) {
  return prisma.user.update({
    where: { id },
    data: { passwordHash },
  });
}

/**
 * Search users by email prefix for invite autocomplete (Blueprint Section 7.4)
 * Query: WHERE lower(email) LIKE lower($1) || '%' AND id <> $owner AND id NOT IN (members) LIMIT 5
 */
export async function searchUsersForInvite({ q, ownerId, memberIds = [] }) {
  const excludedIds = [ownerId, ...memberIds];

  return prisma.user.findMany({
    where: {
      email: {
        startsWith: q.toLowerCase(),
      },
      id: {
        notIn: excludedIds,
      },
    },
    take: 5,
    select: {
      id: true,
      name: true,
      email: true,
      avatarColor: true,
    },
  });
}
