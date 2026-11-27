import { useState, type FormEvent } from 'react';
import {
  ArrowUpRight,
  FolderOpen,
  LayoutGrid,
  List,
  LogOut,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Users,
} from 'lucide-react';
import type { Role, SupportedLanguage, UserAccount } from '../types/devsync';
import { getLanguageMeta } from '../utils/fileTree';
import { getPermissionsForRole } from '../utils/permissions';
import { Sidebar, type ProjectTabFilter } from './Sidebar';
import {
  Dialog,
  EmptyState,
  FormField,
  GlassButton,
  GlassPanel,
  ProjectCardSkeleton,
  RoleChip,
  TextInput,
} from './ui';

export interface DashboardProjectItem {
  id: string;
  name: string;
  role: Role;
  ownerName: string;
  updatedAt: string;
  fileCount?: number;
  folderCount?: number;
  collaboratorCount?: number;
  languages?: SupportedLanguage[];
}

interface DashboardProps {
  user: UserAccount;
  projects: DashboardProjectItem[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  isLoading?: boolean;
  isFetching?: boolean;
  errorMessage?: string | null;
  onRetry?: () => void;
  onOpenProject: (projectId: string) => void;
  onCreateProject: (name: string) => Promise<{ error?: string }> | { error?: string };
  onRenameProject: (projectId: string, name: string) => Promise<{ error?: string }> | { error?: string };
  onDeleteProject: (projectId: string) => Promise<{ error?: string }> | { error?: string };
  onLeaveProject?: (projectId: string) => Promise<{ error?: string }> | { error?: string };
  onSignOut: () => void;
  onOpenCommandPalette?: () => void;
}

function formatRelativeTime(iso: string): string {
  const diffMs = Math.max(0, Date.now() - new Date(iso).getTime());
  const mins = Math.max(1, Math.floor(diffMs / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function Dashboard({
  user,
  projects,
  searchQuery,
  onSearchChange,
  isLoading = false,
  isFetching = false,
  errorMessage = null,
  onRetry,
  onOpenProject,
  onCreateProject,
  onRenameProject,
  onDeleteProject,
  onLeaveProject,
  onSignOut,
  onOpenCommandPalette,
}: DashboardProps) {
  const [filter, setFilter] = useState<ProjectTabFilter>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Create Project Dialog (Project Name ONLY)
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // Rename Project Dialog
  const [renameTarget, setRenameTarget] = useState<DashboardProjectItem | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renameError, setRenameError] = useState<string | null>(null);
  const [renaming, setRenaming] = useState(false);

  // Destructive Delete Dialog
  const [deleteTarget, setDeleteTarget] = useState<DashboardProjectItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Leave Shared Project Dialog
  const [leaveTarget, setLeaveTarget] = useState<DashboardProjectItem | null>(null);
  const [leaving, setLeaving] = useState(false);

  const counts: Record<ProjectTabFilter, number> = {
    all: projects.length,
    owned: projects.filter((p) => p.role === 'owner').length,
    shared: projects.filter((p) => p.role !== 'owner').length,
  };

  const filteredProjects = projects
    .filter((p) => {
      if (filter === 'owned') return p.role === 'owner';
      if (filter === 'shared') return p.role !== 'owner';
      return true;
    })
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  const filterTitle: Record<ProjectTabFilter, string> = {
    all: 'All Projects',
    owned: 'My Projects',
    shared: 'Shared with me',
  };

  const handleCreateSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = newProjectName.trim();
    if (!trimmed) {
      setCreateError('Project name is required.');
      return;
    }
    setCreating(true);
    setCreateError(null);
    const res = await onCreateProject(trimmed);
    setCreating(false);
    if (res.error) {
      setCreateError(res.error);
      return;
    }
    setNewProjectName('');
    setShowCreateModal(false);
  };

  const handleRenameSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!renameTarget) return;
    const trimmed = renameValue.trim();
    if (!trimmed) {
      setRenameError('Project name cannot be empty.');
      return;
    }
    setRenaming(true);
    setRenameError(null);
    const res = await onRenameProject(renameTarget.id, trimmed);
    setRenaming(false);
    if (res.error) {
      setRenameError(res.error);
      return;
    }
    setRenameTarget(null);
    setRenameValue('');
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    await onDeleteProject(deleteTarget.id);
    setDeleting(false);
    setDeleteTarget(null);
  };

