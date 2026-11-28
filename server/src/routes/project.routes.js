import { Router } from 'express';
import {
  getProjects,
  createProject,
  getProjectById,
  renameProject,
  deleteProject,
} from '../controllers/project.controller.js';
import {
  getTree,
  createFolder,
  createFile,
  getFileById,
  updateFileContent,
  renameNode,
  moveNode,
  changeFileLanguage,
  deleteNode,
} from '../controllers/node.controller.js';
import {
  getCollaborators,
  inviteCollaborator,
  updateCollaborator,
  removeCollaborator,
} from '../controllers/collaborator.controller.js';
import {
  runFile,
  getExecutions,
  getExecution,
  clearExecutions,
} from '../controllers/execution.controller.js';
import {
  startDebugSession,
  getActiveSession,
  stopSession,
  getBreakpoints,
  replaceBreakpoints,
} from '../controllers/debug.controller.js';
import {
  getRepoInfo,
  initRepo,
  setRemote,
  cloneRepo,
  getStatus,
  stage,
  unstage,
  discard,
  commit,
  getLog,
  getDiff,
  getBranches,
  createBranch,
  checkoutBranch,
  deleteBranch,
  pull,
  push,
} from '../controllers/git.controller.js';
import {
  getEnvironment,
  saveEnvironment,
} from '../controllers/environment.controller.js';
import validate from '../middleware/validate.js';
import authenticate from '../middleware/auth.js';
import { requireRole } from '../middleware/projectAccess.js';
import {
  getProjectsSchema,
  createProjectSchema,
  projectIdParamSchema,
  renameProjectSchema,
} from '../validators/project.schema.js';
import {
  getTreeSchema,
  createFolderSchema,
  createFileSchema,
  fileIdParamSchema,
  updateContentSchema,
  renameNodeSchema,
  moveNodeSchema,
  changeLanguageSchema,
  nodeIdParamSchema,
} from '../validators/node.schema.js';
import {
  collaboratorProjectParamSchema,
  inviteCollaboratorSchema,
  updateCollaboratorRoleSchema,
  collaboratorMemberParamsSchema,
} from '../validators/collaborator.schema.js';
import {
  runFileSchema,
  listExecutionsSchema,
  executionParamsSchema,
} from '../validators/execution.schema.js';
import {
  startDebugSchema,
  activeDebugSchema,
  stopDebugSchema,
  fileBreakpointsParamsSchema,
  replaceBreakpointsSchema,
} from '../validators/debug.schema.js';
import {
  gitRepoParamSchema,
  initGitSchema,
  setRemoteSchema,
  cloneGitSchema,
  stagePathsSchema,
  unstagePathsSchema,
  discardPathsSchema,
  commitGitSchema,
  gitLogSchema,
  gitDiffSchema,
  gitBranchesSchema,
  createBranchSchema,
  checkoutBranchSchema,
  deleteBranchSchema,
  pullGitSchema,
  pushGitSchema,
} from '../validators/git.schema.js';
import {
  environmentProjectIdSchema,
  saveEnvironmentSchema,
} from '../validators/environment.schema.js';

const router = Router();

// Endpoint #11: GET /api/v1/projects?search=... (Logged in)
router.get('/', authenticate, validate(getProjectsSchema), getProjects);

// Endpoint #12: POST /api/v1/projects (Logged in)
router.post('/', authenticate, validate(createProjectSchema), createProject);

// Endpoint #13: GET /api/v1/projects/:projectId (Viewer+)
router.get('/:projectId', authenticate, validate(projectIdParamSchema), requireRole('viewer'), getProjectById);

// Endpoint #14: PATCH /api/v1/projects/:projectId (Owner)
router.patch('/:projectId', authenticate, validate(renameProjectSchema), requireRole('owner'), renameProject);

// Endpoint #15: DELETE /api/v1/projects/:projectId (Owner)
router.delete('/:projectId', authenticate, validate(projectIdParamSchema), requireRole('owner'), deleteProject);

// Endpoint #16: GET /api/v1/projects/:projectId/tree (Viewer+)
router.get('/:projectId/tree', authenticate, validate(getTreeSchema), requireRole('viewer'), getTree);

// Endpoint #17: POST /api/v1/projects/:projectId/folders (Editor+)
router.post('/:projectId/folders', authenticate, validate(createFolderSchema), requireRole('editor'), createFolder);

// Endpoint #18: POST /api/v1/projects/:projectId/files (Editor+)
router.post('/:projectId/files', authenticate, validate(createFileSchema), requireRole('editor'), createFile);

// Endpoint #19: GET /api/v1/projects/:projectId/files/:fileId (Viewer+)
router.get('/:projectId/files/:fileId', authenticate, validate(fileIdParamSchema), requireRole('viewer'), getFileById);

