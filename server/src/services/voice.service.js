// server/src/services/voice.service.js
// DevSync Real-Time Voice WebRTC Service (Endpoints #61, #62 - Mastermind M4)
// Blueprint Section 7.11 & Section 9.7

import crypto from 'node:crypto';
import env from '../config/env.js';

/**
 * In-memory map of active project voice sessions (Blueprint Section 9.7)
 * voiceRooms: Map<projectId, Map<socketId, { userId, name, avatarColor, muted, joinedAt }>>
 */
export const voiceRooms = new Map();

/**
 * Generates STUN/TURN ICE server configuration with coturn REST credentials
 * (Endpoint #61 - Mastermind M4)
 * Blueprint Section 7.11 & Page 34
 */
export function getIceServersConfig({ userId }) {
  const ttl = env.TURN_CREDENTIAL_TTL_SEC || 3600;
  const expiryUnix = Math.floor(Date.now() / 1000) + ttl;
  const username = `${expiryUnix}:${userId}`;

  // Generate HMAC-SHA1 credential according to coturn REST API scheme
  const credential = crypto
    .createHmac('sha1', env.TURN_SECRET)
    .update(username)
    .digest('base64');

  // Format STUN urls
  const stunUrls = (env.STUN_URLS || 'stun:stun.l.google.com:19302')
    .split(',')
    .map((u) => u.trim())
    .filter(Boolean);

  // Format TURN urls with udp & tcp transports
  const turnBase = env.TURN_URL || 'turn:turn.example.com:3478';
  const turnUrls = [
    `${turnBase}${turnBase.includes('?') ? '&' : '?'}transport=udp`,
    `${turnBase}${turnBase.includes('?') ? '&' : '?'}transport=tcp`,
  ];

  return {
    iceServers: [
      { urls: stunUrls },
      {
        urls: turnUrls,
        username,
        credential,
      },
    ],
    ttl,
    maxParticipants: env.VOICE_MAX_PARTICIPANTS || 8,
  };
}

/**
 * Retrieves the current voice session participants for a project
 * (Endpoint #62 - Mastermind M4)
 * Blueprint Section 7.11 & Page 34
 */
export function getVoiceSession(projectId) {
  const room = voiceRooms.get(projectId);

  if (!room || room.size === 0) {
    return {
      active: false,
      participants: [],
    };
  }

  // Deduplicate by userId if user has multiple sockets open
  const userMap = new Map();
  for (const participant of room.values()) {
    if (!userMap.has(participant.userId)) {
      userMap.set(participant.userId, {
        userId: participant.userId,
        name: participant.name,
        avatarColor: participant.avatarColor,
        muted: Boolean(participant.muted),
      });
    }
  }

  const participants = Array.from(userMap.values());

  return {
    active: participants.length > 0,
    participants,
  };
}

/**
 * Helper to add a participant to a project voice room (called by Socket.IO voice signalling)
 */
export function addVoiceParticipant(projectId, socketId, { userId, name, avatarColor, muted = false }) {
  if (!voiceRooms.has(projectId)) {
    voiceRooms.set(projectId, new Map());
  }

  const room = voiceRooms.get(projectId);
  room.set(socketId, {
    userId,
    name,
    avatarColor,
    muted,
    joinedAt: new Date().toISOString(),
  });

  return getVoiceSession(projectId);
}

/**
 * Helper to remove a participant from a project voice room
 */
export function removeVoiceParticipant(projectId, socketId) {
  const room = voiceRooms.get(projectId);
  if (!room) return { active: false, participants: [] };

  room.delete(socketId);
  if (room.size === 0) {
    voiceRooms.delete(projectId);
  }

  return getVoiceSession(projectId);
}

/**
 * Helper to update mute status of a participant
 */
export function setVoiceParticipantMute(projectId, socketId, muted) {
  const room = voiceRooms.get(projectId);
  if (room && room.has(socketId)) {
    const participant = room.get(socketId);
    participant.muted = Boolean(muted);
  }

  return getVoiceSession(projectId);
}
