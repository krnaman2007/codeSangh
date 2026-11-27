import { useMemo, useState, type ReactNode } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  ExternalLink,
  History,
  Loader2,
  PlayCircle,
  Terminal as TerminalIcon,
  Trash2,
} from 'lucide-react';
import type { ApiExecutionRecord } from '../api/types';
import type { WorkspaceCapabilities } from '../hooks/usePermissions';
import { useClearExecutionsMutation, useExecutionDetailQuery, useExecutionsQuery } from '../hooks/useExecutions';
import { getLanguageMeta } from '../utils/fileTree';
import type { FileNode, SupportedLanguage } from '../types/devsync';
import { Dialog, EmptyState, GlassButton, Skeleton, StatusChip, type StatusTone } from './ui';

export type WorkspaceBottomTab = 'output' | 'history' | 'terminal';

interface ExecutionPanelProps {
  projectId: string;
  nodes: FileNode[];
  activeFile: { id: string; name: string; language: string } | null;
  permissions: WorkspaceCapabilities;
  activeTab: WorkspaceBottomTab;
  onTabChange: (tab: WorkspaceBottomTab) => void;
  latestExecution: ApiExecutionRecord | null;
  isRunning: boolean;
  stdin: string;
  onStdinChange: (value: string) => void;
  onOpenFile: (fileId: string) => void;
  terminalSlot?: ReactNode;
}

function mapStatusTone(status: string): StatusTone {
  const s = status.toLowerCase();
  if (s === 'success' || s === 'accepted') return 'success';
  if (s === 'timeout') return 'warning';
  return 'danger';
}

function formatExecStatus(status: string): string {
  switch (status) {
    case 'success':
      return 'Success';
    case 'timeout':
      return 'Time Limit';
    case 'compilation_error':
      return 'Compile Error';
    default:
      return 'Error';
  }
}

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatDuration(time: string | number | null | undefined): string {
  if (time === null || time === undefined || time === '') return '—';
  const num = typeof time === 'number' ? time : parseFloat(time);
  if (Number.isNaN(num)) return String(time);
  return num < 1 ? `${Math.round(num * 1000)}ms` : `${num.toFixed(2)}s`;
}