// Endpoint #20: PUT /api/v1/projects/:projectId/files/:fileId/content (Editor+)
router.put('/:projectId/files/:fileId/content', authenticate, validate(updateContentSchema), requireRole('editor'), updateFileContent);

// Endpoint #21: PATCH /api/v1/projects/:projectId/nodes/:nodeId (Editor+)
router.patch('/:projectId/nodes/:nodeId', authenticate, validate(renameNodeSchema), requireRole('editor'), renameNode);

// Endpoint #22: PATCH /api/v1/projects/:projectId/nodes/:nodeId/move (Editor+)
router.patch('/:projectId/nodes/:nodeId/move', authenticate, validate(moveNodeSchema), requireRole('editor'), moveNode);

// Endpoint #23: PATCH /api/v1/projects/:projectId/files/:fileId/language (Editor+)
router.patch('/:projectId/files/:fileId/language', authenticate, validate(changeLanguageSchema), requireRole('editor'), changeFileLanguage);

// Endpoint #24: DELETE /api/v1/projects/:projectId/nodes/:nodeId (Editor+)
router.delete('/:projectId/nodes/:nodeId', authenticate, validate(nodeIdParamSchema), requireRole('editor'), deleteNode);

// Endpoint #25: GET /api/v1/projects/:projectId/collaborators (Viewer+)
router.get(
  '/:projectId/collaborators',
  authenticate,
  validate(collaboratorProjectParamSchema),
  requireRole('viewer'),
  getCollaborators
);

// Endpoint #26: POST /api/v1/projects/:projectId/collaborators (Owner)
router.post(
  '/:projectId/collaborators',
  authenticate,
  validate(inviteCollaboratorSchema),
  requireRole('owner'),
  inviteCollaborator
);

// Endpoint #27: PATCH /api/v1/projects/:projectId/collaborators/:userId (Owner)
router.patch(
  '/:projectId/collaborators/:userId',
  authenticate,
  validate(updateCollaboratorRoleSchema),
  requireRole('owner'),
  updateCollaborator
);

// Endpoint #28: DELETE /api/v1/projects/:projectId/collaborators/:userId (Owner / self)
router.delete(
  '/:projectId/collaborators/:userId',
  authenticate,
  validate(collaboratorMemberParamsSchema),
  requireRole('viewer'),
  removeCollaborator
);

// Endpoint #29: POST /api/v1/projects/:projectId/files/:fileId/run (Editor+)
router.post(
  '/:projectId/files/:fileId/run',
  authenticate,
  validate(runFileSchema),
  requireRole('editor'),
  runFile
);

// Endpoint #30: GET /api/v1/projects/:projectId/executions (Viewer+)
router.get(
  '/:projectId/executions',
  authenticate,
  validate(listExecutionsSchema),
  requireRole('viewer'),
  getExecutions
);

// Endpoint #31: GET /api/v1/projects/:projectId/executions/:executionId (Viewer+)
router.get(
  '/:projectId/executions/:executionId',
  authenticate,
  validate(executionParamsSchema),
  requireRole('viewer'),
  getExecution
);

// Endpoint #32: DELETE /api/v1/projects/:projectId/executions (Owner)
router.delete(
  '/:projectId/executions',
  authenticate,
  validate(collaboratorProjectParamSchema),
  requireRole('owner'),
  clearExecutions
);

// Endpoint #33: POST /api/v1/projects/:projectId/files/:fileId/debug (Editor+)
router.post(
  '/:projectId/files/:fileId/debug',
  authenticate,
  validate(startDebugSchema),
  requireRole('editor'),
  startDebugSession
);

// Endpoint #34: GET /api/v1/projects/:projectId/debug/sessions/active (Viewer+)
router.get(
  '/:projectId/debug/sessions/active',
  authenticate,
  validate(activeDebugSchema),
  requireRole('viewer'),
  getActiveSession
);

// Endpoint #35: DELETE /api/v1/projects/:projectId/debug/sessions/:sessionId (Editor+)
router.delete(
  '/:projectId/debug/sessions/:sessionId',
  authenticate,
  validate(stopDebugSchema),
  requireRole('editor'),
  stopSession
);

// Endpoint #36: GET /api/v1/projects/:projectId/files/:fileId/breakpoints (Viewer+)
router.get(
  '/:projectId/files/:fileId/breakpoints',
  authenticate,
  validate(fileBreakpointsParamsSchema),
  requireRole('viewer'),
  getBreakpoints
);

// Endpoint #37: PUT /api/v1/projects/:projectId/files/:fileId/breakpoints (Editor+)
router.put(
  '/:projectId/files/:fileId/breakpoints',
  authenticate,
  validate(replaceBreakpointsSchema),
  requireRole('editor'),
  replaceBreakpoints
);

