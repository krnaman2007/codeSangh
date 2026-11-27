import { apiClient } from './client';
import type { ApiCollaborator, ApiUser } from './types';

export interface CollaboratorsListResponse {
  owner: ApiUser;
  collaborators: ApiCollaborator[];
}

export const collaboratorsApi = {
  list: (projectId: string, signal?: AbortSignal) =>
    apiClient.get<CollaboratorsListResponse>(`/projects/${projectId}/collaborators`, {
      signal,
    }),

  searchUsers: (q: string, projectId: string, signal?: AbortSignal) =>
    apiClient.get<{ users: ApiUser[] }>('/users/search', {
      query: { q: q.trim(), projectId },
      signal,
    }),

  invite: (projectId: string, input: { email: string; role: 'editor' | 'viewer' }) =>
    apiClient.post<{ collaborator: ApiCollaborator }>(
      `/projects/${projectId}/collaborators`,
      { email: input.email.trim().toLowerCase(), role: input.role }
    ),

  updateRole: (projectId: string, userId: string, role: 'editor' | 'viewer') =>
    apiClient.patch<{ collaborator: ApiCollaborator }>(
      `/projects/${projectId}/collaborators/${userId}`,
      { role }
    ),

  remove: (projectId: string, userId: string) =>
    apiClient.delete<void>(`/projects/${projectId}/collaborators/${userId}`),
};
