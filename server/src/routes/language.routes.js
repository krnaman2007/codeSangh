import { Router } from 'express';
import { getLanguages } from '../controllers/language.controller.js';
import authenticate from '../middleware/auth.js';

const router = Router();

// Endpoint #2: GET /api/v1/languages (Access: Logged in)
router.get('/languages', authenticate, getLanguages);

export default router;
