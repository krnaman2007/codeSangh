import {
  FolderKanban,
  UserCheck,
  Users,
  Search,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  GitBranch,
  Bug,
  Mic,
  Sparkles,
} from 'lucide-react';
import type { UserAccount } from '../types/devsync';
import { BrandLogo } from './BrandMark';

export type ProjectTabFilter = 'all' | 'owned' | 'shared';

interface SidebarProps {
  user: UserAccount;
  activeFilter: ProjectTabFilter;
  onSelectFilter: (filter: ProjectTabFilter) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  counts: Record<ProjectTabFilter, number>;
  onSignOut: () => void;
  onOpenCommandPalette?: () => void;
}

const NAV_ITEMS: {
  id: ProjectTabFilter;
  label: string;
  icon: typeof FolderKanban;
}[] = [
  { id: 'all', label: 'All Projects', icon: FolderKanban },
  { id: 'owned', label: 'My Projects', icon: UserCheck },
  { id: 'shared', label: 'Shared with me', icon: Users },
];

const UPCOMING_ITEMS = [
  { id: 'git', label: 'Git Version Control', icon: GitBranch },
  { id: 'debug', label: 'Collaborative Debug', icon: Bug },
  { id: 'voice', label: 'Voice Channels', icon: Mic },
  { id: 'ai', label: 'AI Code Assistant', icon: Sparkles },
];

export function Sidebar({
  user,
  activeFilter,
  onSelectFilter,
  searchQuery,
  onSearchChange,
  collapsed,
  onToggleCollapse,
  counts,
  onSignOut,
  onOpenCommandPalette,
}: SidebarProps) {
  return (
    <aside
      aria-label="Dashboard navigation"
      className={`shrink-0 bg-[var(--surface-base)] border-r border-[var(--border-hairline)] flex flex-col justify-between transition-mechanical ${
        collapsed ? 'w-[68px]' : 'w-[256px]'
      }`}
    >
      <div className="p-3.5 flex flex-col gap-4">
        {/* Brand Row */}
        <div className="flex items-center justify-between px-1.5 h-9">
          <div className="flex items-center gap-2.5 min-w-0">
            <BrandLogo size={20} />
            {!collapsed && (
              <span className="text-[15px] font-semibold tracking-tight text-[var(--text-primary)] truncate">
                DevSync
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="w-7 h-7 rounded-md border border-white/[0.08] bg-[var(--surface-elevated)] hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center transition-mechanical cursor-pointer shrink-0"
          >
            {collapsed ? (
              <PanelLeftOpen className="w-3.5 h-3.5" strokeWidth={1.5} />
            ) : (
              <PanelLeftClose className="w-3.5 h-3.5" strokeWidth={1.5} />
            )}
          </button>
        </div>

        {/* Quick Search Bar */}
        {!collapsed ? (
          <div role="search" className="relative">
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
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              className="w-full rounded-lg bg-[var(--surface-elevated)] border border-[var(--border-hairline)] pl-8 pr-12 py-1.5 text-[13px] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] transition-mechanical"
            />
            {onOpenCommandPalette && (
              <button
                type="button"
                onClick={onOpenCommandPalette}
                title="Open Command Palette (⌘K)"
                aria-label="Open Command Palette"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5 cursor-pointer"
              >
                <kbd className="px-1.5 py-0.5 text-[10px] font-mono text-[var(--text-secondary)] bg-[var(--surface-hover)] border border-white/[0.08] rounded">
                  ⌘K
                </kbd>
              </button>
            )}
          </div>
        ) : (
          onOpenCommandPalette && (
            <button
              type="button"
              onClick={onOpenCommandPalette}
              aria-label="Open Command Palette"
              className="w-full h-9 rounded-lg bg-[var(--surface-elevated)] border border-[var(--border-hairline)] hover:bg-[var(--surface-hover)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-mechanical cursor-pointer"
            >
              <Search className="w-4 h-4" strokeWidth={1.5} />
            </button>
          )
        )}

        {/* Primary Navigation */}
        <nav aria-label="Project collections" className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeFilter === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectFilter(item.id)}
                title={collapsed ? item.label : undefined}
                aria-current={isActive ? 'page' : undefined}
                className={`w-full flex items-center justify-between rounded-lg px-2.5 py-2 text-[13px] font-medium transition-mechanical cursor-pointer ${
                  isActive
                    ? 'sidebar-active-item text-[var(--text-primary)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]/60 border border-transparent'
                }`}
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'
                    }`}
                    strokeWidth={1.5}
                  />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </span>
                {!collapsed && (
                  <span className="text-[11px] font-mono tabular-nums text-[var(--text-muted)]">
                    {counts[item.id]}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Quiet Workspace Capabilities Preview */}
        <div className="pt-3 border-t border-[var(--border-hairline)] hidden md:block">
          {!collapsed && (
            <div className="px-2.5 mb-2 flex items-center justify-between">
              <span className="text-[11px] font-medium text-[var(--text-muted)] tracking-wide">
                Workspace Modules
              </span>
              <span className="text-[10px] font-mono text-[var(--text-muted)]">IDE</span>
            </div>
          )}
          <div className="space-y-0.5">
            {UPCOMING_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.id}
                  title={item.label}
                  className="flex items-center justify-between rounded-lg px-2.5 py-1.5 text-[12px] text-[var(--text-muted)] select-none"
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <Icon className="w-3.5 h-3.5 shrink-0 opacity-70" strokeWidth={1.5} />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom User Profile Card */}
      <div className="p-3.5 border-t border-[var(--border-hairline)]">
        <div
          className={`rounded-lg glass-surface p-2 flex items-center ${
            collapsed ? 'justify-center' : 'justify-between gap-2'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-[var(--surface-hover)] border border-white/[0.1] flex items-center justify-center text-[11px] font-mono font-medium text-[var(--text-primary)] shrink-0">
              {user.initials}
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="text-[12px] font-medium text-[var(--text-primary)] truncate">
                  {user.name}
                </p>
                <p className="text-[11px] text-[var(--text-muted)] truncate">{user.email}</p>
              </div>
            )}
          </div>
          {!collapsed && (
            <button
              type="button"
              onClick={onSignOut}
              aria-label="Sign out"
              title="Sign out"
              className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-mechanical cursor-pointer shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" strokeWidth={1.5} />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
