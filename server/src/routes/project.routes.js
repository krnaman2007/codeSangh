import { Router } from 'express';
import {
  getProjects,
  createProject,
  getProjectById,
  renameProject,
  deleteProject,
} from '../controllers/project.controller.js';
import validate from '../middleware/validate.js';
import authenticate from '../middleware/auth.js';
import { requireRole } from '../middleware/projectAccess.js';
import {
  getProjectsSchema,
  createProjectSchema,
  projectIdParamSchema,
  renameProjectSchema,
} from '../validators/project.schema.js';

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

export default router;
