import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiClientError } from '../api/errors';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import {
  useCreateProjectMutation,
  useDeleteProjectMutation,
  useLeaveProjectMutation,
  useProjectsQuery,
  useRenameProjectMutation,
} from '../hooks/useProjects';
import { getInitials, useAuth } from '../state/authStore';
import { useUiStore } from '../state/uiStore';
import { Dashboard, type DashboardProjectItem } from './Dashboard';

export function DashboardPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { pushToast } = useUiStore();
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebouncedValue(searchQuery, 250);

  const projectsQuery = useProjectsQuery(debouncedSearch);
  const createMutation = useCreateProjectMutation();
  const renameMutation = useRenameProjectMutation();
  const deleteMutation = useDeleteProjectMutation();
  const leaveMutation = useLeaveProjectMutation();

  const normalizedProjects = useMemo<DashboardProjectItem[]>(() => {
    const data = projectsQuery.data;
    if (!data) return [];

    const owned: DashboardProjectItem[] = data.owned.map((p) => ({
      id: p.id,
      name: p.name,
      role: 'owner',
      ownerName: user?.name ?? 'You',
      updatedAt: p.updatedAt,
      fileCount: p.fileCount,
      folderCount: p.folderCount,
      collaboratorCount: p.collaboratorCount,
    }));

    const shared: DashboardProjectItem[] = data.shared.map((p) => ({
      id: p.id,
      name: p.name,
      role: p.role,
      ownerName: p.owner.name,
      updatedAt: p.updatedAt,
    }));

    return [...owned, ...shared];
  }, [projectsQuery.data, user?.name]);

  const errorMessage =
    projectsQuery.error instanceof ApiClientError
      ? projectsQuery.error.userMessage
      : projectsQuery.error
      ? 'Unable to load your projects.'
      : null;

  const account = {
    id: user?.id ?? '',
    name: user?.name ?? 'Developer',
    email: user?.email ?? '',
    initials: getInitials(user?.name ?? 'DevSync'),
  };

  return (
    <Dashboard
      user={account}
      projects={normalizedProjects}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      isLoading={projectsQuery.isLoading}
      isFetching={projectsQuery.isFetching}
      errorMessage={errorMessage}
      onRetry={() => void projectsQuery.refetch()}
      onOpenProject={(projectId) => navigate(`/project/${projectId}`)}
      onCreateProject={async (name) => {
        try {
          const res = await createMutation.mutateAsync(name);
          pushToast(`Created project "${res.project.name}"`, 'success');
          return {};
        } catch (err) {
          const msg =
            err instanceof ApiClientError ? err.userMessage : 'Could not create project.';
          return { error: msg };
        }
      }}
      onRenameProject={async (projectId, name) => {
        try {
          await renameMutation.mutateAsync({ projectId, name });
          pushToast(`Renamed project to "${name}"`, 'success');
          return {};
        } catch (err) {
          const msg =
            err instanceof ApiClientError ? err.userMessage : 'Could not rename project.';
          return { error: msg };
        }
      }}
      onDeleteProject={async (projectId) => {
        try {
          await deleteMutation.mutateAsync(projectId);
          pushToast('Project deleted', 'info');
          return {};
        } catch (err) {
          const msg =
            err instanceof ApiClientError ? err.userMessage : 'Could not delete project.';
          pushToast('Delete failed', 'error', msg);
          return { error: msg };
        }
      }}
      onLeaveProject={async (projectId) => {
        try {
          await leaveMutation.mutateAsync(projectId);
          pushToast('Left shared project', 'info');
          return {};
        } catch (err) {
          const msg =
            err instanceof ApiClientError ? err.userMessage : 'Could not leave project.';
          pushToast('Leave failed', 'error', msg);
          return { error: msg };
        }
      }}
      onSignOut={() => {
        void logout().then(() => {
          pushToast('Signed out', 'info');
          navigate('/', { replace: true });
        });
      }}
    />
  );
}
