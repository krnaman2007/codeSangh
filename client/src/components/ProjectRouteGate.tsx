import { useParams } from 'react-router-dom';
import { useProjectDetailsQuery } from '../hooks/useProjects';
import { getInitials, useAuth } from '../state/authStore';
import { BrandLogo } from './BrandMark';
import { DemoWorkspaceShell } from './DemoWorkspaceShell';
import { ProjectErrorState } from './ProjectErrorState';
import { GlassPanel, Skeleton } from './ui';

export function ProjectRouteGate() {
  const { projectId } = useParams<{ projectId: string }>();
  const { user, logout } = useAuth();
  const projectQuery = useProjectDetailsQuery(projectId);

  if (projectQuery.isLoading) {
    return (
      <div className="min-h-screen bg-[var(--surface-canvas)] flex items-center justify-center p-6">
        <GlassPanel className="w-full max-w-[400px] p-6 space-y-4">
          <div className="flex items-center gap-2.5">
            <BrandLogo size={20} />
            <span className="text-[14px] font-semibold text-[var(--text-primary)]">
              Loading workspace…
            </span>
          </div>
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-2/3" />
        </GlassPanel>
      </div>
    );
  }

  if (projectQuery.isError || !projectQuery.data) {
    return (
      <ProjectErrorState
        error={projectQuery.error}
        onRetry={() => void projectQuery.refetch()}
      />
    );
  }

  const account = user
    ? {
        id: user.id,
        name: user.name,
        email: user.email,
        initials: getInitials(user.name),
      }
    : undefined;

  return (
    <DemoWorkspaceShell
      mode="workspace"
      account={account}
      onSignOut={() => {
        void logout();
      }}
    />
  );
}
