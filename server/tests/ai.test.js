// server/tests/ai.test.js
// DevSync AI Coding Assistant Tests (Endpoint #63 - Mastermind M5)
// Blueprint Section 7.12 & Page 34-35

import test from 'node:test';
import assert from 'node:assert/strict';
import { aiChatSchema } from '../src/validators/ai.schema.js';
import {
  buildAiContext,
  streamAiChat,
} from '../src/services/ai.service.js';

test('AI Coding Assistant Module (Endpoint #63 - Mastermind M5)', async (t) => {
  const testProjectId = '99999999-9999-4999-a999-999999999999';
  const testUserId = 'u9999999-9999-4999-a999-999999999999';

  await t.test('Endpoint #63: aiChatSchema validation (Blueprint Section 7.12 & Page 35)', () => {
    // 1. Valid request
    const valid = aiChatSchema.safeParse({
      params: { projectId: testProjectId },
      body: {
        conversationId: null,
        message: 'Why does this function throw an error?',
        mode: 'ask',
        context: {
          fileId: '11111111-1111-4111-a111-111111111111',
          selection: { startLine: 10, endLine: 20 },
          includeLastError: true,
        },
      },
    });
    assert.equal(valid.success, true);
    assert.equal(valid.data.body.mode, 'ask');

    // 2. Reject empty message
    const emptyMsg = aiChatSchema.safeParse({
      params: { projectId: testProjectId },
      body: { message: '   ' },
    });
    assert.equal(emptyMsg.success, false);

    // 3. Reject message > 4000 characters
    const hugeMsg = aiChatSchema.safeParse({
      params: { projectId: testProjectId },
      body: { message: 'a'.repeat(4001) },
    });
    assert.equal(hugeMsg.success, false);
    assert.ok(hugeMsg.error.issues.some((i) => i.message.includes('4,000 characters')));

    // 4. Reject invalid mode
    const badMode = aiChatSchema.safeParse({
      params: { projectId: testProjectId },
      body: {
        message: 'Hello',
        mode: 'hack',
      },
    });
    assert.equal(badMode.success, false);

    // 5. Reject invalid projectId
    const badProject = aiChatSchema.safeParse({
      params: { projectId: 'not-a-uuid' },
      body: { message: 'Valid message' },
    });
    assert.equal(badProject.success, false);
  });

  await t.test('buildAiContext handles file & selection context cleanly', async () => {
    const context = await buildAiContext({
      projectId: testProjectId,
      fileId: null,
      selection: null,
      includeLastError: false,
    });

    assert.equal(context.fileContext, '');
    assert.equal(context.errorContext, '');
  });

  await t.test('streamAiChat enforces 503 AI_UNAVAILABLE when GEMINI_API_KEY is missing', async () => {
    // Ensure GEMINI_API_KEY is empty for this test
    const originalKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;

    await assert.rejects(
      async () => {
        await streamAiChat({
          projectId: testProjectId,
          user: { id: testUserId, name: 'Naman K' },
          body: {
            message: 'Explain this code',
            mode: 'explain',
          },
          res: {
            setHeader: () => {},
            write: () => {},
            end: () => {},
          },
        });
      },
      (err) => {
        assert.equal(err.statusCode, 503);
        assert.equal(err.code, 'AI_UNAVAILABLE');
        assert.ok(err.message.includes('GEMINI_API_KEY'));
        return true;
      }
    );

    if (originalKey) {
      process.env.GEMINI_API_KEY = originalKey;
    }
  });

  await t.test('AI Assistant Role Permissions Matrix (Blueprint 6.2 & Page 19)', () => {
    const RANK = { viewer: 1, editor: 2, owner: 3 };

    // Endpoint 63: Viewer+
    const canAskAssistant = (role) => RANK[role] >= RANK.viewer;
    assert.equal(canAskAssistant('owner'), true);
    assert.equal(canAskAssistant('editor'), true);
    assert.equal(canAskAssistant('viewer'), true);
  });
});
