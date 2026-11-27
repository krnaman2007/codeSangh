import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import languageRoutes from './language.routes.js';

const router = Router();

// Mount health routes (/api/v1/health)
router.use('/', healthRoutes);

// Mount language registry routes (/api/v1/languages)
router.use('/', languageRoutes);

// Mount auth routes (/api/v1/auth/*)
router.use('/auth', authRoutes);

// Mount user routes (/api/v1/users/*)
router.use('/users', userRoutes);

export default router;
