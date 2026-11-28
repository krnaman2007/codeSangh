// server/src/controllers/ai.controller.js
// DevSync AI Coding Assistant Controller (Endpoint #63 - Mastermind M5)
// Blueprint Section 7.12 & Page 34-35

import { streamAiChat } from '../services/ai.service.js';

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
