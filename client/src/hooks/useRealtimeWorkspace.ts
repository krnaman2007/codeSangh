import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { Socket } from 'socket.io-client';
import { queryKeys } from '../lib/queryClient';
import { useAuth } from '../state/authStore';
import type { Role } from '../types/devsync';
import { MutationEventDeduplicator } from '../realtime/eventDedup';
import {
  createWorkspaceSocket,
  refreshSocketAuth,
  type PresenceParticipant,
  type RealtimeConnectionState,
  type TreeSocketEvent,
} from '../realtime/socketClient';
import { YjsWorkspaceManager } from '../realtime/yjsManager';

interface UseRealtimeWorkspaceOptions {
  projectId: string;
  activeFileId: string | null;
  enabled: boolean;
  onRoleChanged?: (nextRole: Role) => void;
  onAccessRevoked?: () => void;
}

export function useRealtimeWorkspace({
  projectId,
  activeFileId,
  enabled,
  onRoleChanged,
  onAccessRevoked,
}: UseRealtimeWorkspaceOptions) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [connectionState, setConnectionState] = useState<RealtimeConnectionState>('connecting');
  const [participants, setParticipants] = useState<PresenceParticipant[]>([]);
  const [offlineQueuedEdits, setOfflineQueuedEdits] = useState(0);

  const socketRef = useRef<Socket | null>(null);
  const yjsManagerRef = useRef<YjsWorkspaceManager | null>(null);
  const dedupRef = useRef<MutationEventDeduplicator>(new MutationEventDeduplicator());
  const activeFileRef = useRef<string | null>(activeFileId);
  activeFileRef.current = activeFileId;

  if (!yjsManagerRef.current) {
    yjsManagerRef.current = new YjsWorkspaceManager();
  }

  useEffect(() => {
    if (!enabled || !projectId || !user) return;

    const handleOffline = () => {
      setConnectionState('offline');
    };
    const handleOnline = () => {
      if (socketRef.current && !socketRef.current.connected) {
        setConnectionState('reconnecting');
        socketRef.current.connect();
      }
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    const socket = createWorkspaceSocket();
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnectionState('connected');
      setOfflineQueuedEdits(0);
      socket.emit('project:join', { projectId });
      if (activeFileRef.current) {
        socket.emit('file:join', { projectId, fileId: activeFileRef.current });
      }
    });

    socket.on('disconnect', () => {
      setConnectionState(navigator.onLine ? 'reconnecting' : 'offline');
    });

    socket.on('connect_error', async (err) => {
      if (err?.message?.toLowerCase().includes('auth') || err?.message?.includes('401')) {
        const refreshed = await refreshSocketAuth(socket);
        if (refreshed) {
          socket.connect();
          return;
        }
      }
      setConnectionState(navigator.onLine ? 'unavailable' : 'offline');
    });

    socket.io.on('reconnect_attempt', () => {
      setConnectionState('reconnecting');
    });

    socket.io.on('reconnect_failed', () => {
      setConnectionState(navigator.onLine ? 'unavailable' : 'offline');
    });

    socket.on('presence:update', (payload: { participants?: PresenceParticipant[] }) => {
      if (Array.isArray(payload?.participants)) {
        setParticipants(payload.participants);
      }
    });

    socket.on('project:role-changed', (payload: { role?: Role }) => {
      if (payload?.role) {
        onRoleChanged?.(payload.role);
      }
      void qc.invalidateQueries({ queryKey: queryKeys.project(projectId) });
    });

    socket.on('project:access-revoked', () => {
      onAccessRevoked?.();
      socket.disconnect();
    });

    socket.on('tree:event', (ev: TreeSocketEvent) => {
      const dedupKey = ev.eventId || `${ev.type}:${ev.nodeId}`;
      if (dedupRef.current.shouldDeduplicate(dedupKey)) {
        return;
      }
      void qc.invalidateQueries({ queryKey: queryKeys.tree(projectId) });
    });

    socket.on(
      'yjs:sync',
      (payload: { fileId: string; update: ArrayBuffer | number[] }) => {
        if (!payload?.fileId || !payload?.update) return;
        const bytes =
          payload.update instanceof ArrayBuffer
            ? new Uint8Array(payload.update)
            : new Uint8Array(payload.update);
        yjsManagerRef.current?.applyRemoteUpdate(payload.fileId, bytes);
      }
    );

    socket.on(
      'yjs:update',
      (payload: { fileId: string; update: ArrayBuffer | number[] }) => {
        if (!payload?.fileId || !payload?.update) return;
        const bytes =
          payload.update instanceof ArrayBuffer
            ? new Uint8Array(payload.update)
            : new Uint8Array(payload.update);
        yjsManagerRef.current?.applyRemoteUpdate(payload.fileId, bytes);
      }
    );

    socket.on(
      'yjs:awareness',
      (payload: { fileId: string; update: ArrayBuffer | number[] }) => {
        if (!payload?.fileId || !payload?.update) return;
        const bytes =
          payload.update instanceof ArrayBuffer
            ? new Uint8Array(payload.update)
            : new Uint8Array(payload.update);
        yjsManagerRef.current?.applyRemoteAwareness(payload.fileId, bytes);
      }
    );

    setConnectionState(navigator.onLine ? 'connecting' : 'offline');
    if (navigator.onLine) {
      socket.connect();
    }

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
      if (socket.connected) {
        socket.emit('project:leave', { projectId });
      }
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
      yjsManagerRef.current?.destroyAll();
      dedupRef.current.clear();
    };
  }, [enabled, projectId, user?.id, qc]);

  // Join / leave file rooms when activeFileId changes
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !socket.connected || !activeFileId) return;

    socket.emit('file:join', { projectId, fileId: activeFileId });
    return () => {
      if (socket.connected) {
        socket.emit('file:leave', { projectId, fileId: activeFileId });
      }
    };
  }, [projectId, activeFileId]);

  const markLocalTreeMutation = useCallback((type: TreeSocketEvent['type'], nodeId: string) => {
    dedupRef.current.markLocal(`${type}:${nodeId}`);
  }, []);

  const recordOfflineEdit = useCallback(() => {
    setOfflineQueuedEdits((n) => n + 1);
  }, []);

  const clearOfflineEdits = useCallback(() => {
    setOfflineQueuedEdits(0);
  }, []);

  const reconnectNow = useCallback(() => {
    const socket = socketRef.current;
    if (!socket) return;
    setConnectionState('reconnecting');
    socket.connect();
  }, []);

  return {
    socketRef,
    yjsManager: yjsManagerRef.current,
    connectionState,
    participants,
    offlineQueuedEdits,
    markLocalTreeMutation,
    recordOfflineEdit,
    clearOfflineEdits,
    reconnectNow,
  };
}
