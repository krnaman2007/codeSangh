import {
  listProjectCollaborators,
  countProjectCollaborators,
  findProjectMember,
  addCollaborator as addCollaboratorRepo,
  updateCollaboratorRole as updateCollaboratorRoleRepo,
  removeCollaborator as removeCollaboratorRepo,
} from '../repositories/collaborator.repo.js';
import { getProjectDetails } from '../repositories/project.repo.js';
import { findUserByEmail } from '../repositories/user.repo.js';
import { LIMITS } from '../constants/limits.js';
import { sendSuccess } from '../utils/respond.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';

/**
 * GET /api/v1/projects/:projectId/collaborators (Endpoint #25)
 * List owner + collaborators.
 * Access: Viewer+ (Blueprint Section 7.4)
 */
export const getCollaborators = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const data = await listProjectCollaborators(projectId);

  if (!data) {
    throw new ApiError(404, 'NOT_FOUND', 'Project not found');
  }

  return sendSuccess(res, data, 200);
});

/**
 * POST /api/v1/projects/:projectId/collaborators (Endpoint #26)
 * Invite user with View/Edit access.
 * Access: Owner (Blueprint Section 7.4)
 */
export const inviteCollaborator = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { email, role } = req.body;

  const project = await getProjectDetails(projectId);
  if (!project) {
    throw new ApiError(404, 'NOT_FOUND', 'Project not found');
  }

  // 1. Prevent self-invite
  if (email.toLowerCase() === req.user.email?.toLowerCase()) {
    throw new ApiError(400, 'CANNOT_SHARE_WITH_SELF', 'Cannot add project owner as collaborator');
  }

  // 2. Check if target user exists in system
  const targetUser = await findUserByEmail(email);
  if (!targetUser) {
    throw new ApiError(404, 'USER_NOT_FOUND', 'No user found with this email address');
  }

  if (targetUser.id === project.owner.id) {
    throw new ApiError(400, 'CANNOT_SHARE_WITH_SELF', 'Cannot add project owner as collaborator');
  }

  // 3. Check if target user is already a collaborator
  const existing = await findProjectMember(projectId, targetUser.id);
  if (existing) {
    throw new ApiError(409, 'ALREADY_COLLABORATOR', 'User is already a collaborator on this project');
  }

  // 4. Enforce 20-collaborator limit
  const currentCount = await countProjectCollaborators(projectId);
  if (currentCount >= LIMITS.COLLABORATORS_PER_PROJECT) {
    throw new ApiError(
      409,
      'LIMIT_EXCEEDED',
      `Project collaborator limit reached (maximum ${LIMITS.COLLABORATORS_PER_PROJECT} collaborators)`
    );
  }

  // 5. Add collaborator
  const collaborator = await addCollaboratorRepo({
    projectId,
    userId: targetUser.id,
    role,
    invitedById: req.user.id,
  });

  return sendSuccess(res, { collaborator }, 201);
});

/**
 * PATCH /api/v1/projects/:projectId/collaborators/:userId (Endpoint #27)
 * Change access level (editor | viewer).
 * Access: Owner (Blueprint Section 7.4)
 */
export const updateCollaborator = asyncHandler(async (req, res) => {
  const { projectId, userId } = req.params;
  const { role } = req.body;

  const project = await getProjectDetails(projectId);
  if (!project) {
    throw new ApiError(404, 'NOT_FOUND', 'Project not found');
  }

  // Cannot change role of owner
  if (userId === project.owner.id) {
    throw new ApiError(400, 'INVALID_ACTION', "Cannot change role of project owner");
  }

  // Collaborator must exist
  const existing = await findProjectMember(projectId, userId);
  if (!existing) {
    throw new ApiError(404, 'NOT_FOUND', 'Collaborator not found');
  }

  const collaborator = await updateCollaboratorRoleRepo(projectId, userId, role);

  return sendSuccess(res, { collaborator }, 200);
});

/**
 * DELETE /api/v1/projects/:projectId/collaborators/:userId (Endpoint #28)
 * Revoke collaborator (owner) or leave project (collaborator self).
 * Access: Owner / self (Blueprint Section 7.4)
 */
export const removeCollaborator = asyncHandler(async (req, res) => {
  const { projectId, userId } = req.params;
  const callerRole = req.project.role;
  const callerId = req.user.id;

  const project = await getProjectDetails(projectId);
  if (!project) {
    throw new ApiError(404, 'NOT_FOUND', 'Project not found');
  }

  if (callerRole === 'owner') {
    if (userId === project.owner.id) {
      throw new ApiError(400, 'CANNOT_REMOVE_OWNER', 'Owner cannot leave project; delete the project instead');
    }
  } else {
    // Viewer or Editor leaving project
    if (userId !== callerId) {
      throw new ApiError(403, 'FORBIDDEN', 'Only the project owner can remove other collaborators');
    }
  }

  // Check if target user is actually a collaborator
  const existing = await findProjectMember(projectId, userId);
  if (!existing) {
    throw new ApiError(404, 'NOT_FOUND', 'Collaborator not found');
  }

  await removeCollaboratorRepo(projectId, userId);

  return res.status(204).send();
});
