import {
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type FormEvent,
  type KeyboardEvent,
} from 'react';
import {
  ChevronDown,
  ChevronRight,
  FilePlus,
  Folder,
  FolderInput,
  FolderOpen,
  FolderPlus,
  Languages,
  MoreVertical,
  Pencil,
  Trash2,
} from 'lucide-react';
import type { FileNode, SupportedLanguage } from '../types/devsync';
import type { LanguageRegistryEntry } from '../api/types';
import {
  SUPPORTED_LANGUAGES,
  getLanguageMeta,
  getNodePath,
  getSortedChildren,
  isDescendantOf,
  resolveFileNameWithExtension,
} from '../utils/fileTree';
import { Dialog, FormField, GlassButton, GlassPanel, TextInput } from './ui';

interface FileExplorerProps {
  nodes: FileNode[];
  languages?: LanguageRegistryEntry[];
  activeFileId: string | null;
  canManageFiles: boolean;
  isLoading?: boolean;
  onSelectFile: (fileId: string) => void;
  onCreateFolder: (
    name: string,
    parentId: string | null
  ) => Promise<{ error?: string }> | { error?: string };
  onCreateFile: (
    name: string,
    language: SupportedLanguage,
    parentId: string | null
  ) => Promise<{ error?: string; createdId?: string }> | { error?: string; createdId?: string };
  onRenameNode: (
    nodeId: string,
    nextName: string
  ) => Promise<{ error?: string }> | { error?: string };
  onMoveNode: (
    nodeId: string,
    targetParentId: string | null
  ) => Promise<{ error?: string }> | { error?: string };
  onChangeFileLanguage?: (
    fileId: string,
    language: SupportedLanguage
  ) => Promise<{ error?: string }> | { error?: string };
  onDeleteNode: (nodeId: string) => Promise<{ error?: string } | void> | void;
  externalCreateFileTrigger: number;
  externalCreateFolderTrigger: number;
  onExplorerFocusChange?: (focused: boolean) => void;
  selectedNodeId?: string | null;
  onSelectNodeChange?: (nodeId: string | null) => void;
  externalRenameTrigger?: number;
  externalDeleteTrigger?: number;
}

interface VisibleTreeItem {
  node: FileNode;
  depth: number;
}

