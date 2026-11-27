import { apiClient } from './client';
import type {
  ApiFileDetail,
  ApiTreeNode,
  LanguageRegistryEntry,
} from './types';

export const languagesApi = {
  list: (signal?: AbortSignal) =>
    apiClient.get<{ languages: LanguageRegistryEntry[] }>('/languages', { signal }),
};

export const nodesApi = {
  getTree: (projectId: string, signal?: AbortSignal) =>
    apiClient.get<{ nodes: ApiTreeNode[] }>(`/projects/${projectId}/tree`, { signal }),

  createFolder: (projectId: string, input: { name: string; parentId?: string | null }) =>
    apiClient.post<{ node: ApiTreeNode }>(`/projects/${projectId}/folders`, {
      name: input.name.trim(),
      parentId: input.parentId ?? null,
    }),

  createFile: (
    projectId: string,
    input: { name: string; language: string; parentId?: string | null; content?: string }
  ) =>
    apiClient.post<{ node: ApiTreeNode }>(`/projects/${projectId}/files`, {
      name: input.name.trim(),
      language: input.language,
      parentId: input.parentId ?? null,
      content: input.content ?? '',
    }),

  getFile: (projectId: string, fileId: string, signal?: AbortSignal) =>
    apiClient.get<{ file: ApiFileDetail }>(`/projects/${projectId}/files/${fileId}`, { signal }),

  updateContent: (projectId: string, fileId: string, content: string) =>
    apiClient.put<{ file: { id: string; size: number; updatedAt: string } }>(
      `/projects/${projectId}/files/${fileId}/content`,
      { content }
    ),

  renameNode: (projectId: string, nodeId: string, name: string) =>
    apiClient.patch<{ node: { id: string; name: string } }>(
      `/projects/${projectId}/nodes/${nodeId}`,
      { name: name.trim() }
    ),

  moveNode: (projectId: string, nodeId: string, parentId: string | null) =>
    apiClient.patch<{ node: { id: string; parentId: string | null } }>(
      `/projects/${projectId}/nodes/${nodeId}/move`,
      { parentId }
    ),

  changeLanguage: (projectId: string, fileId: string, language: string) =>
    apiClient.patch<{ node: { id: string; language: string } }>(
      `/projects/${projectId}/files/${fileId}/language`,
      { language }
    ),

  deleteNode: (projectId: string, nodeId: string) =>
    apiClient.delete<{ deletedIds: string[] }>(`/projects/${projectId}/nodes/${nodeId}`),
};
