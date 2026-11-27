import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { languagesApi, nodesApi } from '../api/nodes.api';
import { queryKeys } from '../lib/queryClient';

export function useLanguagesQuery() {
  return useQuery({
    queryKey: queryKeys.languages,
    queryFn: ({ signal }) => languagesApi.list(signal),
    staleTime: 10 * 60_000,
  });
}

export function useProjectTreeQuery(projectId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.tree(projectId ?? ''),
    queryFn: ({ signal }) => nodesApi.getTree(projectId!, signal),
    enabled: Boolean(projectId),
  });
}

export function useFileDetailQuery(projectId: string | undefined, fileId: string | null) {
  return useQuery({
    queryKey: queryKeys.file(projectId ?? '', fileId ?? ''),
    queryFn: ({ signal }) => nodesApi.getFile(projectId!, fileId!, signal),
    enabled: Boolean(projectId && fileId),
    staleTime: 15_000,
  });
}

export function useNodeMutations(projectId: string) {
  const qc = useQueryClient();

  const invalidateTree = () => {
    void qc.invalidateQueries({ queryKey: queryKeys.tree(projectId) });
    void qc.invalidateQueries({ queryKey: ['projects'] });
  };

  const createFolder = useMutation({
    mutationFn: (input: { name: string; parentId?: string | null }) =>
      nodesApi.createFolder(projectId, input),
    onSuccess: invalidateTree,
  });

  const createFile = useMutation({
    mutationFn: (input: {
      name: string;
      language: string;
      parentId?: string | null;
      content?: string;
    }) => nodesApi.createFile(projectId, input),
    onSuccess: invalidateTree,
  });

  const updateContent = useMutation({
    mutationFn: ({ fileId, content }: { fileId: string; content: string }) =>
      nodesApi.updateContent(projectId, fileId, content),
    onSuccess: (_data, { fileId, content }) => {
      qc.setQueryData(queryKeys.file(projectId, fileId), (old: unknown) => {
        if (!old || typeof old !== 'object' || !('file' in old)) return old;
        const prev = old as { file: Record<string, unknown> };
        return {
          file: {
            ...prev.file,
            content,
            updatedAt: new Date().toISOString(),
          },
        };
      });
      void qc.invalidateQueries({ queryKey: queryKeys.tree(projectId) });
    },
  });

  const renameNode = useMutation({
    mutationFn: ({ nodeId, name }: { nodeId: string; name: string }) =>
      nodesApi.renameNode(projectId, nodeId, name),
    onSuccess: (_data, { nodeId }) => {
      invalidateTree();
      void qc.invalidateQueries({ queryKey: queryKeys.file(projectId, nodeId) });
    },
  });

  const moveNode = useMutation({
    mutationFn: ({ nodeId, parentId }: { nodeId: string; parentId: string | null }) =>
      nodesApi.moveNode(projectId, nodeId, parentId),
    onSuccess: invalidateTree,
  });

  const changeLanguage = useMutation({
    mutationFn: ({ fileId, language }: { fileId: string; language: string }) =>
      nodesApi.changeLanguage(projectId, fileId, language),
    onSuccess: (_data, { fileId }) => {
      invalidateTree();
      void qc.invalidateQueries({ queryKey: queryKeys.file(projectId, fileId) });
    },
  });

  const deleteNode = useMutation({
    mutationFn: (nodeId: string) => nodesApi.deleteNode(projectId, nodeId),
    onSuccess: invalidateTree,
  });

  return {
    createFolder,
    createFile,
    updateContent,
    renameNode,
    moveNode,
    changeLanguage,
    deleteNode,
  };
}