export function FileExplorer({
  nodes,
  languages,
  activeFileId,
  canManageFiles,
  isLoading = false,
  onSelectFile,
  onCreateFolder,
  onCreateFile,
  onRenameNode,
  onMoveNode,
  onChangeFileLanguage,
  onDeleteNode,
  externalCreateFileTrigger,
  externalCreateFolderTrigger,
  onExplorerFocusChange,
  selectedNodeId,
  onSelectNodeChange,
  externalRenameTrigger = 0,
  externalDeleteTrigger = 0,
}: FileExplorerProps) {
  const treeRef = useRef<HTMLDivElement | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | '__root__' | null>(null);

  // Context Menu
  const [contextMenu, setContextMenu] = useState<{
    node: FileNode;
    x: number;
    y: number;
  } | null>(null);

  // New Folder Dialog (Folder Name ONLY)
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [folderParentId, setFolderParentId] = useState<string | null>(null);
  const [folderError, setFolderError] = useState<string | null>(null);
  const [submittingFolder, setSubmittingFolder] = useState(false);

  // New File Dialog (File Name + Language)
  const [showFileModal, setShowFileModal] = useState(false);
  const [fileName, setFileName] = useState('');
  const [fileLanguage, setFileLanguage] = useState<SupportedLanguage>('python');
  const [fileParentId, setFileParentId] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [submittingFile, setSubmittingFile] = useState(false);

  // Rename Dialog
  const [renameTarget, setRenameTarget] = useState<FileNode | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renameError, setRenameError] = useState<string | null>(null);
  const [submittingRename, setSubmittingRename] = useState(false);

  // Move Dialog
  const [moveTarget, setMoveTarget] = useState<FileNode | null>(null);
  const [moveDestId, setMoveDestId] = useState<string>('__root__');
  const [moveError, setMoveError] = useState<string | null>(null);
  const [submittingMove, setSubmittingMove] = useState(false);

  // Change Language Dialog
  const [langTarget, setLangTarget] = useState<FileNode | null>(null);
  const [langValue, setLangValue] = useState<SupportedLanguage>('javascript');
  const [submittingLang, setSubmittingLang] = useState(false);

  // Delete Confirmation Dialog
  const [deleteTarget, setDeleteTarget] = useState<FileNode | null>(null);
  const [submittingDelete, setSubmittingDelete] = useState(false);

  const activeSelectedId = selectedNodeId ?? internalSelectedId;
  const setSelectedNode = (id: string | null) => {
    setInternalSelectedId(id);
    onSelectNodeChange?.(id);
  };

  // External triggers from Command Palette / Shortcuts
  const [lastFileTrigger, setLastFileTrigger] = useState(externalCreateFileTrigger);
  if (externalCreateFileTrigger !== lastFileTrigger) {
    setLastFileTrigger(externalCreateFileTrigger);
    if (canManageFiles) {
      setFileName('');
      setFileLanguage('python');
      setFileParentId(selectedFolderId);
      setFileError(null);
      setShowFileModal(true);
    }
  }

  const [lastFolderTrigger, setLastFolderTrigger] = useState(externalCreateFolderTrigger);
  if (externalCreateFolderTrigger !== lastFolderTrigger) {
    setLastFolderTrigger(externalCreateFolderTrigger);
    if (canManageFiles) {
      setFolderName('');
      setFolderParentId(selectedFolderId);
      setFolderError(null);
      setShowFolderModal(true);
    }
  }

  const [lastRenameTrigger, setLastRenameTrigger] = useState(externalRenameTrigger);
  if (externalRenameTrigger !== lastRenameTrigger) {
    setLastRenameTrigger(externalRenameTrigger);
    const target = nodes.find((n) => n.id === activeSelectedId);
    if (canManageFiles && target) {
      setRenameTarget(target);
      setRenameValue(target.name);
      setRenameError(null);
    }
  }

  const [lastDeleteTrigger, setLastDeleteTrigger] = useState(externalDeleteTrigger);
  if (externalDeleteTrigger !== lastDeleteTrigger) {
    setLastDeleteTrigger(externalDeleteTrigger);
    const target = nodes.find((n) => n.id === activeSelectedId);
    if (canManageFiles && target) {
      setDeleteTarget(target);
    }
  }

  const folders = useMemo(() => nodes.filter((n) => n.type === 'folder'), [nodes]);

  const languageOptions = useMemo(() => {
    if (languages && languages.length > 0) {
      return languages.map((l) => ({
        id: l.key as SupportedLanguage,
        label: l.label,
        ext: l.ext,
      }));
    }
    return SUPPORTED_LANGUAGES.map((l) => ({
      id: l.id,
      label: l.label,
      ext: l.extension,
    }));
  }, [languages]);

  const visibleItems = useMemo<VisibleTreeItem[]>(() => {
    const out: VisibleTreeItem[] = [];
    const walk = (parentId: string | null, depth: number) => {
      for (const node of getSortedChildren(nodes, parentId)) {
        out.push({ node, depth });
        if (node.type === 'folder' && (expandedFolders[node.id] ?? true)) {
          walk(node.id, depth + 1);
        }
      }
    };
    walk(null, 0);
    return out;
  }, [nodes, expandedFolders]);

  const toggleFolder = (folderId: string) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [folderId]: !(prev[folderId] ?? true),
    }));
    setSelectedFolderId(folderId);
    setSelectedNode(folderId);
  };

  const openNewFileModal = (parentId: string | null = selectedFolderId) => {
    if (!canManageFiles) return;
    setFileName('');
    setFileLanguage('python');
    setFileParentId(parentId);
    setFileError(null);
    setShowFileModal(true);
  };

  const openNewFolderModal = (parentId: string | null = selectedFolderId) => {
    if (!canManageFiles) return;
    setFolderName('');
    setFolderParentId(parentId);
    setFolderError(null);
    setShowFolderModal(true);
  };

  const handleTreeKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (visibleItems.length === 0) return;
    const currentIndex = visibleItems.findIndex((item) => item.node.id === activeSelectedId);
    const idx = currentIndex >= 0 ? currentIndex : 0;
    const current = visibleItems[idx]?.node;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = visibleItems[Math.min(visibleItems.length - 1, idx + 1)];
      if (next) setSelectedNode(next.node.id);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = visibleItems[Math.max(0, idx - 1)];
      if (prev) setSelectedNode(prev.node.id);
    } else if (e.key === 'ArrowRight' && current?.type === 'folder') {
      e.preventDefault();
      const isExpanded = expandedFolders[current.id] ?? true;
      if (!isExpanded) {
        setExpandedFolders((prev) => ({ ...prev, [current.id]: true }));
      }
    } else if (e.key === 'ArrowLeft' && current) {
      e.preventDefault();
      if (current.type === 'folder' && (expandedFolders[current.id] ?? true)) {
        setExpandedFolders((prev) => ({ ...prev, [current.id]: false }));
      } else if (current.parentId) {
        setSelectedNode(current.parentId);
      }
    } else if ((e.key === 'Enter' || e.key === ' ') && current) {
      e.preventDefault();
      if (current.type === 'folder') {
        toggleFolder(current.id);
      } else {
        setSelectedFolderId(current.parentId);
        onSelectFile(current.id);
      }
    }
  };

  const handleFolderSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmittingFolder(true);
    const res = await onCreateFolder(folderName, folderParentId);
    setSubmittingFolder(false);
    if (res.error) {
      setFolderError(res.error);
      return;
    }
    if (folderParentId) {
      setExpandedFolders((prev) => ({ ...prev, [folderParentId]: true }));
    }
    setShowFolderModal(false);
  };

  const handleFileSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmittingFile(true);
    const res = await onCreateFile(fileName, fileLanguage, fileParentId);
    setSubmittingFile(false);
    if (res.error) {
      setFileError(res.error);
      return;
    }
    if (fileParentId) {
      setExpandedFolders((prev) => ({ ...prev, [fileParentId]: true }));
    }
    setShowFileModal(false);
  };

  const handleRenameSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!renameTarget) return;
    setSubmittingRename(true);
    const res = await onRenameNode(renameTarget.id, renameValue);
    setSubmittingRename(false);
    if (res.error) {
      setRenameError(res.error);
      return;
    }
    setRenameTarget(null);
  };

  const handleMoveSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!moveTarget) return;
    const targetParent = moveDestId === '__root__' ? null : moveDestId;
    setSubmittingMove(true);
    const res = await onMoveNode(moveTarget.id, targetParent);
    setSubmittingMove(false);
    if (res.error) {
      setMoveError(res.error);
      return;
    }
    if (targetParent) {
      setExpandedFolders((prev) => ({ ...prev, [targetParent]: true }));
    }
    setMoveTarget(null);
  };

  const handleLanguageSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!langTarget || !onChangeFileLanguage) return;
    setSubmittingLang(true);
    await onChangeFileLanguage(langTarget.id, langValue);
    setSubmittingLang(false);
    setLangTarget(null);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setSubmittingDelete(true);
    await onDeleteNode(deleteTarget.id);
    setSubmittingDelete(false);
    setDeleteTarget(null);
  };

  const handleDropOnTarget = async (e: DragEvent, targetParentId: string | null) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolderId(null);
    if (!canManageFiles || !draggedNodeId) return;
    if (draggedNodeId === targetParentId) return;
    const dragged = nodes.find((n) => n.id === draggedNodeId);
    if (!dragged || dragged.parentId === targetParentId) return;
    if (targetParentId && dragged.type === 'folder' && isDescendantOf(nodes, targetParentId, dragged.id)) {
      return;
    }
    await onMoveNode(draggedNodeId, targetParentId);
    setDraggedNodeId(null);
  };

  const previewFileName = resolveFileNameWithExtension(fileName, fileLanguage);

  return (
    <aside
      aria-label="Project file explorer"
      onFocus={() => onExplorerFocusChange?.(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) {
          onExplorerFocusChange?.(false);
        }
      }}
      onClick={() => setContextMenu(null)}
      className="w-[252px] shrink-0 bg-[var(--surface-base)] border-r border-[var(--border-hairline)] flex flex-col select-none relative"
    >
      <div className="h-10 px-3 border-b border-[var(--border-hairline)] flex items-center justify-between">
        <span className="text-[11px] font-medium text-[var(--text-secondary)] tracking-wide uppercase">
          Explorer
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={!canManageFiles}
            onClick={() => openNewFileModal(selectedFolderId)}
            aria-label="New File"
            title={canManageFiles ? 'New File (Alt+N)' : 'Read-only mode'}
            className="p-1 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] disabled:opacity-35 disabled:cursor-not-allowed transition-mechanical cursor-pointer"
          >
            <FilePlus className="w-3.5 h-3.5" strokeWidth={1.5} />
          </button>
          <button
            type="button"
            disabled={!canManageFiles}
            onClick={() => openNewFolderModal(selectedFolderId)}
            aria-label="New Folder"
            title={canManageFiles ? 'New Folder (Alt+Shift+N)' : 'Read-only mode'}
            className="p-1 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] disabled:opacity-35 disabled:cursor-not-allowed transition-mechanical cursor-pointer"
          >
            <FolderPlus className="w-3.5 h-3.5" strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {/* Tree Region with Root Drop Zone */}
      <div
        ref={treeRef}
        role="tree"
        aria-label="Project files and folders"
        tabIndex={0}
        onKeyDown={handleTreeKeyDown}
        onDragOver={(e) => {
          if (!canManageFiles) return;
          e.preventDefault();
          setDragOverFolderId('__root__');
        }}
        onDragLeave={() => setDragOverFolderId(null)}
        onDrop={(e) => void handleDropOnTarget(e, null)}
        className={`flex-1 overflow-y-auto py-1.5 focus:outline-none ${
          dragOverFolderId === '__root__' ? 'ring-1 ring-inset ring-[var(--accent-primary)]/50' : ''
        }`}
      >
        {isLoading ? (
          <div className="px-3 py-4 space-y-2 text-[12px] text-[var(--text-muted)]">
            Loading files…
          </div>
        ) : nodes.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-[12px] text-[var(--text-muted)]">Empty workspace</p>
            {canManageFiles && (
              <div className="mt-3 flex flex-col gap-1.5">
                <GlassButton size="sm" variant="glass" onClick={() => openNewFileModal(null)}>
                  + New File
                </GlassButton>
                <GlassButton size="sm" variant="ghost" onClick={() => openNewFolderModal(null)}>
                  + New Folder
                </GlassButton>
              </div>
            )}
          </div>
        ) : (
          visibleItems.map(({ node, depth }) => {
            const isExpanded = expandedFolders[node.id] ?? true;
            const isActiveFile = node.type === 'file' && node.id === activeFileId;
            const isSelected = node.id === activeSelectedId;
            const langMeta = node.type === 'file' ? getLanguageMeta(node.language) : null;
            const isDropTarget = dragOverFolderId === node.id;

            return (
              <div
                key={node.id}
                role="treeitem"
                aria-selected={isActiveFile || isSelected}
                aria-expanded={node.type === 'folder' ? isExpanded : undefined}
                draggable={canManageFiles}
                onDragStart={(e) => {
                  if (!canManageFiles) return;
                  setDraggedNodeId(node.id);
                  e.dataTransfer.effectAllowed = 'move';
                }}
                onDragEnd={() => {
                  setDraggedNodeId(null);
                  setDragOverFolderId(null);
                }}
                onDragOver={(e) => {
                  if (!canManageFiles || node.type !== 'folder') return;
                  e.preventDefault();
                  e.stopPropagation();
                  setDragOverFolderId(node.id);
                }}
                onDrop={(e) => {
                  if (node.type === 'folder') {
                    void handleDropOnTarget(e, node.id);
                  }
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setSelectedNode(node.id);
                  setContextMenu({ node, x: e.clientX, y: e.clientY });
                }}
                className={`group flex items-center justify-between pr-2 h-8 text-[13px] transition-mechanical ${
                  isDropTarget
                    ? 'bg-[var(--accent-soft)] text-[var(--text-primary)]'
                    : isActiveFile
                    ? 'bg-[var(--surface-hover)] text-[var(--text-primary)]'
                    : isSelected
                    ? 'bg-[var(--surface-elevated)] text-[var(--text-primary)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-elevated)]'
                }`}
                style={{ paddingLeft: `${10 + depth * 14}px` }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setSelectedNode(node.id);
                    if (node.type === 'folder') {
                      toggleFolder(node.id);
                    } else {
                      setSelectedFolderId(node.parentId);
                      onSelectFile(node.id);
                    }
                  }}
                  className="flex items-center gap-2 min-w-0 flex-1 h-full text-left cursor-pointer"
                >
                  {node.type === 'folder' ? (
                    <>
                      {isExpanded ? (
                        <ChevronDown
                          className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0"
                          strokeWidth={1.5}
                        />
                      ) : (
                        <ChevronRight
                          className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0"
                          strokeWidth={1.5}
                        />
                      )}
                      {isExpanded ? (
                        <FolderOpen
                          className="w-3.5 h-3.5 text-[var(--text-secondary)] shrink-0"
                          strokeWidth={1.5}
                        />
                      ) : (
                        <Folder
                          className="w-3.5 h-3.5 text-[var(--text-secondary)] shrink-0"
                          strokeWidth={1.5}
                        />
                      )}
                      <span className="truncate font-medium">{node.name}</span>
                    </>
                  ) : (
                    <>
                      <span
                        className="w-8 text-[10px] font-mono font-semibold text-left shrink-0 tracking-tight"
                        style={{ color: langMeta?.color }}
                      >
                        {langMeta?.shortTag}
                      </span>
                      <span className="truncate font-mono text-[12px]">{node.name}</span>
                    </>
                  )}
                </button>

                {canManageFiles && (
                  <div className="flex items-center gap-0.5 shrink-0 ml-1 card-actions">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const rect = e.currentTarget.getBoundingClientRect();
                        setSelectedNode(node.id);
                        setContextMenu({ node, x: rect.left, y: rect.bottom + 4 });
                      }}
                      aria-label={`Actions for ${node.name}`}
                      className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] cursor-pointer"
                    >
                      <MoreVertical className="w-3 h-3" strokeWidth={1.5} />
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Floating Context Menu */}
      {contextMenu && canManageFiles && (
        <GlassPanel
          variant="elevated"
          role="menu"
          aria-label={`Actions for ${contextMenu.node.name}`}
          onClick={(e) => e.stopPropagation()}
          className="fixed z-50 w-48 py-1.5 text-[12px]"
          style={{
            top: Math.min(contextMenu.y, window.innerHeight - 220),
            left: Math.min(contextMenu.x, window.innerWidth - 200),
          }}
        >
          {contextMenu.node.type === 'folder' && (
            <>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  const id = contextMenu.node.id;
                  setContextMenu(null);
                  openNewFileModal(id);
                }}
                className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-[var(--surface-hover)] cursor-pointer"
              >
                <FilePlus className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                <span>New File Here</span>
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  const id = contextMenu.node.id;
                  setContextMenu(null);
                  openNewFolderModal(id);
                }}
                className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-[var(--surface-hover)] cursor-pointer"
              >
                <FolderPlus className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                <span>New Folder Here</span>
              </button>
            </>
          )}

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              const node = contextMenu.node;
              setContextMenu(null);
              setRenameTarget(node);
              setRenameValue(node.name);
              setRenameError(null);
            }}
            className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-[var(--surface-hover)] cursor-pointer"
          >
            <Pencil className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
            <span>Rename</span>
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              const node = contextMenu.node;
              setContextMenu(null);
              setMoveTarget(node);
              setMoveDestId(node.parentId ?? '__root__');
              setMoveError(null);
            }}
            className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-[var(--surface-hover)] cursor-pointer"
          >
            <FolderInput className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
            <span>Move…</span>
          </button>

          {contextMenu.node.type === 'file' && onChangeFileLanguage && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                const node = contextMenu.node;
                setContextMenu(null);
                setLangTarget(node);
                setLangValue(node.language ?? 'javascript');
              }}
              className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-[var(--surface-hover)] cursor-pointer"
            >
              <Languages className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
              <span>Change Language…</span>
            </button>
          )}

          <div className="my-1 border-t border-[var(--border-hairline)]" />

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              const node = contextMenu.node;
              setContextMenu(null);
              setDeleteTarget(node);
            }}
            className="w-full px-3 py-1.5 text-left flex items-center gap-2 text-[#fca5a5] hover:bg-[var(--state-danger-bg)] cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>
        </GlassPanel>
      )}

      {/* Create Folder Dialog (Name ONLY) */}
      <Dialog
        open={showFolderModal}
        onClose={() => setShowFolderModal(false)}
        title="New Folder"
        maxWidthClass="max-w-[380px]"
      >
        <form onSubmit={handleFolderSubmit} noValidate className="space-y-4">
          <FormField id="folder-name-input" label="Folder Name" required error={folderError}>
            <TextInput
              id="folder-name-input"
              type="text"
              autoFocus
              value={folderName}
              onChange={(e) => {
                setFolderName(e.target.value);
                setFolderError(null);
              }}
              placeholder="e.g. scripts"
              className="font-mono"
              hasError={Boolean(folderError)}
            />
          </FormField>

          {folders.length > 0 && (
            <FormField id="folder-parent-select" label="Location">
              <select
                id="folder-parent-select"
                value={folderParentId ?? '__root__'}
                onChange={(e) =>
                  setFolderParentId(e.target.value === '__root__' ? null : e.target.value)
                }
                className="w-full rounded-lg bg-[var(--surface-base)] border border-white/[0.09] px-3 py-2 text-[13px] font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
              >
                <option value="__root__">/ (Project Root)</option>
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>
                    /{getNodePath(nodes, f.id)}
                  </option>
                ))}
              </select>
            </FormField>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <GlassButton variant="ghost" onClick={() => setShowFolderModal(false)}>
              Cancel
            </GlassButton>
            <GlassButton type="submit" variant="primary" loading={submittingFolder}>
              {submittingFolder ? 'Creating…' : 'Create Folder'}
            </GlassButton>
          </div>
        </form>
      </Dialog>

      {/* Create File Dialog (File Name + Language + Extension Rule Preview) */}
      <Dialog
        open={showFileModal}
        onClose={() => setShowFileModal(false)}
        title="New File"
        description="Every file in DevSync carries its own language configuration."
        maxWidthClass="max-w-[420px]"
      >
        <form onSubmit={handleFileSubmit} noValidate className="space-y-4">
          <FormField
            id="file-name-input"
            label="File Name"
            required
            error={fileError}
            hint={
              previewFileName
                ? `Will be created as ${previewFileName}`
                : `No extension? "${getLanguageMeta(fileLanguage).extension}" is appended automatically.`
            }
          >
            <TextInput
              id="file-name-input"
              type="text"
              autoFocus
              value={fileName}
              onChange={(e) => {
                setFileName(e.target.value);
                setFileError(null);
              }}
              placeholder={`e.g. main${getLanguageMeta(fileLanguage).extension}`}
              className="font-mono"
              hasError={Boolean(fileError)}
            />
          </FormField>

          <FormField id="file-language-select" label="Programming Language" required>
            <select
              id="file-language-select"
              value={fileLanguage}
              onChange={(e) => setFileLanguage(e.target.value as SupportedLanguage)}
              className="w-full rounded-lg bg-[var(--surface-base)] border border-white/[0.09] px-3 py-2 text-[13px] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
            >
              {languageOptions.map((lang) => (
                <option key={lang.id} value={lang.id}>
                  {lang.label} ({lang.ext})
                </option>
              ))}
            </select>
          </FormField>

          {folders.length > 0 && (
            <FormField id="file-parent-select" label="Folder">
              <select
                id="file-parent-select"
                value={fileParentId ?? '__root__'}
                onChange={(e) =>
                  setFileParentId(e.target.value === '__root__' ? null : e.target.value)
                }
                className="w-full rounded-lg bg-[var(--surface-base)] border border-white/[0.09] px-3 py-2 text-[13px] font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
              >
                <option value="__root__">/ (Project Root)</option>
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>
                    /{getNodePath(nodes, f.id)}
                  </option>
                ))}
              </select>
            </FormField>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <GlassButton variant="ghost" onClick={() => setShowFileModal(false)}>
              Cancel
            </GlassButton>
            <GlassButton type="submit" variant="primary" loading={submittingFile}>
              {submittingFile ? 'Creating…' : 'Create File'}
            </GlassButton>
          </div>
        </form>
      </Dialog>

      {/* Rename Node Dialog */}
      <Dialog
        open={Boolean(renameTarget)}
        onClose={() => setRenameTarget(null)}
        title={`Rename ${renameTarget?.type === 'folder' ? 'Folder' : 'File'}`}
        maxWidthClass="max-w-[380px]"
      >
        <form onSubmit={handleRenameSubmit} noValidate className="space-y-4">
          <FormField id="rename-node-input" label="Name" required error={renameError}>
            <TextInput
              id="rename-node-input"
              type="text"
              autoFocus
              value={renameValue}
              onChange={(e) => {
                setRenameValue(e.target.value);
                setRenameError(null);
              }}
              className="font-mono"
              hasError={Boolean(renameError)}
            />
          </FormField>
          <div className="flex items-center justify-end gap-2">
            <GlassButton variant="ghost" onClick={() => setRenameTarget(null)}>
              Cancel
            </GlassButton>
            <GlassButton type="submit" variant="primary" loading={submittingRename}>
              {submittingRename ? 'Renaming…' : 'Rename'}
            </GlassButton>
          </div>
        </form>
      </Dialog>

      {/* Move Node Dialog */}
      <Dialog
        open={Boolean(moveTarget)}
        onClose={() => setMoveTarget(null)}
        title={`Move “${moveTarget?.name ?? ''}”`}
        maxWidthClass="max-w-[380px]"
      >
        <form onSubmit={handleMoveSubmit} noValidate className="space-y-4">
          <FormField id="move-dest-select" label="Destination Folder" error={moveError}>
            <select
              id="move-dest-select"
              value={moveDestId}
              onChange={(e) => {
                setMoveDestId(e.target.value);
                setMoveError(null);
              }}
              className="w-full rounded-lg bg-[var(--surface-base)] border border-white/[0.09] px-3 py-2 text-[13px] font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
            >
              <option value="__root__">/ (Project Root)</option>
              {folders
                .filter(
                  (f) =>
                    !moveTarget ||
                    moveTarget.type !== 'folder' ||
                    !isDescendantOf(nodes, f.id, moveTarget.id)
                )
                .map((f) => (
                  <option key={f.id} value={f.id}>
                    /{getNodePath(nodes, f.id)}
                  </option>
                ))}
            </select>
          </FormField>
          <div className="flex items-center justify-end gap-2">
            <GlassButton variant="ghost" onClick={() => setMoveTarget(null)}>
              Cancel
            </GlassButton>
            <GlassButton type="submit" variant="primary" loading={submittingMove}>
              {submittingMove ? 'Moving…' : 'Move Here'}
            </GlassButton>
          </div>
        </form>
      </Dialog>

      {/* Change Language Dialog */}
      <Dialog
        open={Boolean(langTarget)}
        onClose={() => setLangTarget(null)}
        title={`Change Language for “${langTarget?.name ?? ''}”`}
        maxWidthClass="max-w-[380px]"
      >
        <form onSubmit={handleLanguageSubmit} className="space-y-4">
          <FormField id="change-file-lang" label="Programming Language">
            <select
              id="change-file-lang"
              value={langValue}
              onChange={(e) => setLangValue(e.target.value as SupportedLanguage)}
              className="w-full rounded-lg bg-[var(--surface-base)] border border-white/[0.09] px-3 py-2 text-[13px] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
            >
              {languageOptions.map((lang) => (
                <option key={lang.id} value={lang.id}>
                  {lang.label} ({lang.ext})
                </option>
              ))}
            </select>
          </FormField>
          <div className="flex items-center justify-end gap-2">
            <GlassButton variant="ghost" onClick={() => setLangTarget(null)}>
              Cancel
            </GlassButton>
            <GlassButton type="submit" variant="primary" loading={submittingLang}>
              {submittingLang ? 'Updating…' : 'Update Language'}
            </GlassButton>
          </div>
        </form>
      </Dialog>

      {/* Delete Node Confirmation Dialog */}
      <Dialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title={`Delete “${deleteTarget?.name ?? ''}”?`}
        description={
          deleteTarget?.type === 'folder'
            ? 'This permanently deletes this folder and every file inside it.'
            : 'This permanently deletes this file from the project.'
        }
        maxWidthClass="max-w-[380px]"
      >
        <div className="flex items-center justify-end gap-2 pt-3">
          <GlassButton variant="ghost" autoFocus onClick={() => setDeleteTarget(null)}>
            Cancel
          </GlassButton>
          <GlassButton variant="danger" loading={submittingDelete} onClick={handleDeleteConfirm}>
            {submittingDelete ? 'Deleting…' : 'Delete'}
          </GlassButton>
        </div>
      </Dialog>
    </aside>
  );
}
