import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Bug,
  Check,
  Container,
  FolderTree,
  GitBranch,
  Loader2,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Play,
  RefreshCw,
  Search,
  Share2,
  Sparkles,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { ApiClientError } from '../api/errors';
import type { ApiExecutionRecord } from '../api/types';
import { featureFlags } from '../config/features';
import { useActiveDebugSessionQuery, useBreakpointsQuery, useDebugMutations } from '../hooks/useDebugAndGit';
import { useRunFileMutation } from '../hooks/useExecutions';
import { usePermissions } from '../hooks/usePermissions';
import { useFileDetailQuery, useLanguagesQuery, useNodeMutations, useProjectTreeQuery } from '../hooks/useProjectNodes';
import { useLeaveProjectMutation, useProjectDetailsQuery, useProjectsQuery, useRenameProjectMutation } from '../hooks/useProjects';
import { useRealtimeWorkspace } from '../hooks/useRealtimeWorkspace';
import { getInitials, useAuth } from '../state/authStore';
import { useUiStore } from '../state/uiStore';
import type { FileNode, Project, SupportedLanguage } from '../types/devsync';
import { getNodeBreadcrumb, getSortedChildren } from '../utils/fileTree';
import { detectPlatform, matchWorkspaceShortcut } from '../utils/shortcuts';
import { BrandLogo } from './BrandMark';
import { CollaboratorsDialog } from './CollaboratorsDialog';
import { CommandPalette } from './CommandPalette';
import { ExecutionPanel, type WorkspaceBottomTab } from './ExecutionPanel';
import { FileExplorer } from './FileExplorer';
import { MonacoCodeEditor, type FileSaveState, type MonacoModelBindingContext, type OpenEditorFile } from './MonacoCodeEditor';
import { ProjectErrorState } from './ProjectErrorState';
import { Dialog, GlassButton, GlassPanel, RoleChip, Skeleton, StatusChip, Tooltip } from './ui';
import { AiAssistantPanel } from './workspace/AiAssistantPanel';
import { DebugPanel } from './workspace/DebugPanel';
import { EnvironmentPanel } from './workspace/EnvironmentPanel';
import { GitPanel } from './workspace/GitPanel';
import { VoiceControl } from './workspace/VoiceControl';
import { XtermTerminalPanel } from './workspace/XtermTerminalPanel';

type SideRailPanel = 'explorer' | 'git' | 'debug' | 'env' | 'ai';

