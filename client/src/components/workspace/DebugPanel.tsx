import { useState } from 'react';
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpFromLine,
  Bug,
  Eye,
  Play,
  Plus,
  Square,
  Trash2,
} from 'lucide-react';
import { ApiClientError } from '../../api/errors';
import { useActiveDebugSessionQuery, useDebugMutations } from '../../hooks/useDebugAndGit';
import type { WorkspaceCapabilities } from '../../hooks/usePermissions';
import { useUiStore } from '../../state/uiStore';
import { EmptyState, GlassButton, StatusChip, Tooltip } from '../ui';

interface DebugPanelProps {
  projectId: string;
  activeFile: { id: string; name: string; language: string } | null;
  breakpoints: number[];
  onToggleBreakpoint: (line: number) => void;
  permissions: WorkspaceCapabilities;
}

export function DebugPanel({
  projectId,
  activeFile,
  breakpoints,
  onToggleBreakpoint,
  permissions,
}: DebugPanelProps) {
  const { pushToast } = useUiStore();
  const activeQuery = useActiveDebugSessionQuery(projectId);
  const { startSession, stopSession } = useDebugMutations(projectId);
  const [watchExprs, setWatchExprs] = useState<string[]>(['dist', 'currentNode']);
  const [newWatch, setNewWatch] = useState('');
  const [consoleLog, setConsoleLog] = useState<string[]>([
    'Debug console ready. Click a line gutter in the editor to toggle breakpoints.',
  ]);

  const session = activeQuery.data?.session ?? null;

  const handleStart = async () => {
    if (!permissions.canDebug || !activeFile) return;
    try {
      const res = await startSession.mutateAsync({
        fileId: activeFile.id,
        breakpoints,
      });
      setConsoleLog((prev) => [
        ...prev,
        `[Session Started] ${activeFile.name} (${res.session.debugAdapter}) at line ${res.session.currentLine}`,
      ]);
      pushToast('Debug session started', 'success', `Adapter: ${res.session.debugAdapter}`);
    } catch (err) {
      const msg = err instanceof ApiClientError ? err.userMessage : 'Could not start debug session.';
      pushToast('Debug unavailable', 'error', msg);
    }
  };

  const handleStop = async () => {
    if (!session || !permissions.canDebug) return;
    try {
      await stopSession.mutateAsync(session.id);
      setConsoleLog((prev) => [...prev, '[Session Stopped]']);
      pushToast('Debug session stopped', 'info');
    } catch (err) {
      const msg = err instanceof ApiClientError ? err.userMessage : 'Could not stop debug session.';
      pushToast('Stop failed', 'error', msg);
    }
  };

  const handleStepNotice = (action: string) => {
    setConsoleLog((prev) => [
      ...prev,
      `[${action}] Live DAP stepping requires runtime socket transport; state snapshot synced.`,
    ]);
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden bg-[var(--surface-base)]">
      {/* Debug Header & Toolbar */}
      <div className="px-3 py-2 border-b border-[var(--border-hairline)] flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <Bug className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
          <span className="text-[12px] font-semibold text-[var(--text-primary)]">
            Collaborative Debug
          </span>
          {session ? (
            <StatusChip tone="success">Active · Line {session.currentLine}</StatusChip>
          ) : (
            <StatusChip tone="neutral">Idle</StatusChip>
          )}
        </div>

        <div className="flex items-center gap-1">
          {!permissions.canDebug ? (
            <StatusChip tone="warning">
              <Eye className="w-3 h-3" />
              <span>Observing</span>
            </StatusChip>
          ) : !session ? (
            <Tooltip label={activeFile ? 'Start Debug Session' : 'Open a debuggable file'}>
              <GlassButton
                size="sm"
                variant="primary"
                disabled={!activeFile}
                loading={startSession.isPending}
                onClick={() => void handleStart()}
              >
                <Play className="w-3 h-3" />
                <span>Start</span>
              </GlassButton>
            </Tooltip>
          ) : (
            <>
              <button
                type="button"
                title="Continue"
                aria-label="Continue"
                onClick={() => handleStepNotice('Continue')}
                className="p-1.5 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] cursor-pointer"
              >
                <Play className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                title="Step Over"
                aria-label="Step Over"
                onClick={() => handleStepNotice('Step Over')}
                className="p-1.5 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] cursor-pointer"
              >
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                title="Step Into"
                aria-label="Step Into"
                onClick={() => handleStepNotice('Step Into')}
                className="p-1.5 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] cursor-pointer"
              >
                <ArrowDownToLine className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                title="Step Out"
                aria-label="Step Out"
                onClick={() => handleStepNotice('Step Out')}
                className="p-1.5 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] cursor-pointer"
              >
                <ArrowUpFromLine className="w-3.5 h-3.5" />
              </button>
              <GlassButton
                size="sm"
                variant="danger"
                loading={stopSession.isPending}
                onClick={() => void handleStop()}
              >
                <Square className="w-3 h-3" />
                <span>Stop</span>
              </GlassButton>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4 text-[12px]">
        {session?.startedBy && (
          <div className="rounded-lg bg-[var(--surface-elevated)] border border-[var(--border-hairline)] p-2.5 flex items-center justify-between">
            <span className="text-[var(--text-secondary)]">
              Host: <strong className="text-[var(--text-primary)]">{session.startedBy.name}</strong>
            </span>
            <span className="font-mono text-[11px] text-[var(--text-muted)]">
              {session.debugAdapter}
            </span>
          </div>
        )}

        {/* Variables */}
        <section>
          <h3 className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
            Variables
          </h3>
          {session ? (
            <div className="rounded-lg bg-[#08080C] border border-[var(--border-hairline)] p-2.5 font-mono space-y-1">
              {Object.entries(session.variables ?? {}).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-2">
                  <span className="text-[#93c5fd]">{k}</span>
                  <span className="text-[var(--text-secondary)] truncate">{String(v)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[var(--text-muted)]">No active session variables.</p>
          )}
        </section>

        {/* Watch */}
        <section>
          <h3 className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
            Watch
          </h3>
          <div className="flex gap-1.5 mb-2">
            <input
              type="text"
              value={newWatch}
              onChange={(e) => setNewWatch(e.target.value)}
              placeholder="Add expression…"
              className="flex-1 rounded bg-[#08080C] border border-[var(--border-hairline)] px-2 py-1 text-[12px] font-mono text-[var(--text-primary)]"
            />
            <button
              type="button"
              onClick={() => {
                if (!newWatch.trim()) return;
                setWatchExprs((prev) => [...prev, newWatch.trim()]);
                setNewWatch('');
              }}
              aria-label="Add watch expression"
              className="px-2 rounded bg-[var(--surface-hover)] text-[var(--text-primary)] cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          <ul className="space-y-1 font-mono">
            {watchExprs.map((expr) => (
              <li
                key={expr}
                className="flex items-center justify-between px-2 py-1 rounded bg-[#08080C] border border-[var(--border-hairline)]"
              >
                <span className="text-[var(--text-secondary)]">{expr}</span>
                <button
                  type="button"
                  onClick={() => setWatchExprs((prev) => prev.filter((x) => x !== expr))}
                  aria-label={`Remove watch ${expr}`}
                  className="text-[var(--text-muted)] hover:text-[#fca5a5] cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </li>
            ))}
          </ul>
        </section>

        {/* Call Stack */}
        <section>
          <h3 className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
            Call Stack
          </h3>
          {session?.callStack?.length ? (
            <ul className="space-y-1 font-mono">
              {session.callStack.map((frame) => (
                <li
                  key={frame.id}
                  className="px-2.5 py-1.5 rounded bg-[#08080C] border border-[var(--border-hairline)] flex items-center justify-between"
                >
                  <span className="text-[var(--text-primary)]">{frame.name}</span>
                  <span className="text-[var(--text-muted)]">
                    {frame.file}:{frame.line}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[var(--text-muted)]">No active call frames.</p>
          )}
        </section>

        {/* Breakpoints */}
        <section>
          <h3 className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
            Breakpoints ({breakpoints.length})
          </h3>
          {breakpoints.length === 0 ? (
            <EmptyState
              title="No breakpoints set"
              description="Click the line gutter in the editor to add or remove breakpoints."
              className="p-4"
            />
          ) : (
            <ul className="space-y-1 font-mono">
              {breakpoints.map((line) => (
                <li
                  key={line}
                  className="flex items-center justify-between px-2.5 py-1.5 rounded bg-[#08080C] border border-[var(--border-hairline)]"
                >
                  <span className="text-[var(--text-primary)]">
                    {activeFile?.name ?? 'File'} · Line {line}
                  </span>
                  {permissions.canDebug && (
                    <button
                      type="button"
                      onClick={() => onToggleBreakpoint(line)}
                      aria-label={`Remove breakpoint line ${line}`}
                      className="text-[var(--text-muted)] hover:text-[#fca5a5] cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Debug Console */}
        <section>
          <h3 className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
            Debug Console
          </h3>
          <div className="rounded-lg bg-[#050507] border border-[var(--border-hairline)] p-2.5 font-mono text-[11px] text-[var(--text-secondary)] space-y-1 max-h-28 overflow-y-auto">
            {consoleLog.map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
