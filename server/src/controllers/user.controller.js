import bcrypt from 'bcryptjs';
import env from '../config/env.js';
import {
  updateUserProfile,
  findUserWithPasswordById,
  updatePassword,
  searchUsersForInvite,
} from '../repositories/user.repo.js';
import { revokeAllUserSessions } from '../repositories/session.repo.js';
import { getRole, getProjectMemberUserIds } from '../repositories/project.repo.js';
import { sendSuccess } from '../utils/respond.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';

/**
 * PATCH /api/v1/users/me (Endpoint #8)
 * Updates user name, avatar colour, and/or preferences
 */
export const updateMe = asyncHandler(async (req, res) => {
  const updatedUser = await updateUserProfile(req.user.id, req.body);

  return sendSuccess(
    res,
    {
      user: updatedUser,
    },
    200
  );
});

/**
 * PATCH /api/v1/users/me/password (Endpoint #9)
 * Changes password and revokes all other sessions of this user
 */
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await findUserWithPasswordById(req.user.id);
  if (!user) {
    throw new ApiError(404, 'NOT_FOUND', 'User not found');
  }

  // Verify current password
  const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isMatch) {
    throw new ApiError(401, 'INVALID_CREDENTIALS', 'Current password incorrect');
  }

  // Hash new password (12 rounds)
  const newPasswordHash = await bcrypt.hash(newPassword, env.BCRYPT_ROUNDS);

  // Update password in database
  await updatePassword(user.id, newPasswordHash);

  // Revoke all other sessions of this user (Blueprint Section 7.4)
  await revokeAllUserSessions(user.id);

  return res.status(204).send();
});

/**
 * GET /api/v1/users/search?q=riy&projectId=3f2a9c1e-... (Endpoint #10)
 * Autocomplete for invite box. Owner only. Max 5 users whose email starts with q.
 */
export const searchUsers = asyncHandler(async (req, res) => {
  const { q, projectId } = req.query;

  // Check if project exists and caller's role (Blueprint Section 5.7 & 7.4)
  const role = await getRole(projectId, req.user.id);
  if (!role) {
    // Do not leak project existence to non-members
    throw new ApiError(404, 'NOT_FOUND', 'Project not found');
  }

  if (role !== 'owner') {
    throw new ApiError(403, 'FORBIDDEN', 'Only the project owner can search users to invite');
  }

  // Get existing collaborator IDs so they are excluded
  const memberIds = await getProjectMemberUserIds(projectId);

  // Query users matching email prefix, excluding owner and collaborators
  const users = await searchUsersForInvite({
    q,
    ownerId: req.user.id,
    memberIds,
  });

  return sendSuccess(res, { users }, 200);
});