  const handleLeaveConfirm = async () => {
    if (!leaveTarget || !onLeaveProject) return;
    setLeaving(true);
    await onLeaveProject(leaveTarget.id);
    setLeaving(false);
    setLeaveTarget(null);
  };

  return (
    <div className="min-h-screen bg-[var(--surface-canvas)] text-[var(--text-primary)] flex">
      <div className="hidden md:flex">
        <Sidebar
          user={user}
          activeFilter={filter}
          onSelectFilter={setFilter}
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
          counts={counts}
          onSignOut={onSignOut}
          onOpenCommandPalette={onOpenCommandPalette}
        />
      </div>

      <main className="flex-1 min-w-0 flex flex-col">
        {/* Dashboard Top Bar */}
        <header className="glass-toolbar border-b px-4 sm:px-7 py-3 flex flex-col gap-3 shrink-0">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-baseline gap-3 min-w-0">
              <h1 className="text-[18px] font-semibold tracking-tight text-[var(--text-primary)] truncate">
                {filterTitle[filter]}
              </h1>
              <span className="text-[12px] font-mono tabular-nums text-[var(--text-muted)]">
                {filteredProjects.length}{' '}
                {filteredProjects.length === 1 ? 'project' : 'projects'}
              </span>
              {isFetching && !isLoading && (
                <span className="text-[11px] font-mono text-[var(--text-muted)]">Syncing…</span>
              )}
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <div
                role="group"
                aria-label="Project layout view"
                className="hidden sm:flex items-center p-0.5 rounded-lg bg-[var(--surface-base)] border border-[var(--border-hairline)]"
              >
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  aria-label="Grid view"
                  aria-pressed={viewMode === 'grid'}
                  className={`p-1.5 rounded-md transition-mechanical cursor-pointer ${
                    viewMode === 'grid'
                      ? 'bg-[var(--surface-hover)] text-[var(--text-primary)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" strokeWidth={1.5} />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  aria-label="List view"
                  aria-pressed={viewMode === 'list'}
                  className={`p-1.5 rounded-md transition-mechanical cursor-pointer ${
                    viewMode === 'list'
                      ? 'bg-[var(--surface-hover)] text-[var(--text-primary)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                  }`}
                >
                  <List className="w-3.5 h-3.5" strokeWidth={1.5} />
                </button>
              </div>

              <GlassButton
                variant="primary"
                size="md"
                onClick={() => {
                  setNewProjectName('');
                  setCreateError(null);
                  setShowCreateModal(true);
                }}
              >
                <Plus className="w-4 h-4" strokeWidth={1.75} />
                <span>New Project</span>
              </GlassButton>
            </div>
          </div>

          {/* Mobile Tabs + Search */}
          <div className="flex flex-col sm:flex-row md:hidden gap-2.5">
            <div className="flex items-center gap-1 p-0.5 rounded-lg bg-[var(--surface-base)] border border-[var(--border-hairline)] overflow-x-auto">
              {(['all', 'owned', 'shared'] as ProjectTabFilter[]).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setFilter(tab)}
                  aria-pressed={filter === tab}
                  className={`px-3 py-1 rounded-md text-[12px] font-medium whitespace-nowrap cursor-pointer transition-mechanical ${
                    filter === tab
                      ? 'bg-[var(--surface-hover)] text-[var(--text-primary)]'
                      : 'text-[var(--text-secondary)]'
                  }`}
                >
                  {filterTitle[tab]} ({counts[tab]})
                </button>
              ))}
            </div>
            <search className="relative flex-1">
              <Search
                className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                strokeWidth={1.5}
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search projects..."
                aria-label="Search projects"
                className="w-full rounded-lg bg-[var(--surface-base)] border border-[var(--border-hairline)] pl-8 pr-3 py-1.5 text-[13px] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)]"
              />
            </search>
          </div>
        </header>

