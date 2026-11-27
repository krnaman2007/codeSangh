import { findNodeById } from '../repositories/node.repo.js';
import {
  createExecution,
  listProjectExecutions,
  getExecutionById as getExecutionByIdRepo,
  clearProjectExecutions,
} from '../repositories/execution.repo.js';
import { getLanguageByKey } from '../constants/languages.js';
import { executeCode } from '../services/judge0.service.js';
import { enforceRunRateLimit } from '../utils/rateLimiter.js';
import { sendSuccess } from '../utils/respond.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';

/**
 * POST /api/v1/projects/:projectId/files/:fileId/run (Endpoint #29)
 * Executes file via Judge0 with rate limiting and stores execution record.
 * Access: Editor+ (Blueprint Section 7.6)
 */
export const runFile = asyncHandler(async (req, res) => {
  const { projectId, fileId } = req.params;
  const { stdin, content } = req.body;

  // 1. Enforce rate limiting: 10 runs per minute per user (Blueprint Section 4.3 & 7.6)
  enforceRunRateLimit(req.user.id);

  // 2. Fetch and validate file node
  const file = await findNodeById(fileId);
  if (!file || file.projectId !== projectId || file.type !== 'file') {
    throw new ApiError(404, 'NOT_FOUND', 'File not found');
  }

  // 3. Validate language is runnable (mode === 'run' with judge0Id)
  const langConfig = getLanguageByKey(file.language);
  if (!langConfig || langConfig.mode !== 'run' || !langConfig.judge0Id) {
    throw new ApiError(
      400,
      'LANGUAGE_NOT_RUNNABLE',
      `Language '${file.language}' does not support execution`
    );
  }

  // 4. Determine code to execute (use unsaved draft in request body if provided, else saved file content)
  const sourceCode = content !== undefined ? content : file.content;

  // 5. Execute code via Judge0 / engine
  const execResult = await executeCode({
    sourceCode,
    judge0Id: langConfig.judge0Id,
    stdin: stdin || '',
  });

  // 6. Record execution in database
  const execution = await createExecution({
    projectId,
    fileId,
    userId: req.user.id,
    language: file.language,
    status: execResult.status,
    stdout: execResult.stdout,
    stderr: execResult.stderr,
    compileOutput: execResult.compileOutput,
    time: execResult.time,
    memory: execResult.memory,
  });

  return sendSuccess(res, { execution }, 200);
});

/**
 * GET /api/v1/projects/:projectId/executions (Endpoint #30)
 * Lists execution history for project.
 * Access: Viewer+ (Blueprint Section 7.6)
 */
export const getExecutions = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { limit, offset } = req.query;

  const data = await listProjectExecutions(projectId, {
    limit: limit ? parseInt(limit, 10) : 50,
    offset: offset ? parseInt(offset, 10) : 0,
  });

  return sendSuccess(res, data, 200);
});

/**
 * GET /api/v1/projects/:projectId/executions/:executionId (Endpoint #31)
 * Gets details of a single execution.
 * Access: Viewer+ (Blueprint Section 7.6)
 */
export const getExecution = asyncHandler(async (req, res) => {
  const { projectId, executionId } = req.params;

  const execution = await getExecutionByIdRepo(executionId, projectId);
  if (!execution) {
    throw new ApiError(404, 'NOT_FOUND', 'Execution record not found');
  }

  return sendSuccess(res, { execution }, 200);
});

/**
 * DELETE /api/v1/projects/:projectId/executions (Endpoint #32)
 * Clears execution history for project.
 * Access: Owner (Blueprint Section 7.6)
 */
export const clearExecutions = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  await clearProjectExecutions(projectId);

  return res.status(204).send();
});
