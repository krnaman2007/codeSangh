import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import git from 'isomorphic-git';
import http from 'isomorphic-git/http/node';
import ApiError from '../utils/ApiError.js';
import { getLanguageByExt } from '../constants/languages.js';

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

/**
 * Gets paginated commit history for a branch (Endpoint #47 - Mastermind M2)
 */
export async function getGitLog({ projectId, branch, page = 1, limit = 20 }) {
  const dir = getProjectGitDir(projectId);

  if (!isGitInitialized(projectId)) {
    throw new ApiError(400, 'GIT_NOT_INITIALIZED', 'Git repository is not initialized for this project');
  }

  try {
    const currentBranch = branch || (await git.currentBranch({ fs, dir })) || 'main';
    let rawCommits = [];

    try {
      rawCommits = await git.log({
        fs,
        dir,
        ref: currentBranch,
        depth: 500,
      });
    } catch (err) {
      // Empty repo with no commits yet returns empty items
      if (err.name === 'NotFoundError' || err.code === 'NotFoundError') {
        return {
          items: [],
          page: Number(page),
          limit: Number(limit),
          total: 0,
        };
      }
      throw err;
    }

    const allCommits = rawCommits.map((c) => ({
      sha: c.oid,
      message: c.commit.message.trim(),
      author: {
        name: c.commit.author.name,
        email: c.commit.author.email,
      },
      committedAt: new Date(c.commit.author.timestamp * 1000).toISOString(),
      parents: c.commit.parent || [],
    }));

    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 20;
    const startIndex = (pageNum - 1) * limitNum;
    const paginatedCommits = allCommits.slice(startIndex, startIndex + limitNum);

    return {
      items: paginatedCommits,
      page: pageNum,
      limit: limitNum,
      total: allCommits.length,
    };
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(500, 'GIT_LOG_FAILED', `Failed to retrieve git log: ${err.message}`);
  }
}

/**
 * Gets file diff between working copy/index and HEAD, or commit vs parent (Endpoint #48 - Mastermind M2)
 */
export async function getGitDiff({ projectId, path: rawPath, staged, commit }) {
  const dir = getProjectGitDir(projectId);

  if (!isGitInitialized(projectId)) {
    throw new ApiError(400, 'GIT_NOT_INITIALIZED', 'Git repository is not initialized for this project');
  }

  const cleanPath = rawPath.replace(/^\/+/, '');
  const targetPath = path.join(dir, cleanPath);
  const ext = path.extname(cleanPath);
  const langConfig = getLanguageByExt(ext);
  const language = langConfig ? langConfig.key : 'text';

  let original = '';
  let modified = '';

  try {
    if (commit) {
      // 1. Commit vs Parent Commit diff
      let commitObj;
      try {
        commitObj = await git.readCommit({ fs, dir, oid: commit });
      } catch (err) {
        throw new ApiError(404, 'NOT_FOUND', `Commit '${commit}' not found`);
      }

      // Read modified blob at commit
      try {
        const { blob } = await git.readBlob({ fs, dir, oid: commit, filepath: cleanPath });
        modified = Buffer.from(blob).toString('utf8');
      } catch {
        modified = '';
      }

      // Read original blob at parent commit (if any)
      const parentSha = commitObj.commit.parent && commitObj.commit.parent[0];
      if (parentSha) {
        try {
          const { blob } = await git.readBlob({ fs, dir, oid: parentSha, filepath: cleanPath });
          original = Buffer.from(blob).toString('utf8');
        } catch {
          original = '';
        }
      }

      if (!modified && !original) {
        throw new ApiError(404, 'NOT_FOUND', `File '${cleanPath}' not found in commit ${commit} or its parent`);
      }
    } else {
      // 2. Working copy or Staged diff vs HEAD
      let headSha = null;
      try {
        headSha = await git.resolveRef({ fs, dir, ref: 'HEAD' });
      } catch {
        // No HEAD commits yet
      }

      if (headSha) {
        try {
          const { blob } = await git.readBlob({ fs, dir, oid: headSha, filepath: cleanPath });
          original = Buffer.from(blob).toString('utf8');
        } catch {
          original = '';
        }
      }

      // Modified side: working tree file on disk
      if (fs.existsSync(targetPath)) {
        try {
          modified = await fs.promises.readFile(targetPath, 'utf8');
        } catch {
          modified = '';
        }
      } else {
        modified = '';
      }

      if (!original && !modified) {
        throw new ApiError(404, 'NOT_FOUND', `File '${cleanPath}' not found in HEAD or working directory`);
      }
    }

    return {
      path: cleanPath,
      language,
      original,
      modified,
      diff: {
        path: cleanPath,
        language,
        original,
        modified,
      },
    };
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(500, 'GIT_DIFF_FAILED', `Failed to generate git diff: ${err.message}`);
  }
}

