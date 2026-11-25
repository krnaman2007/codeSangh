import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Play,
  Share2,
  Search,
  Lock,
  Check,
  Pencil,
  GitBranch,
  Bug,
  Mic,
  Sparkles,
  Container,
} from 'lucide-react';
import type {
  CollaboratorAccess,
  ExecutionRecord,
  Project,
  Role,
  SupportedLanguage,
  UserAccount,
} from '../types/devsync';
import { getNodeBreadcrumb, getNodePath } from '../utils/fileTree';
import { getPermissionsForRole } from '../utils/permissions';
import { executeFile } from '../utils/codeRunner';
import { FileExplorer } from './FileExplorer';
import { CodeEditor } from './CodeEditor';
import { BottomPanel, type BottomTab } from './BottomPanel';
import { ShareModal } from './ShareModal';

interface WorkspaceProps {
  user: UserAccount;
  project: Project;
  onBackToDashboard: () => void;
  onRenameProject: (projectId: string, nextName: string) => { error?: string };
  onChangeDemoRole: (projectId: string, role: Role) => void;
  onCreateFolder: (
    projectId: string,
    name: string,
    parentId: string | null
  ) => { error?: string };
  onCreateFile: (
    projectId: string,
    name: string,
    language: SupportedLanguage,
    parentId: string | null
  ) => { error?: string; createdId?: string };
  onRenameNode: (projectId: string, nodeId: string, nextName: string) => { error?: string };
  onMoveNode: (
    projectId: string,
    nodeId: string,
    targetParentId: string | null
  ) => { error?: string };
  onDeleteNode: (projectId: string, nodeId: string) => void;
  onUpdateFileContent: (projectId: string, fileId: string, content: string) => void;
  onRecordExecution: (projectId: string, record: ExecutionRecord) => void;
  onInviteCollaborator: (
    projectId: string,
    email: string,
    access: CollaboratorAccess
  ) => { error?: string };
  onUpdateCollaboratorAccess: (
    projectId: string,
    collaboratorId: string,
    access: CollaboratorAccess
  ) => void;
  onRevokeCollaborator: (projectId: string, collaboratorId: string) => void;
  onOpenCommandPalette: () => void;
  externalAction: { type: 'run' | 'new-file' | 'new-folder' | 'share' | 'cursors' | 'select-file'; fileId?: string; nonce: number } | null;
  onToast: (title: string, variant?: 'info' | 'success' | 'error', description?: string) => void;
}

const MASTERMIND_RAIL = [
  { id: 'git', label: 'Git Version Control', icon: GitBranch },
  { id: 'debug', label: 'Collaborative Debugging', icon: Bug },
  { id: 'voice', label: 'Real-Time Voice', icon: Mic },
  { id: 'ai', label: 'AI Coding Assistant', icon: Sparkles },
  { id: 'env', label: 'Shared Dev Environments', icon: Container },
];

