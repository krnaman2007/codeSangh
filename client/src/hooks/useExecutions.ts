import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { executionsApi } from '../api/executions.api';
import { queryKeys } from '../lib/queryClient';

export function useExecutionsQuery(
  projectId: string | undefined,
  offset = 0,
  limit = 20
) {
  return useQuery({
    queryKey: queryKeys.executions(projectId ?? '', offset, limit),
    queryFn: ({ signal }) => executionsApi.list(projectId!, { limit, offset }, signal),
    enabled: Boolean(projectId),
  });
}

export function useExecutionDetailQuery(
  projectId: string | undefined,
  executionId: string | null
) {
  return useQuery({
    queryKey: queryKeys.execution(projectId ?? '', executionId ?? ''),
    queryFn: ({ signal }) => executionsApi.getById(projectId!, executionId!, signal),
    enabled: Boolean(projectId && executionId),
  });
}

export function useRunFileMutation(projectId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({
      fileId,
      stdin,
      content,
    }: {
      fileId: string;
      stdin?: string;
      content?: string;
    }) => executionsApi.runFile(projectId, fileId, { stdin, content }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['project', projectId, 'executions'] });
    },
  });
}

export function useClearExecutionsMutation(projectId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: () => executionsApi.clearAll(projectId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['project', projectId, 'executions'] });
    },
  });
}
