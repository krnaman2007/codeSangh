import { Router } from 'express';
import { updateMe, changePassword, searchUsers } from '../controllers/user.controller.js';
import validate from '../middleware/validate.js';
import authenticate from '../middleware/auth.js';
import {
  updateMeSchema,
  changePasswordSchema,
  searchUsersSchema,
} from '../validators/user.schema.js';

const router = Router();

// Endpoint #8: PATCH /api/v1/users/me (Logged in)
router.patch('/me', authenticate, validate(updateMeSchema), updateMe);

// Endpoint #9: PATCH /api/v1/users/me/password (Logged in)
router.patch('/me/password', authenticate, validate(changePasswordSchema), changePassword);

// Endpoint #10: GET /api/v1/users/search?q=...&projectId=... (Owner)
router.get('/search', authenticate, validate(searchUsersSchema), searchUsers);

export default router;
