import { useState, type FormEvent } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  FilePlus,
  FolderPlus,
  Pencil,
  FolderInput,
  Trash2,
  X,
} from 'lucide-react';
import type { FileNode, SupportedLanguage } from '../types/devsync';
import {
  SUPPORTED_LANGUAGES,
  getLanguageMeta,
  getNodePath,
  getSortedChildren,
  isDescendantOf,
} from '../utils/fileTree';

interface FileExplorerProps {
  nodes: FileNode[];
  activeFileId: string | null;
  canManageFiles: boolean;
  onSelectFile: (fileId: string) => void;
  onCreateFolder: (name: string, parentId: string | null) => { error?: string };
  onCreateFile: (
    name: string,
    language: SupportedLanguage,
    parentId: string | null
  ) => { error?: string };
  onRenameNode: (nodeId: string, nextName: string) => { error?: string };
  onMoveNode: (nodeId: string, targetParentId: string | null) => { error?: string };
  onDeleteNode: (nodeId: string) => void;
  externalCreateFileTrigger: number;
  externalCreateFolderTrigger: number;
}

export function FileExplorer({
  nodes,
  activeFileId,
  canManageFiles,
  onSelectFile,
  onCreateFolder,
  onCreateFile,
  onRenameNode,
  onMoveNode,
  onDeleteNode,
  externalCreateFileTrigger,
  externalCreateFolderTrigger,
}: FileExplorerProps) {
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const n of nodes) {
      if (n.type === 'folder') initial[n.id] = true;
    }
    return initial;
  });
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  // New Folder Modal (Folder Name ONLY)
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [folderParentId, setFolderParentId] = useState<string | null>(null);
  const [folderError, setFolderError] = useState<string | null>(null);

  // New File Modal (File Name + Programming Language)
  const [showFileModal, setShowFileModal] = useState(false);
  const [fileName, setFileName] = useState('');
  const [fileLanguage, setFileLanguage] = useState<SupportedLanguage>('python');
  const [fileParentId, setFileParentId] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  // Rename Modal
  const [renameNode, setRenameNode] = useState<FileNode | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renameError, setRenameError] = useState<string | null>(null);

  // Move Modal
  const [moveNodeTarget, setMoveNodeTarget] = useState<FileNode | null>(null);
  const [moveDestId, setMoveDestId] = useState<string>('__root__');
  const [moveError, setMoveError] = useState<string | null>(null);

  // Track external triggers from Command Palette
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

  const folders = nodes.filter((n) => n.type === 'folder');

  const toggleFolder = (folderId: string) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [folderId]: !(prev[folderId] ?? true),
    }));
    setSelectedFolderId(folderId);
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

  const handleFolderSubmit = (e: FormEvent) => {
    e.preventDefault();
    const res = onCreateFolder(folderName, folderParentId);
    if (res.error) {
      setFolderError(res.error);
      return;
    }
    if (folderParentId) {
      setExpandedFolders((prev) => ({ ...prev, [folderParentId]: true }));
    }
    setShowFolderModal(false);
  };

  const handleFileSubmit = (e: FormEvent) => {
    e.preventDefault();
    const res = onCreateFile(fileName, fileLanguage, fileParentId);
    if (res.error) {
      setFileError(res.error);
      return;
    }
    if (fileParentId) {
      setExpandedFolders((prev) => ({ ...prev, [fileParentId]: true }));
    }
    setShowFileModal(false);
  };

  const handleRenameSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!renameNode) return;
    const res = onRenameNode(renameNode.id, renameValue);
    if (res.error) {
      setRenameError(res.error);
      return;
    }
    setRenameNode(null);
  };

  const handleMoveSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!moveNodeTarget) return;
    const targetParent = moveDestId === '__root__' ? null : moveDestId;
    const res = onMoveNode(moveNodeTarget.id, targetParent);
    if (res.error) {
      setMoveError(res.error);
      return;
    }
    if (targetParent) {
      setExpandedFolders((prev) => ({ ...prev, [targetParent]: true }));
    }
    setMoveNodeTarget(null);
  };

  const renderTree = (parentId: string | null, depth: number) => {
    const children = getSortedChildren(nodes, parentId);
    return children.map((node) => {
      const isExpanded = expandedFolders[node.id] ?? true;
      const isActive = node.type === 'file' && node.id === activeFileId;
      const langMeta = node.type === 'file' ? getLanguageMeta(node.language) : null;

      return (
        <div key={node.id}>
          <div
            className={`group flex items-center justify-between pr-2 h-8 text-[13px] transition-mechanical ${
              isActive
                ? 'bg-[#18181F] text-[#F4F4F6]'
                : 'text-[#9494A3] hover:text-[#F4F4F6] hover:bg-[#111116]'
            }`}
            style={{ paddingLeft: `${10 + depth * 14}px` }}
          >
            <button
              type="button"
              onClick={() => {
                if (node.type === 'folder') {
                  toggleFolder(node.id);
                } else {
                  setSelectedFolderId(node.parentId);
                  onSelectFile(node.id);
                }
              }}
              className="flex items-center gap-2 min-w-0 flex-1 h-full text-left cursor-pointer focus-visible:outline-none"
            >
              {node.type === 'folder' ? (
                <>
                  {isExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5 text-[#5C5C6E] shrink-0" strokeWidth={1.5} />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-[#5C5C6E] shrink-0" strokeWidth={1.5} />
                  )}
                  {isExpanded ? (
                    <FolderOpen className="w-3.5 h-3.5 text-[#9494A3] shrink-0" strokeWidth={1.5} />
                  ) : (
                    <Folder className="w-3.5 h-3.5 text-[#9494A3] shrink-0" strokeWidth={1.5} />
                  )}
                  <span className="truncate font-medium">{node.name}</span>
                </>
              ) : (
                <>
                  <span
                    className="w-7 text-[10px] font-mono font-semibold text-left shrink-0 tracking-tight"
                    style={{ color: langMeta?.color }}
                  >
                    {langMeta?.shortTag}
                  </span>
                  <span className="truncate font-mono text-[12px]">{node.name}</span>
                </>
              )}
            </button>

            {canManageFiles && (
              <div className="hidden group-hover:flex group-focus-within:flex items-center gap-0.5 shrink-0 ml-1">
                <button
                  type="button"
                  onClick={() => {
                    setRenameNode(node);
                    setRenameValue(node.name);
                    setRenameError(null);
                  }}
                  aria-label={`Rename ${node.name}`}
                  title="Rename"
                  className="p-1 rounded text-[#5C5C6E] hover:text-[#F4F4F6] hover:bg-[#18181F] cursor-pointer"
                >
                  <Pencil className="w-3 h-3" strokeWidth={1.5} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMoveNodeTarget(node);
                    setMoveDestId(node.parentId ?? '__root__');
                    setMoveError(null);
                  }}
                  aria-label={`Move ${node.name}`}
                  title="Move"
                  className="p-1 rounded text-[#5C5C6E] hover:text-[#F4F4F6] hover:bg-[#18181F] cursor-pointer"
                >
                  <FolderInput className="w-3 h-3" strokeWidth={1.5} />
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteNode(node.id)}
                  aria-label={`Delete ${node.name}`}
                  title="Delete"
                  className="p-1 rounded text-[#5C5C6E] hover:text-[#EF4444] hover:bg-[#18181F] cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" strokeWidth={1.5} />
                </button>
              </div>
            )}
          </div>

          {node.type === 'folder' && isExpanded && renderTree(node.id, depth + 1)}
        </div>
      );
    });
  };

  return (
    <aside
      aria-label="Project file explorer"
      className="w-[244px] shrink-0 bg-[#0B0B0F] border-r border-white/[0.07] flex flex-col select-none"
    >
      <div className="h-10 px-3 border-b border-white/[0.07] flex items-center justify-between">
        <span className="text-[11px] font-medium text-[#9494A3] tracking-wide">
          Explorer
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={!canManageFiles}
            onClick={() => openNewFileModal(selectedFolderId)}
            aria-label="New File"
            title={canManageFiles ? 'New File' : 'Read-only mode'}
            className="p-1 rounded text-[#9494A3] hover:text-[#F4F4F6] hover:bg-[#18181F] disabled:opacity-35 disabled:cursor-not-allowed transition-mechanical cursor-pointer"
          >
            <FilePlus className="w-3.5 h-3.5" strokeWidth={1.5} />
          </button>
          <button
            type="button"
            disabled={!canManageFiles}
            onClick={() => openNewFolderModal(selectedFolderId)}
            aria-label="New Folder"
            title={canManageFiles ? 'New Folder' : 'Read-only mode'}
            className="p-1 rounded text-[#9494A3] hover:text-[#F4F4F6] hover:bg-[#18181F] disabled:opacity-35 disabled:cursor-not-allowed transition-mechanical cursor-pointer"
          >
            <FolderPlus className="w-3.5 h-3.5" strokeWidth={1.5} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-1.5">
        {nodes.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-[12px] text-[#5C5C6E]">Empty workspace</p>
            {canManageFiles && (
              <div className="mt-3 flex flex-col gap-1.5">
                <button
                  type="button"
                  onClick={() => openNewFileModal(null)}
                  className="w-full py-1.5 px-2.5 rounded-md bg-[#111116] hover:bg-[#18181F] border border-white/[0.08] text-[12px] text-[#F4F4F6] transition-mechanical cursor-pointer"
                >
                  + New File
                </button>
                <button
                  type="button"
                  onClick={() => openNewFolderModal(null)}
                  className="w-full py-1.5 px-2.5 rounded-md bg-[#0B0B0F] hover:bg-[#18181F] border border-white/[0.07] text-[12px] text-[#9494A3] transition-mechanical cursor-pointer"
                >
                  + New Folder
                </button>
              </div>
            )}
          </div>
        ) : (
          renderTree(null, 0)
        )}
      </div>

      {/* Create Folder Modal — Folder Name ONLY */}
      {showFolderModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-folder-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowFolderModal(false);
          }}
        >
          <div className="w-full max-w-[380px] rounded-xl bg-[#111116]/85 backdrop-blur-xl border border-white/10 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 id="new-folder-title" className="text-[15px] font-semibold text-[#F4F4F6]">
                New Folder
              </h2>
              <button
                type="button"
                onClick={() => setShowFolderModal(false)}
                aria-label="Close modal"
                className="p-1 text-[#5C5C6E] hover:text-[#F4F4F6] cursor-pointer"
              >
                <X className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>

            <form onSubmit={handleFolderSubmit} noValidate className="space-y-4">
              <div>
                <label
                  htmlFor="folder-name-input"
                  className="block text-[12px] font-medium text-[#9494A3] mb-1.5"
                >
                  Folder Name
                </label>
                <input
                  id="folder-name-input"
                  type="text"
                  autoFocus
                  value={folderName}
                  onChange={(e) => {
                    setFolderName(e.target.value);
                    setFolderError(null);
                  }}
                  placeholder="e.g. scripts"
                  className="w-full rounded-lg bg-[#0B0B0F] border border-white/[0.09] px-3 py-2 text-[13px] font-mono text-[#F4F4F6] placeholder-[#5C5C6E] focus:outline-none focus:border-[#5E5CE6] focus:ring-1 focus:ring-[#5E5CE6]"
                />
              </div>

              {folders.length > 0 && (
                <div>
                  <label
                    htmlFor="folder-parent-select"
                    className="block text-[12px] font-medium text-[#9494A3] mb-1.5"
                  >
                    Location
                  </label>
                  <select
                    id="folder-parent-select"
                    value={folderParentId ?? '__root__'}
                    onChange={(e) =>
                      setFolderParentId(e.target.value === '__root__' ? null : e.target.value)
                    }
                    className="w-full rounded-lg bg-[#0B0B0F] border border-white/[0.09] px-3 py-2 text-[13px] font-mono text-[#F4F4F6] focus:outline-none focus:border-[#5E5CE6]"
                  >
                    <option value="__root__">/ (Project Root)</option>
                    {folders.map((f) => (
                      <option key={f.id} value={f.id}>
                        /{getNodePath(nodes, f.id)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {folderError && (
                <p role="alert" className="text-[12px] text-[#EF4444]">
                  {folderError}
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowFolderModal(false)}
                  className="px-3 py-1.5 rounded-lg text-[13px] text-[#9494A3] hover:text-[#F4F4F6] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-[#5E5CE6] hover:bg-[#4F46E5] text-[#F4F4F6] text-[13px] font-medium transition-mechanical cursor-pointer"
                >
                  Create Folder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create File Modal — File Name AND Programming Language */}
      {showFileModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-file-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowFileModal(false);
          }}
        >
          <div className="w-full max-w-[420px] rounded-xl bg-[#111116]/85 backdrop-blur-xl border border-white/10 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 id="new-file-title" className="text-[15px] font-semibold text-[#F4F4F6]">
                New File
              </h2>
              <button
                type="button"
                onClick={() => setShowFileModal(false)}
                aria-label="Close modal"
                className="p-1 text-[#5C5C6E] hover:text-[#F4F4F6] cursor-pointer"
              >
                <X className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>

            <form onSubmit={handleFileSubmit} noValidate className="space-y-4">
              <div>
                <label
                  htmlFor="file-name-input"
                  className="block text-[12px] font-medium text-[#9494A3] mb-1.5"
                >
                  File Name
                </label>
                <input
                  id="file-name-input"
                  type="text"
                  autoFocus
                  value={fileName}
                  onChange={(e) => {
                    setFileName(e.target.value);
                    setFileError(null);
                  }}
                  placeholder={`e.g. main${getLanguageMeta(fileLanguage).extension}`}
                  className="w-full rounded-lg bg-[#0B0B0F] border border-white/[0.09] px-3 py-2 text-[13px] font-mono text-[#F4F4F6] placeholder-[#5C5C6E] focus:outline-none focus:border-[#5E5CE6] focus:ring-1 focus:ring-[#5E5CE6]"
                />
              </div>

              <div>
                <label
                  htmlFor="file-language-select"
                  className="block text-[12px] font-medium text-[#9494A3] mb-1.5"
                >
                  Programming Language
                </label>
                <select
                  id="file-language-select"
                  value={fileLanguage}
                  onChange={(e) => setFileLanguage(e.target.value as SupportedLanguage)}
                  className="w-full rounded-lg bg-[#0B0B0F] border border-white/[0.09] px-3 py-2 text-[13px] text-[#F4F4F6] focus:outline-none focus:border-[#5E5CE6]"
                >
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <option key={lang.id} value={lang.id}>
                      {lang.label} ({lang.extension}) — {lang.runtime}
                    </option>
                  ))}
                </select>
              </div>

              {folders.length > 0 && (
                <div>
                  <label
                    htmlFor="file-parent-select"
                    className="block text-[12px] font-medium text-[#9494A3] mb-1.5"
                  >
                    Folder
                  </label>
                  <select
                    id="file-parent-select"
                    value={fileParentId ?? '__root__'}
                    onChange={(e) =>
                      setFileParentId(e.target.value === '__root__' ? null : e.target.value)
                    }
                    className="w-full rounded-lg bg-[#0B0B0F] border border-white/[0.09] px-3 py-2 text-[13px] font-mono text-[#F4F4F6] focus:outline-none focus:border-[#5E5CE6]"
                  >
                    <option value="__root__">/ (Project Root)</option>
                    {folders.map((f) => (
                      <option key={f.id} value={f.id}>
                        /{getNodePath(nodes, f.id)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {fileError && (
                <p role="alert" className="text-[12px] text-[#EF4444]">
                  {fileError}
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowFileModal(false)}
                  className="px-3 py-1.5 rounded-lg text-[13px] text-[#9494A3] hover:text-[#F4F4F6] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-[#5E5CE6] hover:bg-[#4F46E5] text-[#F4F4F6] text-[13px] font-medium transition-mechanical cursor-pointer"
                >
                  Create File
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rename Node Modal */}
      {renameNode && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="rename-node-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setRenameNode(null);
          }}
        >
          <div className="w-full max-w-[380px] rounded-xl bg-[#111116]/85 backdrop-blur-xl border border-white/10 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 id="rename-node-title" className="text-[15px] font-semibold text-[#F4F4F6]">
                Rename {renameNode.type === 'folder' ? 'Folder' : 'File'}
              </h2>
              <button
                type="button"
                onClick={() => setRenameNode(null)}
                aria-label="Close modal"
                className="p-1 text-[#5C5C6E] hover:text-[#F4F4F6] cursor-pointer"
              >
                <X className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>
            <form onSubmit={handleRenameSubmit} noValidate className="space-y-4">
              <div>
                <label
                  htmlFor="rename-node-input"
                  className="block text-[12px] font-medium text-[#9494A3] mb-1.5"
                >
                  Name
                </label>
                <input
                  id="rename-node-input"
                  type="text"
                  autoFocus
                  value={renameValue}
                  onChange={(e) => {
                    setRenameValue(e.target.value);
                    setRenameError(null);
                  }}
                  className="w-full rounded-lg bg-[#0B0B0F] border border-white/[0.09] px-3 py-2 text-[13px] font-mono text-[#F4F4F6] focus:outline-none focus:border-[#5E5CE6]"
                />
              </div>
              {renameError && (
                <p role="alert" className="text-[12px] text-[#EF4444]">
                  {renameError}
                </p>
              )}
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRenameNode(null)}
                  className="px-3 py-1.5 rounded-lg text-[13px] text-[#9494A3] hover:text-[#F4F4F6] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-[#5E5CE6] hover:bg-[#4F46E5] text-[#F4F4F6] text-[13px] font-medium cursor-pointer"
                >
                  Rename
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Move Node Modal */}
      {moveNodeTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="move-node-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setMoveNodeTarget(null);
          }}
        >
          <div className="w-full max-w-[380px] rounded-xl bg-[#111116]/85 backdrop-blur-xl border border-white/10 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 id="move-node-title" className="text-[15px] font-semibold text-[#F4F4F6]">
                Move “{moveNodeTarget.name}”
              </h2>
              <button
                type="button"
                onClick={() => setMoveNodeTarget(null)}
                aria-label="Close modal"
                className="p-1 text-[#5C5C6E] hover:text-[#F4F4F6] cursor-pointer"
              >
                <X className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>
            <form onSubmit={handleMoveSubmit} noValidate className="space-y-4">
              <div>
                <label
                  htmlFor="move-dest-select"
                  className="block text-[12px] font-medium text-[#9494A3] mb-1.5"
                >
                  Destination Folder
                </label>
                <select
                  id="move-dest-select"
                  value={moveDestId}
                  onChange={(e) => {
                    setMoveDestId(e.target.value);
                    setMoveError(null);
                  }}
                  className="w-full rounded-lg bg-[#0B0B0F] border border-white/[0.09] px-3 py-2 text-[13px] font-mono text-[#F4F4F6] focus:outline-none focus:border-[#5E5CE6]"
                >
                  <option value="__root__">/ (Project Root)</option>
                  {folders
                    .filter(
                      (f) =>
                        moveNodeTarget.type !== 'folder' ||
                        !isDescendantOf(nodes, f.id, moveNodeTarget.id)
                    )
                    .map((f) => (
                      <option key={f.id} value={f.id}>
                        /{getNodePath(nodes, f.id)}
                      </option>
                    ))}
                </select>
              </div>
              {moveError && (
                <p role="alert" className="text-[12px] text-[#EF4444]">
                  {moveError}
                </p>
              )}
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setMoveNodeTarget(null)}
                  className="px-3 py-1.5 rounded-lg text-[13px] text-[#9494A3] hover:text-[#F4F4F6] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-[#5E5CE6] hover:bg-[#4F46E5] text-[#F4F4F6] text-[13px] font-medium cursor-pointer"
                >
                  Move Here
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </aside>
  );
}
