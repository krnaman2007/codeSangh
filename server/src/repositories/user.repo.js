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
 * Finds user by email INCLUDING passwordHash (for login comparison only)
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
 * Updates user last_login_at timestamp
 */
export async function updateLastLogin(id) {
  return prisma.user.update({
    where: { id },
    data: { lastLoginAt: new Date() },
  });
}
