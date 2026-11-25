import { useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import {
  Search,
  FileCode2,
  Play,
  FilePlus,
  FolderPlus,
  Users,
  LayoutDashboard,
  FolderKanban,
  Eye,
} from 'lucide-react';
import type { FileNode, Project } from '../types/devsync';
import { getLanguageMeta, getNodePath } from '../utils/fileTree';

interface CommandItem {
  id: string;
  group: 'Actions' | 'Files' | 'Projects';
  label: string;
  hint?: string;
  icon: typeof FileCode2;
  disabled?: boolean;
  onSelect: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  projects: Project[];
  activeProject: Project | null;
  canManageFiles: boolean;
  canRunCode: boolean;
  onSelectFile?: (fileId: string) => void;
  onOpenProject: (projectId: string) => void;
  onRunCode?: () => void;
  onNewFile?: () => void;
  onNewFolder?: () => void;
  onOpenShare?: () => void;
  onToggleCursors?: () => void;
  onBackToDashboard?: () => void;
}

export function CommandPalette({
  open,
  onClose,
  projects,
  activeProject,
  canManageFiles,
  canRunCode,
  onSelectFile,
  onOpenProject,
  onRunCode,
  onNewFile,
  onNewFolder,
  onOpenShare,
  onToggleCursors,
  onBackToDashboard,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [open]);

  const items = useMemo<CommandItem[]>(() => {
    const list: CommandItem[] = [];

    if (activeProject) {
      if (onRunCode) {
        list.push({
          id: 'act-run',
          group: 'Actions',
          label: 'Run Active File',
          hint: canRunCode ? 'Execute' : 'Read-Only',
          icon: Play,
          disabled: !canRunCode,
          onSelect: () => {
            onRunCode();
            onClose();
          },
        });
      }
      if (onNewFile) {
        list.push({
          id: 'act-new-file',
          group: 'Actions',
          label: 'New File...',
          hint: 'Select language',
          icon: FilePlus,
          disabled: !canManageFiles,
          onSelect: () => {
            onNewFile();
            onClose();
          },
        });
      }
      if (onNewFolder) {
        list.push({
          id: 'act-new-folder',
          group: 'Actions',
          label: 'New Folder...',
          icon: FolderPlus,
          disabled: !canManageFiles,
          onSelect: () => {
            onNewFolder();
            onClose();
          },
        });
      }
      if (onOpenShare) {
        list.push({
          id: 'act-share',
          group: 'Actions',
          label: 'Share & Manage Collaborators',
          icon: Users,
          onSelect: () => {
            onOpenShare();
            onClose();
          },
        });
      }
      if (onToggleCursors) {
        list.push({
          id: 'act-cursors',
          group: 'Actions',
          label: 'Toggle Live Collaborator Cursors',
          icon: Eye,
          onSelect: () => {
            onToggleCursors();
            onClose();
          },
        });
      }
      if (onBackToDashboard) {
        list.push({
          id: 'act-dashboard',
          group: 'Actions',
          label: 'Go to Dashboard',
          icon: LayoutDashboard,
          onSelect: () => {
            onBackToDashboard();
            onClose();
          },
        });
      }

      const files: FileNode[] = activeProject.nodes.filter((n) => n.type === 'file');
      for (const f of files) {
        const meta = getLanguageMeta(f.language);
        list.push({
          id: `file-${f.id}`,
          group: 'Files',
          label: getNodePath(activeProject.nodes, f.id),
          hint: meta.label,
          icon: FileCode2,
          onSelect: () => {
            onSelectFile?.(f.id);
            onClose();
          },
        });
      }
    }

    for (const p of projects) {
      list.push({
        id: `proj-${p.id}`,
        group: 'Projects',
        label: p.name,
        hint: p.id === activeProject?.id ? 'Current' : 'Open project',
        icon: FolderKanban,
        onSelect: () => {
          onOpenProject(p.id);
          onClose();
        },
      });
    }

    return list;
  }, [
    activeProject,
    projects,
    canManageFiles,
    canRunCode,
    onRunCode,
    onNewFile,
    onNewFolder,
    onOpenShare,
    onToggleCursors,
    onBackToDashboard,
    onSelectFile,
    onOpenProject,
    onClose,
  ]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.group.toLowerCase().includes(q) ||
        (item.hint?.toLowerCase().includes(q) ?? false)
    );
  }, [items, query]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  if (!open) return null;

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (filtered.length > 0 ? (prev + 1) % filtered.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) =>
        filtered.length > 0 ? (prev - 1 + filtered.length) % filtered.length : 0
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const active = filtered[selectedIndex];
      if (active && !active.disabled) {
        active.onSelect();
      }
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command Palette"
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/65 pt-[14vh] px-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-[540px] rounded-xl bg-[#111116]/85 backdrop-blur-xl border border-white/10 overflow-hidden">
        <div className="flex items-center gap-3 px-4 h-12 border-b border-white/[0.08]">
          <Search className="w-4 h-4 text-[#5C5C6E] shrink-0" strokeWidth={1.5} />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Jump to file, run code, or switch project..."
            aria-label="Command palette search"
            className="flex-1 bg-transparent text-[13px] text-[#F4F4F6] placeholder-[#5C5C6E] focus:outline-none"
          />
          <kbd className="px-1.5 py-0.5 text-[10px] font-mono text-[#5C5C6E] bg-[#0B0B0F] border border-white/[0.08] rounded">
            ESC
          </kbd>
        </div>

        <div className="max-h-[340px] overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <p className="px-4 py-8 text-center text-[13px] text-[#5C5C6E]">
              No matching files or commands.
            </p>
          ) : (
            filtered.map((item, idx) => {
              const Icon = item.icon;
              const isHighlighted = idx === selectedIndex;
              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={item.disabled}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  onClick={() => {
                    if (!item.disabled) item.onSelect();
                  }}
                  className={`w-full flex items-center justify-between gap-3 px-4 py-2 text-left text-[13px] transition-mechanical ${
                    item.disabled
                      ? 'opacity-40 cursor-not-allowed'
                      : isHighlighted
                      ? 'bg-[#18181F] text-[#F4F4F6] cursor-pointer'
                      : 'text-[#9494A3] hover:text-[#F4F4F6] cursor-pointer'
                  }`}
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isHighlighted ? 'text-[#5E5CE6]' : 'text-[#5C5C6E]'
                      }`}
                      strokeWidth={1.5}
                    />
                    <span className="truncate font-mono text-[12px]">{item.label}</span>
                  </span>
                  <span className="flex items-center gap-2 shrink-0 text-[11px] font-mono text-[#5C5C6E]">
                    {item.hint && <span>{item.hint}</span>}
                    <span className="text-[10px] text-[#5C5C6E]/70">{item.group}</span>
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
