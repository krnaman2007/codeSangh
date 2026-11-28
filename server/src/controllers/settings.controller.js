// server/src/controllers/settings.controller.js
// DevSync Project Settings Controller (Endpoint #68 - Mastermind M5/M6)
// Blueprint Section 7.12 & Page 35

import { getProjectSettings, updateProjectSettings } from '../services/settings.service.js';
import { sendSuccess } from '../utils/respond.js';
import asyncHandler from '../utils/asyncHandler.js';

/**
 * PATCH /api/v1/projects/:projectId/settings (Endpoint #68)
 * Project-level switches: enable/disable AI for the project (M5/M6).
 * Access: Owner only
 */
export const updateSettings = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { aiEnabled } = req.body;

  const settings = await updateProjectSettings(projectId, { aiEnabled });

  return sendSuccess(res, { settings }, 200);
});

/**
 * GET /api/v1/projects/:projectId/settings
 * Access: Viewer+
 */
export const getSettings = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const settings = await getProjectSettings(projectId);
  return sendSuccess(res, { settings }, 200);
});