export function ExecutionPanel({
  projectId,
  nodes,
  activeFile,
  permissions,
  activeTab,
  onTabChange,
  latestExecution,
  isRunning,
  stdin,
  onStdinChange,
  onOpenFile,
  terminalSlot,
}: ExecutionPanelProps) {
  const [height, setHeight] = useState(248);
  const [collapsed, setCollapsed] = useState(false);

  // History filters & pagination
  const [pageOffset, setPageOffset] = useState(0);
  const pageLimit = 15;
  const [fileFilter, setFileFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'error'>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | '7d'>('all');
  const [selectedExecutionId, setSelectedExecutionId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<'stdout' | 'stderr' | 'meta'>('stdout');
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  const historyQuery = useExecutionsQuery(projectId, pageOffset, pageLimit);
  const detailQuery = useExecutionDetailQuery(projectId, selectedExecutionId);
  const clearMutation = useClearExecutionsMutation(projectId);

  const startResize = (startY: number) => {
    const startHeight = height;
    const onMove = (ev: MouseEvent) => {
      const delta = startY - ev.clientY;
      setHeight(Math.min(460, Math.max(150, startHeight + delta)));
      setCollapsed(false);
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const nodeIds = useMemo(() => new Set(nodes.map((n) => n.id)), [nodes]);
  const fileOptions = useMemo(
    () => nodes.filter((n) => n.type === 'file').sort((a, b) => a.name.localeCompare(b.name)),
    [nodes]
  );

  const filteredExecutions = useMemo(() => {
    const items = historyQuery.data?.executions ?? [];
    const now = Date.now();
    return items.filter((rec) => {
      if (fileFilter !== 'all' && rec.fileId !== fileFilter) return false;
      if (statusFilter === 'success' && rec.status !== 'success') return false;
      if (statusFilter === 'error' && rec.status === 'success') return false;
      if (dateFilter !== 'all') {
        const ageMs = now - new Date(rec.createdAt).getTime();
        const maxMs = dateFilter === 'today' ? 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
        if (ageMs > maxMs) return false;
      }
      return true;
    });
  }, [historyQuery.data?.executions, fileFilter, statusFilter, dateFilter]);

  const totalExecutions = historyQuery.data?.total ?? 0;
  const selectedDetail = detailQuery.data?.execution ?? null;

  return (
    <section
      aria-label="Execution, history, and terminal panel"
      className="shrink-0 bg-[var(--surface-canvas)] border-t border-[var(--border-hairline)] flex flex-col"
      style={{ height: collapsed ? '38px' : `${height}px` }}
    >
      {!collapsed && (
        <div
          role="separator"
          aria-orientation="horizontal"
          aria-label="Resize bottom panel"
          onMouseDown={(e) => startResize(e.clientY)}
          className="h-1 w-full cursor-row-resize hover:bg-[var(--accent-primary)]/60 transition-mechanical shrink-0"
        />
      )}

      {/* Panel Tabs Header */}
      <div className="h-9 px-3 border-b border-[var(--border-hairline)] bg-[var(--surface-base)] flex items-center justify-between shrink-0">
        <div role="tablist" aria-label="Bottom panel views" className="flex items-center gap-1">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'output'}
            onClick={() => {
              onTabChange('output');
              setCollapsed(false);
            }}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-medium transition-mechanical cursor-pointer ${
              activeTab === 'output'
                ? 'bg-[var(--surface-hover)] text-[var(--text-primary)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <PlayCircle className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span>Output</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'history'}
            onClick={() => {
              onTabChange('history');
              setCollapsed(false);
            }}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-medium transition-mechanical cursor-pointer ${
              activeTab === 'history'
                ? 'bg-[var(--surface-hover)] text-[var(--text-primary)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <History className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span>History</span>
            <span className="text-[11px] font-mono tabular-nums text-[var(--text-muted)]">
              {totalExecutions}
            </span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'terminal'}
            onClick={() => {
              onTabChange('terminal');
              setCollapsed(false);
            }}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-medium transition-mechanical cursor-pointer ${
              activeTab === 'terminal'
                ? 'bg-[var(--surface-hover)] text-[var(--text-primary)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <TerminalIcon className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span>Terminal</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => setCollapsed((prev) => !prev)}
          aria-label={collapsed ? 'Expand bottom panel' : 'Collapse bottom panel'}
          className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-mechanical cursor-pointer"
        >
          {collapsed ? (
            <ChevronUp className="w-4 h-4" strokeWidth={1.5} />
          ) : (
            <ChevronDown className="w-4 h-4" strokeWidth={1.5} />
          )}
        </button>
      </div>

      {!collapsed && (
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          {/* Output Tab */}
          {activeTab === 'output' && (
            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
              {/* Stdin Input */}
              <div className="lg:col-span-4 border-b lg:border-b-0 lg:border-r border-[var(--border-hairline)] p-3 flex flex-col bg-[#08080C]">
                <label
                  htmlFor="execution-stdin"
                  className="text-[11px] font-mono text-[var(--text-secondary)] mb-1.5"
                >
                  Standard Input (stdin)
                </label>
                <textarea
                  id="execution-stdin"
                  value={stdin}
                  disabled={!permissions.canRunCode}
                  onChange={(e) => onStdinChange(e.target.value)}
                  placeholder={
                    permissions.canRunCode
                      ? 'Optional stdin passed when running active file…'
                      : permissions.denialReason('runCode')
                  }
                  className="flex-1 min-h-[60px] w-full rounded-md bg-[var(--surface-base)] border border-[var(--border-hairline)] p-2 font-mono text-[12px] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] resize-none disabled:opacity-50"
                />
              </div>

              {/* Execution Result */}
              <div className="lg:col-span-8 overflow-y-auto p-4 font-mono text-[12px]">
                {isRunning ? (
                  <div className="flex items-center gap-2.5 text-[var(--text-secondary)]">
                    <Loader2 className="w-4 h-4 animate-spin text-[var(--accent-primary)]" />
                    <span>Executing {activeFile?.name ?? 'file'}…</span>
                  </div>
                ) : activeFile?.language === 'html' && !latestExecution ? (
                  <p className="text-[var(--text-secondary)]">
                    HTML files render live in the sandboxed HTML Preview pane beside the editor.
                  </p>
                ) : activeFile?.language === 'css' && !latestExecution ? (
                  <p className="text-[var(--text-secondary)]">
                    CSS stylesheets are non-executable directly; link or test them inside an HTML
                    file preview.
                  </p>
                ) : !latestExecution ? (
                  <p className="text-[var(--text-muted)]">
                    No execution output yet. Click Run (or press ⌘↵ / Ctrl+Enter) to execute a
                    supported file.
                  </p>
                ) : (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-3 pb-2.5 border-b border-[var(--border-hairline)] text-[11px]">
                      <StatusChip tone={mapStatusTone(latestExecution.status)}>
                        {latestExecution.status === 'success' ? (
                          <CheckCircle2 className="w-3 h-3" strokeWidth={1.75} />
                        ) : (
                          <AlertCircle className="w-3 h-3" strokeWidth={1.75} />
                        )}
                        <span>{formatExecStatus(latestExecution.status)}</span>
                      </StatusChip>
                      <span className="text-[var(--text-primary)]">
                        {getLanguageMeta(latestExecution.language as SupportedLanguage).label}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[var(--text-secondary)]">
                        <Clock className="w-3 h-3" />
                        <span>{formatDuration(latestExecution.time)}</span>
                      </span>
                      {latestExecution.memory != null && (
                        <span className="text-[var(--text-muted)]">
                          {latestExecution.memory} KB
                        </span>
                      )}
                      <span className="text-[var(--text-muted)] ml-auto">
                        {formatTimestamp(latestExecution.createdAt)}
                      </span>
                    </div>

                    {latestExecution.compileOutput && (
                      <div>
                        <p className="text-[11px] text-[#fde047] mb-1">Compile Output</p>
                        <pre className="text-[#fde047] whitespace-pre-wrap leading-relaxed bg-[var(--state-warning-bg)] border border-[var(--state-warning-border)] rounded-lg p-3">
                          {latestExecution.compileOutput}
                        </pre>
                      </div>
                    )}

                    {latestExecution.stdout && (
                      <pre className="text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed">
                        {latestExecution.stdout}
                      </pre>
                    )}

                    {latestExecution.stderr && (
                      <pre className="text-[#fca5a5] whitespace-pre-wrap leading-relaxed bg-[var(--state-danger-bg)] border border-[var(--state-danger-border)] rounded-lg p-3">
                        {latestExecution.stderr}
                      </pre>
                    )}

                    {!latestExecution.stdout &&
                      !latestExecution.stderr &&
                      !latestExecution.compileOutput && (
                        <p className="text-[var(--text-muted)]">(Program exited with no output)</p>
                      )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Execution History Tab */}
          {activeTab === 'history' && (
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
              {/* Filter Bar */}
              <div className="px-4 py-2 border-b border-[var(--border-hairline)] bg-[#08080C] flex flex-wrap items-center justify-between gap-2 shrink-0">
                <div className="flex flex-wrap items-center gap-2 text-[12px]">
                  <select
                    aria-label="Filter history by file"
                    value={fileFilter}
                    onChange={(e) => setFileFilter(e.target.value)}
                    className="rounded bg-[var(--surface-base)] border border-[var(--border-hairline)] px-2 py-1 text-[12px] font-mono text-[var(--text-primary)]"
                  >
                    <option value="all">All files</option>
                    {fileOptions.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>

                  <select
                    aria-label="Filter history by status"
                    value={statusFilter}
                    onChange={(e) =>
                      setStatusFilter(e.target.value as 'all' | 'success' | 'error')
                    }
                    className="rounded bg-[var(--surface-base)] border border-[var(--border-hairline)] px-2 py-1 text-[12px] text-[var(--text-primary)]"
                  >
                    <option value="all">All statuses</option>
                    <option value="success">Success</option>
                    <option value="error">Errors &amp; Timeouts</option>
                  </select>

                  <select
                    aria-label="Filter history by date"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value as 'all' | 'today' | '7d')}
                    className="rounded bg-[var(--surface-base)] border border-[var(--border-hairline)] px-2 py-1 text-[12px] text-[var(--text-primary)]"
                  >
                    <option value="all">All time</option>
                    <option value="today">Last 24h</option>
                    <option value="7d">Last 7 days</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  {permissions.canClearExecutionHistory && totalExecutions > 0 && (
                    <GlassButton
                      size="sm"
                      variant="ghost"
                      onClick={() => setConfirmClearOpen(true)}
                      className="text-[#fca5a5]"
                    >
                      <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                      <span>Clear History</span>
                    </GlassButton>
                  )}

                  <div className="flex items-center gap-1 text-[11px] font-mono text-[var(--text-muted)]">
                    <button
                      type="button"
                      disabled={pageOffset === 0}
                      onClick={() => setPageOffset((prev) => Math.max(0, prev - pageLimit))}
                      aria-label="Previous history page"
                      className="p-1 rounded hover:bg-[var(--surface-hover)] disabled:opacity-35 cursor-pointer"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <span>
                      {totalExecutions === 0
                        ? '0'
                        : `${pageOffset + 1}-${Math.min(pageOffset + pageLimit, totalExecutions)} of ${totalExecutions}`}
                    </span>
                    <button
                      type="button"
                      disabled={pageOffset + pageLimit >= totalExecutions}
                      onClick={() => setPageOffset((prev) => prev + pageLimit)}
                      aria-label="Next history page"
                      className="p-1 rounded hover:bg-[var(--surface-hover)] disabled:opacity-35 cursor-pointer"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                {historyQuery.isLoading ? (
                  <div className="p-4 space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-4/5" />
                  </div>
                ) : filteredExecutions.length === 0 ? (
                  <div className="p-6 text-center text-[12px] font-mono text-[var(--text-muted)]">
                    No execution records match the current filter.
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse text-[12px]">
                    <thead className="sticky top-0 bg-[var(--surface-base)] border-b border-[var(--border-hairline)] text-[11px] text-[var(--text-muted)]">
                      <tr>
                        <th scope="col" className="py-2 px-4 font-medium">
                          Time
                        </th>
                        <th scope="col" className="py-2 px-4 font-medium">
                          File
                        </th>
                        <th scope="col" className="py-2 px-4 font-medium">
                          Language
                        </th>
                        <th scope="col" className="py-2 px-4 font-medium">
                          Status
                        </th>
                        <th scope="col" className="py-2 px-4 font-medium text-right">
                          Duration
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-hairline)] font-mono">
                      {filteredExecutions.map((rec) => {
                        const meta = getLanguageMeta(rec.language as SupportedLanguage);
                        const fileExists = rec.fileId ? nodeIds.has(rec.fileId) : false;
                        return (
                          <tr
                            key={rec.id}
                            onClick={() => {
                              setSelectedExecutionId(rec.id);
                              setDetailTab(rec.status === 'success' ? 'stdout' : 'stderr');
                            }}
                            className="hover:bg-[var(--surface-elevated)] transition-mechanical cursor-pointer"
                          >
                            <td className="py-2 px-4 text-[var(--text-muted)] whitespace-nowrap">
                              {formatTimestamp(rec.createdAt)}
                            </td>
                            <td className="py-2 px-4 text-[var(--text-primary)]">
                              {rec.file?.name ?? 'Deleted file'}
                              {!fileExists && (
                                <span className="ml-2 text-[10px] text-[var(--text-muted)]">
                                  (deleted)
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-4" style={{ color: meta.color }}>
                              {meta.label}
                            </td>
                            <td className="py-2 px-4">
                              <StatusChip tone={mapStatusTone(rec.status)}>
                                {formatExecStatus(rec.status)}
                              </StatusChip>
                            </td>
                            <td className="py-2 px-4 text-right text-[var(--text-secondary)]">
                              {formatDuration(rec.time)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* Terminal Tab */}
          {activeTab === 'terminal' &&
            (terminalSlot ?? (
              <div className="flex-1 flex items-center justify-center p-6 text-center">
                <EmptyState
                  title="Integrated Terminal"
                  description={
                    permissions.canUseTerminal
                      ? 'Interactive workspace shell initializes in Phase 6.'
                      : permissions.denialReason('useTerminal')
                  }
                />
              </div>
            ))}
        </div>
      )}

      {/* Execution Detail Dialog */}
      <Dialog
        open={Boolean(selectedExecutionId)}
        onClose={() => setSelectedExecutionId(null)}
        title={`Execution Details${selectedDetail?.file?.name ? ` — ${selectedDetail.file.name}` : ''}`}
        maxWidthClass="max-w-[640px]"
      >
        {detailQuery.isLoading ? (
          <div className="space-y-3 py-4">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : selectedDetail ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[var(--border-hairline)]">
              <div className="flex items-center gap-2.5">
                <StatusChip tone={mapStatusTone(selectedDetail.status)}>
                  {formatExecStatus(selectedDetail.status)}
                </StatusChip>
                <span className="text-[12px] font-mono text-[var(--text-secondary)]">
                  {getLanguageMeta(selectedDetail.language as SupportedLanguage).label} ·{' '}
                  {formatDuration(selectedDetail.time)}
                </span>
              </div>

              {selectedDetail.fileId && nodeIds.has(selectedDetail.fileId) ? (
                <GlassButton
                  size="sm"
                  variant="glass"
                  onClick={() => {
                    onOpenFile(selectedDetail.fileId!);
                    setSelectedExecutionId(null);
                  }}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open File</span>
                </GlassButton>
              ) : (
                <span className="text-[11px] font-mono text-[#fde047]">
                  Original file was deleted from the tree
                </span>
              )}
            </div>

            <div
              role="tablist"
              aria-label="Execution detail sections"
              className="flex items-center gap-1 p-1 rounded-lg bg-[var(--surface-base)] border border-[var(--border-hairline)] w-fit"
            >
              {(['stdout', 'stderr', 'meta'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  aria-selected={detailTab === t}
                  onClick={() => setDetailTab(t)}
                  className={`px-3 py-1 rounded text-[12px] font-mono cursor-pointer transition-mechanical ${
                    detailTab === t
                      ? 'bg-[var(--surface-hover)] text-[var(--text-primary)]'
                      : 'text-[var(--text-secondary)]'
                  }`}
                >
                  {t === 'stdout' ? 'stdout' : t === 'stderr' ? 'stderr / compile' : 'metadata'}
                </button>
              ))}
            </div>

            <div className="rounded-lg bg-[#08080C] border border-[var(--border-hairline)] p-4 max-h-72 overflow-y-auto font-mono text-[12px]">
              {detailTab === 'stdout' && (
                <pre className="whitespace-pre-wrap text-[var(--text-primary)]">
                  {selectedDetail.stdout || '(No standard output)'}
                </pre>
              )}
              {detailTab === 'stderr' && (
                <div className="space-y-3">
                  {selectedDetail.compileOutput && (
                    <pre className="whitespace-pre-wrap text-[#fde047]">
                      {selectedDetail.compileOutput}
                    </pre>
                  )}
                  <pre className="whitespace-pre-wrap text-[#fca5a5]">
                    {selectedDetail.stderr ||
                      (!selectedDetail.compileOutput ? '(No error output)' : '')}
                  </pre>
                </div>
              )}
              {detailTab === 'meta' && (
                <dl className="grid grid-cols-2 gap-2 text-[12px]">
                  <dt className="text-[var(--text-muted)]">Execution ID</dt>
                  <dd className="text-[var(--text-primary)] truncate">{selectedDetail.id}</dd>
                  <dt className="text-[var(--text-muted)]">Triggered By</dt>
                  <dd className="text-[var(--text-primary)]">
                    {selectedDetail.user?.name ?? selectedDetail.userId}
                  </dd>
                  <dt className="text-[var(--text-muted)]">Time</dt>
                  <dd className="text-[var(--text-primary)]">
                    {formatDuration(selectedDetail.time)}
                  </dd>
                  <dt className="text-[var(--text-muted)]">Memory</dt>
                  <dd className="text-[var(--text-primary)]">
                    {selectedDetail.memory != null ? `${selectedDetail.memory} KB` : '—'}
                  </dd>
                  <dt className="text-[var(--text-muted)]">Timestamp</dt>
                  <dd className="text-[var(--text-primary)]">
                    {formatTimestamp(selectedDetail.createdAt)}
                  </dd>
                </dl>
              )}
            </div>
          </div>
        ) : null}
      </Dialog>

      {/* Clear History Confirmation */}
      <Dialog
        open={confirmClearOpen}
        onClose={() => setConfirmClearOpen(false)}
        title="Clear all execution history?"
        description="This permanently removes all saved execution records for this project."
        maxWidthClass="max-w-[400px]"
      >
        <div className="flex items-center justify-end gap-2 pt-3">
          <GlassButton variant="ghost" autoFocus onClick={() => setConfirmClearOpen(false)}>
            Cancel
          </GlassButton>
          <GlassButton
            variant="danger"
            loading={clearMutation.isPending}
            onClick={() => {
              void clearMutation.mutateAsync().then(() => setConfirmClearOpen(false));
            }}
          >
            Clear History
          </GlassButton>
        </div>
      </Dialog>
    </section>
  );
}
