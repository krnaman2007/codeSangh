import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { collaboratorsApi } from '../api/collaborators.api';
import { queryKeys } from '../lib/queryClient';

export function useCollaboratorsQuery(projectId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: queryKeys.collaborators(projectId ?? ''),
    queryFn: ({ signal }) => collaboratorsApi.list(projectId!, signal),
    enabled: Boolean(projectId) && enabled,
  });
}

export function useUserSearchQuery(
  projectId: string | undefined,
  query: string,
  enabled: boolean
) {
  const trimmed = query.trim();
  return useQuery({
    queryKey: ['users', 'search', projectId ?? '', trimmed],
    queryFn: ({ signal }) => collaboratorsApi.searchUsers(trimmed, projectId!, signal),
    enabled: Boolean(projectId) && enabled && trimmed.length >= 3,
    staleTime: 10_000,
  });
}

export function useCollaboratorMutations(projectId: string) {
  const qc = useQueryClient();

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: queryKeys.collaborators(projectId) });
    void qc.invalidateQueries({ queryKey: queryKeys.project(projectId) });
    void qc.invalidateQueries({ queryKey: ['projects'] });
  };

  const invite = useMutation({
    mutationFn: (input: { email: string; role: 'editor' | 'viewer' }) =>
      collaboratorsApi.invite(projectId, input),
    onSuccess: invalidate,
  });

  const updateRole = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: 'editor' | 'viewer' }) =>
      collaboratorsApi.updateRole(projectId, userId, role),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (userId: string) => collaboratorsApi.remove(projectId, userId),
    onSuccess: invalidate,
  });

  return { invite, updateRole, remove };
}
