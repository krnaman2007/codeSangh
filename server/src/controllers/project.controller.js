import {
  countOwnedProjects,
  createProject as createProjectRepo,
  getDashboardProjects,
  getProjectDetails,
  renameProject as renameProjectRepo,
  deleteProject as deleteProjectRepo,
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

/**
 * GET /api/v1/projects/:projectId (Endpoint #13)
 * Project metadata and the caller's role (drives all UI permissions).
 * Access: Viewer+ (Blueprint Section 7.4)
 */
export const getProjectById = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const project = await getProjectDetails(projectId);

  if (!project) {
    throw new ApiError(404, 'NOT_FOUND', 'Project not found');
  }

  return sendSuccess(
    res,
    {
      project: {
        id: project.id,
        name: project.name,
      },
      myRole: req.project.role,
      owner: project.owner,
      collaboratorCount: project._count.members,
      settings: {
        aiEnabled: true,
      },
    },
    200
  );
});

/**
 * PATCH /api/v1/projects/:projectId (Endpoint #14)
 * Rename project.
 * Access: Owner (Blueprint Section 7.4)
 */
export const renameProject = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { name } = req.body;

  const project = await renameProjectRepo(projectId, name);

  return sendSuccess(res, { project }, 200);
});

/**
 * DELETE /api/v1/projects/:projectId (Endpoint #15)
 * Delete project with cascade to child tables.
 * Access: Owner (Blueprint Section 7.4)
 */
export const deleteProject = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  await deleteProjectRepo(projectId);

  return res.status(204).send();
});
