import {
  FolderKanban,
  UserCheck,
  Users,
  Clock,
  Search,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  GitBranch,
  Bug,
  Mic,
  Sparkles,
} from 'lucide-react';
import type { DashboardFilter, UserAccount } from '../types/devsync';
import { BrandLogo } from './BrandMark';

interface SidebarProps {
  user: UserAccount;
  activeFilter: DashboardFilter;
  onSelectFilter: (filter: DashboardFilter) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  counts: Record<DashboardFilter, number>;
  onSignOut: () => void;
  onOpenCommandPalette: () => void;
}

const NAV_ITEMS: {
  id: DashboardFilter;
  label: string;
  icon: typeof FolderKanban;
}[] = [
  { id: 'all', label: 'All Projects', icon: FolderKanban },
  { id: 'owned', label: 'Owned by Me', icon: UserCheck },
  { id: 'shared', label: 'Shared with Me', icon: Users },
  { id: 'recent', label: 'Recent', icon: Clock },
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
      className={`shrink-0 bg-[#0B0B0F] border-r border-white/[0.07] flex flex-col justify-between transition-mechanical ${
        collapsed ? 'w-[68px]' : 'w-[256px]'
      }`}
    >
      <div className="p-3.5 flex flex-col gap-4">
        {/* Brand Row */}
        <div className="flex items-center justify-between px-1.5 h-9">
          <div className="flex items-center gap-2.5 min-w-0">
            <BrandLogo size={20} />
            {!collapsed && (
              <span className="text-[15px] font-semibold tracking-tight text-[#F4F4F6] truncate">
                DevSync
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="w-7 h-7 rounded-md border border-white/[0.08] bg-[#111116] hover:bg-[#18181F] text-[#9494A3] hover:text-[#F4F4F6] flex items-center justify-center transition-mechanical cursor-pointer shrink-0"
          >
            {collapsed ? (
              <PanelLeftOpen className="w-3.5 h-3.5" strokeWidth={1.5} />
            ) : (
              <PanelLeftClose className="w-3.5 h-3.5" strokeWidth={1.5} />
            )}
          </button>
        </div>

        {/* Quick Search Bar (Workly-inspired) */}
        {!collapsed ? (
          <div className="relative">
            <Search
              className="w-3.5 h-3.5 text-[#5C5C6E] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              strokeWidth={1.5}
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search..."
              aria-label="Search projects"
              className="w-full rounded-lg bg-[#111116] border border-white/[0.07] pl-8 pr-14 py-1.5 text-[13px] text-[#F4F4F6] placeholder-[#5C5C6E] focus:outline-none focus:border-[#5E5CE6] transition-mechanical"
            />
            <button
              type="button"
              onClick={onOpenCommandPalette}
              title="Open Command Palette (⌘K)"
              aria-label="Open Command Palette"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1 cursor-pointer"
            >
              <kbd className="px-1.5 py-0.5 text-[10px] font-mono text-[#9494A3] bg-[#18181F] border border-white/[0.08] rounded">
                ⌘
              </kbd>
              <kbd className="px-1.5 py-0.5 text-[10px] font-mono text-[#9494A3] bg-[#18181F] border border-white/[0.08] rounded">
                F
              </kbd>
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onOpenCommandPalette}
            aria-label="Open Command Palette"
            className="w-full h-9 rounded-lg bg-[#111116] border border-white/[0.07] hover:bg-[#18181F] flex items-center justify-center text-[#9494A3] hover:text-[#F4F4F6] transition-mechanical cursor-pointer"
          >
            <Search className="w-4 h-4" strokeWidth={1.5} />
          </button>
        )}

        {/* Primary Navigation */}
        <nav className="space-y-1">
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
                    ? 'sidebar-active-item text-[#F4F4F6]'
                    : 'text-[#9494A3] hover:text-[#F4F4F6] hover:bg-[#18181F]/60 border border-transparent'
                }`}
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? 'text-[#F4F4F6]' : 'text-[#5C5C6E]'
                    }`}
                    strokeWidth={1.5}
                  />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </span>
                {!collapsed && (
                  <span className="text-[11px] font-mono tabular-nums text-[#5C5C6E]">
                    {counts[item.id]}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Quiet Mastermind v2 Roadmap Section */}
        <div className="pt-3 border-t border-white/[0.07]">
          {!collapsed && (
            <div className="px-2.5 mb-2 flex items-center justify-between">
              <span className="text-[11px] font-medium text-[#5C5C6E] tracking-wide">
                Planned
              </span>
              <span className="text-[10px] font-mono text-[#5C5C6E]">v2</span>
            </div>
          )}
          <div className="space-y-0.5">
            {UPCOMING_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.id}
                  title={`${item.label} — Coming in v2`}
                  className="flex items-center justify-between rounded-lg px-2.5 py-1.5 text-[12px] text-[#5C5C6E] select-none"
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <Icon className="w-3.5 h-3.5 shrink-0 opacity-70" strokeWidth={1.5} />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </span>
                  {!collapsed && (
                    <span className="text-[10px] font-mono text-[#5C5C6E]/70">Soon</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom User Profile Card */}
      <div className="p-3.5 border-t border-white/[0.07]">
        <div
          className={`rounded-lg bg-[#111116] border border-white/[0.07] p-2 flex items-center ${
            collapsed ? 'justify-center' : 'justify-between gap-2'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-[#18181F] border border-white/[0.1] flex items-center justify-center text-[11px] font-mono font-medium text-[#F4F4F6] shrink-0">
              {user.initials}
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="text-[12px] font-medium text-[#F4F4F6] truncate">{user.name}</p>
                <p className="text-[11px] text-[#5C5C6E] truncate">{user.email}</p>
              </div>
            )}
          </div>
          {!collapsed && (
            <button
              type="button"
              onClick={onSignOut}
              aria-label="Sign out"
              title="Sign out"
              className="p-1.5 rounded-md text-[#5C5C6E] hover:text-[#F4F4F6] hover:bg-[#18181F] transition-mechanical cursor-pointer shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" strokeWidth={1.5} />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
