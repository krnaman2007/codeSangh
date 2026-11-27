import { findNodeById, getFileBreakpoints, updateFileBreakpoints } from '../repositories/node.repo.js';
import {
  createDebugSession as createDebugSessionRepo,
  getActiveDebugSession,
  findDebugSessionById,
  stopDebugSession as stopDebugSessionRepo,
  updateDebugSessionState,
} from '../repositories/debug.repo.js';
import { getLanguageByKey } from '../constants/languages.js';
import { initializeDebugSession, normalizeBreakpoints } from '../services/debug.service.js';
import { sendSuccess } from '../utils/respond.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';

/**
 * POST /api/v1/projects/:projectId/files/:fileId/debug (Endpoint #33)
 * Start a collaborative debug session (Mastermind Feature M1).
 * Access: Editor+ (Blueprint & PDF Page 6)
 */
export const startDebugSession = asyncHandler(async (req, res) => {
  const { projectId, fileId } = req.params;
  const { breakpoints } = req.body;

  // 1. Validate file node exists in this project
  const file = await findNodeById(fileId);
  if (!file || file.projectId !== projectId || file.type !== 'file') {
    throw new ApiError(404, 'NOT_FOUND', 'File not found');
  }

  // 2. Validate language supports debugging
  const langConfig = getLanguageByKey(file.language);
  if (!langConfig || !langConfig.debug) {
    throw new ApiError(
      400,
      'LANGUAGE_NOT_DEBUGGABLE',
      `Language '${file.language}' does not support debugging`
    );
  }

  // 3. Initialize debug session state and breakpoints
  const initState = initializeDebugSession({
    sourceCode: file.content,
    fileName: file.name,
    breakpoints,
  });

  // 4. Create active session in database
  const session = await createDebugSessionRepo({
    projectId,
    fileId,
    startedById: req.user.id,
    language: file.language,
    debugAdapter: langConfig.debugAdapter || 'custom',
    breakpoints: initState.breakpoints,
    currentLine: initState.currentLine,
    variables: initState.variables,
    callStack: initState.callStack,
  });

  return sendSuccess(res, { session }, 201);
});

/**
 * GET /api/v1/projects/:projectId/debug/sessions/active (Endpoint #34)
 * Get current active debug session for this project, if any.
 * Access: Viewer+ (Blueprint & PDF Page 6)
 */
export const getActiveSession = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  const session = await getActiveDebugSession(projectId);

  return sendSuccess(res, { session: session || null }, 200);
});

/**
 * DELETE /api/v1/projects/:projectId/debug/sessions/:sessionId (Endpoint #35)
 * Stop the active debug session.
 * Access: Editor+ (Blueprint & PDF Page 6)
 */
export const stopSession = asyncHandler(async (req, res) => {
  const { projectId, sessionId } = req.params;

  const session = await findDebugSessionById(sessionId, projectId);
  if (!session || session.projectId !== projectId) {
    throw new ApiError(404, 'NOT_FOUND', 'Debug session not found');
  }

  await stopDebugSessionRepo(sessionId, projectId);

  return res.status(204).send();
});

/**
 * GET /api/v1/projects/:projectId/files/:fileId/breakpoints (Endpoint #36)
 * List breakpoints of a file.
 * Access: Viewer+ (Blueprint & PDF Page 6)
 */
export const getBreakpoints = asyncHandler(async (req, res) => {
  const { projectId, fileId } = req.params;

  const file = await findNodeById(fileId);
  if (!file || file.projectId !== projectId || file.type !== 'file') {
    throw new ApiError(404, 'NOT_FOUND', 'File not found');
  }

  const breakpoints = await getFileBreakpoints(fileId, projectId);

  return sendSuccess(res, { breakpoints: breakpoints || [] }, 200);
});

/**
 * PUT /api/v1/projects/:projectId/files/:fileId/breakpoints (Endpoint #37)
 * Replace breakpoints of a file.
 * Access: Editor+ (Blueprint & PDF Page 6)
 */
export const replaceBreakpoints = asyncHandler(async (req, res) => {
  const { projectId, fileId } = req.params;
  const { breakpoints } = req.body;

  const file = await findNodeById(fileId);
  if (!file || file.projectId !== projectId || file.type !== 'file') {
    throw new ApiError(404, 'NOT_FOUND', 'File not found');
  }

  // Validate language supports debugging
  const langConfig = getLanguageByKey(file.language);
  if (!langConfig || !langConfig.debug) {
    throw new ApiError(
      400,
      'LANGUAGE_NOT_DEBUGGABLE',
      `Language '${file.language}' does not support debugging`
    );
  }

  const lineCount = (file.content || '').split(/\r?\n/).length;
  const normalized = normalizeBreakpoints(breakpoints, Math.max(1, lineCount));

  // Deduplicate by line
  const seenLines = new Set();
  const uniqueBreakpoints = [];
  for (const bp of normalized) {
    if (!seenLines.has(bp.line)) {
      seenLines.add(bp.line);
      uniqueBreakpoints.push(bp);
    }
  }

  const updatedFile = await updateFileBreakpoints(fileId, projectId, uniqueBreakpoints);

  // If there's an active debug session for this project and file, update its breakpoints live
  const activeSession = await getActiveDebugSession(projectId);
  if (activeSession && activeSession.fileId === fileId) {
    await updateDebugSessionState(activeSession.id, projectId, { breakpoints: uniqueBreakpoints });
  }

  return sendSuccess(res, { breakpoints: updatedFile.breakpoints }, 200);
});
