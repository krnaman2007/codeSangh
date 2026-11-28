// server/src/controllers/environment.controller.js
import { RUNTIME_CATALOGUE } from '../constants/runtimes.js';
import {
  getProjectEnvironment,
  saveProjectEnvironment,
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
