import path from 'path';
import {
  getProjectTree,
  findNodeById,
  findNodeByName,
  countProjectNodes,
  calculateNodeDepth,
  calculateSubtreeHeight,
  createFolder as createFolderRepo,
  createFile as createFileRepo,
  updateFileContent as updateFileContentRepo,
  renameNode as renameNodeRepo,
  moveNode as moveNodeRepo,
  changeFileLanguage as changeFileLanguageRepo,
  deleteNodeWithDescendants as deleteNodeRepo,
} from '../repositories/node.repo.js';
import { LIMITS } from '../constants/limits.js';
import { getLanguageByKey, isValidLanguageKey } from '../constants/languages.js';
import { computeNodePath, isDescendant } from '../utils/treeUtils.js';
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

/**
 * POST /api/v1/projects/:projectId/files (Endpoint #18)
 * Create a file. Name and language are both required.
 * Access: Editor+ (Blueprint Section 7.5)
 */
export const createFile = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  let { name, language, parentId, content } = req.body;

  // 1. Validate language from registry
  if (!isValidLanguageKey(language)) {
    throw new ApiError(400, 'LANGUAGE_NOT_SUPPORTED', `Language '${language}' is not supported`);
  }

  const langConfig = getLanguageByKey(language);

  // 2. Extension rule (Blueprint Section 7.5):
  // "If the name has no extension the server appends the language's default one (helper -> helper.py)"
  const parsedExt = path.extname(name);
  if (!parsedExt && langConfig.ext) {
    name = `${name}${langConfig.ext}`;
  }

  // 3. Enforce 500-node limit
  const totalNodes = await countProjectNodes(projectId);
  if (totalNodes >= LIMITS.NODES_PER_PROJECT) {
    throw new ApiError(
      409,
      'LIMIT_EXCEEDED',
      `Project node limit reached (maximum ${LIMITS.NODES_PER_PROJECT} files and folders)`
    );
  }

  // 4. Validate parent folder
  if (parentId) {
    const parent = await findNodeById(parentId);
    if (!parent || parent.projectId !== projectId || parent.type !== 'folder') {
      throw new ApiError(400, 'INVALID_PARENT', 'Parent folder does not exist or is not a folder');
    }
  }

  // 5. Check name conflict in parent folder
  const existing = await findNodeByName(projectId, parentId, name.toLowerCase());
  if (existing) {
    throw new ApiError(
      409,
      'NAME_CONFLICT',
      'A file or folder with this name already exists in this folder'
    );
  }

  // 6. Create file node
  const node = await createFileRepo({
    projectId,
    parentId,
    name,
    language,
    content: content || '',
    createdById: req.user.id,
  });

  return sendSuccess(res, { node }, 201);
});

/**
 * GET /api/v1/projects/:projectId/files/:fileId (Endpoint #19)
 * Open a file: returns saved language, content, size, path.
 * Access: Viewer+ (Blueprint Section 7.5)
 */
export const getFileById = asyncHandler(async (req, res) => {
  const { projectId, fileId } = req.params;

  const node = await findNodeById(fileId);
  if (!node || node.projectId !== projectId || node.type !== 'file') {
    throw new ApiError(404, 'NOT_FOUND', 'File not found');
  }

  const filePath = await computeNodePath(node, findNodeById);

  return sendSuccess(
    res,
    {
      file: {
        id: node.id,
        name: node.name,
        path: filePath,
        language: node.language,
        content: node.content,
        size: node.size,
        updatedAt: node.updatedAt,
      },
    },
    200
  );
});

/**
 * PUT /api/v1/projects/:projectId/files/:fileId/content (Endpoint #20)
 * Fallback / explicit save.
 * Access: Editor+ (Blueprint Section 7.5)
 */
export const updateFileContent = asyncHandler(async (req, res) => {
  const { projectId, fileId } = req.params;
  const { content } = req.body;

  const node = await findNodeById(fileId);
  if (!node || node.projectId !== projectId || node.type !== 'file') {
    throw new ApiError(404, 'NOT_FOUND', 'File not found');
  }

  if (Buffer.byteLength(content, 'utf8') > LIMITS.FILE_CONTENT_MAX_BYTES) {
    throw new ApiError(413, 'FILE_TOO_LARGE', 'File content exceeds maximum limit of 1 MB');
  }

  const file = await updateFileContentRepo(fileId, projectId, content, req.user.id);

  return sendSuccess(res, { file }, 200);
});

/**
 * PATCH /api/v1/projects/:projectId/nodes/:nodeId (Endpoint #21)
 * Rename a file or a folder.
 * Access: Editor+ (Blueprint Section 7.5)
 */