// Endpoint #38: GET /api/v1/projects/:projectId/git (Viewer+)
router.get(
  '/:projectId/git',
  authenticate,
  validate(gitRepoParamSchema),
  requireRole('viewer'),
  getRepoInfo
);

// Endpoint #39: POST /api/v1/projects/:projectId/git/init (Editor+)
router.post(
  '/:projectId/git/init',
  authenticate,
  validate(initGitSchema),
  requireRole('editor'),
  initRepo
);

// Endpoint #40: PUT /api/v1/projects/:projectId/git/remote (Owner)
router.put(
  '/:projectId/git/remote',
  authenticate,
  validate(setRemoteSchema),
  requireRole('owner'),
  setRemote
);

// Endpoint #41: POST /api/v1/projects/:projectId/git/clone (Owner)
router.post(
  '/:projectId/git/clone',
  authenticate,
  validate(cloneGitSchema),
  requireRole('owner'),
  cloneRepo
);

// Endpoint #42: GET /api/v1/projects/:projectId/git/status (Viewer+)
router.get(
  '/:projectId/git/status',
  authenticate,
  validate(gitRepoParamSchema),
  requireRole('viewer'),
  getStatus
);

// Endpoint #43: POST /api/v1/projects/:projectId/git/stage (Editor+)
router.post(
  '/:projectId/git/stage',
  authenticate,
  validate(stagePathsSchema),
  requireRole('editor'),
  stage
);

// Endpoint #44: POST /api/v1/projects/:projectId/git/unstage (Editor+)
router.post(
  '/:projectId/git/unstage',
  authenticate,
  validate(unstagePathsSchema),
  requireRole('editor'),
  unstage
);

// Endpoint #45: POST /api/v1/projects/:projectId/git/discard (Editor+)
router.post(
  '/:projectId/git/discard',
  authenticate,
  validate(discardPathsSchema),
  requireRole('editor'),
  discard
);

// Endpoint #46: POST /api/v1/projects/:projectId/git/commit (Editor+)
router.post(
  '/:projectId/git/commit',
  authenticate,
  validate(commitGitSchema),
  requireRole('editor'),
  commit
);

// Endpoint #47: GET /api/v1/projects/:projectId/git/log (Viewer+)
router.get(
  '/:projectId/git/log',
  authenticate,
  validate(gitLogSchema),
  requireRole('viewer'),
  getLog
);

// Endpoint #48: GET /api/v1/projects/:projectId/git/diff (Viewer+)
router.get(
  '/:projectId/git/diff',
  authenticate,
  validate(gitDiffSchema),
  requireRole('viewer'),
  getDiff
);

// Endpoint #49: GET /api/v1/projects/:projectId/git/branches (Viewer+)
router.get(
  '/:projectId/git/branches',
  authenticate,
  validate(gitBranchesSchema),
  requireRole('viewer'),
  getBranches
);

// Endpoint #50: POST /api/v1/projects/:projectId/git/branches (Editor+)
router.post(
  '/:projectId/git/branches',
  authenticate,
  validate(createBranchSchema),
  requireRole('editor'),
  createBranch
);

// Endpoint #51: POST /api/v1/projects/:projectId/git/checkout (Editor+)
router.post(
  '/:projectId/git/checkout',
  authenticate,
  validate(checkoutBranchSchema),
  requireRole('editor'),
  checkoutBranch
);

// Endpoint #52: DELETE /api/v1/projects/:projectId/git/branches/:name (Editor+)
router.delete(
  '/:projectId/git/branches/:name',
  authenticate,
  validate(deleteBranchSchema),
  requireRole('editor'),
  deleteBranch
);

// Endpoint #53: POST /api/v1/projects/:projectId/git/pull (Owner)
router.post(
  '/:projectId/git/pull',
  authenticate,
  validate(pullGitSchema),
  requireRole('owner'),
  pull
);

// Endpoint #54: POST /api/v1/projects/:projectId/git/push (Owner)
router.post(
  '/:projectId/git/push',
  authenticate,
  validate(pushGitSchema),
  requireRole('owner'),
  push
);

// Endpoint #56: GET /api/v1/projects/:projectId/environment (Viewer+)
router.get(
  '/:projectId/environment',
  authenticate,
  validate(environmentProjectIdSchema),
  requireRole('viewer'),
  getEnvironment
);

// Endpoint #57: PUT /api/v1/projects/:projectId/environment (Owner)
router.put(
  '/:projectId/environment',
  authenticate,
  validate(saveEnvironmentSchema),
  requireRole('owner'),
  saveEnvironment
);

export default router;
