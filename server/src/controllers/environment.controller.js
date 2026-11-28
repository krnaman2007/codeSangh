// server/src/controllers/environment.controller.js
import { RUNTIME_CATALOGUE } from '../constants/runtimes.js';
import {
  getProjectEnvironment,
  saveProjectEnvironment,
  rebuildProjectEnvironment,
  getProjectBuildLog,
  resetProjectEnvironment,
} from '../services/environment.service.js';
import { sendSuccess } from '../utils/respond.js';
import asyncHandler from '../utils/asyncHandler.js';

/**
 * GET /api/v1/environments/runtimes (Endpoint #55)
 * Returns runtime catalogue for environment builder (RuntimePicker).
 * Access: Logged in (Blueprint Section 7.10)
 */
export const getRuntimes = asyncHandler(async (req, res) => {
  return sendSuccess(res, { runtimes: RUNTIME_CATALOGUE }, 200);
});

/**
 * GET /api/v1/projects/:projectId/environment (Endpoint #56)
 * Returns project environment configuration and status.
 * Access: Viewer+ (Blueprint Section 7.10 & Page 33)
 */
export const getEnvironment = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  const environment = await getProjectEnvironment(projectId);

  return sendSuccess(res, { environment }, 200);
});

/**
 * PUT /api/v1/projects/:projectId/environment (Endpoint #57)
 * Defines and saves project environment, starts build.
 * Access: Owner (Blueprint Section 7.10 & Page 33)
 */
export const saveEnvironment = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const spec = req.body;

  const environment = await saveProjectEnvironment({
    projectId,
    spec,
    user: req.user,
  });

  return sendSuccess(res, { environment }, 200);
});

/**
 * POST /api/v1/projects/:projectId/environment/build (Endpoint #58)
 * Force rebuild with the stored configuration.
 * Access: Owner (Blueprint Section 7.10 & Page 33)
 */
export const rebuildEnvironment = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  const environment = await rebuildProjectEnvironment({
    projectId,
    user: req.user,
  });

  return sendSuccess(res, { environment }, 202);
});

/**
 * GET /api/v1/projects/:projectId/environment/build-log (Endpoint #59)
 * Returns last build output (capped at 200 KB) for build-log drawer.
 * Access: Viewer+ (Blueprint Section 7.10 & Page 33)
 */
export const getBuildLog = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  const data = await getProjectBuildLog(projectId);

  return sendSuccess(res, data, 200);
});

/**
 * DELETE /api/v1/projects/:projectId/environment (Endpoint #60)
 * Reset environment: stop & remove container & image, delete configuration.
 * Project returns to Judge0 mode.
 * Access: Owner (Blueprint Section 7.10 & Page 34)
 */
export const resetEnvironment = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  await resetProjectEnvironment({ projectId });

  return res.status(204).send();
});