export function Workspace({
  user,
  project,
  onBackToDashboard,
  onRenameProject,
  onChangeDemoRole,
  onCreateFolder,
  onCreateFile,
  onRenameNode,
  onMoveNode,
  onDeleteNode,
  onUpdateFileContent,
  onRecordExecution,
  onInviteCollaborator,
  onUpdateCollaboratorAccess,
  onRevokeCollaborator,
  onOpenCommandPalette,
  externalAction,
  onToast,
}: WorkspaceProps) {
  const perms = getPermissionsForRole(project.currentUserRole);
  const allFiles = project.nodes.filter((n) => n.type === 'file');

  const [openTabIds, setOpenTabIds] = useState<string[]>(() =>
    allFiles.slice(0, 3).map((f) => f.id)
  );
  const [activeFileId, setActiveFileId] = useState<string | null>(
    () => allFiles[0]?.id ?? null
  );
  const [bottomTab, setBottomTab] = useState<BottomTab>('output');
  const [latestExecution, setLatestExecution] = useState<ExecutionRecord | null>(
    () => project.executions[0] ?? null
  );
  const [showShareModal, setShowShareModal] = useState(false);
  const [showLiveCursors, setShowLiveCursors] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');

  // Inline editable project name (Owner only)
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(project.name);

  // Counters to trigger FileExplorer modals from Command Palette
  const [createFileTrigger, setCreateFileTrigger] = useState(0);
  const [createFolderTrigger, setCreateFolderTrigger] = useState(0);

  // Sync open tabs when switching between projects
  useEffect(() => {
    const files = project.nodes.filter((n) => n.type === 'file');
    setOpenTabIds(files.slice(0, 3).map((f) => f.id));
    setActiveFileId(files[0]?.id ?? null);
    setLatestExecution(project.executions[0] ?? null);
    setEditingTitle(false);
    setTitleDraft(project.name);
  }, [project.id]);

  // Clean up open tabs if a file was deleted
  useEffect(() => {
    const existingIds = new Set(project.nodes.map((n) => n.id));
    setOpenTabIds((prev) => {
      const next = prev.filter((id) => existingIds.has(id));
      if (next.length !== prev.length) {
        if (activeFileId && !existingIds.has(activeFileId)) {
          setActiveFileId(next[0] ?? null);
        }
        return next;
      }
      return prev;
    });
  }, [project.nodes, activeFileId]);

  const openFile = (fileId: string) => {
    setOpenTabIds((prev) => (prev.includes(fileId) ? prev : [...prev, fileId]));
    setActiveFileId(fileId);
  };

  const closeTab = (fileId: string) => {
    setOpenTabIds((prev) => {
      const idx = prev.indexOf(fileId);
      const next = prev.filter((id) => id !== fileId);
      if (activeFileId === fileId) {
        setActiveFileId(next[Math.max(0, idx - 1)] ?? null);
      }
      return next;
    });
  };

  const activeFile =
    project.nodes.find((n) => n.id === activeFileId && n.type === 'file') ?? null;

  const openFiles = openTabIds
    .map((id) => project.nodes.find((n) => n.id === id && n.type === 'file'))
    .filter((f): f is NonNullable<typeof f> => Boolean(f));

  const breadcrumb = activeFile ? getNodeBreadcrumb(project.nodes, activeFile.id) : [];

  const handleRunActiveFile = () => {
    if (!perms.canRunCode) {
      onToast('Execution blocked', 'error', 'Viewers have read-only access.');
      return;
    }
    if (!activeFile) {
      onToast('No active file', 'info', 'Open a file first to run it.');
      return;
    }

    const res = executeFile(activeFile);
    const record: ExecutionRecord = {
      id: `exec-${Date.now()}`,
      projectId: project.id,
      fileId: activeFile.id,
      fileName: getNodePath(project.nodes, activeFile.id),
      language: activeFile.language ?? 'javascript',
      runtime: res.runtime,
      status: res.status,
      stdout: res.stdout,
      stderr: res.stderr,
      durationMs: res.durationMs,
      timestamp: new Date().toISOString(),
    };
    setLatestExecution(record);
    setBottomTab('output');
    onRecordExecution(project.id, record);
    onToast(
      res.status === 'success'
        ? `Executed ${activeFile.name}`
        : `Execution error in ${activeFile.name}`,
      res.status === 'success' ? 'success' : 'error',
      `${res.runtime} · ${res.durationMs}ms`
    );
  };

  // Handle commands invoked from Command Palette
  useEffect(() => {
    if (!externalAction) return;
    switch (externalAction.type) {
      case 'run':
        handleRunActiveFile();
        break;
      case 'new-file':
        setCreateFileTrigger((n) => n + 1);
        break;
      case 'new-folder':
        setCreateFolderTrigger((n) => n + 1);
        break;
      case 'share':
        setShowShareModal(true);
        break;
      case 'cursors':
        setShowLiveCursors((prev) => !prev);
        break;
      case 'select-file':
        if (externalAction.fileId) openFile(externalAction.fileId);
        break;
    }
  }, [externalAction?.nonce]);

  const handleContentEdit = (fileId: string, content: string) => {
    if (!perms.canEditCode) return;
    setSaveStatus('saving');
    onUpdateFileContent(project.id, fileId, content);
    window.setTimeout(() => setSaveStatus('saved'), 260);
  };

  const commitProjectRename = () => {
    setEditingTitle(false);
    if (!perms.canRenameProject) return;
    const trimmed = titleDraft.trim();
    if (!trimmed || trimmed === project.name) {
      setTitleDraft(project.name);
      return;
    }
    const res = onRenameProject(project.id, trimmed);
    if (res.error) {
      setTitleDraft(project.name);
      onToast('Rename failed', 'error', res.error);
    }
  };

  const onlineCollaborators = project.collaborators.filter((c) => c.online);

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#050507] text-[#F4F4F6] flex flex-col">
      {/* Top Workspace Bar */}
      <header className="h-12 px-3 bg-[#050507] border-b border-white/[0.07] flex items-center justify-between gap-3 shrink-0">
        {/* Left: Back + Editable Project Name + Breadcrumb */}
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={onBackToDashboard}
            aria-label="Back to Dashboard"
            title="Back to Dashboard"
            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[12px] text-[#9494A3] hover:text-[#F4F4F6] hover:bg-[#18181F] transition-mechanical whitespace-nowrap shrink-0 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span className="hidden sm:inline">Dashboard</span>
          </button>

          <span className="text-white/[0.12]" aria-hidden="true">
            /
          </span>

          {editingTitle && perms.canRenameProject ? (
            <div className="flex items-center gap-1">
              <input
                type="text"
                autoFocus
                aria-label="Edit project name"
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onBlur={commitProjectRename}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitProjectRename();
                  if (e.key === 'Escape') {
                    setTitleDraft(project.name);
                    setEditingTitle(false);
                  }
                }}
                className="w-36 rounded bg-[#111116] border border-[#5E5CE6] px-2 py-0.5 text-[13px] font-medium text-[#F4F4F6] focus:outline-none"
              />
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={commitProjectRename}
                aria-label="Save project name"
                className="p-1 text-[#22C55E] cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" strokeWidth={1.75} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={!perms.canRenameProject}
              onClick={() => {
                if (!perms.canRenameProject) return;
                setTitleDraft(project.name);
                setEditingTitle(true);
              }}
              title={
                perms.canRenameProject
                  ? 'Click to rename project'
                  : 'Only Project Owner can rename'
              }
              className={`group inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#F4F4F6] truncate max-w-[160px] ${
                perms.canRenameProject
                  ? 'hover:text-white cursor-pointer'
                  : 'cursor-default'
              }`}
            >
              <span className="truncate">{project.name}</span>
              {perms.canRenameProject && (
                <Pencil
                  className="w-3 h-3 text-[#5C5C6E] opacity-0 group-hover:opacity-100 transition-mechanical shrink-0"
                  strokeWidth={1.5}
                />
              )}
            </button>
          )}

          {breadcrumb.length > 0 && (
            <nav
              aria-label="File path breadcrumb"
              className="hidden lg:flex items-center gap-1.5 text-[12px] font-mono text-[#5C5C6E] min-w-0 truncate"
            >
              {breadcrumb.map((part) => (
                <span key={part.id} className="inline-flex items-center gap-1.5 truncate">
                  <span aria-hidden="true">/</span>
                  <span
                    className={
                      part.id === activeFile?.id
                        ? 'text-[#9494A3] truncate'
                        : 'text-[#5C5C6E] truncate'
                    }
                  >
                    {part.name}
                  </span>
                </span>
              ))}
            </nav>
          )}
        </div>

        {/* Center/Right: Role Switcher, Read-Only Pill, Avatars, Cmd+K, Run Code, Share */}
        <div className="flex items-center gap-2.5 shrink-0">
          {perms.isReadOnly && (
            <span
              data-testid="readonly-pill"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#EAB308]/10 border border-[#EAB308]/30 text-[11px] font-mono font-medium text-[#EAB308] whitespace-nowrap shrink-0"
            >
              <Lock className="w-3 h-3" strokeWidth={1.75} />
              <span>Read-Only</span>
            </span>
          )}

          {/* Demo Role Switcher (Owner / Editor / Viewer) */}
          <div
            role="group"
            aria-label="Demo permission role switcher"
            className="hidden md:flex items-center p-0.5 rounded-lg bg-[#0B0B0F] border border-white/[0.08]"
          >
            {(['owner', 'editor', 'viewer'] as Role[]).map((roleOption) => {
              const active = project.currentUserRole === roleOption;
              return (
                <button
                  key={roleOption}
                  type="button"
                  onClick={() => onChangeDemoRole(project.id, roleOption)}
                  aria-pressed={active}
                  className={`px-2 py-1 rounded-md text-[11px] font-medium capitalize transition-mechanical whitespace-nowrap cursor-pointer ${
                    active
                      ? 'bg-[#18181F] text-[#F4F4F6]'
                      : 'text-[#5C5C6E] hover:text-[#9494A3]'
                  }`}
                >
                  {roleOption}
                </button>
              );
            })}
          </div>

          <select
            aria-label="Demo permission role"
            value={project.currentUserRole}
            onChange={(e) => onChangeDemoRole(project.id, e.target.value as Role)}
            className="md:hidden rounded-md bg-[#0B0B0F] border border-white/[0.08] px-2 py-1 text-[11px] text-[#F4F4F6] capitalize focus:outline-none focus:border-[#5E5CE6]"
          >
            <option value="owner">Owner</option>
            <option value="editor">Editor</option>
            <option value="viewer">Viewer</option>
          </select>

          {/* Active Collaborator Avatars */}
          <div
            className="hidden sm:flex items-center gap-1.5 px-1"
            aria-label={`${onlineCollaborators.length} collaborators online`}
          >
            {onlineCollaborators.map((collab) => (
              <div
                key={collab.id}
                title={`${collab.name} (${collab.role}) — Online`}
                className="relative w-7 h-7 rounded-full bg-[#18181F] border border-white/[0.1] flex items-center justify-center text-[10px] font-mono text-[#F4F4F6]"
              >
                {collab.initials}
                <span
                  className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full ring-2 ring-[#050507]"
                  style={{ backgroundColor: '#22C55E' }}
                />
              </div>
            ))}
          </div>

          {/* Command Palette Trigger */}
          <button
            type="button"
            onClick={onOpenCommandPalette}
            aria-label="Open Command Palette"
            title="Command Palette (⌘K)"
            className="hidden xl:inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-[#0B0B0F] hover:bg-[#18181F] border border-white/[0.08] text-[12px] text-[#5C5C6E] hover:text-[#F4F4F6] transition-mechanical cursor-pointer"
          >
            <Search className="w-3.5 h-3.5" strokeWidth={1.5} />
            <kbd className="font-mono text-[10px]">⌘K</kbd>
          </button>

          {/* Run Code Button */}
          <button
            type="button"
            disabled={!perms.canRunCode || !activeFile}
            onClick={handleRunActiveFile}
            title={
              perms.canRunCode
                ? 'Run active file'
                : 'Disabled in Read-Only Viewer mode'
            }
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#5E5CE6] hover:bg-[#4F46E5] disabled:bg-[#18181F] disabled:text-[#5C5C6E] disabled:cursor-not-allowed text-[#F4F4F6] text-[12px] font-medium transition-mechanical whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5" strokeWidth={1.75} />
            <span>Run Code</span>
          </button>

          {/* Share Button */}
          <button
            type="button"
            onClick={() => setShowShareModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#111116] hover:bg-[#18181F] border border-white/[0.09] text-[12px] font-medium text-[#F4F4F6] transition-mechanical whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5 text-[#9494A3]" strokeWidth={1.5} />
            <span>Share</span>
          </button>
        </div>
      </header>

      {/* IDE Main Body */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* Quiet Mastermind v2 Future Scope Vertical Icon Rail */}
        <aside
          aria-label="Upcoming v2 workspace modules"
          className="w-10 shrink-0 bg-[#050507] border-r border-white/[0.07] py-3 flex flex-col items-center gap-2"
        >
          {MASTERMIND_RAIL.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.id} className="relative group">
                <button
                  type="button"
                  aria-label={`${item.label} (Coming in v2)`}
                  onClick={() =>
                    onToast(`${item.label}`, 'info', 'Planned for Mastermind v2 release.')
                  }
                  className="w-7 h-7 rounded-md flex items-center justify-center text-[#5C5C6E]/75 hover:text-[#9494A3] hover:bg-[#111116] transition-mechanical cursor-pointer"
                >
                  <Icon className="w-3.5 h-3.5" strokeWidth={1.5} />
                </button>
                <div
                  role="tooltip"
                  className="pointer-events-none opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-mechanical absolute left-full top-1/2 -translate-y-1/2 ml-2 z-40 px-2.5 py-1 rounded-md bg-[#111116]/95 backdrop-blur-xl border border-white/10 text-[11px] text-[#F4F4F6] whitespace-nowrap"
                >
                  <span>{item.label}</span>
                  <span className="ml-1.5 font-mono text-[10px] text-[#5C5C6E]">
                    Coming in v2
                  </span>
                </div>
              </div>
            );
          })}
        </aside>

        {/* Left Sidebar: File Explorer */}
        <FileExplorer
          nodes={project.nodes}
          activeFileId={activeFileId}
          canManageFiles={perms.canManageFiles}
          onSelectFile={openFile}
          onCreateFolder={(name, parentId) => onCreateFolder(project.id, name, parentId)}
          onCreateFile={(name, language, parentId) => {
            const res = onCreateFile(project.id, name, language, parentId);
            if (!res.error && res.createdId) {
              openFile(res.createdId);
            }
            return res;
          }}
          onRenameNode={(nodeId, nextName) => onRenameNode(project.id, nodeId, nextName)}
          onMoveNode={(nodeId, targetParentId) =>
            onMoveNode(project.id, nodeId, targetParentId)
          }
          onDeleteNode={(nodeId) => onDeleteNode(project.id, nodeId)}
          externalCreateFileTrigger={createFileTrigger}
          externalCreateFolderTrigger={createFolderTrigger}
        />

        {/* Right Split: Code Editor + Bottom Resizable Panel */}
        <div className="flex-1 min-w-0 min-h-0 flex flex-col">
          <CodeEditor
            openFiles={openFiles}
            activeFile={activeFile}
            canEditCode={perms.canEditCode}
            saveStatus={saveStatus}
            showLiveCursors={showLiveCursors}
            onToggleLiveCursors={() => setShowLiveCursors((prev) => !prev)}
            onSelectTab={setActiveFileId}
            onCloseTab={closeTab}
            onChangeContent={handleContentEdit}
          />

          <BottomPanel
            projectId={project.id}
            projectName={project.name}
            nodes={project.nodes}
            userName={user.name}
            canRunCode={perms.canRunCode}
            activeTab={bottomTab}
            onTabChange={setBottomTab}
            latestExecution={latestExecution}
            executions={project.executions}
            onTerminalExecution={(record) => {
              setLatestExecution(record);
              onRecordExecution(project.id, record);
            }}
          />
        </div>
      </div>

      {/* Share & Collaboration Management Modal */}
      {showShareModal && (
        <ShareModal
          projectName={project.name}
          collaborators={project.collaborators}
          canManageCollaborators={perms.canManageCollaborators}
          onClose={() => setShowShareModal(false)}
          onInvite={(email, access) => onInviteCollaborator(project.id, email, access)}
          onUpdateAccess={(collabId, access) =>
            onUpdateCollaboratorAccess(project.id, collabId, access)
          }
          onRevoke={(collabId) => onRevokeCollaborator(project.id, collabId)}
        />
      )}
    </div>
  );
}
