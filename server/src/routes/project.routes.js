import { Router } from 'express';
import { getProjects, createProject } from '../controllers/project.controller.js';
import validate from '../middleware/validate.js';
import authenticate from '../middleware/auth.js';
import {
  getProjectsSchema,
  createProjectSchema,
} from '../validators/project.schema.js';

const router = Router();

// Endpoint #11: GET /api/v1/projects?search=... (Logged in)
router.get('/', authenticate, validate(getProjectsSchema), getProjects);

// Endpoint #12: POST /api/v1/projects (Logged in)
router.post('/', authenticate, validate(createProjectSchema), createProject);

export default router;