export function WorkspacePage() {
  const { projectId = '' } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { pushToast, commandPaletteOpen, setCommandPaletteOpen } = useUiStore();

  const projectQuery = useProjectDetailsQuery(projectId);
  const treeQuery = useProjectTreeQuery(projectId);
  const languagesQuery = useLanguagesQuery();
  const dashboardQuery = useProjectsQuery('');
  const renameProjectMutation = useRenameProjectMutation();
  const leaveProjectMutation = useLeaveProjectMutation();
  const nodeMutations = useNodeMutations(projectId);
  const runFileMutation = useRunFileMutation(projectId);

  const [activeSidePanel, setActiveSidePanel] = useState<SideRailPanel>('explorer');
  const [sidebarOpen, setSidebarOpen] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true
  );
  const [bottomTab, setBottomTab] = useState<WorkspaceBottomTab>('output');
  const [bottomPanelVisible, setBottomPanelVisible] = useState(true);
  const [openTabIds, setOpenTabIds] = useState<string[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loadedContents, setLoadedContents] = useState<Record<string, string>>({});
  const [saveStates, setSaveStates] = useState<Record<string, FileSaveState>>({});
  const [stdin, setStdin] = useState('');
  const [latestExecution, setLatestExecution] = useState<ApiExecutionRecord | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const [accessRevoked, setAccessRevoked] = useState(false);
  const [inlineSuggestionsEnabled, setInlineSuggestionsEnabled] = useState(() =>
    Boolean((user?.preferences as { aiSuggestions?: boolean } | undefined)?.aiSuggestions ?? true)
  );

  const [explorerFocused, setExplorerFocused] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [createFileTrigger, setCreateFileTrigger] = useState(0);
  const [createFolderTrigger, setCreateFolderTrigger] = useState(0);
  const [renameTrigger, setRenameTrigger] = useState(0);
  const [deleteTrigger, setDeleteTrigger] = useState(0);

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');

  const saveTimersRef = useRef<Record<string, number>>({});
  const draftsRef = useRef(drafts);
  draftsRef.current = drafts;

  const activeFileDetailQuery = useFileDetailQuery(projectId, activeFileId);
  const breakpointsQuery = useBreakpointsQuery(projectId, activeFileId, featureFlags.debug);
  const activeDebugQuery = useActiveDebugSessionQuery(projectId, featureFlags.debug);
  const debugMutations = useDebugMutations(projectId);

  useEffect(() => {
    setOpenTabIds([]);
    setActiveFileId(null);
    setDrafts({});
    setLoadedContents({});
    setSaveStates({});
    setLatestExecution(null);
    setStdin('');
    setSelectedNodeId(null);
    setEditingTitle(false);
    Object.values(saveTimersRef.current).forEach((id) => window.clearTimeout(id));
    saveTimersRef.current = {};
  }, [projectId]);

  const treeNodes = useMemo<FileNode[]>(() => {
    if (!treeQuery.data?.nodes) return [];
    return treeQuery.data.nodes.map((n) => ({
      id: n.id,
      parentId: n.parentId,
      type: n.type,
      name: n.name,
      language: (n.language as SupportedLanguage | undefined) ?? undefined,
      content: drafts[n.id] ?? loadedContents[n.id],
      updatedAt: n.updatedAt ?? new Date().toISOString(),
    }));
  }, [treeQuery.data?.nodes, drafts, loadedContents]);

  useEffect(() => {
    if (openTabIds.length === 0 && treeNodes.length > 0 && !activeFileId) {
      const sortedRoot = getSortedChildren(treeNodes, null);
      const firstFile =
        sortedRoot.find((n) => n.type === 'file') ??
        treeNodes.find((n) => n.type === 'file');
      if (firstFile) {
        setOpenTabIds([firstFile.id]);
        setActiveFileId(firstFile.id);
      }
    }
  }, [treeNodes, openTabIds.length, activeFileId]);

  useEffect(() => {
    if (!treeQuery.data?.nodes) return;
    const validIds = new Set(treeQuery.data.nodes.map((n) => n.id));
    setOpenTabIds((prev) => {
      const filtered = prev.filter((id) => validIds.has(id));
      if (filtered.length !== prev.length) {
        if (activeFileId && !validIds.has(activeFileId)) {
          setActiveFileId(filtered[0] ?? null);
        }
        return filtered;
      }
      return prev;
    });
  }, [treeQuery.data?.nodes, activeFileId]);

  useEffect(() => {
    const file = activeFileDetailQuery.data?.file;
    if (!file) return;
    setLoadedContents((prev) => ({
      ...prev,
      [file.id]: file.content,
    }));
  }, [activeFileDetailQuery.data?.file]);

  const role = projectQuery.data?.myRole ?? 'viewer';
  const perms = usePermissions(role);
  const projectName = projectQuery.data?.project.name ?? '';
  const languages = languagesQuery.data?.languages ?? [];

  const realtime = useRealtimeWorkspace({
    projectId,
    activeFileId,
    enabled: Boolean(projectQuery.data) && !accessRevoked,
    onRoleChanged: (nextRole) => {
      pushToast(`Workspace role updated to ${nextRole}`, 'info');
    },
    onAccessRevoked: () => {
      setAccessRevoked(true);
    },
  });

  const yjsManagedFileIds = useMemo(() => {
    if (realtime.connectionState !== 'connected' || !activeFileId) {
      return new Set<string>();
    }
    return new Set<string>([activeFileId]);
  }, [realtime.connectionState, activeFileId]);

  const handleModelAttached = useCallback(
    ({ editor, model, fileId }: MonacoModelBindingContext) => {
      if (realtime.connectionState !== 'connected' || !user) {
        return;
      }
      const socket = realtime.socketRef.current;
      realtime.yjsManager.getOrCreateDoc(
        fileId,
        { id: user.id, name: user.name, color: user.avatarColor },
        (fid, update) => {
          socket?.emit('yjs:update', { projectId, fileId: fid, update });
        },
        (fid, awarenessUpdate) => {
          socket?.emit('yjs:awareness', { projectId, fileId: fid, update: awarenessUpdate });
        }
      );
      const initial = draftsRef.current[fileId] ?? loadedContents[fileId] ?? model.getValue();
      realtime.yjsManager.seedInitialContent(fileId, initial);
      return realtime.yjsManager.attachMonaco(fileId, editor, model);
    },
    [loadedContents, projectId, realtime.connectionState, realtime.socketRef, realtime.yjsManager, user]
  );

  const openFile = useCallback((fileId: string) => {
    setOpenTabIds((prev) => (prev.includes(fileId) ? prev : [...prev, fileId]));
    setActiveFileId(fileId);
  }, []);

  const closeTab = useCallback(
    (fileId: string) => {
      const timer = saveTimersRef.current[fileId];
      if (timer) {
        window.clearTimeout(timer);
        delete saveTimersRef.current[fileId];
      }
      setOpenTabIds((prev) => {
        const idx = prev.indexOf(fileId);
        const next = prev.filter((id) => id !== fileId);
        if (activeFileId === fileId) {
          setActiveFileId(next[Math.max(0, idx - 1)] ?? null);
        }
        return next;
      });
    },
    [activeFileId]
  );

  const saveFileNow = useCallback(
    async (fileId: string) => {
      if (!perms.canEditCode) return;
      const content = draftsRef.current[fileId];
      if (content === undefined) return;

      const timer = saveTimersRef.current[fileId];
      if (timer) {
        window.clearTimeout(timer);
        delete saveTimersRef.current[fileId];
      }

      setSaveStates((prev) => ({ ...prev, [fileId]: 'saving' }));
      try {
        await nodeMutations.updateContent.mutateAsync({ fileId, content });
        setLoadedContents((prev) => ({ ...prev, [fileId]: content }));
        setSaveStates((prev) => ({ ...prev, [fileId]: 'saved' }));
        realtime.clearOfflineEdits();
      } catch (err) {
        setSaveStates((prev) => ({ ...prev, [fileId]: 'error' }));
        if (!navigator.onLine) {
          realtime.recordOfflineEdit();
        }
        const msg = err instanceof ApiClientError ? err.userMessage : 'Could not save file.';
        pushToast('Save failed', 'error', msg);
      }
    },
    [nodeMutations.updateContent, perms.canEditCode, pushToast, realtime]
  );

  const handleContentEdit = useCallback(
    (fileId: string, nextContent: string) => {
      if (!perms.canEditCode) return;
      setDrafts((prev) => ({ ...prev, [fileId]: nextContent }));
      setSaveStates((prev) => ({ ...prev, [fileId]: 'dirty' }));
      if (!navigator.onLine) {
        realtime.recordOfflineEdit();
      }

      const existing = saveTimersRef.current[fileId];
      if (existing) window.clearTimeout(existing);

      saveTimersRef.current[fileId] = window.setTimeout(() => {
        void saveFileNow(fileId);
      }, 900);
    },
    [perms.canEditCode, realtime, saveFileNow]
  );

  const activeNode = useMemo(
    () => treeNodes.find((n) => n.id === activeFileId && n.type === 'file') ?? null,
    [treeNodes, activeFileId]
  );

  const activeLanguageMode = useMemo(() => {
    if (!activeNode?.language) return 'none';
    const reg = languages.find((l) => l.key === activeNode.language);
    if (reg) return reg.mode;
    if (activeNode.language === 'html') return 'preview';
    if (activeNode.language === 'css' || activeNode.language === 'text') return 'none';
    return 'run';
  }, [activeNode?.language, languages]);

  const handleRunActiveFile = useCallback(async () => {
    if (!perms.canRunCode) {
      pushToast('Execution blocked', 'error', perms.denialReason('runCode'));
      return;
    }
    if (!activeNode) {
      pushToast('No file selected', 'info', 'Open a file first to run it.');
      return;
    }
    if (activeLanguageMode === 'preview') {
      pushToast('HTML Preview active', 'info', 'HTML files render live in the preview pane.');
      return;
    }
    if (activeLanguageMode === 'none') {
      pushToast(
        'Not executable directly',
        'info',
        `${activeNode.name} (${activeNode.language}) is a non-executable asset.`
      );
      return;
    }

    setBottomPanelVisible(true);
    setBottomTab('output');
    const content = draftsRef.current[activeNode.id] ?? loadedContents[activeNode.id];

    try {
      const res = await runFileMutation.mutateAsync({
        fileId: activeNode.id,
        stdin,
        content,
      });
      setLatestExecution(res.execution);
      pushToast(
        res.execution.status === 'success'
          ? `Executed ${activeNode.name}`
          : `Execution finished (${res.execution.status})`,
        res.execution.status === 'success' ? 'success' : 'error'
      );
    } catch (err) {
      const msg = err instanceof ApiClientError ? err.userMessage : 'Execution failed.';
      pushToast('Execution failed', 'error', msg);
    }
  }, [
    activeLanguageMode,
    activeNode,
    loadedContents,
    perms,
    pushToast,
    runFileMutation,
    stdin,
  ]);

  const activeBreakpointLines = useMemo(
    () => (breakpointsQuery.data?.breakpoints ?? []).map((b) => b.line),
    [breakpointsQuery.data?.breakpoints]
  );

  const handleToggleBreakpoint = useCallback(
    async (fileId: string, line: number) => {
      if (!perms.canDebug) {
        pushToast('Breakpoint blocked', 'info', perms.denialReason('debug'));
        return;
      }
      const current = activeBreakpointLines;
      const exists = current.includes(line);
      const next = exists
        ? current.filter((l) => l !== line)
        : [...current, line].sort((a, b) => a - b);

      try {
        await debugMutations.replaceBreakpoints.mutateAsync({
          fileId,
          breakpoints: next,
        });
      } catch (err) {
        const msg =
          err instanceof ApiClientError ? err.userMessage : 'Could not update breakpoints.';
        pushToast('Breakpoint error', 'error', msg);
      }
    },
    [activeBreakpointLines, debugMutations.replaceBreakpoints, perms, pushToast]
  );

  useEffect(() => {
    const platform = detectPlatform();
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const inTextInput =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.tagName === 'SELECT';
      const inMonaco = Boolean(target?.closest('.monaco-editor'));

      const action = matchWorkspaceShortcut(e, platform, {
        inExplorer: explorerFocused,
        inTextInput: inTextInput && !inMonaco,
      });

      if (!action) return;

      switch (action) {
        case 'command-palette':
          e.preventDefault();
          setCommandPaletteOpen((prev) => !prev);
          break;
        case 'save-file':
          e.preventDefault();
          if (activeFileId && perms.canEditCode) {
            void saveFileNow(activeFileId);
          }
          break;
        case 'toggle-sidebar':
          e.preventDefault();
          setSidebarOpen((prev) => !prev);
          break;
        case 'toggle-terminal':
          e.preventDefault();
          setBottomPanelVisible((prev) => !prev);
          setBottomTab('terminal');
          break;
        case 'new-file':
          if (perms.canManageFiles) {
            e.preventDefault();
            setCreateFileTrigger((n) => n + 1);
          }
          break;
        case 'new-folder':
          if (perms.canManageFiles) {
            e.preventDefault();
            setCreateFolderTrigger((n) => n + 1);
          }
          break;
        case 'rename-node':
          if (perms.canManageFiles) {
            e.preventDefault();
            setRenameTrigger((n) => n + 1);
          }
          break;
        case 'delete-node':
          if (perms.canManageFiles) {
            e.preventDefault();
            setDeleteTrigger((n) => n + 1);
          }
          break;
        case 'run-file':
          e.preventDefault();
          void handleRunActiveFile();
          break;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    activeFileId,
    explorerFocused,
    handleRunActiveFile,
    perms.canEditCode,
    perms.canManageFiles,
    saveFileNow,
    setCommandPaletteOpen,
  ]);

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

  if (accessRevoked) {
    return (
      <ProjectErrorState
        error={
          new ApiClientError({
            status: 403,
            code: 'FORBIDDEN',
            message: 'Your access to this workspace was revoked by the project owner.',
          })
        }
        titleOverride="Workspace access revoked"
      />
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

  const openEditorFiles: OpenEditorFile[] = openTabIds
    .map((id): OpenEditorFile | null => {
      const node = treeNodes.find((n) => n.id === id && n.type === 'file');
      if (!node) return null;
      const isCurrent = id === activeFileId;
      const hasContent = drafts[id] !== undefined || loadedContents[id] !== undefined;
      const loadErr =
        isCurrent && activeFileDetailQuery.error instanceof ApiClientError
          ? activeFileDetailQuery.error.userMessage
          : null;

      return {
        id: node.id,
        name: node.name,
        language: node.language ?? 'text',
        content: drafts[id] ?? loadedContents[id] ?? '',
        isLoading: isCurrent && !hasContent && activeFileDetailQuery.isLoading,
        loadError: loadErr,
      };
    })
    .filter((f): f is OpenEditorFile => Boolean(f));

  const activeEditorFile =
    openEditorFiles.find((f) => f.id === activeFileId) ?? null;

  const breadcrumb = activeFileId ? getNodeBreadcrumb(treeNodes, activeFileId) : [];

  const commitProjectRename = async () => {
    setEditingTitle(false);
    if (!perms.canRenameProject) return;
    const trimmed = titleDraft.trim();
    if (!trimmed || trimmed === projectName) return;
    try {
      await renameProjectMutation.mutateAsync({ projectId, name: trimmed });
      pushToast(`Renamed project to "${trimmed}"`, 'success');
    } catch (err) {
      const msg = err instanceof ApiClientError ? err.userMessage : 'Rename failed.';
      pushToast('Rename failed', 'error', msg);
    }
  };

  const runTooltip = !perms.canRunCode
    ? perms.denialReason('runCode') ?? 'Disabled for Viewer'
    : !activeEditorFile
    ? 'Open a file to execute'
    : activeLanguageMode === 'none'
    ? 'CSS and plain text files cannot be executed directly'
    : activeLanguageMode === 'preview'
    ? 'HTML files render in live preview'
    : 'Run active file (⌘↵ / Ctrl+Enter)';

  const runDisabled =
    !perms.canRunCode ||
    !activeEditorFile ||
    activeLanguageMode === 'none' ||
    runFileMutation.isPending;

  const railItems: Array<{
    id: SideRailPanel;
    label: string;
    icon: typeof FolderTree;
    enabled: boolean;
  }> = [
    { id: 'explorer', label: 'Explorer', icon: FolderTree, enabled: true },
    { id: 'git', label: 'Source Control', icon: GitBranch, enabled: featureFlags.git },
    { id: 'debug', label: 'Debug', icon: Bug, enabled: featureFlags.debug },
    { id: 'env', label: 'Environment', icon: Container, enabled: featureFlags.environment },
    { id: 'ai', label: 'AI Assistant', icon: Sparkles, enabled: featureFlags.aiAssistant },
  ];

  const paletteProjects: Project[] = [
    ...(dashboardQuery.data?.owned ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      ownerId: projectQuery.data.owner.id,
      ownerName: projectQuery.data.owner.name,
      currentUserRole: 'owner' as const,
      updatedAt: p.updatedAt,
      lastOpenedAt: p.updatedAt,
      nodes: p.id === projectId ? treeNodes : [],
      collaborators: [],
      executions: [],
    })),
    ...(dashboardQuery.data?.shared ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      ownerId: p.owner.id,
      ownerName: p.owner.name,
      currentUserRole: p.role,
      updatedAt: p.updatedAt,
      lastOpenedAt: p.updatedAt,
      nodes: p.id === projectId ? treeNodes : [],
      collaborators: [],
      executions: [],
    })),
  ];

  const activePaletteProject: Project = {
    id: projectId,
    name: projectName,
    ownerId: projectQuery.data.owner.id,
    ownerName: projectQuery.data.owner.name,
    currentUserRole: role,
    updatedAt: new Date().toISOString(),
    lastOpenedAt: new Date().toISOString(),
    nodes: treeNodes,
    collaborators: [],
    executions: [],
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-[var(--surface-canvas)] text-[var(--text-primary)] flex flex-col">
      {/* Minimum-width notice on narrow mobile screens */}
      <div className="sm:hidden px-3 py-2 bg-[var(--state-warning-bg)] border-b border-[var(--state-warning-border)] text-[11px] text-[#fde047] flex items-center justify-between gap-2 shrink-0">
        <span>IDE layout works best at 768px+ viewport width.</span>
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="underline font-medium shrink-0 cursor-pointer"
        >
          Dashboard
        </button>
      </div>

      {/* Top Workspace Bar */}
      <header className="h-12 px-3 glass-toolbar border-b flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            aria-label="Back to Dashboard"
            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[12px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-mechanical whitespace-nowrap shrink-0 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span className="hidden sm:inline">Dashboard</span>
          </button>

          <button
            type="button"
            onClick={() => setSidebarOpen((prev) => !prev)}
            aria-label={sidebarOpen ? 'Hide side panel' : 'Show side panel'}
            title="Toggle Side Panel (⌘B / Ctrl+B)"
            className="p-1.5 rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-mechanical cursor-pointer"
          >
            {sidebarOpen ? (
              <PanelLeftClose className="w-3.5 h-3.5" strokeWidth={1.5} />
            ) : (
              <PanelLeftOpen className="w-3.5 h-3.5" strokeWidth={1.5} />
            )}
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
                onBlur={() => void commitProjectRename()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void commitProjectRename();
                  if (e.key === 'Escape') {
                    setTitleDraft(projectName);
                    setEditingTitle(false);
                  }
                }}
                className="w-40 rounded bg-[var(--surface-elevated)] border border-[var(--accent-primary)] px-2 py-0.5 text-[13px] font-medium text-[var(--text-primary)] focus:outline-none"
              />
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => void commitProjectRename()}
                aria-label="Save project name"
                className="p-1 text-[var(--state-success)] cursor-pointer"
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
                setTitleDraft(projectName);
                setEditingTitle(true);
              }}
              title={
                perms.canRenameProject
                  ? 'Click to rename project'
                  : perms.denialReason('renameProject')
              }
              className={`group inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--text-primary)] truncate max-w-[160px] ${
                perms.canRenameProject ? 'hover:text-white cursor-pointer' : 'cursor-default'
              }`}
            >
              <span className="truncate">{projectName}</span>
              {perms.canRenameProject && (
                <Pencil
                  className="w-3 h-3 text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-mechanical shrink-0"
                  strokeWidth={1.5}
                />
              )}
            </button>
          )}

          {breadcrumb.length > 0 && (
            <nav
              aria-label="File path breadcrumb"
              className="hidden lg:flex items-center gap-1.5 text-[12px] font-mono text-[var(--text-muted)] min-w-0 truncate"
            >
              {breadcrumb.map((part) => (
                <span key={part.id} className="inline-flex items-center gap-1.5 truncate">
                  <span aria-hidden="true">/</span>
                  <span
                    className={
                      part.id === activeFileId
                        ? 'text-[var(--text-secondary)] truncate'
                        : 'text-[var(--text-muted)] truncate'
                    }
                  >
                    {part.name}
                  </span>
                </span>
              ))}
            </nav>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {realtime.participants.length > 0 && (
            <div
              className="hidden lg:flex items-center -space-x-1.5 mr-1"
              aria-label={`${realtime.participants.length} collaborators online`}
            >
              {realtime.participants.slice(0, 4).map((p) => (
                <div
                  key={p.userId}
                  title={`${p.name} (${p.role}) — Online`}
                  className="relative w-6 h-6 rounded-full bg-[var(--surface-hover)] border border-white/[0.14] flex items-center justify-center text-[10px] font-mono text-[var(--text-primary)]"
                >
                  {getInitials(p.name)}
                  <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-[var(--state-success)] ring-1 ring-[var(--surface-canvas)]" />
                </div>
              ))}
            </div>
          )}

          <StatusChip
            tone={
              realtime.connectionState === 'connected'
                ? 'success'
                : realtime.connectionState === 'reconnecting' ||
                  realtime.connectionState === 'connecting'
                ? 'warning'
                : realtime.connectionState === 'offline'
                ? 'danger'
                : 'neutral'
            }
          >
            {realtime.connectionState === 'connected' ? (
              <>
                <Wifi className="w-3 h-3" strokeWidth={1.75} />
                <span className="hidden sm:inline">
                  Live · {Math.max(1, realtime.participants.length)} online
                </span>
              </>
            ) : realtime.connectionState === 'offline' ? (
              <>
                <WifiOff className="w-3 h-3" strokeWidth={1.75} />
                <span>Offline</span>
              </>
            ) : realtime.connectionState === 'reconnecting' ? (
              <>
                <RefreshCw className="w-3 h-3 animate-spin" strokeWidth={1.75} />
                <span>Reconnecting…</span>
              </>
            ) : (
              <span className="hidden sm:inline">REST Sync</span>
            )}
          </StatusChip>

          {featureFlags.voice && (
            <VoiceControl
              projectId={projectId}
              socket={realtime.socketRef.current}
              socketConnected={realtime.connectionState === 'connected'}
            />
          )}

          <RoleChip role={role} />

          <button
            type="button"
            onClick={() => setCommandPaletteOpen(true)}
            aria-label="Open Command Palette"
            title="Command Palette (⌘K)"
            className="hidden xl:inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-[var(--surface-base)] hover:bg-[var(--surface-hover)] border border-[var(--border-hairline)] text-[12px] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-mechanical cursor-pointer"
          >
            <Search className="w-3.5 h-3.5" strokeWidth={1.5} />
            <kbd className="font-mono text-[10px]">⌘K</kbd>
          </button>

          <Tooltip label={runTooltip} side="bottom">
            <GlassButton
              variant="primary"
              size="sm"
              disabled={runDisabled}
              loading={runFileMutation.isPending}
              onClick={() => void handleRunActiveFile()}
            >
              {runFileMutation.isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={1.75} />
                  <span>Running…</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" strokeWidth={1.75} />
                  <span>{activeLanguageMode === 'preview' ? 'Preview' : 'Run'}</span>
                </>
              )}
            </GlassButton>
          </Tooltip>

          {perms.canShareProject ? (
            <GlassButton variant="glass" size="sm" onClick={() => setShareOpen(true)}>
              <Share2 className="w-3.5 h-3.5 text-[var(--text-secondary)]" strokeWidth={1.5} />
              <span>Share</span>
            </GlassButton>
          ) : (
            <GlassButton
              variant="ghost"
              size="sm"
              onClick={() => setLeaveConfirmOpen(true)}
              className="text-[var(--text-secondary)] hover:text-[#fca5a5]"
            >
              <LogOut className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span className="hidden sm:inline">Leave</span>
            </GlassButton>
          )}
        </div>
      </header>

      {/* Main IDE Body */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* Activity Rail */}
        <nav
          aria-label="Workspace tools"
          className="w-11 shrink-0 bg-[var(--surface-canvas)] border-r border-[var(--border-hairline)] py-2.5 flex flex-col items-center gap-1.5"
        >
          {railItems
            .filter((item) => item.enabled)
            .map((item) => {
              const Icon = item.icon;
              const isActive = sidebarOpen && activeSidePanel === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-label={item.label}
                  aria-pressed={isActive}
                  title={item.label}
                  onClick={() => {
                    if (isActive) {
                      setSidebarOpen(false);
                    } else {
                      setActiveSidePanel(item.id);
                      setSidebarOpen(true);
                    }
                  }}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-mechanical cursor-pointer ${
                    isActive
                      ? 'bg-[var(--accent-soft)] text-[#c7d2fe] border border-[var(--accent-primary)]/40'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]'
                  }`}
                >
                  <Icon className="w-4 h-4" strokeWidth={1.5} />
                </button>
              );
            })}
        </nav>

        {/* Active Side Panel */}
        {sidebarOpen && activeSidePanel === 'explorer' && (
          <FileExplorer
            nodes={treeNodes}
            languages={languages}
            activeFileId={activeFileId}
            canManageFiles={perms.canManageFiles}
            isLoading={treeQuery.isLoading}
            onSelectFile={openFile}
            onCreateFolder={async (name, parentId) => {
              try {
                const res = await nodeMutations.createFolder.mutateAsync({ name, parentId });
                realtime.markLocalTreeMutation('node:created', res.node.id);
                pushToast(`Created folder "${name.trim()}"`, 'success');
                return {};
              } catch (err) {
                return {
                  error:
                    err instanceof ApiClientError
                      ? err.userMessage
                      : 'Could not create folder.',
                };
              }
            }}
            onCreateFile={async (name, language, parentId) => {
              try {
                const res = await nodeMutations.createFile.mutateAsync({
                  name,
                  language,
                  parentId,
                });
                realtime.markLocalTreeMutation('node:created', res.node.id);
                openFile(res.node.id);
                pushToast(`Created ${res.node.name}`, 'success');
                return { createdId: res.node.id };
              } catch (err) {
                return {
                  error:
                    err instanceof ApiClientError ? err.userMessage : 'Could not create file.',
                };
              }
            }}
            onRenameNode={async (nodeId, nextName) => {
              try {
                await nodeMutations.renameNode.mutateAsync({ nodeId, name: nextName });
                realtime.markLocalTreeMutation('node:renamed', nodeId);
                pushToast(`Renamed to "${nextName.trim()}"`, 'success');
                return {};
              } catch (err) {
                return {
                  error:
                    err instanceof ApiClientError ? err.userMessage : 'Could not rename item.',
                };
              }
            }}
            onMoveNode={async (nodeId, parentId) => {
              try {
                await nodeMutations.moveNode.mutateAsync({ nodeId, parentId });
                realtime.markLocalTreeMutation('node:moved', nodeId);
                pushToast('Moved item', 'success');
                return {};
              } catch (err) {
                const msg =
                  err instanceof ApiClientError ? err.userMessage : 'Could not move item.';
                pushToast('Move failed', 'error', msg);
                return { error: msg };
              }
            }}
            onChangeFileLanguage={async (fileId, language) => {
              try {
                await nodeMutations.changeLanguage.mutateAsync({ fileId, language });
                realtime.markLocalTreeMutation('file:language', fileId);
                pushToast('Updated file language', 'success');
                return {};
              } catch (err) {
                const msg =
                  err instanceof ApiClientError
                    ? err.userMessage
                    : 'Could not change language.';
                pushToast('Language update failed', 'error', msg);
                return { error: msg };
              }
            }}
            onDeleteNode={async (nodeId) => {
              try {
                const res = await nodeMutations.deleteNode.mutateAsync(nodeId);
                realtime.markLocalTreeMutation('node:deleted', nodeId);
                for (const deletedId of res.deletedIds) {
                  realtime.yjsManager.destroyFile(deletedId);
                  closeTab(deletedId);
                }
                pushToast('Deleted item', 'info');
              } catch (err) {
                const msg =
                  err instanceof ApiClientError ? err.userMessage : 'Could not delete item.';
                pushToast('Delete failed', 'error', msg);
              }
            }}
            externalCreateFileTrigger={createFileTrigger}
            externalCreateFolderTrigger={createFolderTrigger}
            onExplorerFocusChange={setExplorerFocused}
            selectedNodeId={selectedNodeId}
            onSelectNodeChange={setSelectedNodeId}
            externalRenameTrigger={renameTrigger}
            externalDeleteTrigger={deleteTrigger}
          />
        )}

        {sidebarOpen && activeSidePanel === 'git' && (
          <aside className="w-[272px] shrink-0 border-r border-[var(--border-hairline)] flex flex-col overflow-hidden">
            <GitPanel projectId={projectId} permissions={perms} />
          </aside>
        )}

        {sidebarOpen && activeSidePanel === 'debug' && (
          <aside className="w-[272px] shrink-0 border-r border-[var(--border-hairline)] flex flex-col overflow-hidden">
            <DebugPanel
              projectId={projectId}
              activeFile={
                activeEditorFile
                  ? {
                      id: activeEditorFile.id,
                      name: activeEditorFile.name,
                      language: activeEditorFile.language,
                    }
                  : null
              }
              breakpoints={activeBreakpointLines}
              onToggleBreakpoint={(line) => {
                if (activeFileId) void handleToggleBreakpoint(activeFileId, line);
              }}
              permissions={perms}
            />
          </aside>
        )}

        {sidebarOpen && activeSidePanel === 'env' && (
          <aside className="w-[272px] shrink-0 border-r border-[var(--border-hairline)] flex flex-col overflow-hidden">
            <EnvironmentPanel nodes={treeNodes} permissions={perms} />
          </aside>
        )}

        {sidebarOpen && activeSidePanel === 'ai' && (
          <aside className="w-[300px] shrink-0 border-r border-[var(--border-hairline)] flex flex-col overflow-hidden">
            <AiAssistantPanel
              activeFile={
                activeEditorFile
                  ? {
                      id: activeEditorFile.id,
                      name: activeEditorFile.name,
                      language: activeEditorFile.language,
                      content: activeEditorFile.content,
                    }
                  : null
              }
              latestExecution={latestExecution}
              permissions={perms}
              inlineSuggestionsEnabled={inlineSuggestionsEnabled}
              onToggleInlineSuggestions={setInlineSuggestionsEnabled}
              onApplyCodeToActiveFile={(fileId, nextContent) => {
                handleContentEdit(fileId, nextContent);
                void saveFileNow(fileId);
              }}
            />
          </aside>
        )}

        {/* Editor + Bottom Execution & Xterm Panel */}
        <div className="flex-1 min-w-0 min-h-0 flex flex-col">
          <MonacoCodeEditor
            openFiles={openEditorFiles}
            activeFile={activeEditorFile}
            languages={languages}
            canEditCode={perms.canEditCode}
            saveStates={saveStates}
            onSelectTab={setActiveFileId}
            onCloseTab={closeTab}
            onChangeContent={handleContentEdit}
            onSaveFile={(fileId) => void saveFileNow(fileId)}
            onModelAttached={handleModelAttached}
            onGutterMouseDown={(fileId, line) => void handleToggleBreakpoint(fileId, line)}
            breakpoints={activeBreakpointLines}
            activeDebugLine={
              activeDebugQuery.data?.session?.fileId === activeFileId
                ? activeDebugQuery.data.session.currentLine
                : null
            }
            yjsManagedFileIds={yjsManagedFileIds}
            inlineSuggestionsEnabled={inlineSuggestionsEnabled}
            onChangeLanguage={(fileId, language) => {
              void nodeMutations.changeLanguage
                .mutateAsync({ fileId, language })
                .then(() => pushToast('Updated file language', 'success'))
                .catch((err) => {
                  const msg =
                    err instanceof ApiClientError
                      ? err.userMessage
                      : 'Could not update language.';
                  pushToast('Language update failed', 'error', msg);
                });
            }}
          />

          {bottomPanelVisible && (
            <ExecutionPanel
              projectId={projectId}
              nodes={treeNodes}
              activeFile={
                activeEditorFile
                  ? {
                      id: activeEditorFile.id,
                      name: activeEditorFile.name,
                      language: activeEditorFile.language,
                    }
                  : null
              }
              permissions={perms}
              activeTab={bottomTab}
              onTabChange={setBottomTab}
              latestExecution={latestExecution}
              isRunning={runFileMutation.isPending}
              stdin={stdin}
              onStdinChange={setStdin}
              onOpenFile={openFile}
              terminalSlot={
                <XtermTerminalPanel
                  projectId={projectId}
                  projectName={projectName}
                  nodes={treeNodes}
                  userName={user?.name ?? 'Developer'}
                  permissions={perms}
                  socket={realtime.socketRef.current}
                  socketConnected={realtime.connectionState === 'connected'}
                />
              }
            />
          )}
        </div>
      </div>

      {perms.canShareProject && (
        <CollaboratorsDialog
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          projectId={projectId}
          projectName={projectName}
          canManageCollaborators={perms.canManageCollaborators}
        />
      )}

      <Dialog
        open={leaveConfirmOpen}
        onClose={() => setLeaveConfirmOpen(false)}
        title={`Leave “${projectName}”?`}
        description="You will lose access to this shared workspace until the owner invites you again."
        maxWidthClass="max-w-[400px]"
      >
        <div className="flex items-center justify-end gap-2 pt-3">
          <GlassButton variant="ghost" autoFocus onClick={() => setLeaveConfirmOpen(false)}>
            Cancel
          </GlassButton>
          <GlassButton
            variant="danger"
            loading={leaveProjectMutation.isPending}
            onClick={() => {
              void leaveProjectMutation
                .mutateAsync(projectId)
                .then(() => {
                  pushToast(`Left "${projectName}"`, 'info');
                  navigate('/dashboard', { replace: true });
                })
                .catch((err) => {
                  const msg =
                    err instanceof ApiClientError ? err.userMessage : 'Could not leave project.';
                  pushToast('Leave failed', 'error', msg);
                });
            }}
          >
            Leave Project
          </GlassButton>
        </div>
      </Dialog>

      <CommandPalette
        open={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        projects={paletteProjects}
        activeProject={activePaletteProject}
        canManageFiles={perms.canManageFiles}
        canRunCode={perms.canRunCode}
        onOpenProject={(targetProjectId) => navigate(`/project/${targetProjectId}`)}
        onSelectFile={openFile}
        onRunCode={() => void handleRunActiveFile()}
        onNewFile={() => setCreateFileTrigger((n) => n + 1)}
        onNewFolder={() => setCreateFolderTrigger((n) => n + 1)}
        onOpenShare={perms.canShareProject ? () => setShareOpen(true) : undefined}
        onBackToDashboard={() => navigate('/dashboard')}
      />
    </div>
  );
}
