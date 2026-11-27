import { Router } from 'express';
import {
  register,
  login,
  refresh,
  logout,
  getMe,
} from '../controllers/auth.controller.js';
import validate from '../middleware/validate.js';
import authenticate from '../middleware/auth.js';
import {
  registerSchema,
  loginSchema,
  refreshSchema,
} from '../validators/auth.schema.js';

const router = Router();

// Endpoint #3: POST /api/v1/auth/register (Public)
router.post('/register', validate(registerSchema), register);

// Endpoint #4: POST /api/v1/auth/login (Public)
router.post('/login', validate(loginSchema), login);

// Endpoint #5: POST /api/v1/auth/refresh (Cookie)
router.post('/refresh', validate(refreshSchema), refresh);

// Endpoint #6: POST /api/v1/auth/logout (Logged in)
router.post('/logout', authenticate, logout);

// Endpoint #7: GET /api/v1/auth/me (Logged in)
router.get('/me', authenticate, getMe);

export default router;
