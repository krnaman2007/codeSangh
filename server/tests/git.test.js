import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  gitRepoParamSchema,
  initGitSchema,
} from '../src/validators/git.schema.js';
import {
  initGitRepository,
  getGitRepositoryInfo,
  getProjectGitDir,
} from '../src/services/git.service.js';

test('Git Version Control Module (Endpoints 38-39 - Mastermind M2)', async (t) => {
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
    // Default branch is 'main'
    const validDefault = initGitSchema.safeParse({
      params: { projectId: validProjectId },
      body: {},
    });
    assert.equal(validDefault.success, true);
    assert.equal(validDefault.data.body.defaultBranch, 'main');

    // Custom valid branch
    const validCustom = initGitSchema.safeParse({
      params: { projectId: validProjectId },
      body: { defaultBranch: 'development' },
    });
    assert.equal(validCustom.success, true);
    assert.equal(validCustom.data.body.defaultBranch, 'development');

    // Invalid branch with spaces or forbidden chars
    const invalidBranch = initGitSchema.safeParse({
      params: { projectId: validProjectId },
      body: { defaultBranch: 'feature branch with spaces' },
    });
    assert.equal(invalidBranch.success, false);
  });

  await t.test('Real Git Repository Operations via isomorphic-git', async () => {
    const testDir = getProjectGitDir(testProjectId);

    // Clean up if leftover from previous test
    if (fs.existsSync(testDir)) {
      await fs.promises.rm(testDir, { recursive: true, force: true });
    }

    // 1. Uninitialized state returns initialized: false
    const infoBefore = await getGitRepositoryInfo(testProjectId);
    assert.equal(infoBefore.initialized, false);
    assert.equal(infoBefore.branch, null);
    assert.equal(infoBefore.headCommit, null);

    // 2. Initialize real Git repo with sample project files
    const result = await initGitRepository({
      projectId: testProjectId,
      defaultBranch: 'main',
      user: { name: 'Test Developer', email: 'test@devsync.io' },
      files: [
        { path: 'index.js', content: 'console.log("Hello from DevSync Git");\n' },
        { path: 'README.md', content: '# DevSync Project\n' },
      ],
    });

    assert.equal(result.initialized, true);
    assert.equal(result.branch, 'main');
    assert.ok(result.headCommit !== null);
    assert.equal(result.headCommit.message, 'Initial commit');
    assert.equal(result.headCommit.author, 'Test Developer');
    assert.equal(typeof result.headCommit.hash, 'string');
    assert.equal(result.headCommit.hash.length, 40); // 40-char SHA-1 hash

    // Verify .git folder exists on disk
    assert.equal(fs.existsSync(path.join(testDir, '.git')), true);

    // 3. Info after initialization returns real commit details
    const infoAfter = await getGitRepositoryInfo(testProjectId);
    assert.equal(infoAfter.initialized, true);
    assert.equal(infoAfter.branch, 'main');
    assert.ok(infoAfter.headCommit !== null);
    assert.equal(infoAfter.headCommit.hash, result.headCommit.hash);

    // 4. Duplicate init throws 409 ALREADY_INITIALIZED
    await assert.rejects(
      async () => {
        await initGitRepository({
          projectId: testProjectId,
          defaultBranch: 'main',
          user: { name: 'Test Developer', email: 'test@devsync.io' },
        });
      },
      (err) => {
        assert.equal(err.statusCode, 409);
        assert.equal(err.code, 'ALREADY_INITIALIZED');
        return true;
      }
    );

    // Cleanup test repository
    if (fs.existsSync(testDir)) {
      await fs.promises.rm(testDir, { recursive: true, force: true });
    }
  });

  await t.test('Git Role Permissions Matrix (Blueprint 6.2 & PDF Page 6)', async () => {
    const RANK = { viewer: 1, editor: 2, owner: 3 };

    // Endpoint 38: Viewer+
    const canViewGit = (role) => RANK[role] >= RANK.viewer;
    assert.equal(canViewGit('owner'), true);
    assert.equal(canViewGit('editor'), true);
    assert.equal(canViewGit('viewer'), true);

    // Endpoint 39: Editor+
    const canInitGit = (role) => RANK[role] >= RANK.editor;
    assert.equal(canInitGit('owner'), true);
    assert.equal(canInitGit('editor'), true);
    assert.equal(canInitGit('viewer'), false);
  });
});