        {/* Project Grid / List Content */}
        <div className="flex-1 p-4 sm:p-7 overflow-y-auto">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, idx) => (
                <ProjectCardSkeleton key={idx} />
              ))}
            </div>
          ) : errorMessage ? (
            <EmptyState
              className="max-w-md mx-auto my-16"
              icon={<RefreshCw className="w-5 h-5" strokeWidth={1.5} />}
              title="Could not load projects"
              description={errorMessage}
              action={
                onRetry && (
                  <GlassButton variant="primary" size="md" onClick={onRetry}>
                    <RefreshCw className="w-4 h-4" strokeWidth={1.5} />
                    <span>Try Again</span>
                  </GlassButton>
                )
              }
            />
          ) : filteredProjects.length === 0 ? (
            <EmptyState
              className="max-w-md mx-auto my-16"
              icon={<FolderOpen className="w-5 h-5" strokeWidth={1.5} />}
              title={searchQuery.trim() ? 'No matching projects' : 'No projects in this view'}
              description={
                searchQuery.trim()
                  ? `No project matched "${searchQuery}". Clear your search to see all projects.`
                  : filter === 'shared'
                  ? 'Projects shared with you by collaborators will appear here.'
                  : 'Create a language-independent project and add files in any supported language.'
              }
              action={
                searchQuery.trim() ? (
                  <GlassButton variant="glass" size="md" onClick={() => onSearchChange('')}>
                    Clear Search
                  </GlassButton>
                ) : filter !== 'shared' ? (
                  <GlassButton
                    variant="primary"
                    size="md"
                    onClick={() => {
                      setNewProjectName('');
                      setCreateError(null);
                      setShowCreateModal(true);
                    }}
                  >
                    <Plus className="w-4 h-4" strokeWidth={1.5} />
                    <span>Create Project</span>
                  </GlassButton>
                ) : undefined
              }
            />
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredProjects.map((project) => {
                const perms = getPermissionsForRole(project.role);
                const isOwner = project.role === 'owner';

                return (
                  <GlassPanel
                    key={project.id}
                    className="group p-5 flex flex-col justify-between hover:border-[var(--border-glass-strong)] hover-lift transition-mechanical"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => onOpenProject(project.id)}
                          className="text-left min-w-0 flex-1 cursor-pointer"
                        >
                          <h2 className="text-[15px] font-semibold text-[var(--text-primary)] group-hover:text-white tracking-tight truncate">
                            {project.name}
                          </h2>
                        </button>

                        <div className="flex items-center gap-1 shrink-0">
                          <RoleChip role={project.role} />
                        </div>
                      </div>

                      <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-[var(--text-secondary)]">
                        {project.fileCount !== undefined && (
                          <>
                            <span className="font-mono tabular-nums">
                              {project.fileCount} {project.fileCount === 1 ? 'file' : 'files'}
                            </span>
                            <span className="text-[var(--text-muted)]" aria-hidden="true">
                              ·
                            </span>
                          </>
                        )}
                        {project.folderCount !== undefined && (
                          <>
                            <span className="font-mono tabular-nums">
                              {project.folderCount}{' '}
                              {project.folderCount === 1 ? 'folder' : 'folders'}
                            </span>
                            <span className="text-[var(--text-muted)]" aria-hidden="true">
                              ·
                            </span>
                          </>
                        )}
                        {!isOwner && (
                          <>
                            <span>Owner: {project.ownerName}</span>
                            <span className="text-[var(--text-muted)]" aria-hidden="true">
                              ·
                            </span>
                          </>
                        )}
                        <span className="font-mono tabular-nums text-[var(--text-muted)]">
                          Updated {formatRelativeTime(project.updatedAt)}
                        </span>
                      </div>

                      {project.languages && (
                        <div className="mt-4 pt-3.5 border-t border-[var(--border-hairline)] flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12px] font-mono">
                          {project.languages.length > 0 ? (
                            project.languages.map((lang, idx) => {
                              const meta = getLanguageMeta(lang);
                              return (
                                <span key={lang} className="inline-flex items-center gap-2">
                                  {idx > 0 && (
                                    <span className="text-[var(--text-muted)]" aria-hidden="true">
                                      /
                                    </span>
                                  )}
                                  <span style={{ color: meta.color }}>{meta.label}</span>
                                </span>
                              );
                            })
                          ) : (
                            <span className="text-[var(--text-muted)]">
                              Empty workspace — add files
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="mt-5 pt-3 border-t border-[var(--border-hairline)] flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-[12px] text-[var(--text-muted)]">
                        {project.collaboratorCount !== undefined && (
                          <span className="inline-flex items-center gap-1 font-mono">
                            <Users className="w-3.5 h-3.5" strokeWidth={1.5} />
                            <span>{project.collaboratorCount}</span>
                          </span>
                        )}
                        {perms.canRenameProject && (
                          <div className="flex items-center gap-0.5 card-actions">
                            <button
                              type="button"
                              onClick={() => {
                                setRenameTarget(project);
                                setRenameValue(project.name);
                                setRenameError(null);
                              }}
                              aria-label={`Rename ${project.name}`}
                              title="Rename project"
                              className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-mechanical cursor-pointer"
                            >
                              <Pencil className="w-3.5 h-3.5" strokeWidth={1.5} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(project)}
                              aria-label={`Delete ${project.name}`}
                              title="Delete project"
                              className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--state-danger)] hover:bg-[var(--surface-hover)] transition-mechanical cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                            </button>
                          </div>
                        )}
                        {!isOwner && onLeaveProject && (
                          <button
                            type="button"
                            onClick={() => setLeaveTarget(project)}
                            aria-label={`Leave ${project.name}`}
                            title="Leave project"
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-[var(--text-muted)] hover:text-[#fca5a5] hover:bg-[var(--surface-hover)] transition-mechanical cursor-pointer"
                          >
                            <LogOut className="w-3 h-3" strokeWidth={1.5} />
                            <span>Leave</span>
                          </button>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => onOpenProject(project.id)}
                        className="inline-flex items-center gap-1 text-[12px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-mechanical cursor-pointer"
                      >
                        <span>Open IDE</span>
                        <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={1.5} />
                      </button>
                    </div>
                  </GlassPanel>
                );
              })}
            </div>
          ) : (
            <GlassPanel className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border-hairline)] text-[11px] font-medium text-[var(--text-muted)]">
                    <th scope="col" className="py-2.5 px-4">
                      Project
                    </th>
                    <th scope="col" className="py-2.5 px-4">
                      Role
                    </th>
                    <th scope="col" className="py-2.5 px-4">
                      Owner
                    </th>
                    <th scope="col" className="py-2.5 px-4">
                      Updated
                    </th>
                    <th scope="col" className="py-2.5 px-4 text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-hairline)] text-[13px]">
                  {filteredProjects.map((project) => {
                    const perms = getPermissionsForRole(project.role);
                    const isOwner = project.role === 'owner';
                    return (
                      <tr
                        key={project.id}
                        className="hover:bg-[var(--surface-hover)]/50 transition-mechanical"
                      >
                        <td className="py-3 px-4 font-medium text-[var(--text-primary)]">
                          <button
                            type="button"
                            onClick={() => onOpenProject(project.id)}
                            className="hover:underline cursor-pointer"
                          >
                            {project.name}
                          </button>
                        </td>
                        <td className="py-3 px-4">
                          <RoleChip role={project.role} />
                        </td>
                        <td className="py-3 px-4 text-[var(--text-secondary)]">
                          {isOwner ? 'You' : project.ownerName}
                        </td>
                        <td className="py-3 px-4 font-mono tabular-nums text-[var(--text-muted)]">
                          {formatRelativeTime(project.updatedAt)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            {perms.canRenameProject && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRenameTarget(project);
                                    setRenameValue(project.name);
                                    setRenameError(null);
                                  }}
                                  aria-label={`Rename ${project.name}`}
                                  className="p-1.5 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] cursor-pointer"
                                >
                                  <Pencil className="w-3.5 h-3.5" strokeWidth={1.5} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleteTarget(project)}
                                  aria-label={`Delete ${project.name}`}
                                  className="p-1.5 rounded text-[var(--text-muted)] hover:text-[var(--state-danger)] hover:bg-[var(--surface-hover)] cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                                </button>
                              </>
                            )}
                            {!isOwner && onLeaveProject && (
                              <button
                                type="button"
                                onClick={() => setLeaveTarget(project)}
                                aria-label={`Leave ${project.name}`}
                                className="px-2 py-1 rounded text-[12px] text-[var(--text-secondary)] hover:text-[#fca5a5] hover:bg-[var(--surface-hover)] cursor-pointer"
                              >
                                Leave
                              </button>
                            )}
                            <GlassButton
                              size="sm"
                              variant="glass"
                              onClick={() => onOpenProject(project.id)}
                            >
                              Open
                            </GlassButton>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </GlassPanel>
          )}
        </div>
      </main>

      {/* Create Project Dialog (Project Name ONLY) */}
      <Dialog
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Project"
        description="Projects are language-independent. You will select the language individually when creating each file."
        maxWidthClass="max-w-[420px]"
      >
        <form onSubmit={handleCreateSubmit} noValidate className="space-y-4">
          <FormField id="new-project-name" label="Project Name" required error={createError}>
            <TextInput
              id="new-project-name"
              type="text"
              autoFocus
              value={newProjectName}
              onChange={(e) => {
                setNewProjectName(e.target.value);
                setCreateError(null);
              }}
              placeholder="e.g. GraphEngine"
              hasError={Boolean(createError)}
            />
          </FormField>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <GlassButton variant="ghost" onClick={() => setShowCreateModal(false)}>
              Cancel
            </GlassButton>
            <GlassButton type="submit" variant="primary" loading={creating}>
              {creating ? 'Creating…' : 'Create Project'}
            </GlassButton>
          </div>
        </form>
      </Dialog>

      {/* Rename Project Dialog */}
      <Dialog
        open={Boolean(renameTarget)}
        onClose={() => setRenameTarget(null)}
        title="Rename Project"
        maxWidthClass="max-w-[400px]"
      >
        <form onSubmit={handleRenameSubmit} noValidate className="space-y-4">
          <FormField id="rename-project-input" label="New Project Name" required error={renameError}>
            <TextInput
              id="rename-project-input"
              type="text"
              autoFocus
              value={renameValue}
              onChange={(e) => {
                setRenameValue(e.target.value);
                setRenameError(null);
              }}
              hasError={Boolean(renameError)}
            />
          </FormField>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <GlassButton variant="ghost" onClick={() => setRenameTarget(null)}>
              Cancel
            </GlassButton>
            <GlassButton type="submit" variant="primary" loading={renaming}>
              {renaming ? 'Saving…' : 'Save Name'}
            </GlassButton>
          </div>
        </form>
      </Dialog>

      {/* Delete Project Confirmation Dialog */}
      <Dialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title={`Delete “${deleteTarget?.name ?? ''}”?`}
        description="This permanently deletes the project, all folders, files, execution history, and collaborator access."
        maxWidthClass="max-w-[420px]"
      >
        <div className="flex items-center justify-end gap-2.5 pt-3">
          <GlassButton variant="ghost" autoFocus onClick={() => setDeleteTarget(null)}>
            Cancel
          </GlassButton>
          <GlassButton variant="danger" loading={deleting} onClick={handleDeleteConfirm}>
            {deleting ? 'Deleting…' : 'Delete Project'}
          </GlassButton>
        </div>
      </Dialog>

      {/* Leave Shared Project Confirmation Dialog */}
      <Dialog
        open={Boolean(leaveTarget)}
        onClose={() => setLeaveTarget(null)}
        title={`Leave “${leaveTarget?.name ?? ''}”?`}
        description="You will lose access to this shared workspace until the owner invites you again."
        maxWidthClass="max-w-[420px]"
      >
        <div className="flex items-center justify-end gap-2.5 pt-3">
          <GlassButton variant="ghost" autoFocus onClick={() => setLeaveTarget(null)}>
            Cancel
          </GlassButton>
          <GlassButton variant="danger" loading={leaving} onClick={handleLeaveConfirm}>
            {leaving ? 'Leaving…' : 'Leave Project'}
          </GlassButton>
        </div>
      </Dialog>
    </div>
  );
}