export const renameNode = asyncHandler(async (req, res) => {
  const { projectId, nodeId } = req.params;
  const { name } = req.body;

  const node = await findNodeById(nodeId);
  if (!node || node.projectId !== projectId) {
    throw new ApiError(404, 'NOT_FOUND', 'Node not found');
  }

  // Check name conflict in existing parent
  const existing = await findNodeByName(projectId, node.parentId, name.toLowerCase());
  if (existing && existing.id !== nodeId) {
    throw new ApiError(
      409,
      'NAME_CONFLICT',
      'A file or folder with this name already exists in this folder'
    );
  }

  const updatedNode = await renameNodeRepo(nodeId, projectId, name);

  return sendSuccess(res, { node: updatedNode }, 200);
});

/**
 * PATCH /api/v1/projects/:projectId/nodes/:nodeId/move (Endpoint #22)
 * Move a file or folder to another folder.
 * Access: Editor+ (Blueprint Section 7.5)
 */
export const moveNode = asyncHandler(async (req, res) => {
  const { projectId, nodeId } = req.params;
  const { parentId } = req.body;

  const node = await findNodeById(nodeId);
  if (!node || node.projectId !== projectId) {
    throw new ApiError(404, 'NOT_FOUND', 'Node not found');
  }

  // If moving into itself
  if (parentId === nodeId) {
    throw new ApiError(400, 'INVALID_MOVE', 'Cannot move node into itself');
  }

  // If moving a folder into its own descendant
  if (node.type === 'folder' && parentId) {
    const isInsideDescendant = await isDescendant(parentId, nodeId, findNodeById);
    if (isInsideDescendant) {
      throw new ApiError(400, 'INVALID_MOVE', 'Cannot move folder into its own descendant');
    }
  }

  // If target parent is specified
  if (parentId) {
    const targetParent = await findNodeById(parentId);
    if (!targetParent || targetParent.projectId !== projectId || targetParent.type !== 'folder') {
      throw new ApiError(400, 'INVALID_PARENT', 'Target parent folder does not exist or is not a folder');
    }

    // Depth check
    const targetDepth = await calculateNodeDepth(parentId);
    const nodeHeight = node.type === 'folder' ? await calculateSubtreeHeight(nodeId) : 1;
    if (targetDepth + nodeHeight > LIMITS.FOLDER_NESTING_DEPTH) {
      throw new ApiError(
        409,
        'LIMIT_EXCEEDED',
        `Maximum folder nesting depth of ${LIMITS.FOLDER_NESTING_DEPTH} exceeded`
      );
    }
  }

  // Name uniqueness in target folder
  const existing = await findNodeByName(projectId, parentId, node.nameLower);
  if (existing && existing.id !== nodeId) {
    throw new ApiError(
      409,
      'NAME_CONFLICT',
      'A file or folder with this name already exists in the target folder'
    );
  }

  const movedNode = await moveNodeRepo(nodeId, projectId, parentId);

  return sendSuccess(res, { node: movedNode }, 200);
});

/**
 * PATCH /api/v1/projects/:projectId/files/:fileId/language (Endpoint #23)
 * Change file language.
 * Access: Editor+ (Blueprint Section 7.5)
 */
export const changeFileLanguage = asyncHandler(async (req, res) => {
  const { projectId, fileId } = req.params;
  const { language } = req.body;

  const node = await findNodeById(fileId);
  if (!node || node.projectId !== projectId || node.type !== 'file') {
    throw new ApiError(404, 'NOT_FOUND', 'File not found');
  }

  if (!isValidLanguageKey(language)) {
    throw new ApiError(400, 'LANGUAGE_NOT_SUPPORTED', `Language '${language}' is not supported`);
  }

  const updatedNode = await changeFileLanguageRepo(fileId, projectId, language);

  return sendSuccess(res, { node: updatedNode }, 200);
});

/**
 * DELETE /api/v1/projects/:projectId/nodes/:nodeId (Endpoint #24)
 * Delete a file or a folder (recursive).
 * Access: Editor+ (Blueprint Section 7.5)
 */
export const deleteNode = asyncHandler(async (req, res) => {
  const { projectId, nodeId } = req.params;

  const node = await findNodeById(nodeId);
  if (!node || node.projectId !== projectId) {
    throw new ApiError(404, 'NOT_FOUND', 'Node not found');
  }

  const deletedIds = await deleteNodeRepo(nodeId, projectId);

  return sendSuccess(res, { deletedIds }, 200);
});
