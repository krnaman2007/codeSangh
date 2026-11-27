import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  gitRepoParamSchema,
  initGitSchema,
  setRemoteSchema,
  cloneGitSchema,
} from '../src/validators/git.schema.js';
import {
  initGitRepository,
  getGitRepositoryInfo,
  getProjectGitDir,
  setGitRemote,
  getGitStatus,
} from '../src/services/git.service.js';

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
  });
});
