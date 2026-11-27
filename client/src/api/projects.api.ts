import { apiClient } from './client';
import type {
  DashboardProjectsResponse,
  ProjectDetailsResponse,
} from './types';

export interface CreatedProjectResponse {
  project: {
    id: string;
    name: string;
    ownerId: string;
    createdAt: string;
    updatedAt: string;
  };
}

export interface RenamedProjectResponse {
  project: {
    id: string;
    name: string;
  };
}

export const projectsApi = {
  list: (search?: string, signal?: AbortSignal) =>
    apiClient.get<DashboardProjectsResponse>('/projects', {
      query: search?.trim() ? { search: search.trim() } : undefined,
      signal,
    }),

  getById: (projectId: string, signal?: AbortSignal) =>
    apiClient.get<ProjectDetailsResponse>(`/projects/${projectId}`, { signal }),

  create: (name: string) =>
    apiClient.post<CreatedProjectResponse>('/projects', { name: name.trim() }),

  rename: (projectId: string, name: string) =>
    apiClient.patch<RenamedProjectResponse>(`/projects/${projectId}`, {
      name: name.trim(),
    }),

  remove: (projectId: string) =>
    apiClient.delete<void>(`/projects/${projectId}`),

  leave: (projectId: string, userId: string) =>
    apiClient.delete<void>(`/projects/${projectId}/collaborators/${userId}`),
};
