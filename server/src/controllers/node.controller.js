import {
  getProjectTree,
  findNodeById,
  findNodeByName,
  countProjectNodes,
  calculateNodeDepth,
  createFolder as createFolderRepo,
} from '../repositories/node.repo.js';
import { LIMITS } from '../constants/limits.js';
import { sendSuccess } from '../utils/respond.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';

/**
 * GET /api/v1/projects/:projectId/tree (Endpoint #16)
 * Flat list of all folders and files (no content) for the explorer.
 * Access: Viewer+ (Blueprint Section 7.5)
 */
export const getTree = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const nodes = await getProjectTree(projectId);

  return sendSuccess(res, { nodes }, 200);
});

/**
 * POST /api/v1/projects/:projectId/folders (Endpoint #17)
 * Create a folder. No language.
 * Access: Editor+ (Blueprint Section 7.5)
 */
export const createFolder = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { name, parentId } = req.body;

  // 1. Enforce 500-node limit per project (Blueprint Section 4.3 & 7.5)
  const totalNodes = await countProjectNodes(projectId);
  if (totalNodes >= LIMITS.NODES_PER_PROJECT) {
    throw new ApiError(
      409,
      'LIMIT_EXCEEDED',
      `Project node limit reached (maximum ${LIMITS.NODES_PER_PROJECT} files and folders)`
    );
  }

  // 2. Validate parent folder if specified
  if (parentId) {
    const parent = await findNodeById(parentId);

    if (!parent || parent.projectId !== projectId || parent.type !== 'folder') {
      throw new ApiError(400, 'INVALID_PARENT', 'Parent folder does not exist or is not a folder');
    }

    // 3. Enforce folder nesting depth limit of 8 (Blueprint Section 4.3 & 7.5)
    const parentDepth = await calculateNodeDepth(parentId);
    if (parentDepth >= LIMITS.FOLDER_NESTING_DEPTH) {
      throw new ApiError(
        409,
        'LIMIT_EXCEEDED',
        `Maximum folder nesting depth of ${LIMITS.FOLDER_NESTING_DEPTH} exceeded`
      );
    }
  }

  // 4. Case-insensitive name uniqueness within the same parent folder (Blueprint Section 7.5)
  const existing = await findNodeByName(projectId, parentId, name.toLowerCase());
  if (existing) {
    throw new ApiError(
      409,
      'NAME_CONFLICT',
      'A file or folder with this name already exists in this folder'
    );
  }

  // 5. Create folder node
  const node = await createFolderRepo({
    projectId,
    parentId,
    name,
    createdById: req.user.id,
  });

  return sendSuccess(res, { node }, 201);
});
