// server/src/controllers/voice.controller.js
// DevSync Voice WebRTC Controllers (Endpoints #61, #62 - Mastermind M4)
// Blueprint Section 7.11 & Page 34

import {
  getIceServersConfig,
  getVoiceSession,
} from '../services/voice.service.js';
import { sendSuccess } from '../utils/respond.js';
import asyncHandler from '../utils/asyncHandler.js';

/**
 * GET /api/v1/projects/:projectId/voice/ice-servers (Endpoint #61)
 * STUN/TURN servers for RTCPeerConnection with time-limited coturn REST credentials.
 * Access: Viewer+ (Blueprint Section 7.11 & Page 34)
 */
export const getIceServers = asyncHandler(async (req, res) => {
  const data = getIceServersConfig({ userId: req.user.id });
  return sendSuccess(res, data, 200);
});

/**
 * GET /api/v1/projects/:projectId/voice (Endpoint #62)
 * Returns active participants in the project voice session.
 * Access: Viewer+ (Blueprint Section 7.11 & Page 34)
 */
export const getVoiceSessionInfo = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const data = getVoiceSession(projectId);
  return sendSuccess(res, data, 200);
});
