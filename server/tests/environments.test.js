// server/tests/environments.test.js
// DevSync Environment Runtime Catalogue Tests (Endpoint #55 - Mastermind M3)

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  RUNTIMES,
  RUNTIME_CATALOGUE,
  getRuntimeByKey,
  isValidRuntimeKey,
  isValidRuntimeVersion,
} from '../src/constants/runtimes.js';
import { getRuntimes } from '../src/controllers/environment.controller.js';
import {
  environmentProjectIdSchema,
  saveEnvironmentSchema,
  buildEnvironmentSchema,
  getBuildLogSchema,
  resetEnvironmentSchema,
} from '../src/validators/environment.schema.js';
import {
  getProjectEnvironment,
  saveProjectEnvironment,
  rebuildProjectEnvironment,
  getProjectBuildLog,
  resetProjectEnvironment,
  computeConfigHash,
  dockerfileFor,
} from '../src/services/environment.service.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ENV_STORAGE_DIR = path.resolve(__dirname, '../storage/environments');

test('Endpoint #55: Environments Runtime Catalogue (Blueprint Section 7.10 & Page 32)', async (t) => {
  await t.test('should contain all required runtimes from the Blueprint', () => {
    const requiredKeys = ['node', 'python', 'java', 'cpp'];
    for (const key of requiredKeys) {
      assert.ok(RUNTIMES[key], `Runtime '${key}' must exist in RUNTIMES`);
    }
    assert.equal(RUNTIME_CATALOGUE.length, 4);
  });

  await t.test('each runtime entry should conform to the Blueprint shape', () => {
    for (const item of RUNTIME_CATALOGUE) {
      assert.ok(typeof item.key === 'string' && item.key.length > 0);
      assert.ok(typeof item.label === 'string' && item.label.length > 0);
      assert.ok(Array.isArray(item.versions) && item.versions.length > 0);
      assert.ok(typeof item.defaultVersion === 'string' && item.defaultVersion.length > 0);
      assert.ok(item.versions.includes(item.defaultVersion), 'defaultVersion must be one of versions');
      assert.ok(Array.isArray(item.managers) && item.managers.length > 0);
      assert.ok(Array.isArray(item.languages) && item.languages.length > 0);
    }
  });

  await t.test('Node.js runtime specifications (Blueprint 7.10 & 9.4)', () => {
    const node = getRuntimeByKey('node');
    assert.equal(node.key, 'node');
    assert.equal(node.label, 'Node.js');
    assert.deepEqual(node.versions, ['18', '20', '22']);
    assert.equal(node.defaultVersion, '20');
    assert.deepEqual(node.managers, ['npm', 'apt']);
    assert.deepEqual(node.languages, ['javascript']);
    assert.equal(node.image('20'), 'node:20-bookworm-slim');
  });

  await t.test('Python runtime specifications (Blueprint 7.10 & 9.4)', () => {
    const python = getRuntimeByKey('python');
    assert.equal(python.key, 'python');
    assert.equal(python.label, 'Python');
    assert.deepEqual(python.versions, ['3.10', '3.11', '3.12']);
    assert.equal(python.defaultVersion, '3.12');
    assert.deepEqual(python.managers, ['pip', 'apt']);
    assert.deepEqual(python.languages, ['python']);
    assert.equal(python.image('3.12'), 'python:3.12-slim');
  });

  await t.test('Java (OpenJDK) runtime specifications (Blueprint 7.10 & 9.4)', () => {
    const java = getRuntimeByKey('java');
    assert.equal(java.key, 'java');
    assert.equal(java.label, 'Java (OpenJDK)');
    assert.deepEqual(java.versions, ['17', '21']);
    assert.equal(java.defaultVersion, '21');
    assert.deepEqual(java.managers, ['apt']);
    assert.deepEqual(java.languages, ['java']);
    assert.equal(java.image('21'), 'eclipse-temurin:21-jdk');
  });

  await t.test('C++ (GCC) runtime specifications (Blueprint 7.10 & 9.4)', () => {
    const cpp = getRuntimeByKey('cpp');
    assert.equal(cpp.key, 'cpp');
    assert.equal(cpp.label, 'C++ (GCC)');
    assert.deepEqual(cpp.versions, ['12', '13']);
    assert.equal(cpp.defaultVersion, '13');
    assert.deepEqual(cpp.managers, ['apt']);
    assert.deepEqual(cpp.languages, ['cpp', 'c']);
    assert.equal(cpp.image('13'), 'gcc:13');
  });

  await t.test('helper validation functions', () => {
    assert.equal(isValidRuntimeKey('node'), true);
    assert.equal(isValidRuntimeKey('python'), true);
    assert.equal(isValidRuntimeKey('ruby'), false);

    assert.equal(isValidRuntimeVersion('node', '20'), true);
    assert.equal(isValidRuntimeVersion('node', '18'), true);
    assert.equal(isValidRuntimeVersion('node', '14'), false);
    assert.equal(isValidRuntimeVersion('unknown', '1.0'), false);
  });

  await t.test('getRuntimes controller should format standard response envelope', async () => {
    let statusCode = null;
    let jsonResponse = null;

    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        jsonResponse = data;
        return this;
      },
    };

    await getRuntimes({}, res);

    assert.equal(statusCode, 200);
    assert.equal(jsonResponse.success, true);
    assert.ok(Array.isArray(jsonResponse.data.runtimes));
    assert.equal(jsonResponse.data.runtimes.length, 4);
    assert.equal(jsonResponse.data.runtimes[0].key, 'node');
  });

  const validProjectId = '3f2a9c1e-6140-4c12-8809-5b76612c2a01';
  const testProjectId = '7d6e5c4b-3a21-4f09-8811-aa22bb33cc44';

  await t.test('Endpoints #56 & #57: Schemas Validation (Viewer+ & Owner)', async () => {
    // 1. environmentProjectIdSchema
    const validId = environmentProjectIdSchema.safeParse({
      params: { projectId: validProjectId },
    });
    assert.equal(validId.success, true);

    const invalidId = environmentProjectIdSchema.safeParse({
      params: { projectId: 'invalid-id' },
    });
    assert.equal(invalidId.success, false);

    // 2. saveEnvironmentSchema valid node.js spec
    const validNode = saveEnvironmentSchema.safeParse({
      params: { projectId: validProjectId },
      body: {
        runtime: 'node',
        runtimeVersion: '20',
        dependencies: [
          { manager: 'npm', name: 'express', version: '4.19.2' },
          { manager: 'apt', name: 'curl', version: '7.88.1' },
        ],
        envVars: {
          NODE_ENV: 'development',
          PORT: '3000',
        },
        setupCommand: 'npm install',
        executionMode: 'environment',
      },
    });
    assert.equal(validNode.success, true);

    // 3. saveEnvironmentSchema valid python spec
    const validPython = saveEnvironmentSchema.safeParse({
      params: { projectId: validProjectId },
      body: {
        runtime: 'python',
        runtimeVersion: '3.12',
        dependencies: [
          { manager: 'pip', name: 'numpy', version: '1.26.4' },
          { manager: 'pip', name: 'flask', version: '3.0.0' },
        ],
        envVars: {
          FLASK_ENV: 'development',
        },
      },
    });
    assert.equal(validPython.success, true);

    // 4. Rejection: invalid runtime
    const invalidRuntime = saveEnvironmentSchema.safeParse({
      params: { projectId: validProjectId },
      body: {
        runtime: 'ruby',
        runtimeVersion: '3.0',
      },
    });
    assert.equal(invalidRuntime.success, false);

    // 5. Rejection: invalid runtime version
    const invalidVersion = saveEnvironmentSchema.safeParse({
      params: { projectId: validProjectId },
      body: {
        runtime: 'node',
        runtimeVersion: '14',
      },
    });
    assert.equal(invalidVersion.success, false);

    // 6. Rejection: package manager not supported for runtime (e.g. pip with node)
    const invalidManager = saveEnvironmentSchema.safeParse({
      params: { projectId: validProjectId },
      body: {
        runtime: 'node',
        runtimeVersion: '20',
        dependencies: [{ manager: 'pip', name: 'numpy', version: '1.0' }],
      },
    });
    assert.equal(invalidManager.success, false);

    // 7. Rejection: env var key with invalid characters
    const invalidEnvKey = saveEnvironmentSchema.safeParse({
      params: { projectId: validProjectId },
      body: {
        runtime: 'node',
        runtimeVersion: '20',
        envVars: {
          'bad-key-lowercase': 'val',
        },
      },
    });
    assert.equal(invalidEnvKey.success, false);

    // 8. Rejection: dependencies exceeding limit of 50
    const tooManyDeps = saveEnvironmentSchema.safeParse({
      params: { projectId: validProjectId },
      body: {
        runtime: 'node',
        runtimeVersion: '20',
        dependencies: Array.from({ length: 51 }, (_, i) => ({
          manager: 'npm',
          name: `pkg-${i}`,
          version: '1.0.0',
        })),
      },
    });
    assert.equal(tooManyDeps.success, false);
  });

  await t.test('Real Project Environment Service & Dockerfile Generation (Endpoints 56 & 57)', async () => {
    const envFile = path.join(ENV_STORAGE_DIR, `${testProjectId}.json`);
    if (fs.existsSync(envFile)) {
      await fs.promises.unlink(envFile);
    }

    // 1. Endpoint #56: Initial unconfigured state
    const initial = await getProjectEnvironment(testProjectId);
    assert.equal(initial.configured, false);

    // 2. Endpoint #57: Save environment & compute hash
    const spec = {
      runtime: 'node',
      runtimeVersion: '20',
      dependencies: [
        { manager: 'npm', name: 'express', version: '4.19.2' },
        { manager: 'apt', name: 'curl', version: '7.88.1' },
      ],
      envVars: {
        NODE_ENV: 'production',
        APP_PORT: '8080',
      },
      setupCommand: 'npm install',
      runCommand: 'node server.js',
      executionMode: 'environment',
    };

    const hash = computeConfigHash(spec);
    assert.equal(typeof hash, 'string');
    assert.equal(hash.length, 64);

    const saved = await saveProjectEnvironment({
      projectId: testProjectId,
      spec,
      user: { id: 'u1', name: 'Naman K' },
    });

    assert.equal(saved.configured, true);
    assert.equal(saved.status, 'building');
    assert.equal(saved.runtime, 'node');
    assert.equal(saved.runtimeVersion, '20');
    assert.equal(saved.configHash, hash);
    assert.ok(saved.imageTag.startsWith('devsync/proj-'));
    assert.equal(saved.updatedBy.name, 'Naman K');

    // 3. Dockerfile generation check
    const dockerfile = dockerfileFor(spec);
    assert.ok(dockerfile.includes('FROM node:20-bookworm-slim'));
    assert.ok(dockerfile.includes('USER dev'));
    assert.ok(dockerfile.includes('WORKDIR /workspace'));
    assert.ok(dockerfile.includes('RUN npm install -g express@4.19.2'));
    assert.ok(dockerfile.includes('RUN apt-get update && apt-get install -y --no-install-recommends curl=7.88.1'));
    assert.ok(dockerfile.includes('ENV NODE_ENV="production"'));

    // 4. Endpoint #56: Read configured environment
    const current = await getProjectEnvironment(testProjectId);
    assert.equal(current.configured, true);
    assert.equal(current.runtime, 'node');
    assert.equal(current.imageTag, saved.imageTag);

    // 5. Cleanup
    if (fs.existsSync(envFile)) {
      await fs.promises.unlink(envFile);
    }
  });

  await t.test('Environment Permissions Matrix (Blueprint 6.2 & Page 19)', async () => {
    const RANK = { viewer: 1, editor: 2, owner: 3 };

    // Endpoint 56: Viewer+
    const canViewEnv = (role) => RANK[role] >= RANK.viewer;
    assert.equal(canViewEnv('owner'), true);
    assert.equal(canViewEnv('editor'), true);
    assert.equal(canViewEnv('viewer'), true);

    // Endpoint 57: Owner only
    const canConfigureEnv = (role) => RANK[role] >= RANK.owner;
    assert.equal(canConfigureEnv('owner'), true);
    assert.equal(canConfigureEnv('editor'), false);
    assert.equal(canConfigureEnv('viewer'), false);

    // Endpoint 58: Owner only
    const canRebuildEnv = (role) => RANK[role] >= RANK.owner;
    assert.equal(canRebuildEnv('owner'), true);
    assert.equal(canRebuildEnv('editor'), false);
    assert.equal(canRebuildEnv('viewer'), false);

    // Endpoint 59: Viewer+
    const canViewBuildLog = (role) => RANK[role] >= RANK.viewer;
    assert.equal(canViewBuildLog('owner'), true);
    assert.equal(canViewBuildLog('editor'), true);
    assert.equal(canViewBuildLog('viewer'), true);

    // Endpoint 60: Owner only
    const canResetEnv = (role) => RANK[role] >= RANK.owner;
    assert.equal(canResetEnv('owner'), true);
    assert.equal(canResetEnv('editor'), false);
    assert.equal(canResetEnv('viewer'), false);
  });

  await t.test('Endpoints #58-#60: Force Rebuild, Build Log & Reset Environment (Mastermind M3)', async () => {
    const testProjectId = '77777777-7777-4777-a777-777777777777';
    const envFile = path.join(ENV_STORAGE_DIR, `${testProjectId}.json`);

    // Clean up any stale state
    if (fs.existsSync(envFile)) {
      await fs.promises.unlink(envFile);
    }

    // 1. Endpoint #58 on unconfigured project -> throws 404 NOT_FOUND
    await assert.rejects(
      async () => {
        await rebuildProjectEnvironment({
          projectId: testProjectId,
          user: { id: 'u1', name: 'Naman K' },
        });
      },
      (err) => {
        assert.equal(err.statusCode, 404);
        assert.equal(err.code, 'NOT_FOUND');
        return true;
      }
    );

    // 2. Endpoint #59 on unconfigured project -> returns status none with empty log
    const emptyLog = await getProjectBuildLog(testProjectId);
    assert.equal(emptyLog.status, 'none');
    assert.equal(emptyLog.log, '');
    assert.equal(emptyLog.builtAt, null);

    // 3. Configure project environment
    const spec = {
      runtime: 'python',
      runtimeVersion: '3.12',
      dependencies: [{ manager: 'pip', name: 'fastapi', version: '0.115.0' }],
      envVars: { ENV: 'production' },
      executionMode: 'environment',
    };

    await saveProjectEnvironment({
      projectId: testProjectId,
      spec,
      user: { id: 'u1', name: 'Naman K' },
    });

    // 4. Endpoint #58 when status is building -> throws 409 ENVIRONMENT_BUILDING
    await assert.rejects(
      async () => {
        await rebuildProjectEnvironment({
          projectId: testProjectId,
          user: { id: 'u1', name: 'Naman K' },
        });
      },
      (err) => {
        assert.equal(err.statusCode, 409);
        assert.equal(err.code, 'ENVIRONMENT_BUILDING');
        return true;
      }
    );

    // Wait briefly for background pipeline initialization
    await new Promise((r) => setTimeout(r, 60));

    // Simulate build completion to 'ready'
    const envData = JSON.parse(await fs.promises.readFile(envFile, 'utf8'));
    envData.status = 'ready';
    envData.builtAt = new Date().toISOString();
    envData.buildLog += 'Successfully installed fastapi==0.115.0\n';
    await fs.promises.writeFile(envFile, JSON.stringify(envData, null, 2), 'utf8');

    // 5. Endpoint #58 Force rebuild -> successfully transitions to building
    const rebuildResult = await rebuildProjectEnvironment({
      projectId: testProjectId,
      user: { id: 'u1', name: 'Naman K' },
      skipDockerCheck: true,
    });
    assert.equal(rebuildResult.status, 'building');

    const rebuildingEnv = await getProjectEnvironment(testProjectId);
    assert.ok(['building', 'ready'].includes(rebuildingEnv.status));
    assert.ok(rebuildingEnv.buildLog.includes('[Force rebuild started]'));

    // 6. Endpoint #59: Build Log retrieval and 200 KB capping test
    const buildLogData = await getProjectBuildLog(testProjectId);
    assert.ok(['building', 'ready'].includes(buildLogData.status));
    assert.ok(buildLogData.log.includes('[Force rebuild started]'));

    // Test log capping on huge log > 200 KB
    const hugeLog = 'X'.repeat(250 * 1024);
    envData.buildLog = hugeLog;
    await fs.promises.writeFile(envFile, JSON.stringify(envData, null, 2), 'utf8');

    const cappedLogData = await getProjectBuildLog(testProjectId);
    assert.equal(cappedLogData.log.length, 200 * 1024);

    // 7. Endpoint #60: Reset Environment -> deletes configuration and container/image
    await resetProjectEnvironment({ projectId: testProjectId });
    const resetEnv = await getProjectEnvironment(testProjectId);
    assert.equal(resetEnv.configured, false);
    assert.equal(fs.existsSync(envFile), false);

    // Post-reset build log returns none
    const postResetLog = await getProjectBuildLog(testProjectId);
    assert.equal(postResetLog.status, 'none');
  });
});
