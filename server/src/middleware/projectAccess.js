import { getRole } from '../repositories/project.repo.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';

// Role hierarchy rank (Blueprint Section 6.2 & Page 19)
const RANK = { viewer: 1, editor: 2, owner: 3 };

/**
 * Enforces minimum role requirement for a project
 * Usage: router.get('/:projectId', auth, requireRole('viewer'), ctrl.getProject)
 * Usage: router.patch('/:projectId', auth, requireRole('owner'), ctrl.renameProject)
 */
export const requireRole = (minRole) =>
  asyncHandler(async (req, res, next) => {
    const role = await getRole(req.params.projectId, req.user.id);

    // If caller is not a member (or project doesn't exist), return 404 to avoid leaking existence
    if (!role) {
      throw new ApiError(404, 'NOT_FOUND', 'Project not found');
    }

    if (RANK[role] < RANK[minRole]) {
      throw new ApiError(403, 'FORBIDDEN', 'Insufficient access');
    }

    req.project = { id: req.params.projectId, role };
    next();
  });

export default requireRole;
