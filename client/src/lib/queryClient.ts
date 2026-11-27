import { QueryClient } from '@tanstack/react-query';
import { ApiClientError } from '../api/errors';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        if (error instanceof ApiClientError) {
          if (error.status === 401 || error.status === 403 || error.status === 404 || error.status === 422) {
            return false;
          }
        }
        return failureCount < 1;
      },
    },
    mutations: {
      retry: false,
    },
  },
});

export const queryKeys = {
  me: ['auth', 'me'] as const,
  languages: ['languages'] as const,
  projects: (search?: string) => ['projects', search ?? ''] as const,
  project: (projectId: string) => ['project', projectId] as const,
  tree: (projectId: string) => ['project', projectId, 'tree'] as const,
  file: (projectId: string, fileId: string) => ['project', projectId, 'file', fileId] as const,
  collaborators: (projectId: string) => ['project', projectId, 'collaborators'] as const,
  executions: (projectId: string, offset = 0, limit = 50) =>
    ['project', projectId, 'executions', offset, limit] as const,
  execution: (projectId: string, executionId: string) =>
    ['project', projectId, 'execution', executionId] as const,
  debugActive: (projectId: string) => ['project', projectId, 'debug', 'active'] as const,
  breakpoints: (projectId: string, fileId: string) =>
    ['project', projectId, 'file', fileId, 'breakpoints'] as const,
  gitInfo: (projectId: string) => ['project', projectId, 'git'] as const,
  gitStatus: (projectId: string) => ['project', projectId, 'git', 'status'] as const,
};
