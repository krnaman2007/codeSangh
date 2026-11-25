import { useState, type FormEvent } from 'react';
import {
  Plus,
  LayoutGrid,
  List,
  Pencil,
  Trash2,
  FolderOpen,
  X,
  ArrowUpRight,
} from 'lucide-react';
import type { DashboardFilter, Project, UserAccount } from '../types/devsync';
import {
  countProjectFiles,
  deriveProjectLanguages,
  getLanguageMeta,
} from '../utils/fileTree';
import { formatRoleLabel, getPermissionsForRole } from '../utils/permissions';
import { Sidebar } from './Sidebar';

interface DashboardProps {
  user: UserAccount;
  projects: Project[];
  onOpenProject: (projectId: string) => void;
  onCreateProject: (name: string) => { error?: string; projectId?: string };
  onRenameProject: (projectId: string, name: string) => { error?: string };
  onDeleteProject: (projectId: string) => void;
  onSignOut: () => void;
  onOpenCommandPalette: () => void;
}

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
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
  onOpenProject,
  onCreateProject,
  onRenameProject,
  onDeleteProject,
  onSignOut,
  onOpenCommandPalette,
}: DashboardProps) {
  const [filter, setFilter] = useState<DashboardFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Create Project Modal (Project Name ONLY per PDF spec 1.1)
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);

  // Rename Project Modal
  const [renameTarget, setRenameTarget] = useState<Project | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renameError, setRenameError] = useState<string | null>(null);

  const counts: Record<DashboardFilter, number> = {
    all: projects.length,
    owned: projects.filter((p) => p.currentUserRole === 'owner').length,
    shared: projects.filter((p) => p.currentUserRole !== 'owner').length,
    recent: projects.length,
  };

  const filteredProjects = projects
    .filter((p) => {
      if (filter === 'owned') return p.currentUserRole === 'owner';
      if (filter === 'shared') return p.currentUserRole !== 'owner';
      return true;
    })
    .filter((p) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const langs = deriveProjectLanguages(p.nodes)
        .map((l) => getLanguageMeta(l).label.toLowerCase())
        .join(' ');
      return (
        p.name.toLowerCase().includes(q) ||
        p.ownerName.toLowerCase().includes(q) ||
        langs.includes(q)
      );
    })
    .sort((a, b) => {
      const key = filter === 'recent' ? 'lastOpenedAt' : 'updatedAt';
      return new Date(b[key]).getTime() - new Date(a[key]).getTime();
    });

  const filterTitle: Record<DashboardFilter, string> = {
    all: 'All Projects',
    owned: 'Owned by Me',
    shared: 'Shared with Me',
    recent: 'Recent Projects',
  };

  const handleCreateSubmit = (e: FormEvent) => {
    e.preventDefault();
    const res = onCreateProject(newProjectName);
    if (res.error) {
      setCreateError(res.error);
      return;
    }
    setNewProjectName('');
    setCreateError(null);
    setShowCreateModal(false);
  };

  const handleRenameSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!renameTarget) return;
    const res = onRenameProject(renameTarget.id, renameValue);
    if (res.error) {
      setRenameError(res.error);
      return;
    }
    setRenameTarget(null);
    setRenameValue('');
    setRenameError(null);
  };

  return (
    <div className="min-h-screen bg-[#050507] text-[#F4F4F6] flex">
      <Sidebar
        user={user}
        activeFilter={filter}
        onSelectFilter={setFilter}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
        counts={counts}
        onSignOut={onSignOut}
        onOpenCommandPalette={onOpenCommandPalette}
      />

      <main className="flex-1 min-w-0 flex flex-col">
        {/* Dashboard Top Bar */}
        <header className="h-16 px-7 border-b border-white/[0.07] bg-[#050507] flex items-center justify-between gap-6 shrink-0">
          <div className="flex items-baseline gap-3 min-w-0">
            <h1 className="text-[18px] font-semibold tracking-tight text-[#F4F4F6] truncate">
              {filterTitle[filter]}
            </h1>
            <span className="text-[12px] font-mono tabular-nums text-[#5C5C6E]">
              {filteredProjects.length}{' '}
              {filteredProjects.length === 1 ? 'project' : 'projects'}
            </span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div
              role="group"
              aria-label="Project layout view"
              className="flex items-center p-0.5 rounded-lg bg-[#0B0B0F] border border-white/[0.07]"
            >
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                aria-label="Grid view"
                aria-pressed={viewMode === 'grid'}
                className={`p-1.5 rounded-md transition-mechanical cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-[#18181F] text-[#F4F4F6]'
                    : 'text-[#5C5C6E] hover:text-[#9494A3]'
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
                    ? 'bg-[#18181F] text-[#F4F4F6]'
                    : 'text-[#5C5C6E] hover:text-[#9494A3]'
                }`}
              >
                <List className="w-3.5 h-3.5" strokeWidth={1.5} />
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setNewProjectName('');
                setCreateError(null);
                setShowCreateModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#5E5CE6] hover:bg-[#4F46E5] text-[#F4F4F6] text-[13px] font-medium transition-mechanical whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5E5CE6]"
            >
              <Plus className="w-4 h-4" strokeWidth={1.75} />
              <span>New Project</span>
            </button>
          </div>
        </header>

        {/* Project Grid / List Content */}
        <div className="flex-1 p-7 overflow-y-auto">
          {filteredProjects.length === 0 ? (
            <div className="max-w-md mx-auto my-20 text-center rounded-xl bg-[#0B0B0F] border border-white/[0.07] p-8">
              <div className="w-10 h-10 rounded-lg bg-[#111116] border border-white/[0.07] flex items-center justify-center mx-auto mb-4">
                <FolderOpen className="w-5 h-5 text-[#9494A3]" strokeWidth={1.5} />
              </div>
              <h2 className="text-[15px] font-semibold text-[#F4F4F6]">
                {searchQuery.trim() ? 'No matching projects' : 'No projects in this view'}
              </h2>
              <p className="text-[13px] text-[#9494A3] mt-1.5">
                {searchQuery.trim()
                  ? `No project matched "${searchQuery}". Try clearing your search.`
                  : 'Create a language-independent project and add files in any supported language.'}
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setNewProjectName('');
                  setCreateError(null);
                  setShowCreateModal(true);
                }}
                className="mt-5 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#5E5CE6] hover:bg-[#4F46E5] text-[#F4F4F6] text-[13px] font-medium transition-mechanical cursor-pointer"
              >
                <Plus className="w-4 h-4" strokeWidth={1.5} />
                <span>Create Project</span>
              </button>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredProjects.map((project) => {
                const langs = deriveProjectLanguages(project.nodes);
                const fileCount = countProjectFiles(project.nodes);
                const perms = getPermissionsForRole(project.currentUserRole);

                return (
                  <article
                    key={project.id}
                    className="group rounded-xl bg-[#0B0B0F] hover:bg-[#111116] border border-white/[0.07] hover:border-white/[0.13] p-5 flex flex-col justify-between transition-mechanical"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => onOpenProject(project.id)}
                          className="text-left min-w-0 flex-1 cursor-pointer focus-visible:outline-none"
                        >
                          <h2 className="text-[15px] font-semibold text-[#F4F4F6] group-hover:text-white tracking-tight truncate">
                            {project.name}
                          </h2>
                        </button>
                        <div className="flex items-center gap-1 shrink-0">
                          {perms.canRenameProject && (
                            <button
                              type="button"
                              onClick={() => {
                                setRenameTarget(project);
                                setRenameValue(project.name);
                                setRenameError(null);
                              }}
                              aria-label={`Rename ${project.name}`}
                              title="Rename project"
                              className="p-1.5 rounded-md text-[#5C5C6E] hover:text-[#F4F4F6] hover:bg-[#18181F] transition-mechanical cursor-pointer"
                            >
                              <Pencil className="w-3.5 h-3.5" strokeWidth={1.5} />
                            </button>
                          )}
                          {perms.canRenameProject && (
                            <button
                              type="button"
                              onClick={() => onDeleteProject(project.id)}
                              aria-label={`Delete ${project.name}`}
                              title="Delete project"
                              className="p-1.5 rounded-md text-[#5C5C6E] hover:text-[#EF4444] hover:bg-[#18181F] transition-mechanical cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Clean unboxed metadata row */}
                      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-[#9494A3]">
                        <span className="font-mono tabular-nums">
                          {fileCount} {fileCount === 1 ? 'file' : 'files'}
                        </span>
                        <span className="text-[#5C5C6E]" aria-hidden="true">
                          ·
                        </span>
                        <span className="text-[#9494A3]">
                          {formatRoleLabel(project.currentUserRole)}
                        </span>
                        <span className="text-[#5C5C6E]" aria-hidden="true">
                          ·
                        </span>
                        <span className="font-mono tabular-nums text-[#5C5C6E]">
                          {formatRelativeTime(project.updatedAt)}
                        </span>
                      </div>

                      {/* Derived languages from contained files */}
                      <div className="mt-4 pt-3.5 border-t border-white/[0.06] flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12px] font-mono">
                        {langs.length > 0 ? (
                          langs.map((lang, idx) => {
                            const meta = getLanguageMeta(lang);
                            return (
                              <span key={lang} className="inline-flex items-center gap-2">
                                {idx > 0 && (
                                  <span className="text-[#5C5C6E]" aria-hidden="true">
                                    /
                                  </span>
                                )}
                                <span style={{ color: meta.color }}>{meta.label}</span>
                              </span>
                            );
                          })
                        ) : (
                          <span className="text-[#5C5C6E]">Empty workspace — add files</span>
                        )}
                      </div>
                    </div>

                    <div className="mt-5 flex items-center justify-between gap-3">
                      <div
                        className="flex items-center -space-x-1.5"
                        aria-label={`${project.collaborators.length} collaborators`}
                      >
                        {project.collaborators.slice(0, 4).map((collab) => (
                          <div
                            key={collab.id}
                            title={`${collab.name} (${collab.role})`}
                            className="w-6 h-6 rounded-full bg-[#18181F] border border-[#0B0B0F] flex items-center justify-center text-[10px] font-mono text-[#F4F4F6]"
                          >
                            {collab.initials}
                          </div>
                        ))}
                        {project.collaborators.length > 4 && (
                          <div className="w-6 h-6 rounded-full bg-[#18181F] border border-[#0B0B0F] flex items-center justify-center text-[10px] font-mono text-[#9494A3]">
                            +{project.collaborators.length - 4}
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => onOpenProject(project.id)}
                        className="inline-flex items-center gap-1 text-[12px] font-medium text-[#9494A3] hover:text-[#F4F4F6] transition-mechanical cursor-pointer"
                      >
                        <span>Open IDE</span>
                        <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={1.5} />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl bg-[#0B0B0F] border border-white/[0.07] overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/[0.07] text-[11px] font-medium text-[#5C5C6E]">
                    <th className="py-2.5 px-4">Project</th>
                    <th className="py-2.5 px-4">Languages</th>
                    <th className="py-2.5 px-4">Files</th>
                    <th className="py-2.5 px-4">Role</th>
                    <th className="py-2.5 px-4">Updated</th>
                    <th className="py-2.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06] text-[13px]">
                  {filteredProjects.map((project) => {
                    const langs = deriveProjectLanguages(project.nodes);
                    const fileCount = countProjectFiles(project.nodes);
                    const perms = getPermissionsForRole(project.currentUserRole);
                    return (
                      <tr
                        key={project.id}
                        className="hover:bg-[#111116] transition-mechanical"
                      >
                        <td className="py-3 px-4 font-medium text-[#F4F4F6]">
                          <button
                            type="button"
                            onClick={() => onOpenProject(project.id)}
                            className="hover:underline cursor-pointer"
                          >
                            {project.name}
                          </button>
                        </td>
                        <td className="py-3 px-4 font-mono text-[12px]">
                          {langs.length > 0 ? (
                            langs.map((l, i) => (
                              <span key={l}>
                                {i > 0 && <span className="text-[#5C5C6E] mx-1.5">/</span>}
                                <span style={{ color: getLanguageMeta(l).color }}>
                                  {getLanguageMeta(l).shortTag}
                                </span>
                              </span>
                            ))
                          ) : (
                            <span className="text-[#5C5C6E]">None</span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono tabular-nums text-[#9494A3]">
                          {fileCount}
                        </td>
                        <td className="py-3 px-4 text-[#9494A3]">
                          {formatRoleLabel(project.currentUserRole)}
                        </td>
                        <td className="py-3 px-4 font-mono tabular-nums text-[#5C5C6E]">
                          {formatRelativeTime(project.updatedAt)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center gap-2">
                            {perms.canRenameProject && (
                              <button
                                type="button"
                                onClick={() => {
                                  setRenameTarget(project);
                                  setRenameValue(project.name);
                                  setRenameError(null);
                                }}
                                aria-label={`Rename ${project.name}`}
                                className="p-1.5 rounded text-[#5C5C6E] hover:text-[#F4F4F6] hover:bg-[#18181F] cursor-pointer"
                              >
                                <Pencil className="w-3.5 h-3.5" strokeWidth={1.5} />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => onOpenProject(project.id)}
                              className="px-2.5 py-1 rounded-md bg-[#18181F] hover:bg-[#22222C] text-[12px] text-[#F4F4F6] transition-mechanical cursor-pointer"
                            >
                              Open
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Create Project Modal — STRICTLY Project Name ONLY (no language selector) */}
      {showCreateModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-project-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowCreateModal(false);
          }}
        >
          <div className="w-full max-w-[420px] rounded-xl bg-[#111116]/85 backdrop-blur-xl border border-white/10 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2
                id="create-project-title"
                className="text-[16px] font-semibold tracking-tight text-[#F4F4F6]"
              >
                Create Project
              </h2>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                aria-label="Close modal"
                className="p-1 rounded-md text-[#5C5C6E] hover:text-[#F4F4F6] transition-mechanical cursor-pointer"
              >
                <X className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>

            <p className="text-[12px] text-[#9494A3] mb-4">
              Projects are language-independent. You will select the programming language
              individually when creating files inside the workspace.
            </p>

            <form onSubmit={handleCreateSubmit} noValidate className="space-y-4">
              <div>
                <label
                  htmlFor="new-project-name"
                  className="block text-[12px] font-medium text-[#9494A3] mb-1.5"
                >
                  Project Name
                </label>
                <input
                  id="new-project-name"
                  type="text"
                  autoFocus
                  value={newProjectName}
                  onChange={(e) => {
                    setNewProjectName(e.target.value);
                    setCreateError(null);
                  }}
                  placeholder="e.g. GraphEngine"
                  className="w-full rounded-lg bg-[#0B0B0F] border border-white/[0.09] px-3 py-2 text-[13px] text-[#F4F4F6] placeholder-[#5C5C6E] focus:outline-none focus:border-[#5E5CE6] focus:ring-1 focus:ring-[#5E5CE6] transition-mechanical"
                />
              </div>

              {createError && (
                <p role="alert" className="text-[12px] text-[#EF4444]">
                  {createError}
                </p>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3.5 py-2 rounded-lg text-[13px] text-[#9494A3] hover:text-[#F4F4F6] hover:bg-[#18181F] transition-mechanical cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#5E5CE6] hover:bg-[#4F46E5] text-[#F4F4F6] text-[13px] font-medium transition-mechanical cursor-pointer"
                >
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rename Project Modal */}
      {renameTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="rename-project-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setRenameTarget(null);
          }}
        >
          <div className="w-full max-w-[400px] rounded-xl bg-[#111116]/85 backdrop-blur-xl border border-white/10 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2
                id="rename-project-title"
                className="text-[16px] font-semibold tracking-tight text-[#F4F4F6]"
              >
                Rename Project
              </h2>
              <button
                type="button"
                onClick={() => setRenameTarget(null)}
                aria-label="Close modal"
                className="p-1 rounded-md text-[#5C5C6E] hover:text-[#F4F4F6] transition-mechanical cursor-pointer"
              >
                <X className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>

            <form onSubmit={handleRenameSubmit} noValidate className="space-y-4">
              <div>
                <label
                  htmlFor="rename-project-input"
                  className="block text-[12px] font-medium text-[#9494A3] mb-1.5"
                >
                  New Project Name
                </label>
                <input
                  id="rename-project-input"
                  type="text"
                  autoFocus
                  value={renameValue}
                  onChange={(e) => {
                    setRenameValue(e.target.value);
                    setRenameError(null);
                  }}
                  className="w-full rounded-lg bg-[#0B0B0F] border border-white/[0.09] px-3 py-2 text-[13px] text-[#F4F4F6] focus:outline-none focus:border-[#5E5CE6] focus:ring-1 focus:ring-[#5E5CE6] transition-mechanical"
                />
              </div>

              {renameError && (
                <p role="alert" className="text-[12px] text-[#EF4444]">
                  {renameError}
                </p>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setRenameTarget(null)}
                  className="px-3.5 py-2 rounded-lg text-[13px] text-[#9494A3] hover:text-[#F4F4F6] hover:bg-[#18181F] transition-mechanical cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#5E5CE6] hover:bg-[#4F46E5] text-[#F4F4F6] text-[13px] font-medium transition-mechanical cursor-pointer"
                >
                  Save Name
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
