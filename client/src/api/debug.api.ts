import { apiClient } from './client';

export interface DebugBreakpoint {
  line: number;
  condition?: string | null;
  verified?: boolean;
}

export interface DebugStackFrame {
  id: number;
  name: string;
  file: string;
  line: number;
  column: number;
}

export interface ApiDebugSession {
  id: string;
  projectId: string;
  fileId: string;
  startedById: string;
  language: string;
  debugAdapter: string;
  status: 'active' | 'stopped';
  breakpoints: DebugBreakpoint[];
  currentLine: number;
  variables: Record<string, unknown>;
  callStack: DebugStackFrame[];
  startedAt: string;
  startedBy?: {
    id: string;
    name: string;
    email: string;
    avatarColor?: string;
  };
  file?: {
    id: string;
    name: string;
    language: string;
  };
}

export const debugApi = {
  startSession: (
    projectId: string,
    fileId: string,
    breakpoints: Array<number | { line: number; condition?: string }> = []
  ) =>
    apiClient.post<{ session: ApiDebugSession }>(
      `/projects/${projectId}/files/${fileId}/debug`,
      { breakpoints }
    ),

  getActiveSession: (projectId: string, signal?: AbortSignal) =>
    apiClient.get<{ session: ApiDebugSession | null }>(
      `/projects/${projectId}/debug/sessions/active`,
      { signal }
    ),

  stopSession: (projectId: string, sessionId: string) =>
    apiClient.delete<void>(`/projects/${projectId}/debug/sessions/${sessionId}`),

  getBreakpoints: (projectId: string, fileId: string, signal?: AbortSignal) =>
    apiClient.get<{ breakpoints: DebugBreakpoint[] }>(
      `/projects/${projectId}/files/${fileId}/breakpoints`,
      { signal }
    ),

  replaceBreakpoints: (
    projectId: string,
    fileId: string,
    breakpoints: Array<number | { line: number; condition?: string }>
  ) =>
    apiClient.put<{ breakpoints: DebugBreakpoint[] }>(
      `/projects/${projectId}/files/${fileId}/breakpoints`,
      { breakpoints }
    ),
};