/**
 * Lists all local and remote branches (Endpoint #49 - Mastermind M2)
 */
export async function getGitBranches(projectId) {
  const dir = getProjectGitDir(projectId);

  if (!isGitInitialized(projectId)) {
    throw new ApiError(400, 'GIT_NOT_INITIALIZED', 'Git repository is not initialized for this project');
  }

  try {
    const current = (await git.currentBranch({ fs, dir })) || 'main';
    const localBranchNames = await git.listBranches({ fs, dir });

    if (localBranchNames.length === 0) {
      return {
        current,
        branches: [
          {
            name: current,
            sha: null,
            current: true,
          },
        ],
      };
    }

    const branches = [];
    for (const name of localBranchNames) {
      let sha = null;
      try {
        sha = await git.resolveRef({ fs, dir, ref: name });
      } catch {
        // Branch without commits yet
      }

      branches.push({
        name,
        sha,
        current: name === current,
      });
    }

    // Include remote branches if available
    try {
      const remoteBranchNames = await git.listBranches({ fs, dir, remote: 'origin' });
      for (const rName of remoteBranchNames) {
        const fullRemoteName = `origin/${rName}`;
        let sha = null;
        try {
          sha = await git.resolveRef({ fs, dir, ref: `refs/remotes/origin/${rName}` });
        } catch {
          // Ignore
        }
        branches.push({
          name: fullRemoteName,
          sha,
          current: false,
        });
      }
    } catch {
      // No remotes configured
    }

    return {
      current,
      branches,
    };
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(500, 'GIT_BRANCHES_FAILED', `Failed to list branches: ${err.message}`);
  }
}

/**
 * Creates a new branch from a specified ref or current branch (Endpoint #50 - Mastermind M2)
 */
export async function createGitBranch({ projectId, name, from, checkout = false }) {
  const dir = getProjectGitDir(projectId);

  if (!isGitInitialized(projectId)) {
    throw new ApiError(400, 'GIT_NOT_INITIALIZED', 'Git repository is not initialized for this project');
  }

  return withGitLock(projectId, async () => {
    const existing = await git.listBranches({ fs, dir });
    if (existing.includes(name)) {
      throw new ApiError(409, 'BRANCH_EXISTS', `Branch '${name}' already exists`);
    }

    try {
      const fromRef = from || (await git.currentBranch({ fs, dir })) || 'main';
      await git.branch({ fs, dir, ref: name, object: fromRef });

      let sha = null;
      try {
        sha = await git.resolveRef({ fs, dir, ref: name });
      } catch {
        // Empty repo
      }

      if (checkout) {
        await git.checkout({ fs, dir, ref: name, force: true });
      }

      return {
        branch: {
          name,
          sha,
        },
      };
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError(500, 'GIT_BRANCH_FAILED', `Failed to create branch: ${err.message}`);
    }
  });
}

/**
 * Checks out an existing branch (Endpoint #51 - Mastermind M2)
 */
export async function checkoutGitBranch({ projectId, branch, force = false }) {
  const dir = getProjectGitDir(projectId);

  if (!isGitInitialized(projectId)) {
    throw new ApiError(400, 'GIT_NOT_INITIALIZED', 'Git repository is not initialized for this project');
  }

  return withGitLock(projectId, async () => {
    const existing = await git.listBranches({ fs, dir });
    if (!existing.includes(branch)) {
      throw new ApiError(404, 'NOT_FOUND', `Branch '${branch}' not found`);
    }

    if (!force) {
      const status = await getGitStatus(projectId);
      if (!status.clean) {
        throw new ApiError(409, 'DIRTY_WORKING_TREE', 'Checkout blocked: working tree has uncommitted changes');
      }
    }

    try {
      await git.checkout({ fs, dir, ref: branch, force: Boolean(force) });

      return {
        branch,
        changedFiles: 0,
      };
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError(500, 'GIT_CHECKOUT_FAILED', `Failed to checkout branch: ${err.message}`);
    }
  });
}

/**
 * Deletes a branch by name (Endpoint #52 - Mastermind M2)
 */
