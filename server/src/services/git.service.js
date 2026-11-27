import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import git from 'isomorphic-git';
import ApiError from '../utils/ApiError.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const GIT_BASE_DIR = path.resolve(__dirname, '../../storage/git');

/**
 * Gets path to project git working directory
 */
export function getProjectGitDir(projectId) {
  return path.join(GIT_BASE_DIR, projectId);
}

/**
 * Checks if a project has an initialized git repository
 */
export function isGitInitialized(projectId) {
  const gitDir = path.join(getProjectGitDir(projectId), '.git');
  return fs.existsSync(gitDir);
}

/**
 * Gets repository status and information (Endpoint #38 - Mastermind M2)
 */
export async function getGitRepositoryInfo(projectId) {
  const dir = getProjectGitDir(projectId);

  if (!isGitInitialized(projectId)) {
    return {
      initialized: false,
      branch: null,
      remote: null,
      headCommit: null,
    };
  }

  try {
    const currentBranch = await git.currentBranch({ fs, dir });

    let headCommit = null;
    try {
      const commits = await git.log({ fs, dir, depth: 1 });
      if (commits && commits.length > 0) {
        const c = commits[0];
        headCommit = {
          hash: c.oid,
          message: c.commit.message.trim(),
          author: c.commit.author.name,
          timestamp: new Date(c.commit.author.timestamp * 1000).toISOString(),
        };
      }
    } catch {
      // Empty repo with no commits yet
    }

    let remote = null;
    try {
      const remotes = await git.listRemotes({ fs, dir });
      remote = remotes.length > 0 ? remotes[0].url : null;
    } catch {
      // No remotes configured
    }

    return {
      initialized: true,
      branch: currentBranch || 'main',
      remote,
      headCommit,
    };
  } catch (err) {
    throw new ApiError(500, 'GIT_ERROR', `Failed to read git repository: ${err.message}`);
  }
}

/**
 * Initializes a real Git repository with initial project files (Endpoint #39 - Mastermind M2)
 */
export async function initGitRepository({
  projectId,
  defaultBranch = 'main',
  user,
  files = [],
}) {
  const dir = getProjectGitDir(projectId);

  if (isGitInitialized(projectId)) {
    throw new ApiError(409, 'ALREADY_INITIALIZED', 'Git repository is already initialized for this project');
  }

  try {
    await fs.promises.mkdir(dir, { recursive: true });

    // Initialize actual Git repository
    await git.init({
      fs,
      dir,
      defaultBranch,
    });

    let headCommit = null;

    // If project has files, write them to disk and create initial commit
    if (files.length > 0) {
      for (const file of files) {
        // Strip leading slash if present
        const cleanPath = (file.path || file.name).replace(/^\/+/, '');
        const targetPath = path.join(dir, cleanPath);

        await fs.promises.mkdir(path.dirname(targetPath), { recursive: true });
        await fs.promises.writeFile(targetPath, file.content || '', 'utf8');

        await git.add({
          fs,
          dir,
          filepath: cleanPath,
        });
      }

      const commitOid = await git.commit({
        fs,
        dir,
        message: 'Initial commit',
        author: {
          name: user?.name || 'DevSync Developer',
          email: user?.email || 'dev@devsync.io',
        },
      });

      headCommit = {
        hash: commitOid,
        message: 'Initial commit',
        author: user?.name || 'DevSync Developer',
        timestamp: new Date().toISOString(),
      };
    }

    return {
      initialized: true,
      branch: defaultBranch,
      remote: null,
      headCommit,
      createdAt: new Date().toISOString(),
    };
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(500, 'GIT_INIT_FAILED', `Failed to initialize git repository: ${err.message}`);
  }
}
