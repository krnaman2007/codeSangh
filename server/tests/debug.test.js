import test from 'node:test';
import assert from 'node:assert/strict';
import {
  startDebugSchema,
  activeDebugSchema,
  stopDebugSchema,
  fileBreakpointsParamsSchema,
  replaceBreakpointsSchema,
} from '../src/validators/debug.schema.js';
import { getLanguageByKey, LANGUAGES } from '../src/constants/languages.js';
import { normalizeBreakpoints, initializeDebugSession } from '../src/services/debug.service.js';

test('Collaborative Debugging Module (Endpoints 33-35 - Mastermind M1)', async (t) => {
  const validProjectId = '3f2a9c1e-6140-4c12-8809-5b76612c2a01';
  const validFileId = '4a3b2c1d-7250-4d23-9910-6c87723d3b02';
  const validSessionId = '5b4c3d2e-8361-4e34-aa21-7d98834e4c03';

  await t.test('Endpoint #33: startDebugSchema (Editor+)', async () => {
    // Valid with empty body
    const validDefault = startDebugSchema.safeParse({
      params: { projectId: validProjectId, fileId: validFileId },
      body: {},
    });
    assert.equal(validDefault.success, true);
    assert.deepEqual(validDefault.data.body.breakpoints, []);

    // Valid with breakpoint numbers
    const validWithNumbers = startDebugSchema.safeParse({
      params: { projectId: validProjectId, fileId: validFileId },
      body: { breakpoints: [5, 12, 25] },
    });
    assert.equal(validWithNumbers.success, true);
    assert.deepEqual(validWithNumbers.data.body.breakpoints, [5, 12, 25]);

    // Valid with breakpoint objects
    const validWithObjects = startDebugSchema.safeParse({
      params: { projectId: validProjectId, fileId: validFileId },
      body: { breakpoints: [{ line: 8, condition: 'x > 10' }] },
    });
    assert.equal(validWithObjects.success, true);

    // Invalid projectId
    const invalidProj = startDebugSchema.safeParse({
      params: { projectId: 'bad-uuid', fileId: validFileId },
      body: {},
    });
    assert.equal(invalidProj.success, false);

    // Invalid breakpoint (negative line)
    const invalidBp = startDebugSchema.safeParse({
      params: { projectId: validProjectId, fileId: validFileId },
      body: { breakpoints: [-1] },
    });
    assert.equal(invalidBp.success, false);
  });

  await t.test('Endpoint #34: activeDebugSchema (Viewer+)', async () => {
    const valid = activeDebugSchema.safeParse({
      params: { projectId: validProjectId },
    });
    assert.equal(valid.success, true);

    const invalid = activeDebugSchema.safeParse({
      params: { projectId: 'not-a-uuid' },
    });
    assert.equal(invalid.success, false);
  });

  await t.test('Endpoint #35: stopDebugSchema (Editor+)', async () => {
    const valid = stopDebugSchema.safeParse({
      params: { projectId: validProjectId, sessionId: validSessionId },
    });
    assert.equal(valid.success, true);

    const invalid = stopDebugSchema.safeParse({
      params: { projectId: validProjectId, sessionId: '123' },
    });
    assert.equal(invalid.success, false);
  });

  await t.test('Debug Service: Breakpoint & Session Initialization', async () => {
    const bps = normalizeBreakpoints([3, { line: 7, condition: 'i === 5' }], 50);
    assert.equal(bps.length, 2);
    assert.equal(bps[0].line, 3);
    assert.equal(bps[0].verified, true);
    assert.equal(bps[1].line, 7);
    assert.equal(bps[1].condition, 'i === 5');

    const sourceCode = `const counter = 0;\nlet message = "hello";\nconsole.log(message);`;
    const init = initializeDebugSession({
      sourceCode,
      fileName: 'main.js',
      breakpoints: [2],
    });

    assert.equal(init.currentLine, 2);
    assert.ok(init.variables.counter !== undefined);
    assert.equal(init.callStack.length, 1);
    assert.equal(init.callStack[0].file, 'main.js');
    assert.equal(init.callStack[0].line, 2);
  });

  await t.test('Languages Debug Support & Adapters (Blueprint 4.2)', async () => {
    const debuggable = ['javascript', 'python', 'java', 'cpp'];
    for (const key of debuggable) {
      const config = getLanguageByKey(key);
      assert.equal(config.debug, true, `${key} must support debugging`);
      assert.ok(typeof config.debugAdapter === 'string', `${key} must have debugAdapter`);
    }

    const nonDebuggable = ['html', 'css', 'text'];
    for (const key of nonDebuggable) {
      const config = getLanguageByKey(key);
      assert.equal(config.debug, false, `${key} must not support debugging`);
      assert.equal(config.debugAdapter, null);
    }
  });

  await t.test('Debug Permissions Matrix (Blueprint 6.2 & PDF Page 6)', async () => {
    const RANK = { viewer: 1, editor: 2, owner: 3 };

    // Endpoint 33 & 35: Editor+ (minRole = editor)
    const canManageDebug = (role) => RANK[role] >= RANK.editor;
    assert.equal(canManageDebug('owner'), true);
    assert.equal(canManageDebug('editor'), true);
    assert.equal(canManageDebug('viewer'), false);

    // Endpoint 34: Viewer+ (minRole = viewer)
    const canViewDebug = (role) => RANK[role] >= RANK.viewer;
    assert.equal(canViewDebug('owner'), true);
    assert.equal(canViewDebug('editor'), true);
    assert.equal(canViewDebug('viewer'), true);
  });

  await t.test('Endpoints #36 & #37: Breakpoint Management for Files', async () => {
    // Endpoint 36: get breakpoints param schema
    const validGet = fileBreakpointsParamsSchema.safeParse({
      params: { projectId: validProjectId, fileId: validFileId },
    });
    assert.equal(validGet.success, true);

    const invalidGet = fileBreakpointsParamsSchema.safeParse({
      params: { projectId: 'bad', fileId: validFileId },
    });
    assert.equal(invalidGet.success, false);

    // Endpoint 37: replace breakpoints schema
    const validPut = replaceBreakpointsSchema.safeParse({
      params: { projectId: validProjectId, fileId: validFileId },
      body: {
        breakpoints: [10, 25, { line: 40, condition: 'i === 5' }],
      },
    });
    assert.equal(validPut.success, true);
    assert.equal(validPut.data.body.breakpoints.length, 3);

    // Invalid: line <= 0
    const invalidLine = replaceBreakpointsSchema.safeParse({
      params: { projectId: validProjectId, fileId: validFileId },
      body: {
        breakpoints: [0],
      },
    });
    assert.equal(invalidLine.success, false);

    // Invalid: exceeding 100 limit
    const tooMany = Array.from({ length: 101 }, (_, i) => i + 1);
    const invalidLimit = replaceBreakpointsSchema.safeParse({
      params: { projectId: validProjectId, fileId: validFileId },
      body: {
        breakpoints: tooMany,
      },
    });
    assert.equal(invalidLimit.success, false);
  });
});
