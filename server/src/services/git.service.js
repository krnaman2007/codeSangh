import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import git from 'isomorphic-git';
import http from 'isomorphic-git/http/node';
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

/**
 * Sets remote URL and credentials for project repository (Endpoint #40 - Mastermind M2)
 */
export async function setGitRemote({ projectId, url, token, name = 'origin' }) {
  const dir = getProjectGitDir(projectId);

  if (!isGitInitialized(projectId)) {
    throw new ApiError(400, 'GIT_NOT_INITIALIZED', 'Git repository is not initialized for this project');
  }

  try {
    // Remove existing remote if already configured
    try {
      await git.deleteRemote({ fs, dir, remote: name });
    } catch {
      // Remote didn't exist yet, ignore
    }

    // Add new remote
    await git.addRemote({
      fs,
      dir,
      remote: name,
      url,
    });

    // Save auth token in secure project git config if provided
    if (token) {
      const authFile = path.join(dir, '.git', 'devsync-auth.json');
      await fs.promises.writeFile(authFile, JSON.stringify({ token }), 'utf8');
    }

    return {
      name,
      url,
      hasToken: Boolean(token),
    };
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(500, 'GIT_REMOTE_FAILED', `Failed to configure git remote: ${err.message}`);
  }
}

/**
 * Connects and clones an existing remote repository (Endpoint #41 - Mastermind M2)
 */
export async function cloneGitRepository({ projectId, url, token, branch = 'main' }) {
  const dir = getProjectGitDir(projectId);

  if (isGitInitialized(projectId)) {
    throw new ApiError(409, 'ALREADY_INITIALIZED', 'Git repository is already initialized for this project');
  }

  try {
    await fs.promises.mkdir(dir, { recursive: true });

    // Perform actual Git clone
    await git.clone({
      fs,
      http,
      dir,
      url,
      ref: branch,
      singleBranch: true,
      depth: 10,
      onAuth: () => (token ? { username: token } : undefined),
    });

    // Save token if private repo credentials were used
    if (token) {
      const authFile = path.join(dir, '.git', 'devsync-auth.json');
      await fs.promises.writeFile(authFile, JSON.stringify({ token }), 'utf8');
    }

    return {
      initialized: true,
      branch,
      remote: url,
      dir,
    };
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(500, 'GIT_CLONE_FAILED', `Failed to clone repository: ${err.message}`);
  }
}

/**
 * Gets real changed files status from Git working directory (Endpoint #42 - Mastermind M2)
 */
export async function getGitStatus(projectId) {
  const dir = getProjectGitDir(projectId);

  if (!isGitInitialized(projectId)) {
    throw new ApiError(400, 'GIT_NOT_INITIALIZED', 'Git repository is not initialized for this project');
  }

  try {
    const currentBranch = await git.currentBranch({ fs, dir });
    const matrix = await git.statusMatrix({ fs, dir });

    const staged = [];
    const modified = [];
    const untracked = [];
    const deleted = [];

    for (const row of matrix) {
      const [filepath, head, workdir, stage] = row;

      // Skip .git folder itself
      if (filepath.startsWith('.git/')) continue;

      // Untracked: not in HEAD, in WORKDIR, not in index
      if (head === 0 && workdir === 2 && stage === 0) {
        untracked.push(filepath);
      }
      // Staged new: not in HEAD, in WORKDIR, in index
      else if (head === 0 && workdir === 2 && stage === 2) {
        staged.push(filepath);
      }
      // Modified workdir: in HEAD, in WORKDIR, workdir != stage
      else if (head === 1 && workdir === 2 && stage === 1) {
        modified.push(filepath);
      }
      // Staged modified: in HEAD, in WORKDIR, workdir == stage, stage != head
      else if (head === 1 && workdir === 2 && stage === 2) {
        staged.push(filepath);
      }
      // Deleted from workdir: in HEAD, workdir == 0
      else if (head === 1 && workdir === 0) {
        deleted.push(filepath);
      }
    }

    const clean =
      staged.length === 0 &&
      modified.length === 0 &&
      untracked.length === 0 &&
      deleted.length === 0;

    return {
      clean,
      branch: currentBranch || 'main',
      staged,
      modified,
      untracked,
      deleted,
    };
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(500, 'GIT_STATUS_FAILED', `Failed to get git status: ${err.message}`);
  }
}

// In-memory mutex for per-project mutating Git operations (Blueprint Section 7.9 & Page 30)
const projectLocks = new Set();

export async function withGitLock(projectId, fn) {
  if (projectLocks.has(projectId)) {
    throw new ApiError(409, 'GIT_BUSY', 'Another Git operation is currently running on this project');
  }
  projectLocks.add(projectId);
  try {
    return await fn();
  } finally {
    projectLocks.delete(projectId);
  }
}

/**
 * Stages paths or entire working directory (Endpoint #43 - Mastermind M2)
 */
