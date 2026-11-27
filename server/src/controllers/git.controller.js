import prisma from '../db/prisma.js';
import { getGitRepositoryInfo, initGitRepository } from '../services/git.service.js';
import { findNodeById } from '../repositories/node.repo.js';
import { computeNodePath } from '../utils/treeUtils.js';
import { sendSuccess } from '../utils/respond.js';
import asyncHandler from '../utils/asyncHandler.js';

/**
 * GET /api/v1/projects/:projectId/git (Endpoint #38)
 * Get repository info.
 * Access: Viewer+ (Blueprint & PDF Page 6)
 */
export const getRepoInfo = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  const repoInfo = await getGitRepositoryInfo(projectId);

  return sendSuccess(res, repoInfo, 200);
});

/**
 * POST /api/v1/projects/:projectId/git/init (Endpoint #39)
 * Initialize real Git repository with initial project files.
 * Access: Editor+ (Blueprint & PDF Page 6)
 */
export const initRepo = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { defaultBranch } = req.body;

  // Fetch all file nodes for this project
  const fileNodes = await prisma.fileNode.findMany({
    where: { projectId, type: 'file' },
    select: {
      id: true,
      name: true,
      content: true,
      parentId: true,
      type: true,
    },
  });

  // Compute forward-slash paths for all files
  const fileItems = [];
  for (const file of fileNodes) {
    const filePath = await computeNodePath(file, findNodeById);
    fileItems.push({
      path: filePath,
      content: file.content,
    });
  }

  const repository = await initGitRepository({
    projectId,
    defaultBranch: defaultBranch || 'main',
    user: req.user,
    files: fileItems,
  });

  return sendSuccess(res, { repository }, 201);
});
