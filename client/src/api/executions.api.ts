import { apiClient } from './client';
import type { ApiExecutionRecord } from './types';

export const executionsApi = {
  runFile: (
    projectId: string,
    fileId: string,
    input: { stdin?: string; content?: string }
  ) =>
    apiClient.post<{ execution: ApiExecutionRecord }>(
      `/projects/${projectId}/files/${fileId}/run`,
      input
    ),

  list: (
    projectId: string,
    params: { limit?: number; offset?: number } = {},
    signal?: AbortSignal
  ) =>
    apiClient.get<{ total: number; executions: ApiExecutionRecord[] }>(
      `/projects/${projectId}/executions`,
      {
        query: {
          limit: params.limit ?? 20,
          offset: params.offset ?? 0,
        },
        signal,
      }
    ),

  getById: (projectId: string, executionId: string, signal?: AbortSignal) =>
    apiClient.get<{ execution: ApiExecutionRecord }>(
      `/projects/${projectId}/executions/${executionId}`,
      { signal }
    ),

  clearAll: (projectId: string) =>
    apiClient.delete<void>(`/projects/${projectId}/executions`),
};
