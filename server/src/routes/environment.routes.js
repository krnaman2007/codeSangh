// server/src/routes/environment.routes.js
import { Router } from 'express';
import { getRuntimes } from '../controllers/environment.controller.js';
import authenticate from '../middleware/auth.js';

const router = Router();

// Endpoint #55: GET /api/v1/environments/runtimes (Logged in)
router.get('/runtimes', authenticate, getRuntimes);

export default router;
