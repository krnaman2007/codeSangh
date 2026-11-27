import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { debugApi } from '../api/debug.api';
import { gitApi } from '../api/git.api';
import { queryKeys } from '../lib/queryClient';

export function useActiveDebugSessionQuery(projectId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: queryKeys.debugActive(projectId ?? ''),
    queryFn: ({ signal }) => debugApi.getActiveSession(projectId!, signal),
    enabled: Boolean(projectId) && enabled,
  });
}

export function useBreakpointsQuery(
  projectId: string | undefined,
  fileId: string | null,
  enabled = true
) {
  return useQuery({
    queryKey: queryKeys.breakpoints(projectId ?? '', fileId ?? ''),
    queryFn: ({ signal }) => debugApi.getBreakpoints(projectId!, fileId!, signal),
    enabled: Boolean(projectId && fileId) && enabled,
  });
}

export function useDebugMutations(projectId: string) {
  const qc = useQueryClient();

  const startSession = useMutation({
    mutationFn: ({
      fileId,
      breakpoints,
    }: {
      fileId: string;
      breakpoints?: Array<number | { line: number; condition?: string }>;
    }) => debugApi.startSession(projectId, fileId, breakpoints),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.debugActive(projectId) });
    },
  });

  const stopSession = useMutation({
    mutationFn: (sessionId: string) => debugApi.stopSession(projectId, sessionId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.debugActive(projectId) });
    },
  });

  const replaceBreakpoints = useMutation({
    mutationFn: ({
      fileId,
      breakpoints,
    }: {
      fileId: string;
      breakpoints: Array<number | { line: number; condition?: string }>;
    }) => debugApi.replaceBreakpoints(projectId, fileId, breakpoints),
    onSuccess: (_data, { fileId }) => {
      void qc.invalidateQueries({ queryKey: queryKeys.breakpoints(projectId, fileId) });
      void qc.invalidateQueries({ queryKey: queryKeys.debugActive(projectId) });
    },
  });

  return { startSession, stopSession, replaceBreakpoints };
}

export function useGitRepoQuery(projectId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: queryKeys.gitInfo(projectId ?? ''),
    queryFn: ({ signal }) => gitApi.getRepoInfo(projectId!, signal),
    enabled: Boolean(projectId) && enabled,
  });
}

export function useGitStatusQuery(projectId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: queryKeys.gitStatus(projectId ?? ''),
    queryFn: ({ signal }) => gitApi.getStatus(projectId!, signal),
    enabled: Boolean(projectId) && enabled,
  });
}

export function useGitMutations(projectId: string) {
  const qc = useQueryClient();

  const invalidateGit = () => {
    void qc.invalidateQueries({ queryKey: queryKeys.gitInfo(projectId) });
    void qc.invalidateQueries({ queryKey: queryKeys.gitStatus(projectId) });
    void qc.invalidateQueries({ queryKey: queryKeys.tree(projectId) });
  };

  const initRepo = useMutation({
    mutationFn: (defaultBranch?: string) => gitApi.initRepo(projectId, defaultBranch),
    onSuccess: invalidateGit,
  });

  const setRemote = useMutation({
    mutationFn: (input: { url: string; token?: string; name?: string }) =>
      gitApi.setRemote(projectId, input),
    onSuccess: invalidateGit,
  });

  const cloneRepo = useMutation({
    mutationFn: (input: { url: string; token?: string; branch?: string }) =>
      gitApi.cloneRepo(projectId, input),
    onSuccess: invalidateGit,
  });

  return { initRepo, setRemote, cloneRepo };
}