export async function stageGitPaths({ projectId, paths }) {
  const dir = getProjectGitDir(projectId);

  if (!isGitInitialized(projectId)) {
    throw new ApiError(400, 'GIT_NOT_INITIALIZED', 'Git repository is not initialized for this project');
  }

  return withGitLock(projectId, async () => {
    try {
      let stagedCount = 0;

      if (paths.includes('.')) {
        const matrix = await git.statusMatrix({ fs, dir });
        for (const [filepath, head, workdir] of matrix) {
          if (filepath.startsWith('.git/')) continue;
          if (workdir === 0 && head === 1) {
            // Deleted in workdir, remove from git index
            await git.remove({ fs, dir, filepath });
            stagedCount++;
          } else if (workdir === 2) {
            // New or modified in workdir, add to git index
            await git.add({ fs, dir, filepath });
            stagedCount++;
          }
        }
      } else {
        for (const p of paths) {
          const cleanPath = p.replace(/^\/+/, '');
          const targetPath = path.join(dir, cleanPath);
          const exists = fs.existsSync(targetPath);

          if (exists) {
            await git.add({ fs, dir, filepath: cleanPath });
          } else {
            try {
              await git.remove({ fs, dir, filepath: cleanPath });
            } catch {
              // File wasn't tracked, ignore
            }
          }
          stagedCount++;
        }
      }

      return { staged: stagedCount };
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError(500, 'GIT_STAGE_FAILED', `Failed to stage paths: ${err.message}`);
    }
  });
}

/**
 * Unstages paths from the Git index (Endpoint #44 - Mastermind M2)
 */
export async function unstageGitPaths({ projectId, paths }) {
  const dir = getProjectGitDir(projectId);

  if (!isGitInitialized(projectId)) {
    throw new ApiError(400, 'GIT_NOT_INITIALIZED', 'Git repository is not initialized for this project');
  }

  return withGitLock(projectId, async () => {
    try {
      let unstagedCount = 0;

      if (paths.includes('.')) {
        const matrix = await git.statusMatrix({ fs, dir });
        for (const [filepath, head, , stage] of matrix) {
          if (filepath.startsWith('.git/')) continue;
          if (head !== stage) {
            await git.resetIndex({ fs, dir, filepath });
            unstagedCount++;
          }
        }
      } else {
        for (const p of paths) {
          const cleanPath = p.replace(/^\/+/, '');
          await git.resetIndex({ fs, dir, filepath: cleanPath });
          unstagedCount++;
        }
      }

      return { unstaged: unstagedCount };
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError(500, 'GIT_UNSTAGE_FAILED', `Failed to unstage paths: ${err.message}`);
    }
  });
}

/**
 * Discards working copy changes, restoring HEAD content (Endpoint #45 - Mastermind M2)
 */
export async function discardGitChanges({ projectId, paths }) {
  const dir = getProjectGitDir(projectId);

  if (!isGitInitialized(projectId)) {
    throw new ApiError(400, 'GIT_NOT_INITIALIZED', 'Git repository is not initialized for this project');
  }

  return withGitLock(projectId, async () => {
    try {
      let discardedCount = 0;
      let targetPaths = [];

      if (paths.includes('.')) {
        const matrix = await git.statusMatrix({ fs, dir });
        for (const [filepath, head, workdir, stage] of matrix) {
          if (filepath.startsWith('.git/')) continue;
          if (head !== workdir || head !== stage) {
            targetPaths.push(filepath);
          }
        }
      } else {
        targetPaths = paths.map((p) => p.replace(/^\/+/, ''));
      }

      for (const filepath of targetPaths) {
        const targetPath = path.join(dir, filepath);
        let inHead = false;
        try {
          const matrix = await git.statusMatrix({ fs, dir, filter: (f) => f === filepath });
          if (matrix.length > 0 && matrix[0][1] === 1) {
            inHead = true;
          }
        } catch {
          // Ignore
        }

        if (inHead) {
          // Restore working directory content from HEAD
          await git.checkout({ fs, dir, filepaths: [filepath], force: true });
          // Reset index entry as well
          await git.resetIndex({ fs, dir, filepath });
        } else {
          // Untracked file: remove from working copy
          if (fs.existsSync(targetPath)) {
            await fs.promises.unlink(targetPath);
          }
          await git.resetIndex({ fs, dir, filepath }).catch(() => {});
        }
        discardedCount++;
      }

      return { discarded: discardedCount };
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError(500, 'GIT_DISCARD_FAILED', `Failed to discard changes: ${err.message}`);
    }
  });
}

/**
 * Commits staged changes to the repository (Endpoint #46 - Mastermind M2)
 */
export async function commitStagedChanges({ projectId, message, user }) {
  const dir = getProjectGitDir(projectId);

  if (!isGitInitialized(projectId)) {
    throw new ApiError(400, 'GIT_NOT_INITIALIZED', 'Git repository is not initialized for this project');
  }

  return withGitLock(projectId, async () => {
    try {
      const matrix = await git.statusMatrix({ fs, dir });
      const stagedFiles = matrix.filter(([filepath, head, , stage]) => {
        if (filepath.startsWith('.git/')) return false;
        return head !== stage;
      });

      if (stagedFiles.length === 0) {
        throw new ApiError(400, 'NOTHING_TO_COMMIT', 'No changes staged to commit');
      }

      const author = {
        name: user?.name || 'DevSync Developer',
        email: user?.email || 'dev@devsync.io',
      };

      const sha = await git.commit({
        fs,
        dir,
        message,
        author,
      });

      return {
        commit: {
          sha,
          message,
          author: {
            userId: user?.id,
            name: author.name,
            email: author.email,
          },
          committedAt: new Date().toISOString(),
        },
      };
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError(500, 'GIT_COMMIT_FAILED', `Failed to commit staged changes: ${err.message}`);
    }
  });
}
