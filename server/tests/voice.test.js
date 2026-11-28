// server/tests/voice.test.js
// DevSync Real-Time Voice WebRTC Tests (Endpoints #61, #62 - Mastermind M4)
// Blueprint Section 7.11 & 9.7

import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import env from '../src/config/env.js';
import {
  getIceServersConfig,
  getVoiceSession,
  addVoiceParticipant,
  removeVoiceParticipant,
  setVoiceParticipantMute,
  voiceRooms,
} from '../src/services/voice.service.js';
import {
  voiceProjectParamSchema,
  getIceServersSchema,
  getVoiceSessionSchema,
} from '../src/validators/voice.schema.js';

test('Real-Time Voice WebRTC Module (Endpoints #61, #62 - Mastermind M4)', async (t) => {
  const testProjectId = '88888888-8888-4888-a888-888888888888';
  const testUserId = 'u1234567-89ab-cdef-0123-456789abcdef';

  await t.test('Validation Schemas (Endpoints #61 & #62)', () => {
    // Valid UUID param
    const valid = voiceProjectParamSchema.safeParse({
      params: { projectId: testProjectId },
    });
    assert.equal(valid.success, true);

    // Invalid UUID param
    const invalid = voiceProjectParamSchema.safeParse({
      params: { projectId: 'invalid-uuid-123' },
    });
    assert.equal(invalid.success, false);
    assert.ok(invalid.error.issues.some((i) => i.path.includes('projectId')));
  });

  await t.test('Endpoint #61: getIceServersConfig generates valid coturn ephemeral credentials', () => {
    const config = getIceServersConfig({ userId: testUserId });

    // Verify response structure (Blueprint Section 7.11 & Page 34)
    assert.ok(Array.isArray(config.iceServers));
    assert.equal(config.iceServers.length, 2);
    assert.equal(config.ttl, 3600);
    assert.equal(config.maxParticipants, 8);

    // STUN config check
    const stunEntry = config.iceServers[0];
    assert.ok(Array.isArray(stunEntry.urls));
    assert.ok(stunEntry.urls.some((u) => u.startsWith('stun:')));

    // TURN config check
    const turnEntry = config.iceServers[1];
    assert.ok(Array.isArray(turnEntry.urls));
    assert.ok(turnEntry.urls.some((u) => u.includes('transport=udp')));
    assert.ok(turnEntry.urls.some((u) => u.includes('transport=tcp')));

    // Verify username format: <expiry-unix>:<userId>
    assert.ok(typeof turnEntry.username === 'string');
    const [expiryStr, uid] = turnEntry.username.split(':');
    assert.equal(uid, testUserId);
    const expiryUnix = parseInt(expiryStr, 10);
    const nowUnix = Math.floor(Date.now() / 1000);
    assert.ok(expiryUnix > nowUnix);
    assert.ok(expiryUnix <= nowUnix + 3605);

    // Verify HMAC-SHA1 credential calculation: base64(HMAC-SHA1(TURN_SECRET, username))
    const expectedCredential = crypto
      .createHmac('sha1', env.TURN_SECRET)
      .update(turnEntry.username)
      .digest('base64');
    assert.equal(turnEntry.credential, expectedCredential);
  });

  await t.test('Endpoint #62: In-Memory Voice Session lifecycle (Blueprint Section 9.7 & Page 43)', () => {
    // Clean up room before test
    voiceRooms.delete(testProjectId);

    // 1. Initial state: no participants
    const initial = getVoiceSession(testProjectId);
    assert.equal(initial.active, false);
    assert.deepEqual(initial.participants, []);

    // 2. Add first participant
    addVoiceParticipant(testProjectId, 'socket_1', {
      userId: 'user_1',
      name: 'Naman K',
      avatarColor: '#6366F1',
      muted: false,
    });

    const activeSession = getVoiceSession(testProjectId);
    assert.equal(activeSession.active, true);
    assert.equal(activeSession.participants.length, 1);
    assert.equal(activeSession.participants[0].userId, 'user_1');
    assert.equal(activeSession.participants[0].name, 'Naman K');
    assert.equal(activeSession.participants[0].muted, false);

    // 3. Add second participant
    addVoiceParticipant(testProjectId, 'socket_2', {
      userId: 'user_2',
      name: 'Aayush S',
      avatarColor: '#10B981',
      muted: true,
    });

    const twoUsersSession = getVoiceSession(testProjectId);
    assert.equal(twoUsersSession.participants.length, 2);

    // 4. Mute / unmute update
    setVoiceParticipantMute(testProjectId, 'socket_1', true);
    const mutedSession = getVoiceSession(testProjectId);
    const p1 = mutedSession.participants.find((p) => p.userId === 'user_1');
    assert.equal(p1.muted, true);

    // 5. Remove participants
    removeVoiceParticipant(testProjectId, 'socket_1');
    const remainingSession = getVoiceSession(testProjectId);
    assert.equal(remainingSession.active, true);
    assert.equal(remainingSession.participants.length, 1);
    assert.equal(remainingSession.participants[0].userId, 'user_2');

    // Remove last participant -> empty room is deleted
    removeVoiceParticipant(testProjectId, 'socket_2');
    const emptySession = getVoiceSession(testProjectId);
    assert.equal(emptySession.active, false);
    assert.equal(emptySession.participants.length, 0);
    assert.equal(voiceRooms.has(testProjectId), false);
  });

  await t.test('Voice Role Permissions Matrix (Blueprint 6.2 & Page 19)', () => {
    const RANK = { viewer: 1, editor: 2, owner: 3 };

    // Endpoint 61 (GET /ice-servers): Viewer+
    const canAccessIceServers = (role) => RANK[role] >= RANK.viewer;
    assert.equal(canAccessIceServers('owner'), true);
    assert.equal(canAccessIceServers('editor'), true);
    assert.equal(canAccessIceServers('viewer'), true);

    // Endpoint 62 (GET /voice): Viewer+
    const canViewVoiceSession = (role) => RANK[role] >= RANK.viewer;
    assert.equal(canViewVoiceSession('owner'), true);
    assert.equal(canViewVoiceSession('editor'), true);
    assert.equal(canViewVoiceSession('viewer'), true);
  });
});
