import { io, type Socket } from 'socket.io-client';
import { getAccessToken, refreshSessionToken } from '../api/client';
import { clientEnv } from '../config/env';
import type { Role } from '../types/devsync';

export type RealtimeConnectionState =
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'offline'
  | 'unavailable';

export interface PresenceParticipant {
  userId: string;
  name: string;
  email?: string;
  avatarColor?: string;
  role: Role;
  activeFileId?: string | null;
}

export interface TreeSocketEvent {
  eventId?: string;
  type: 'node:created' | 'node:renamed' | 'node:moved' | 'node:deleted' | 'file:language';
  projectId: string;
  nodeId: string;
  actorId?: string;
}

export function createWorkspaceSocket(): Socket {
  const url = clientEnv.socketUrl || undefined;
  return io(url, {
    path: '/socket.io',
    withCredentials: true,
    autoConnect: false,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1200,
    reconnectionDelayMax: 8000,
    timeout: 6000,
    transports: ['websocket', 'polling'],
    auth: (cb) => {
      cb({ token: getAccessToken() });
    },
  });
}

export async function refreshSocketAuth(socket: Socket): Promise<boolean> {
  const refreshed = await refreshSessionToken();
  if (!refreshed?.accessToken) {
    return false;
  }
  socket.auth = { token: refreshed.accessToken };
  return true;
}
