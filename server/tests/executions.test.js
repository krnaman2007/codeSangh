import test from 'node:test';
import assert from 'node:assert/strict';
import {
  runFileSchema,
  executionParamsSchema,
  listExecutionsSchema,
} from '../src/validators/execution.schema.js';
import { LIMITS } from '../src/constants/limits.js';
import { getLanguageByKey, RUNNABLE_LANGUAGES } from '../src/constants/languages.js';
import { enforceRunRateLimit, resetRunRateLimiter } from '../src/utils/rateLimiter.js';
import { executeCode } from '../src/services/judge0.service.js';

test('Executions Module Validation & Business Rules (Endpoints 29-32)', async (t) => {
  const validProjectId = '3f2a9c1e-6140-4c12-8809-5b76612c2a01';
  const validFileId = '4a3b2c1d-7250-4d23-9910-6c87723d3b02';
  const validExecutionId = '5b4c3d2e-8361-4e34-aa21-7d98834e4c03';
  const validUserId = '6c5d4e3f-9472-4f45-bb32-8e09945f5d04';

  await t.test('Endpoint #29: runFileSchema (Editor+)', async () => {
    // Valid minimal run request
    const validMinimal = runFileSchema.safeParse({
      params: { projectId: validProjectId, fileId: validFileId },
      body: {},
    });
    assert.equal(validMinimal.success, true);
    assert.equal(validMinimal.data.body.stdin, '');

    // Valid run with stdin and draft content
    const validWithData = runFileSchema.safeParse({
      params: { projectId: validProjectId, fileId: validFileId },
      body: { stdin: 'hello world', content: 'console.log(123);' },
    });
    assert.equal(validWithData.success, true);
    assert.equal(validWithData.data.body.stdin, 'hello world');

    // Invalid projectId
    const invalidProj = runFileSchema.safeParse({
      params: { projectId: 'invalid-id', fileId: validFileId },
      body: {},
    });
    assert.equal(invalidProj.success, false);

    // Stdin exceeding 64 KB limit
    const oversizedStdin = 'a'.repeat(LIMITS.STDIN_MAX_BYTES + 1);
    const invalidStdin = runFileSchema.safeParse({
      params: { projectId: validProjectId, fileId: validFileId },
      body: { stdin: oversizedStdin },
    });
    assert.equal(invalidStdin.success, false);
  });

  await t.test('Endpoints #30 & #31: executionParamsSchema & listExecutionsSchema', async () => {
    // Execution params
    const validParams = executionParamsSchema.safeParse({
      params: { projectId: validProjectId, executionId: validExecutionId },
    });
    assert.equal(validParams.success, true);

    const invalidParams = executionParamsSchema.safeParse({
      params: { projectId: validProjectId, executionId: 'bad-uuid' },
    });
    assert.equal(invalidParams.success, false);

    // List executions default pagination
    const defaultList = listExecutionsSchema.safeParse({
      params: { projectId: validProjectId },
      query: {},
    });
    assert.equal(defaultList.success, true);
    assert.equal(defaultList.data.query.limit, 50);
    assert.equal(defaultList.data.query.offset, 0);

    // Custom pagination
    const customList = listExecutionsSchema.safeParse({
      params: { projectId: validProjectId },
      query: { limit: '20', offset: '40' },
    });
    assert.equal(customList.success, true);
    assert.equal(customList.data.query.limit, 20);
    assert.equal(customList.data.query.offset, 40);
  });

  await t.test('Rate Limiter: Enforces 10 runs per minute per user (Blueprint 4.3)', async () => {
    resetRunRateLimiter();

    // First 10 runs must succeed
    for (let i = 0; i < LIMITS.RUN_RATE_LIMIT; i++) {
      assert.doesNotThrow(() => enforceRunRateLimit(validUserId));
    }

    // 11th run must throw RATE_LIMIT_EXCEEDED (429)
    assert.throws(
      () => enforceRunRateLimit(validUserId),
      (err) => {
        assert.equal(err.statusCode, 429);
        assert.equal(err.code, 'RATE_LIMIT_EXCEEDED');
        return true;
      }
    );

    // Other user should not be affected
    const anotherUser = '7d6e5f40-0583-4056-cc43-9f1aa5606e05';
    assert.doesNotThrow(() => enforceRunRateLimit(anotherUser));

    resetRunRateLimiter();
  });

  await t.test('Runnable Languages Verification', async () => {
    // Runnable languages must include javascript, python, java, cpp
    assert.deepEqual(RUNNABLE_LANGUAGES.sort(), ['cpp', 'java', 'javascript', 'python'].sort());

    for (const key of RUNNABLE_LANGUAGES) {
      const config = getLanguageByKey(key);
      assert.equal(config.mode, 'run');
      assert.ok(typeof config.judge0Id === 'number');
    }

    // Non-runnable languages must have mode != 'run'
    const nonRunnable = ['html', 'css', 'text'];
    for (const key of nonRunnable) {
      const config = getLanguageByKey(key);
      assert.notEqual(config.mode, 'run');
      assert.equal(config.judge0Id, null);
    }
  });

  await t.test('Judge0 Execution Engine & Real Error Reporting without API key', async () => {
    // 1. Successful execution captures real stdout
    const successResult = await executeCode({
      sourceCode: 'console.log("Hello DevSync");',
      judge0Id: 63, // JavaScript
      stdin: '',
    });
    assert.equal(successResult.status, 'success');
    assert.ok(successResult.stdout.includes('Hello DevSync'));
    assert.equal(successResult.stderr, null);

    // 2. Real Runtime Error is caught and reported
    const runtimeErrorResult = await executeCode({
      sourceCode: 'const x = null; x.someFunction();',
      judge0Id: 63, // JavaScript
      stdin: '',
    });
    assert.equal(runtimeErrorResult.status, 'error');
    assert.ok(runtimeErrorResult.stderr.includes('TypeError') || runtimeErrorResult.stderr.includes('null'));

    // 3. Real Syntax Error is caught and reported
    const syntaxErrorResult = await executeCode({
      sourceCode: 'let a = ;',
      judge0Id: 63, // JavaScript
      stdin: '',
    });
    assert.equal(syntaxErrorResult.status, 'error');
    assert.ok(syntaxErrorResult.stderr.includes('SyntaxError') || syntaxErrorResult.compileOutput !== null);
  });
});
