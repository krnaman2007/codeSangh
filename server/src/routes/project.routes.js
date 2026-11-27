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

export default router;
