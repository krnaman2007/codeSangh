import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { projectsApi } from '../api/projects.api';
import type { DashboardProjectsResponse } from '../api/types';
import { queryKeys } from '../lib/queryClient';
import { useAuth } from '../state/authStore';

export function useProjectsQuery(search: string) {
  return useQuery({
    queryKey: queryKeys.projects(search),
    queryFn: ({ signal }) => projectsApi.list(search, signal),
  });
}

export function useProjectDetailsQuery(projectId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.project(projectId ?? ''),
    queryFn: ({ signal }) => projectsApi.getById(projectId!, signal),
    enabled: Boolean(projectId),
  });
}

export function useCreateProjectMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (name: string) => projectsApi.create(name),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useRenameProjectMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, name }: { projectId: string; name: string }) =>
      projectsApi.rename(projectId, name),
    onMutate: async ({ projectId, name }) => {
      await qc.cancelQueries({ queryKey: ['projects'] });
      const previous = qc.getQueriesData<DashboardProjectsResponse>({ queryKey: ['projects'] });
      const trimmed = name.trim();
      const now = new Date().toISOString();

      qc.setQueriesData<DashboardProjectsResponse>({ queryKey: ['projects'] }, (old) => {
        if (!old) return old;
        return {
          owned: old.owned.map((p) =>
            p.id === projectId ? { ...p, name: trimmed, updatedAt: now } : p
          ),
          shared: old.shared.map((p) =>
            p.id === projectId ? { ...p, name: trimmed, updatedAt: now } : p
          ),
        };
      });
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        for (const [key, data] of ctx.previous) {
          qc.setQueryData(key, data);
        }
      }
    },
    onSettled: (_data, _err, { projectId }) => {
      void qc.invalidateQueries({ queryKey: ['projects'] });
      void qc.invalidateQueries({ queryKey: queryKeys.project(projectId) });
    },
  });
}

export function useDeleteProjectMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (projectId: string) => projectsApi.remove(projectId),
    onMutate: async (projectId) => {
      await qc.cancelQueries({ queryKey: ['projects'] });
      const previous = qc.getQueriesData<DashboardProjectsResponse>({ queryKey: ['projects'] });

      qc.setQueriesData<DashboardProjectsResponse>({ queryKey: ['projects'] }, (old) => {
        if (!old) return old;
        return {
          owned: old.owned.filter((p) => p.id !== projectId),
          shared: old.shared.filter((p) => p.id !== projectId),
        };
      });
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        for (const [key, data] of ctx.previous) {
          qc.setQueryData(key, data);
        }
      }
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useLeaveProjectMutation() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (projectId: string) => {
      if (!user) throw new Error('Not authenticated');
      return projectsApi.leave(projectId, user.id);
    },
    onMutate: async (projectId) => {
      await qc.cancelQueries({ queryKey: ['projects'] });
      const previous = qc.getQueriesData<DashboardProjectsResponse>({ queryKey: ['projects'] });

      qc.setQueriesData<DashboardProjectsResponse>({ queryKey: ['projects'] }, (old) => {
        if (!old) return old;
        return {
          ...old,
          shared: old.shared.filter((p) => p.id !== projectId),
        };
      });
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        for (const [key, data] of ctx.previous) {
          qc.setQueryData(key, data);
        }
      }
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}
