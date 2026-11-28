import { Router } from 'express';
import healthRoutes from './health.routes.js';
import languageRoutes from './language.routes.js';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import projectRoutes from './project.routes.js';
import environmentRoutes from './environment.routes.js';

const router = Router();

// Mount health routes (/api/v1/health)
router.use('/', healthRoutes);

// Mount language registry routes (/api/v1/languages)
router.use('/', languageRoutes);

// Mount auth routes (/api/v1/auth/*)
router.use('/auth', authRoutes);

// Mount user routes (/api/v1/users/*)
router.use('/users', userRoutes);

// Mount project routes (/api/v1/projects/*)
router.use('/projects', projectRoutes);

// Mount environment routes (/api/v1/environments/*)
router.use('/environments', environmentRoutes);

export default router;
