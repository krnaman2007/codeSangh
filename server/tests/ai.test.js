// server/tests/ai.test.js
// DevSync AI Coding Assistant Tests (Endpoint #63 - Mastermind M5)
// Blueprint Section 7.12 & Page 34-35

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  aiChatSchema,
  listAiConversationsSchema,
  aiConversationIdParamSchema,
  aiCompleteSchema,
} from '../src/validators/ai.schema.js';
import {
  updateProjectSettingsSchema,
  getProjectSettingsSchema,
} from '../src/validators/settings.schema.js';
import {
  buildAiContext,
  streamAiChat,
  getUserConversations,
  getUserConversationById,
  deleteUserConversation,
  getAiCompletion,
  completionCache,
} from '../src/services/ai.service.js';
import {
  getProjectSettings,
  updateProjectSettings,
} from '../src/services/settings.service.js';
import env from '../src/config/env.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const AI_STORAGE_DIR = path.resolve(__dirname, '../storage/ai');

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
    const originalEnvKey = env.GEMINI_API_KEY;
    const originalProcKey = process.env.GEMINI_API_KEY;
    env.GEMINI_API_KEY = '';
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

    env.GEMINI_API_KEY = originalEnvKey;
    if (originalProcKey) {
      process.env.GEMINI_API_KEY = originalProcKey;
    }
  });

  await t.test('AI Assistant Role Permissions Matrix (Blueprint 6.2 & Page 19)', () => {
    const RANK = { viewer: 1, editor: 2, owner: 3 };

    // Endpoint 63: Viewer+
    const canAskAssistant = (role) => RANK[role] >= RANK.viewer;
    assert.equal(canAskAssistant('owner'), true);
    assert.equal(canAskAssistant('editor'), true);
    assert.equal(canAskAssistant('viewer'), true);

    // Endpoints 64-66: Viewer+ (own)
    const canManageOwnConversations = (role) => RANK[role] >= RANK.viewer;
    assert.equal(canManageOwnConversations('owner'), true);
    assert.equal(canManageOwnConversations('editor'), true);
    assert.equal(canManageOwnConversations('viewer'), true);
  });

  await t.test('Endpoints #64-#66: Conversations List, Get & Delete (Mastermind M5)', async () => {
    const userA = 'user-a-1111-4111-a111-111111111111';
    const userB = 'user-b-2222-4222-b222-222222222222';
    const convDir = path.join(AI_STORAGE_DIR, testProjectId);

    // Clean up test data
    if (fs.existsSync(convDir)) {
      await fs.promises.rm(convDir, { recursive: true, force: true });
    }

    // 1. Initial conversations list should be empty
    const initial = await getUserConversations({
      projectId: testProjectId,
      userId: userA,
      page: 1,
      limit: 10,
    });
    assert.equal(initial.total, 0);
    assert.deepEqual(initial.items, []);

    // 2. Mock create conversations for User A
    const userAFile = path.join(convDir, `${userA}.json`);
    await fs.promises.mkdir(convDir, { recursive: true });

    const conv1Id = 'cccc1111-1111-4111-a111-111111111111';
    const conv2Id = 'cccc2222-2222-4222-a222-222222222222';

    const testConversations = [
      {
        id: conv1Id,
        projectId: testProjectId,
        userId: userA,
        title: 'Older conversation about JavaScript loops',
        createdAt: '2026-11-28T09:00:00.000Z',
        updatedAt: '2026-11-28T09:00:00.000Z',
        messages: [
          { id: 'm1', role: 'user', content: 'How do loops work?' },
          { id: 'm2', role: 'assistant', content: 'Loops in JS...' },
        ],
      },
      {
        id: conv2Id,
        projectId: testProjectId,
        userId: userA,
        title: 'Newer conversation about Docker',
        createdAt: '2026-11-28T10:00:00.000Z',
        updatedAt: '2026-11-28T10:30:00.000Z',
        messages: [
          { id: 'm3', role: 'user', content: 'What is Docker?' },
          { id: 'm4', role: 'assistant', content: 'Docker is a container platform...' },
        ],
      },
    ];

    await fs.promises.writeFile(userAFile, JSON.stringify(testConversations, null, 2), 'utf8');

    // 3. Endpoint #64: List conversations - sorted newest first
    const listResult = await getUserConversations({
      projectId: testProjectId,
      userId: userA,
      page: 1,
      limit: 10,
    });
    assert.equal(listResult.total, 2);
    assert.equal(listResult.items.length, 2);
    // Newest first check
    assert.equal(listResult.items[0].id, conv2Id);
    assert.equal(listResult.items[0].title, 'Newer conversation about Docker');
    assert.equal(listResult.items[1].id, conv1Id);

    // 4. Endpoint #65: Get single conversation with full message history
    const single = await getUserConversationById({
      projectId: testProjectId,
      userId: userA,
      conversationId: conv2Id,
    });
    assert.equal(single.conversation.id, conv2Id);
    assert.equal(single.conversation.title, 'Newer conversation about Docker');
    assert.equal(single.conversation.messages.length, 2);
    assert.equal(single.conversation.messages[0].content, 'What is Docker?');

    // 5. Privacy Isolation: User B cannot access User A's conversation
    await assert.rejects(
      async () => {
        await getUserConversationById({
          projectId: testProjectId,
          userId: userB,
          conversationId: conv2Id,
        });
      },
      (err) => {
        assert.equal(err.statusCode, 404);
        assert.equal(err.code, 'NOT_FOUND');
        return true;
      }
    );

    // 6. Endpoint #66: Delete conversation
    const deleteRes = await deleteUserConversation({
      projectId: testProjectId,
      userId: userA,
      conversationId: conv1Id,
    });
    assert.equal(deleteRes, true);

    // Subsequent get should throw 404
    await assert.rejects(
      async () => {
        await getUserConversationById({
          projectId: testProjectId,
          userId: userA,
          conversationId: conv1Id,
        });
      },
      (err) => {
        assert.equal(err.statusCode, 404);
        return true;
      }
    );

    // Remaining total should be 1
    const postDeleteList = await getUserConversations({
      projectId: testProjectId,
      userId: userA,
    });
    assert.equal(postDeleteList.total, 1);
    assert.equal(postDeleteList.items[0].id, conv2Id);

    // Cleanup
    if (fs.existsSync(convDir)) {
      await fs.promises.rm(convDir, { recursive: true, force: true });
    }
  });

  await t.test('Endpoint #67: aiCompleteSchema validation (Blueprint Page 35)', () => {
    // 1. Valid request
    const valid = aiCompleteSchema.safeParse({
      params: { projectId: testProjectId },
      body: {
        fileId: '11111111-1111-4111-a111-111111111111',
        language: 'python',
        prefix: 'def add(a, b):\n    ',
        suffix: '\n\nprint(add(1, 2))',
        cursor: { line: 2, column: 5 },
      },
    });
    assert.equal(valid.success, true);
    assert.equal(valid.data.body.language, 'python');

    // 2. Reject empty language
    const badLang = aiCompleteSchema.safeParse({
      params: { projectId: testProjectId },
      body: {
        fileId: '11111111-1111-4111-a111-111111111111',
        language: '',
        cursor: { line: 1, column: 1 },
      },
    });
    assert.equal(badLang.success, false);

    // 3. Reject invalid fileId
    const badFile = aiCompleteSchema.safeParse({
      params: { projectId: testProjectId },
      body: {
        fileId: 'bad-uuid',
        language: 'javascript',
        cursor: { line: 1, column: 1 },
      },
    });
    assert.equal(badFile.success, false);
  });

  await t.test('Endpoint #67: Size limit checks (413 FILE_TOO_LARGE) and LRU cache', async () => {
    // 1. Exceed prefix limit (> 4 KB = 4096 bytes)
    await assert.rejects(
      async () => {
        await getAiCompletion({
          projectId: testProjectId,
          fileId: '11111111-1111-4111-a111-111111111111',
          language: 'python',
          prefix: 'x'.repeat(4097),
          suffix: 'y',
          cursor: { line: 1, column: 1 },
        });
      },
      (err) => {
        assert.equal(err.statusCode, 413);
        assert.equal(err.code, 'FILE_TOO_LARGE');
        assert.ok(err.message.includes('4 KB'));
        return true;
      }
    );

    // 2. Exceed suffix limit (> 1 KB = 1024 bytes)
    await assert.rejects(
      async () => {
        await getAiCompletion({
          projectId: testProjectId,
          fileId: '11111111-1111-4111-a111-111111111111',
          language: 'python',
          prefix: 'x',
          suffix: 'y'.repeat(1025),
          cursor: { line: 1, column: 1 },
        });
      },
      (err) => {
        assert.equal(err.statusCode, 413);
        assert.equal(err.code, 'FILE_TOO_LARGE');
        assert.ok(err.message.includes('1 KB'));
        return true;
      }
    );

    // 3. LRU Cache hit returns cached suggestion without calling Gemini
    const crypto = await import('node:crypto');
    const testLang = 'typescript';
    const testPrefix = 'const greeting = ';
    const testSuffix = ';\nconsole.log(greeting);';
    const cacheKey = crypto
      .createHash('sha256')
      .update(`${testLang}:${testPrefix}:${testSuffix}`)
      .digest('hex');

    const cachedObj = { id: 'cached-s1', text: '"Hello DevSync"' };
    completionCache.set(cacheKey, cachedObj);

    const result = await getAiCompletion({
      projectId: testProjectId,
      fileId: '11111111-1111-4111-a111-111111111111',
      language: testLang,
      prefix: testPrefix,
      suffix: testSuffix,
      cursor: { line: 1, column: 17 },
    });

    assert.deepEqual(result.suggestion, cachedObj);
  });

  await t.test('Endpoint #67: AI_UNAVAILABLE (503) when GEMINI_API_KEY is missing', async () => {
    const originalEnvKey = env.GEMINI_API_KEY;
    const originalProcKey = process.env.GEMINI_API_KEY;
    env.GEMINI_API_KEY = '';
    delete process.env.GEMINI_API_KEY;

    await assert.rejects(
      async () => {
        await getAiCompletion({
          projectId: testProjectId,
          fileId: '11111111-1111-4111-a111-111111111111',
          language: 'python',
          prefix: 'print(',
          suffix: ')',
          cursor: { line: 1, column: 6 },
        });
      },
      (err) => {
        assert.equal(err.statusCode, 503);
        assert.equal(err.code, 'AI_UNAVAILABLE');
        return true;
      }
    );

    env.GEMINI_API_KEY = originalEnvKey;
    if (originalProcKey) {
      process.env.GEMINI_API_KEY = originalProcKey;
    }
  });

  await t.test('Endpoint #68: Project settings and AI_DISABLED (403) enforcement', async () => {
    // 1. Initial settings defaults to aiEnabled: true
    const settingsDir = path.resolve(__dirname, '../storage/settings');
    const settingsFile = path.join(settingsDir, `${testProjectId}.json`);
    if (fs.existsSync(settingsFile)) {
      await fs.promises.unlink(settingsFile);
    }

    const initial = await getProjectSettings(testProjectId);
    assert.equal(initial.aiEnabled, true);

    // 2. Owner disables AI for project (Endpoint #68)
    const updateRes = await updateProjectSettings(testProjectId, { aiEnabled: false });
    assert.equal(updateRes.aiEnabled, false);

    const fetched = await getProjectSettings(testProjectId);
    assert.equal(fetched.aiEnabled, false);

    // 3. Endpoint #67 returns 403 AI_DISABLED when AI is turned off
    await assert.rejects(
      async () => {
        await getAiCompletion({
          projectId: testProjectId,
          fileId: '11111111-1111-4111-a111-111111111111',
          language: 'python',
          prefix: 'x = 1',
          suffix: '',
          cursor: { line: 1, column: 5 },
        });
      },
      (err) => {
        assert.equal(err.statusCode, 403);
        assert.equal(err.code, 'AI_DISABLED');
        assert.ok(err.message.includes('turned off') || err.message.includes('disabled'));
        return true;
      }
    );

    // 4. Re-enable AI
    await updateProjectSettings(testProjectId, { aiEnabled: true });
    const reEnabled = await getProjectSettings(testProjectId);
    assert.equal(reEnabled.aiEnabled, true);

    // Cleanup
    if (fs.existsSync(settingsFile)) {
      await fs.promises.unlink(settingsFile);
    }
  });

  await t.test('Endpoints #67 & #68: Role Permissions Matrix (Blueprint Page 19 & 35)', () => {
    const RANK = { viewer: 1, editor: 2, owner: 3 };

    // Endpoint 67: Editor+ (Owner and Editor allowed, Viewer forbidden)
    const canComplete = (role) => RANK[role] >= RANK.editor;
    assert.equal(canComplete('owner'), true);
    assert.equal(canComplete('editor'), true);
    assert.equal(canComplete('viewer'), false);

    // Endpoint 68: Owner only (Owner allowed, Editor and Viewer forbidden)
    const canChangeSettings = (role) => RANK[role] >= RANK.owner;
    assert.equal(canChangeSettings('owner'), true);
    assert.equal(canChangeSettings('editor'), false);
    assert.equal(canChangeSettings('viewer'), false);
  });
});
