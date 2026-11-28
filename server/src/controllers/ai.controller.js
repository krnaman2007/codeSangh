// server/src/controllers/ai.controller.js
// DevSync AI Coding Assistant Controller (Endpoint #63 - Mastermind M5)
// Blueprint Section 7.12 & Page 34-35

import {
  streamAiChat,
  getUserConversations,
  getUserConversationById,
  deleteUserConversation,
  getAiCompletion,
} from '../services/ai.service.js';
import { sendSuccess } from '../utils/respond.js';
import asyncHandler from '../utils/asyncHandler.js';

/**
 * POST /api/v1/projects/:projectId/ai/chat (Endpoint #63)
 * Ask the assistant a question about code. Streams response as Server-Sent Events (SSE).
 * Access: Viewer+ (Blueprint Section 7.12 & Page 34)
 */
export const chatWithAi = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    await streamAiChat({
      projectId,
      user: req.user,
      body: req.body,
      res,
    });
  } catch (err) {
    if (!res.headersSent) {
      next(err);
    } else {
      res.write(
        `event: error\ndata: ${JSON.stringify({
          code: err.code || 'AI_UNAVAILABLE',
          message: err.message,
        })}\n\n`
      );
      res.end();
    }
  }
};

/**
 * GET /api/v1/projects/:projectId/ai/conversations (Endpoint #64)
 * Lists caller's AI conversations (newest first).
 * Access: Viewer+ (own) (Blueprint Section 7.12 & Page 35)
 */
export const getConversations = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { page, limit } = req.query;

  const data = await getUserConversations({
    projectId,
    userId: req.user.id,
    page,
    limit,
  });

  return sendSuccess(res, data, 200);
});

/**
 * GET /api/v1/projects/:projectId/ai/conversations/:conversationId (Endpoint #65)
 * Returns one conversation with full message history (private to author).
 * Access: Viewer+ (own) (Blueprint Section 7.12 & Page 35)
 */
export const getConversation = asyncHandler(async (req, res) => {
  const { projectId, conversationId } = req.params;

  const data = await getUserConversationById({
    projectId,
    userId: req.user.id,
    conversationId,
  });

  return sendSuccess(res, data, 200);
});

/**
 * DELETE /api/v1/projects/:projectId/ai/conversations/:conversationId (Endpoint #66)
 * Deletes a conversation and cascade-deletes messages (private to author).
 * Access: Viewer+ (own) (Blueprint Section 7.12 & Page 35)
 */
export const deleteConversation = asyncHandler(async (req, res) => {
  const { projectId, conversationId } = req.params;

  await deleteUserConversation({
    projectId,
    userId: req.user.id,
    conversationId,
  });

  return res.status(204).send();
});

/**
 * POST /api/v1/projects/:projectId/ai/complete (Endpoint #67)
 * One short inline suggestion for ghost-text completion provider in Monaco Editor (M6). Not streamed.
 * Access: Editor+ (Blueprint Section 7.12 & Page 35)
 */
export const completeCode = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { fileId, language, prefix, suffix, cursor } = req.body;

  const data = await getAiCompletion({
    projectId,
    fileId,
    language,
    prefix,
    suffix,
    cursor,
  });

  return sendSuccess(res, data, 200);
});

