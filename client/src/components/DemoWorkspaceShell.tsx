import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type {
  CollaboratorAccess,
  ExecutionRecord,
  Project,
  Role,
  SupportedLanguage,
  UserAccount,
} from '../types/devsync';
import { DEMO_USER, createSeedProjects } from '../data/seedProjects';
import {
  countProjectFiles,
  createFileNode,
  createFolderNode,
  deleteFileNode,
  deriveProjectLanguages,
  moveFileNode,
  renameFileNode,
} from '../utils/fileTree';
import { getPermissionsForRole } from '../utils/permissions';
import { useUiStore } from '../state/uiStore';
import { Dashboard, type DashboardProjectItem } from './Dashboard';
import { Workspace } from './Workspace';
import { CommandPalette } from './CommandPalette';

const STORAGE_DEMO_PROJECTS_KEY = 'devsync_demo_projects_v1';

function loadDemoProjects(): Project[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_DEMO_PROJECTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Project[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // Fallback to deterministic seed data
  }
  return createSeedProjects();
}

export function DemoWorkspaceShell({
  mode,
  account = DEMO_USER,
  onSignOut,
}: {
  mode: 'dashboard' | 'workspace';
  account?: UserAccount;
  onSignOut?: () => void;
}) {
  const navigate = useNavigate();
  const { projectId: routeProjectId } = useParams<{ projectId: string }>();
  const { pushToast, commandPaletteOpen, setCommandPaletteOpen } = useUiStore();

  const [projects, setProjects] = useState<Project[]>(loadDemoProjects);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeProjectId, setActiveProjectId] = useState<string>(() => {
    if (routeProjectId) return routeProjectId;
    const initial = loadDemoProjects();
    return initial[0]?.id ?? 'proj-algolab';
  });
  const [workspaceAction, setWorkspaceAction] = useState<{
    type: 'run' | 'new-file' | 'new-folder' | 'share' | 'cursors' | 'select-file';
    fileId?: string;
    nonce: number;
  } | null>(null);

  useEffect(() => {
    if (routeProjectId) {
      setActiveProjectId(routeProjectId);
    }
  }, [routeProjectId]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_DEMO_PROJECTS_KEY, JSON.stringify(projects));
    } catch {
      // Ignore storage quota errors
    }
  }, [projects]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setCommandPaletteOpen]);

  const activeProject =
    projects.find((p) => p.id === (routeProjectId ?? activeProjectId)) ?? projects[0] ?? null;

  const handleOpenProject = (projectId: string) => {
    const now = new Date().toISOString();
    setProjects((prev) =>
      prev.map((p) => (p.id === projectId ? { ...p, lastOpenedAt: now } : p))
    );
    setActiveProjectId(projectId);
    navigate(mode === 'workspace' && !routeProjectId ? '/demo' : `/project/${projectId}`);
  };

  const handleCreateProject = (name: string): { error?: string; projectId?: string } => {
    const trimmed = name.trim();
    if (!trimmed) return { error: 'Project name is required.' };
    if (projects.some((p) => p.name.toLowerCase() === trimmed.toLowerCase())) {
      return { error: `A project named "${trimmed}" already exists.` };
    }
    const now = new Date().toISOString();
    const id = `proj-${Date.now()}`;
    const newProject: Project = {
      id,
      name: trimmed,
      ownerId: account.id,
      ownerName: account.name,
      currentUserRole: 'owner',
      updatedAt: now,
      lastOpenedAt: now,
      nodes: [],
      collaborators: [
        {
          id: account.id,
          name: account.name,
          email: account.email,
          initials: account.initials,
          role: 'owner',
          online: true,
          cursorColor: '#F4F4F6',
        },
      ],
      executions: [],
    };
    setProjects((prev) => [newProject, ...prev]);
    pushToast(`Created project "${trimmed}"`, 'success');
    return { projectId: id };
  };

  const handleRenameProject = (projectId: string, nextName: string): { error?: string } => {
    const trimmed = nextName.trim();
    if (!trimmed) return { error: 'Project name cannot be empty.' };
    if (
      projects.some(
        (p) => p.id !== projectId && p.name.toLowerCase() === trimmed.toLowerCase()
      )
    ) {
      return { error: `A project named "${trimmed}" already exists.` };
    }
    const now = new Date().toISOString();
    setProjects((prev) =>
      prev.map((p) => (p.id === projectId ? { ...p, name: trimmed, updatedAt: now } : p))
    );
    pushToast(`Renamed project to "${trimmed}"`, 'success');
    return {};
  };

  const handleDeleteProject = (projectId: string) => {
    const target = projects.find((p) => p.id === projectId);
    setProjects((prev) => prev.filter((p) => p.id !== projectId));
    if (activeProject?.id === projectId) {
      navigate('/dashboard');
    }
    if (target) pushToast(`Deleted "${target.name}"`, 'info');
    return {};
  };

  const handleChangeDemoRole = (projectId: string, role: Role) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === projectId ? { ...p, currentUserRole: role } : p))
    );
    pushToast(
      `Switched demo role to ${role.charAt(0).toUpperCase() + role.slice(1)}`,
      'info'
    );
  };

  const handleCreateFolder = (projectId: string, name: string, parentId: string | null) => {
    const proj = projects.find((p) => p.id === projectId);
    if (!proj) return { error: 'Project not found.' };
    const id = `folder-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
    const res = createFolderNode(proj.nodes, name, parentId, id);
    if (res.error) return { error: res.error };
    const now = new Date().toISOString();
    setProjects((prev) =>
      prev.map((p) =>
        p.id === projectId ? { ...p, nodes: res.nodes, updatedAt: now } : p
      )
    );
    pushToast(`Created folder "${res.created.name}"`, 'success');
    return {};
  };

  const handleCreateFile = (
    projectId: string,
    name: string,
    language: SupportedLanguage,
    parentId: string | null
  ) => {
    const proj = projects.find((p) => p.id === projectId);
    if (!proj) return { error: 'Project not found.' };
    const id = `file-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
    const res = createFileNode(proj.nodes, name, language, parentId, id);
    if (res.error) return { error: res.error };
    const now = new Date().toISOString();
    setProjects((prev) =>
      prev.map((p) =>
        p.id === projectId ? { ...p, nodes: res.nodes, updatedAt: now } : p
      )
    );
    pushToast(`Created ${res.created.name}`, 'success');
    return { createdId: res.created.id };
  };

  const handleRenameNode = (projectId: string, nodeId: string, nextName: string) => {
    const proj = projects.find((p) => p.id === projectId);
    if (!proj) return { error: 'Project not found.' };
    const res = renameFileNode(proj.nodes, nodeId, nextName);
    if (res.error) return { error: res.error };
    const now = new Date().toISOString();
    setProjects((prev) =>
      prev.map((p) =>
        p.id === projectId ? { ...p, nodes: res.nodes, updatedAt: now } : p
      )
    );
    pushToast(`Renamed to "${nextName.trim()}"`, 'success');
    return {};
  };

  const handleMoveNode = (
    projectId: string,
    nodeId: string,
    targetParentId: string | null
  ) => {
    const proj = projects.find((p) => p.id === projectId);
    if (!proj) return { error: 'Project not found.' };
    const res = moveFileNode(proj.nodes, nodeId, targetParentId);
    if (res.error) return { error: res.error };
    const now = new Date().toISOString();
    setProjects((prev) =>
      prev.map((p) =>
        p.id === projectId ? { ...p, nodes: res.nodes, updatedAt: now } : p
      )
    );
    pushToast('Moved item successfully', 'success');
    return {};
  };

  const handleDeleteNode = (projectId: string, nodeId: string) => {
    const proj = projects.find((p) => p.id === projectId);
    if (!proj) return;
    const target = proj.nodes.find((n) => n.id === nodeId);
    const res = deleteFileNode(proj.nodes, nodeId);
    const now = new Date().toISOString();
    setProjects((prev) =>
      prev.map((p) =>
        p.id === projectId ? { ...p, nodes: res.nodes, updatedAt: now } : p
      )
    );
    if (target) pushToast(`Deleted "${target.name}"`, 'info');
  };

  const handleUpdateFileContent = (projectId: string, fileId: string, content: string) => {
    const now = new Date().toISOString();
    setProjects((prev) =>
      prev.map((p) =>
        p.id === projectId
          ? {
              ...p,
              updatedAt: now,
              nodes: p.nodes.map((n) =>
                n.id === fileId ? { ...n, content, updatedAt: now } : n
              ),
            }
          : p
      )
    );
  };

  const handleRecordExecution = (projectId: string, record: ExecutionRecord) => {
    setProjects((prev) =>
      prev.map((p) =>
        p.id === projectId
          ? { ...p, executions: [record, ...p.executions].slice(0, 40) }
          : p
      )
    );
  };

  const handleInviteCollaborator = (
    projectId: string,
    email: string,
    access: CollaboratorAccess
  ) => {
    const proj = projects.find((p) => p.id === projectId);
    if (!proj) return { error: 'Project not found.' };
    if (proj.collaborators.some((c) => c.email.toLowerCase() === email.toLowerCase())) {
      return { error: `${email} is already a collaborator on this project.` };
    }
    const rawName = email
      .split('@')[0]
      .replace(/[._-]+/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
    const parts = rawName.split(/\s+/).filter(Boolean);
    const initials =
      parts.length >= 2
        ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
        : rawName.slice(0, 2).toUpperCase();

    const colors = ['#5E5CE6', '#14B8A6', '#F59E0B', '#EC4899'];
    const cursorColor = colors[proj.collaborators.length % colors.length];

    setProjects((prev) =>
      prev.map((p) =>
        p.id === projectId
          ? {
              ...p,
              collaborators: [
                ...p.collaborators,
                {
                  id: `collab-${Date.now()}`,
                  name: rawName,
                  email,
                  initials,
                  role: access,
                  online: true,
                  cursorColor,
                },
              ],
            }
          : p
      )
    );
    pushToast(`Invited ${email}`, 'success');
    return {};
  };

  const handleUpdateCollaboratorAccess = (
    projectId: string,
    collaboratorId: string,
    access: CollaboratorAccess
  ) => {
    setProjects((prev) =>
      prev.map((p) =>
        p.id === projectId
          ? {
              ...p,
              collaborators: p.collaborators.map((c) =>
                c.id === collaboratorId ? { ...c, role: access } : c
              ),
            }
          : p
      )
    );
    pushToast(
      `Updated access to ${access === 'edit' ? 'Edit Access' : 'View Access'}`,
      'success'
    );
  };

  const handleRevokeCollaborator = (projectId: string, collaboratorId: string) => {
    const proj = projects.find((p) => p.id === projectId);
    const removed = proj?.collaborators.find((c) => c.id === collaboratorId);
    setProjects((prev) =>
      prev.map((p) =>
        p.id === projectId
          ? {
              ...p,
              collaborators: p.collaborators.filter((c) => c.id !== collaboratorId),
            }
          : p
      )
    );
    if (removed) pushToast(`Revoked access for ${removed.name}`, 'info');
  };

  const dashboardItems: DashboardProjectItem[] = projects
    .filter((p) =>
      searchQuery.trim()
        ? p.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
        : true
    )
    .map((p) => ({
      id: p.id,
      name: p.name,
      role: p.currentUserRole,
      ownerName: p.ownerName,
      updatedAt: p.updatedAt,
      fileCount: countProjectFiles(p.nodes),
      folderCount: p.nodes.filter((n) => n.type === 'folder').length,
      collaboratorCount: p.collaborators.length,
      languages: deriveProjectLanguages(p.nodes),
    }));

  const activePerms = activeProject
    ? getPermissionsForRole(activeProject.currentUserRole)
    : null;

  return (
    <>
      {mode === 'dashboard' && (
        <Dashboard
          user={account}
          projects={dashboardItems}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onOpenProject={handleOpenProject}
          onCreateProject={handleCreateProject}
          onRenameProject={handleRenameProject}
          onDeleteProject={handleDeleteProject}
          onSignOut={() => {
            onSignOut?.();
            navigate('/');
          }}
          onOpenCommandPalette={() => setCommandPaletteOpen(true)}
        />
      )}

      {mode === 'workspace' && activeProject && (
        <Workspace
          user={account}
          project={activeProject}
          onBackToDashboard={() => navigate(routeProjectId ? '/dashboard' : '/')}
          onRenameProject={handleRenameProject}
          onChangeDemoRole={handleChangeDemoRole}
          onCreateFolder={handleCreateFolder}
          onCreateFile={handleCreateFile}
          onRenameNode={handleRenameNode}
          onMoveNode={handleMoveNode}
          onDeleteNode={handleDeleteNode}
          onUpdateFileContent={handleUpdateFileContent}
          onRecordExecution={handleRecordExecution}
          onInviteCollaborator={handleInviteCollaborator}
          onUpdateCollaboratorAccess={handleUpdateCollaboratorAccess}
          onRevokeCollaborator={handleRevokeCollaborator}
          onOpenCommandPalette={() => setCommandPaletteOpen(true)}
          externalAction={workspaceAction}
          onToast={pushToast}
        />
      )}

      <CommandPalette
        open={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        projects={projects}
        activeProject={mode === 'workspace' ? activeProject : null}
        canManageFiles={activePerms?.canManageFiles ?? false}
        canRunCode={activePerms?.canRunCode ?? false}
        onOpenProject={handleOpenProject}
        onSelectFile={(fileId) =>
          setWorkspaceAction({ type: 'select-file', fileId, nonce: Date.now() })
        }
        onRunCode={() => setWorkspaceAction({ type: 'run', nonce: Date.now() })}
        onNewFile={() => setWorkspaceAction({ type: 'new-file', nonce: Date.now() })}
        onNewFolder={() => setWorkspaceAction({ type: 'new-folder', nonce: Date.now() })}
        onOpenShare={() => setWorkspaceAction({ type: 'share', nonce: Date.now() })}
        onToggleCursors={() => setWorkspaceAction({ type: 'cursors', nonce: Date.now() })}
        onBackToDashboard={() => navigate('/dashboard')}
      />
    </>
  );
}
