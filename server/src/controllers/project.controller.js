import {
  countOwnedProjects,
  createProject as createProjectRepo,
  getDashboardProjects,
} from '../repositories/project.repo.js';
import { LIMITS } from '../constants/limits.js';
import { sendSuccess } from '../utils/respond.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';

/**
 * GET /api/v1/projects?search=port (Endpoint #11)
 * Dashboard data in one call: projects I own and projects shared with me.
 * Access: Logged in (Blueprint Section 7.4)
 */
export const getProjects = asyncHandler(async (req, res) => {
  const search = req.query?.search;
  const data = await getDashboardProjects(req.user.id, search);

  return sendSuccess(res, data, 200);
});

/**
 * POST /api/v1/projects (Endpoint #12)
 * Create a project. Only the name is accepted; any language field is rejected/ignored.
 * Access: Logged in (Blueprint Section 7.4)
 */
export const createProject = asyncHandler(async (req, res) => {
  const { name } = req.body;

  // Enforce 50 projects per user limit (Blueprint Section 4.3 & 7.4)
  const ownedCount = await countOwnedProjects(req.user.id);
  if (ownedCount >= LIMITS.PROJECTS_PER_USER) {
    throw new ApiError(409, 'LIMIT_EXCEEDED', `Project limit reached (maximum ${LIMITS.PROJECTS_PER_USER} projects)`);
  }

  // Create project in DB (name_lower uniqueness handled by DB unique index + errorHandler)
  const project = await createProjectRepo({
    name,
    ownerId: req.user.id,
  });

  return sendSuccess(res, { project }, 201);
});
