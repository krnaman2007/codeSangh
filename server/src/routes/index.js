import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';

const router = Router();

// Mount health routes (/api/v1/health)
router.use('/', healthRoutes);

// Mount auth routes (/api/v1/auth/*)
router.use('/auth', authRoutes);

export default router;
