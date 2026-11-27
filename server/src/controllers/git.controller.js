import fs from 'node:fs';
import path from 'node:path';
import prisma from '../db/prisma.js';
import {
  getGitRepositoryInfo,
  initGitRepository,
  setGitRemote,
  cloneGitRepository,
  getGitStatus,
} from '../services/git.service.js';
import { findNodeById } from '../repositories/node.repo.js';
import { computeNodePath } from '../utils/treeUtils.js';
import { getLanguageByExt } from '../constants/languages.js';
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

/**
 * PUT /api/v1/projects/:projectId/git/remote (Endpoint #40)
 * Set remote URL and authentication token.
 * Access: Owner (Blueprint & PDF Page 6)
 */
export const setRemote = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { url, token, name } = req.body;

  const remote = await setGitRemote({
    projectId,
    url,
    token,
    name: name || 'origin',
  });

  return sendSuccess(res, { remote }, 200);
});

/**
 * POST /api/v1/projects/:projectId/git/clone (Endpoint #41)
 * Connect existing remote repository by cloning.
 * Access: Owner (Blueprint & PDF Page 6)
 */
export const cloneRepo = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { url, token, branch } = req.body;

  const cloneResult = await cloneGitRepository({
    projectId,
    url,
    token,
    branch: branch || 'main',
  });

  // Sync cloned files from disk into FileNode database
  let fileCount = 0;
  async function syncDiskFilesToDb(currentDir, parentId = null) {
    const entries = await fs.promises.readdir(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === '.git' || entry.name === 'node_modules') continue;
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        const folder = await prisma.fileNode.create({
          data: {
            projectId,
            parentId,
            name: entry.name,
            nameLower: entry.name.toLowerCase(),
            type: 'folder',
            createdById: req.user.id,
          },
        });
        await syncDiskFilesToDb(fullPath, folder.id);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        const langConfig = getLanguageByExt(ext);
        const content = await fs.promises.readFile(fullPath, 'utf8');

        await prisma.fileNode.create({
          data: {
            projectId,
            parentId,
            name: entry.name,
            nameLower: entry.name.toLowerCase(),
            type: 'file',
            language: langConfig ? langConfig.key : 'text',
            content,
            size: Buffer.byteLength(content, 'utf8'),
            createdById: req.user.id,
          },
        });
        fileCount++;
      }
    }
  }

  await syncDiskFilesToDb(cloneResult.dir, null);

  return sendSuccess(
    res,
    {
      repository: {
        initialized: true,
        branch: cloneResult.branch,
        remote: cloneResult.remote,
        filesCloned: fileCount,
      },
    },
    201
  );
});

/**
 * GET /api/v1/projects/:projectId/git/status (Endpoint #42)
 * Get list of changed files (staged, modified, untracked, deleted).
 * Access: Viewer+ (Blueprint & PDF Page 6)
 */
export const getStatus = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  const status = await getGitStatus(projectId);

  return sendSuccess(res, { status }, 200);
});