export async function deleteGitBranch({ projectId, name }) {
  const dir = getProjectGitDir(projectId);

  if (!isGitInitialized(projectId)) {
    throw new ApiError(400, 'GIT_NOT_INITIALIZED', 'Git repository is not initialized for this project');
  }

  return withGitLock(projectId, async () => {
    const current = (await git.currentBranch({ fs, dir })) || 'main';
    if (name === current) {
      throw new ApiError(400, 'CANNOT_DELETE_CURRENT', 'Cannot delete the currently checked out branch');
    }

    const existing = await git.listBranches({ fs, dir });
    if (!existing.includes(name)) {
      throw new ApiError(404, 'NOT_FOUND', `Branch '${name}' not found`);
    }

    try {
      await git.deleteBranch({ fs, dir, ref: name });
      return { success: true };
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError(500, 'GIT_DELETE_BRANCH_FAILED', `Failed to delete branch: ${err.message}`);
    }
  });
}

/**
 * Pulls changes from remote repository (Endpoint #53 - Mastermind M2)
 */
export async function pullGitRepository({ projectId, branch, user }) {
  const dir = getProjectGitDir(projectId);

  if (!isGitInitialized(projectId)) {
    throw new ApiError(400, 'GIT_NOT_INITIALIZED', 'Git repository is not initialized for this project');
  }

  return withGitLock(projectId, async () => {
    // 1. Check uncommitted changes in working tree
    const status = await getGitStatus(projectId);
    if (!status.clean) {
      throw new ApiError(409, 'DIRTY_WORKING_TREE', 'Pull blocked: working tree has uncommitted changes');
    }

    // 2. Check remote configured
    const remotes = await git.listRemotes({ fs, dir });
    if (!remotes || remotes.length === 0) {
      throw new ApiError(400, 'NO_REMOTE', 'No remote configured. Use PUT /git/remote first.');
    }

    const currentBranch = branch || (await git.currentBranch({ fs, dir })) || 'main';

    let token = null;
    try {
      const authFile = path.join(dir, '.git', 'devsync-auth.json');
      if (fs.existsSync(authFile)) {
        const raw = JSON.parse(await fs.promises.readFile(authFile, 'utf8'));
        token = raw.token;
      }
    } catch {
      // Ignore
    }

    try {
      const pullResult = await git.pull({
        fs,
        http,
        dir,
        ref: currentBranch,
        singleBranch: true,
        author: {
          name: user?.name || 'DevSync Developer',
          email: user?.email || 'dev@devsync.io',
        },
        onAuth: () => (token ? { username: token } : undefined),
      });

      return {
        result: pullResult || 'up-to-date',
      };
    } catch (err) {
      if (err.name === 'MergeConflictError' || err.code === 'MergeConflictError') {
        const conflicts = err.data?.filepaths || [];
        throw new ApiError(409, 'MERGE_CONFLICTS', 'Pull aborted due to merge conflicts', conflicts);
      }
      throw new ApiError(502, 'GIT_REMOTE_ERROR', `Git remote error: ${err.message}`);
    }
  });
}

/**
 * Pushes changes to remote repository (Endpoint #54 - Mastermind M2)
 */
export async function pushGitRepository({ projectId, branch }) {
  const dir = getProjectGitDir(projectId);

  if (!isGitInitialized(projectId)) {
    throw new ApiError(400, 'GIT_NOT_INITIALIZED', 'Git repository is not initialized for this project');
  }

  return withGitLock(projectId, async () => {
    // 1. Check remote configured
    const remotes = await git.listRemotes({ fs, dir });
    if (!remotes || remotes.length === 0) {
      throw new ApiError(400, 'NO_REMOTE', 'No remote configured. Use PUT /git/remote first.');
    }

    const currentBranch = branch || (await git.currentBranch({ fs, dir })) || 'main';

    let token = null;
    try {
      const authFile = path.join(dir, '.git', 'devsync-auth.json');
      if (fs.existsSync(authFile)) {
        const raw = JSON.parse(await fs.promises.readFile(authFile, 'utf8'));
        token = raw.token;
      }
    } catch {
      // Ignore
    }

    try {
      const pushResult = await git.push({
        fs,
        http,
        dir,
        remote: 'origin',
        ref: currentBranch,
        onAuth: () => (token ? { username: token } : undefined),
      });

      return {
        pushed: true,
        ref: `refs/heads/${currentBranch}`,
        result: pushResult,
      };
    } catch (err) {
      if (err.name === 'PushRejectedError' || err.code === 'PushRejectedError') {
        throw new ApiError(409, 'NON_FAST_FORWARD', 'Push rejected: remote has newer changes. Pull first.');
      }
      throw new ApiError(502, 'GIT_REMOTE_ERROR', `Git remote error: ${err.message}`);
    }
  });
}
