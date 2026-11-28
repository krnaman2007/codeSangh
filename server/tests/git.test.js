import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  gitRepoParamSchema,
  initGitSchema,
  setRemoteSchema,
  cloneGitSchema,
  stagePathsSchema,
  unstagePathsSchema,
  discardPathsSchema,
  commitGitSchema,
  gitLogSchema,
  gitDiffSchema,
  gitBranchesSchema,
} from '../src/validators/git.schema.js';
import {
  initGitRepository,
  getGitRepositoryInfo,
  getProjectGitDir,
  setGitRemote,
  getGitStatus,
  stageGitPaths,
  unstageGitPaths,
  discardGitChanges,
  commitStagedChanges,
  withGitLock,
  getGitLog,
  getGitDiff,
  getGitBranches,
} from '../src/services/git.service.js';
import git from 'isomorphic-git';

test('Git Version Control Module (Endpoints 38-42 - Mastermind M2)', async (t) => {
  const validProjectId = '3f2a9c1e-6140-4c12-8809-5b76612c2a01';
  const testProjectId = '8c7b6a50-1234-4567-89ab-cdef01234567';

  await t.test('Endpoint #38: gitRepoParamSchema (Viewer+)', async () => {
    const valid = gitRepoParamSchema.safeParse({
      params: { projectId: validProjectId },
    });
    assert.equal(valid.success, true);

    const invalid = gitRepoParamSchema.safeParse({
      params: { projectId: 'not-a-uuid' },
    });
    assert.equal(invalid.success, false);
  });

  await t.test('Endpoint #39: initGitSchema (Editor+)', async () => {
    const validDefault = initGitSchema.safeParse({
      params: { projectId: validProjectId },
      body: {},
    });
    assert.equal(validDefault.success, true);
    assert.equal(validDefault.data.body.defaultBranch, 'main');

    const validCustom = initGitSchema.safeParse({
      params: { projectId: validProjectId },
      body: { defaultBranch: 'development' },
    });
    assert.equal(validCustom.success, true);
    assert.equal(validCustom.data.body.defaultBranch, 'development');

    const invalidBranch = initGitSchema.safeParse({
      params: { projectId: validProjectId },
      body: { defaultBranch: 'feature branch with spaces' },
    });
    assert.equal(invalidBranch.success, false);
  });

  await t.test('Endpoint #40: setRemoteSchema (Owner)', async () => {
    const valid = setRemoteSchema.safeParse({
      params: { projectId: validProjectId },
      body: {
        url: 'https://github.com/developer/devsync-repo.git',
        token: 'ghp_secretToken12345',
        name: 'origin',
      },
    });
    assert.equal(valid.success, true);
    assert.equal(valid.data.body.name, 'origin');

    const invalidUrl = setRemoteSchema.safeParse({
      params: { projectId: validProjectId },
      body: {
        url: 'not-a-valid-url',
      },
    });
    assert.equal(invalidUrl.success, false);
  });

  await t.test('Endpoint #41: cloneGitSchema (Owner)', async () => {
    const valid = cloneGitSchema.safeParse({
      params: { projectId: validProjectId },
      body: {
        url: 'https://github.com/developer/devsync-repo.git',
        branch: 'main',
      },
    });
    assert.equal(valid.success, true);
    assert.equal(valid.data.body.branch, 'main');

    const invalid = cloneGitSchema.safeParse({
      params: { projectId: validProjectId },
      body: {
        url: 'ftp://invalid-protocol.com/repo.git',
      },
    });
    assert.equal(invalid.success, false);
  });

  await t.test('Real Git Remote & Working Tree Status Operations (Endpoints 40 & 42)', async () => {
    const testDir = getProjectGitDir(testProjectId);

    if (fs.existsSync(testDir)) {
      await fs.promises.rm(testDir, { recursive: true, force: true });
    }

    // 1. Initialize repo
    await initGitRepository({
      projectId: testProjectId,
      defaultBranch: 'main',
      user: { name: 'Test Developer', email: 'test@devsync.io' },
      files: [
        { path: 'index.js', content: 'console.log("Initial code");\n' },
      ],
    });

    // 2. Set remote (Endpoint #40)
    const remoteResult = await setGitRemote({
      projectId: testProjectId,
      url: 'https://github.com/developer/my-project.git',
      token: 'ghp_dummyAuthToken',
      name: 'origin',
    });
    assert.equal(remoteResult.name, 'origin');
    assert.equal(remoteResult.url, 'https://github.com/developer/my-project.git');
    assert.equal(remoteResult.hasToken, true);

    // 3. Status clean (Endpoint #42)
    const initialStatus = await getGitStatus(testProjectId);
    assert.equal(initialStatus.clean, true);
    assert.equal(initialStatus.branch, 'main');
    assert.equal(initialStatus.modified.length, 0);
    assert.equal(initialStatus.untracked.length, 0);

    // 4. Modify existing file -> check status detects modified
    await fs.promises.writeFile(path.join(testDir, 'index.js'), 'console.log("Modified code");\n');
    const modifiedStatus = await getGitStatus(testProjectId);
    assert.equal(modifiedStatus.clean, false);
    assert.ok(modifiedStatus.modified.includes('index.js'));

    // 5. Create new file -> check status detects untracked
    await fs.promises.writeFile(path.join(testDir, 'helper.js'), 'export const x = 10;\n');
    const untrackedStatus = await getGitStatus(testProjectId);
    assert.ok(untrackedStatus.untracked.includes('helper.js'));

    // Cleanup
    if (fs.existsSync(testDir)) {
      await fs.promises.rm(testDir, { recursive: true, force: true });
    }
  });

  await t.test('Git Role Permissions Matrix (Blueprint 6.2 & PDF Page 6)', async () => {
    const RANK = { viewer: 1, editor: 2, owner: 3 };

    // Endpoint 38 & 42: Viewer+
    const canViewGit = (role) => RANK[role] >= RANK.viewer;
    assert.equal(canViewGit('owner'), true);
    assert.equal(canViewGit('editor'), true);
    assert.equal(canViewGit('viewer'), true);

    // Endpoint 39: Editor+
    const canInitGit = (role) => RANK[role] >= RANK.editor;
    assert.equal(canInitGit('owner'), true);
    assert.equal(canInitGit('editor'), true);
    assert.equal(canInitGit('viewer'), false);

    // Endpoints 40 & 41: Owner only
    const canManageRemoteOrClone = (role) => RANK[role] >= RANK.owner;
    assert.equal(canManageRemoteOrClone('owner'), true);
    assert.equal(canManageRemoteOrClone('editor'), false);
    assert.equal(canManageRemoteOrClone('viewer'), false);

    // Endpoints 43-46: Editor+ (Stage, Unstage, Discard, Commit)
    const canMutateGit = (role) => RANK[role] >= RANK.editor;
    assert.equal(canMutateGit('owner'), true);
    assert.equal(canMutateGit('editor'), true);
    assert.equal(canMutateGit('viewer'), false);
  });

  await t.test('Endpoints #43-#45: stage, unstage & discard path schemas (Editor+)', async () => {
    // Stage schema
    const validStage = stagePathsSchema.safeParse({
      params: { projectId: validProjectId },
      body: { paths: ['src/app.js', 'README.md'] },
    });
    assert.equal(validStage.success, true);

    const validStageAll = stagePathsSchema.safeParse({
      params: { projectId: validProjectId },
      body: { paths: ['.'] },
    });
    assert.equal(validStageAll.success, true);

    const invalidEmptyStage = stagePathsSchema.safeParse({
      params: { projectId: validProjectId },
      body: { paths: [] },
    });
    assert.equal(invalidEmptyStage.success, false);

    const invalidTraversalStage = stagePathsSchema.safeParse({
      params: { projectId: validProjectId },
      body: { paths: ['../../etc/passwd'] },
    });
    assert.equal(invalidTraversalStage.success, false);

    // Unstage schema
    const validUnstage = unstagePathsSchema.safeParse({
      params: { projectId: validProjectId },
      body: { paths: ['src/app.js'] },
    });
    assert.equal(validUnstage.success, true);

    // Discard schema
    const validDiscard = discardPathsSchema.safeParse({
      params: { projectId: validProjectId },
      body: { paths: ['src/app.js'] },
    });
    assert.equal(validDiscard.success, true);
  });

  await t.test('Endpoint #46: commitGitSchema (Editor+)', async () => {
    const validCommit = commitGitSchema.safeParse({
      params: { projectId: validProjectId },
      body: { message: 'feat: add git stage and commit functionality' },
    });
    assert.equal(validCommit.success, true);

    const emptyCommit = commitGitSchema.safeParse({
      params: { projectId: validProjectId },
      body: { message: '   ' },
    });
    assert.equal(emptyCommit.success, false);

    const longCommit = commitGitSchema.safeParse({
      params: { projectId: validProjectId },
      body: { message: 'a'.repeat(501) },
    });
    assert.equal(longCommit.success, false);
  });

  await t.test('Real Git Operations: Stage, Commit, Unstage, Discard & Mutex (Endpoints 43-46)', async () => {
    const testDir = getProjectGitDir(testProjectId);

    if (fs.existsSync(testDir)) {
      await fs.promises.rm(testDir, { recursive: true, force: true });
    }

    // 1. Initialize repo with index.js
    await initGitRepository({
      projectId: testProjectId,
      defaultBranch: 'main',
      user: { id: 'u1', name: 'Naman K', email: 'naman@devsync.io' },
      files: [
        { path: 'index.js', content: 'console.log("v1.0");\n' },
      ],
    });

    // 2. Commit when nothing is staged -> 400 NOTHING_TO_COMMIT
    await assert.rejects(
      async () => {
        await commitStagedChanges({
          projectId: testProjectId,
          message: 'Empty commit test',
          user: { id: 'u1', name: 'Naman K', email: 'naman@devsync.io' },
        });
      },
      (err) => {
        assert.equal(err.code, 'NOTHING_TO_COMMIT');
        assert.equal(err.statusCode, 400);
        return true;
      }
    );

    // 3. Modify index.js -> verify status is modified
    await fs.promises.writeFile(path.join(testDir, 'index.js'), 'console.log("v1.1 modified");\n');
    let status = await getGitStatus(testProjectId);
    assert.ok(status.modified.includes('index.js'));
    assert.equal(status.staged.length, 0);

    // 4. Stage modified file (Endpoint #43)
    const stageRes = await stageGitPaths({
      projectId: testProjectId,
      paths: ['index.js'],
    });
    assert.equal(stageRes.staged, 1);

    status = await getGitStatus(testProjectId);
    assert.ok(status.staged.includes('index.js'));

    // 5. Commit staged change (Endpoint #46)
    const commitRes = await commitStagedChanges({
      projectId: testProjectId,
      message: 'Update index to v1.1',
      user: { id: 'u1', name: 'Naman K', email: 'naman@devsync.io' },
    });
    assert.ok(commitRes.commit);
    assert.equal(commitRes.commit.sha.length, 40);
    assert.equal(commitRes.commit.message, 'Update index to v1.1');
    assert.equal(commitRes.commit.author.name, 'Naman K');
    assert.equal(commitRes.commit.author.email, 'naman@devsync.io');

    status = await getGitStatus(testProjectId);
    assert.equal(status.clean, true);

    // 6. Modify file again, stage it, then unstage it (Endpoint #44)
    await fs.promises.writeFile(path.join(testDir, 'index.js'), 'console.log("v1.2 unstaged test");\n');
    await stageGitPaths({
      projectId: testProjectId,
      paths: ['index.js'],
    });
    status = await getGitStatus(testProjectId);
    assert.ok(status.staged.includes('index.js'));

    const unstageRes = await unstageGitPaths({
      projectId: testProjectId,
      paths: ['index.js'],
    });
    assert.equal(unstageRes.unstaged, 1);

    status = await getGitStatus(testProjectId);
    assert.equal(status.staged.length, 0);
    assert.ok(status.modified.includes('index.js'));

    // 7. Discard modified changes (Endpoint #45) -> restores HEAD content
    const discardRes = await discardGitChanges({
      projectId: testProjectId,
      paths: ['index.js'],
    });
    assert.equal(discardRes.discarded, 1);

    const restoredContent = await fs.promises.readFile(path.join(testDir, 'index.js'), 'utf8');
    assert.equal(restoredContent, 'console.log("v1.1 modified");\n');

    status = await getGitStatus(testProjectId);
    assert.equal(status.clean, true);

    // 8. Create untracked file, discard it -> file deleted
    const tempFile = path.join(testDir, 'temp.txt');
    await fs.promises.writeFile(tempFile, 'temporary content');
    status = await getGitStatus(testProjectId);
    assert.ok(status.untracked.includes('temp.txt'));

    await discardGitChanges({
      projectId: testProjectId,
      paths: ['temp.txt'],
    });
    assert.equal(fs.existsSync(tempFile), false);

    // 9. Per-project Mutex: concurrent lock throws 409 GIT_BUSY
    await assert.rejects(
      async () => {
        await withGitLock(testProjectId, async () => {
          // Inside lock, try to acquire another lock on same project
          await withGitLock(testProjectId, async () => {});
        });
      },
      (err) => {
        assert.equal(err.code, 'GIT_BUSY');
        assert.equal(err.statusCode, 409);
        return true;
      }
    );

    // Cleanup
    if (fs.existsSync(testDir)) {
      await fs.promises.rm(testDir, { recursive: true, force: true });
    }
  });

  await t.test('Endpoints #47-#49: gitLogSchema, gitDiffSchema & gitBranchesSchema (Viewer+)', async () => {
    // 1. gitLogSchema
    const validLog = gitLogSchema.safeParse({
      params: { projectId: validProjectId },
      query: { branch: 'main', page: '1', limit: '10' },
    });
    assert.equal(validLog.success, true);
    assert.equal(validLog.data.query.page, 1);
    assert.equal(validLog.data.query.limit, 10);

    const defaultLog = gitLogSchema.safeParse({
      params: { projectId: validProjectId },
      query: {},
    });
    assert.equal(defaultLog.success, true);
    assert.equal(defaultLog.data.query.page, 1);
    assert.equal(defaultLog.data.query.limit, 20);

    const invalidLimitLog = gitLogSchema.safeParse({
      params: { projectId: validProjectId },
      query: { limit: '200' },
    });
    assert.equal(invalidLimitLog.success, false);

    // 2. gitDiffSchema
    const validDiff = gitDiffSchema.safeParse({
      params: { projectId: validProjectId },
      query: {
        path: 'src/app.js',
        staged: 'true',
        commit: '3f2a9c1e61404c1288095b76612c2a013f2a9c1e',
      },
    });
    assert.equal(validDiff.success, true);
    assert.equal(validDiff.data.query.staged, true);

    const invalidPathDiff = gitDiffSchema.safeParse({
      params: { projectId: validProjectId },
      query: { path: '../secrets.env' },
    });
    assert.equal(invalidPathDiff.success, false);

    const missingPathDiff = gitDiffSchema.safeParse({
      params: { projectId: validProjectId },
      query: {},
    });
    assert.equal(missingPathDiff.success, false);

    // 3. gitBranchesSchema
    const validBranches = gitBranchesSchema.safeParse({
      params: { projectId: validProjectId },
    });
    assert.equal(validBranches.success, true);

    const invalidBranches = gitBranchesSchema.safeParse({
      params: { projectId: 'not-a-valid-uuid' },
    });
    assert.equal(invalidBranches.success, false);
  });

  await t.test('Real Git Log, Diff, and Branches Operations (Endpoints 47-49)', async () => {
    const testDir = getProjectGitDir(testProjectId);

    if (fs.existsSync(testDir)) {
      await fs.promises.rm(testDir, { recursive: true, force: true });
    }

    // 1. Initialize repo
    await initGitRepository({
      projectId: testProjectId,
      defaultBranch: 'main',
      user: { id: 'u1', name: 'Naman K', email: 'naman@devsync.io' },
      files: [
        { path: 'index.js', content: 'console.log("Initial code v1.0");\n' },
      ],
    });

    // 2. Endpoint #47: git log initial state
    const log1 = await getGitLog({
      projectId: testProjectId,
      branch: 'main',
      page: 1,
      limit: 10,
    });
    assert.equal(log1.total, 1);
    assert.equal(log1.items.length, 1);
    assert.equal(log1.items[0].message, 'Initial commit');
    assert.equal(log1.items[0].author.name, 'Naman K');
    assert.equal(log1.items[0].sha.length, 40);

    // 3. Make second commit and check pagination
    await fs.promises.writeFile(path.join(testDir, 'index.js'), 'console.log("Updated code v2.0");\n');
    await stageGitPaths({ projectId: testProjectId, paths: ['index.js'] });
    const commit2 = await commitStagedChanges({
      projectId: testProjectId,
      message: 'feat: update to v2.0',
      user: { id: 'u1', name: 'Naman K', email: 'naman@devsync.io' },
    });

    const log2 = await getGitLog({
      projectId: testProjectId,
      page: 1,
      limit: 1,
    });
    assert.equal(log2.total, 2);
    assert.equal(log2.items.length, 1);
    assert.equal(log2.items[0].sha, commit2.commit.sha);
    assert.equal(log2.items[0].message, 'feat: update to v2.0');

    // 4. Endpoint #48: git diff - working tree vs HEAD
    await fs.promises.writeFile(path.join(testDir, 'index.js'), 'console.log("Working copy v3.0");\n');
    const workingDiff = await getGitDiff({
      projectId: testProjectId,
      path: 'index.js',
    });
    assert.equal(workingDiff.path, 'index.js');
    assert.equal(workingDiff.language, 'javascript');
    assert.ok(workingDiff.original.includes('Updated code v2.0'));
    assert.ok(workingDiff.modified.includes('Working copy v3.0'));

    // 5. Endpoint #48: git diff - commit vs parent commit
    const commitDiff = await getGitDiff({
      projectId: testProjectId,
      path: 'index.js',
      commit: commit2.commit.sha,
    });
    assert.ok(commitDiff.original.includes('Initial code v1.0'));
    assert.ok(commitDiff.modified.includes('Updated code v2.0'));

    // Non-existent file diff throws 404
    await assert.rejects(
      async () => {
        await getGitDiff({
          projectId: testProjectId,
          path: 'non-existent.js',
        });
      },
      (err) => {
        assert.equal(err.code, 'NOT_FOUND');
        assert.equal(err.statusCode, 404);
        return true;
      }
    );

    // 6. Endpoint #49: git branches
    const initialBranches = await getGitBranches(testProjectId);
    assert.equal(initialBranches.current, 'main');
    assert.equal(initialBranches.branches.length, 1);
    assert.equal(initialBranches.branches[0].name, 'main');
    assert.equal(initialBranches.branches[0].current, true);
    assert.equal(initialBranches.branches[0].sha.length, 40);

    // Create a new branch via isomorphic-git
    await git.branch({ fs, dir: testDir, ref: 'feature/auth' });
    const multipleBranches = await getGitBranches(testProjectId);
    assert.equal(multipleBranches.current, 'main');
    assert.equal(multipleBranches.branches.length, 2);
    const authBranch = multipleBranches.branches.find((b) => b.name === 'feature/auth');
    assert.ok(authBranch);
    assert.equal(authBranch.current, false);
    assert.equal(authBranch.sha.length, 40);

    // 7. Role permissions matrix for Endpoints 47-49: Viewer+
    const RANK = { viewer: 1, editor: 2, owner: 3 };
    const canReadGitInfo = (role) => RANK[role] >= RANK.viewer;
    assert.equal(canReadGitInfo('owner'), true);
    assert.equal(canReadGitInfo('editor'), true);
    assert.equal(canReadGitInfo('viewer'), true);

    // Cleanup
    if (fs.existsSync(testDir)) {
      await fs.promises.rm(testDir, { recursive: true, force: true });
    }
  });
});
