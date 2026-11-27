import { apiClient } from './client';

export interface GitHeadCommit {
  hash: string;
  message: string;
  author: string;
  timestamp: string;
}

export interface ApiGitRepoInfo {
  initialized: boolean;
  branch: string | null;
  remote: string | null;
  headCommit: GitHeadCommit | null;
}

export interface ApiGitStatus {
  clean: boolean;
  branch: string;
  staged: string[];
  modified: string[];
  untracked: string[];
  deleted: string[];
}

export const gitApi = {
  getRepoInfo: (projectId: string, signal?: AbortSignal) =>
    apiClient.get<ApiGitRepoInfo>(`/projects/${projectId}/git`, { signal }),

  initRepo: (projectId: string, defaultBranch = 'main') =>
    apiClient.post<{ repository: ApiGitRepoInfo }>(`/projects/${projectId}/git/init`, {
      defaultBranch,
    }),

  setRemote: (projectId: string, input: { url: string; token?: string; name?: string }) =>
    apiClient.put<{ remote: { name: string; url: string; hasToken: boolean } }>(
      `/projects/${projectId}/git/remote`,
      input
    ),

  cloneRepo: (projectId: string, input: { url: string; token?: string; branch?: string }) =>
    apiClient.post<{
      repository: { initialized: boolean; branch: string; remote: string; filesCloned: number };
    }>(`/projects/${projectId}/git/clone`, input),

  getStatus: (projectId: string, signal?: AbortSignal) =>
    apiClient.get<{ status: ApiGitStatus }>(`/projects/${projectId}/git/status`, { signal }),
};
