import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import {
  Terminal as TerminalIcon,
  PlayCircle,
  History,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertCircle,
  Trash2,
} from 'lucide-react';
import type { ExecutionRecord, FileNode } from '../types/devsync';
import { getLanguageMeta } from '../utils/fileTree';
import { processTerminalCommand } from '../utils/codeRunner';

export type BottomTab = 'output' | 'terminal' | 'history';

interface TerminalLine {
  id: string;
  kind: 'prompt' | 'stdout' | 'error';
  text: string;
}

interface BottomPanelProps {
  projectId: string;
  projectName: string;
  nodes: FileNode[];
  userName: string;
  canRunCode: boolean;
  activeTab: BottomTab;
  onTabChange: (tab: BottomTab) => void;
  latestExecution: ExecutionRecord | null;
  executions: ExecutionRecord[];
  onTerminalExecution: (record: ExecutionRecord) => void;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function BottomPanel({
  projectId,
  projectName,
  nodes,
  userName,
  canRunCode,
  activeTab,
  onTabChange,
  latestExecution,
  executions,
  onTerminalExecution,
}: BottomPanelProps) {
  const [height, setHeight] = useState(224);
  const [collapsed, setCollapsed] = useState(false);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);

  const [terminalLines, setTerminalLines] = useState<TerminalLine[]>([
    {
      id: 'welcome-1',
      kind: 'stdout',
      text: `DevSync Integrated Terminal — workspace: ${projectName}`,
    },
    {
      id: 'welcome-2',
      kind: 'stdout',
      text: 'Type "help" for available commands (ls, run <file>, cat <file>, clear).',
    },
  ]);
  const [terminalInput, setTerminalInput] = useState('');
  const [cmdHistory, setCmdHistory] = useState<string[]>([]);
  const [historyCursor, setHistoryCursor] = useState(-1);
  const termScrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setTerminalLines([
      {
        id: `welcome-${projectId}-1`,
        kind: 'stdout',
        text: `DevSync Integrated Terminal — workspace: ${projectName}`,
      },
      {
        id: `welcome-${projectId}-2`,
        kind: 'stdout',
        text: 'Type "help" for available commands (ls, run <file>, cat <file>, clear).',
      },
    ]);
  }, [projectId, projectName]);

  useEffect(() => {
    if (termScrollRef.current) {
      termScrollRef.current.scrollTop = termScrollRef.current.scrollHeight;
    }
  }, [terminalLines, activeTab]);

  const startResize = (startY: number) => {
    const startHeight = height;
    const onMove = (ev: MouseEvent) => {
      const delta = startY - ev.clientY;
      setHeight(Math.min(440, Math.max(136, startHeight + delta)));
      setCollapsed(false);
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const handleTerminalSubmit = (e: FormEvent) => {
    e.preventDefault();
    const raw = terminalInput.trim();
    if (!raw) return;

    const promptSlug = projectName.toLowerCase().replace(/\s+/g, '-');
    const result = processTerminalCommand(raw, {
      projectId,
      projectName,
      nodes,
      userName,
      canRunCode,
    });

    setCmdHistory((prev) => [raw, ...prev].slice(0, 30));
    setHistoryCursor(-1);
    setTerminalInput('');

    if (result.clear) {
      setTerminalLines([]);
      return;
    }

    if (result.executionRecord) {
      onTerminalExecution(result.executionRecord);
    }

    const now = Date.now();
    const newEntries: TerminalLine[] = [
      {
        id: `cmd-${now}`,
        kind: 'prompt',
        text: `devsync:~/${promptSlug} $ ${raw}`,
      },
      ...result.outputLines.map((line, i) => ({
        id: `out-${now}-${i}`,
        kind: (result.isError ? 'error' : 'stdout') as 'stdout' | 'error',
        text: line,
      })),
    ];

    setTerminalLines((prev) => [...prev, ...newEntries]);
  };

  const handleTerminalKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (cmdHistory.length === 0) return;
      const next = Math.min(cmdHistory.length - 1, historyCursor + 1);
      setHistoryCursor(next);
      setTerminalInput(cmdHistory[next]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyCursor <= 0) {
        setHistoryCursor(-1);
        setTerminalInput('');
      } else {
        const next = historyCursor - 1;
        setHistoryCursor(next);
        setTerminalInput(cmdHistory[next]);
      }
    }
  };

  return (
    <section
      aria-label="Execution and terminal panel"
      className="shrink-0 bg-[#050507] border-t border-white/[0.07] flex flex-col"
      style={{ height: collapsed ? '38px' : `${height}px` }}
    >
      {/* Drag Resize Handle */}
      {!collapsed && (
        <div
          role="separator"
          aria-orientation="horizontal"
          aria-label="Resize bottom panel"
          onMouseDown={(e) => startResize(e.clientY)}
          className="h-1 w-full cursor-row-resize hover:bg-[#5E5CE6]/60 transition-mechanical shrink-0"
        />
      )}

      {/* Panel Tabs Header */}
      <div className="h-9 px-3 border-b border-white/[0.07] bg-[#0B0B0F] flex items-center justify-between shrink-0">
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
                ? 'bg-[#18181F] text-[#F4F4F6]'
                : 'text-[#9494A3] hover:text-[#F4F4F6]'
            }`}
          >
            <PlayCircle className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span>Output</span>
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
                ? 'bg-[#18181F] text-[#F4F4F6]'
                : 'text-[#9494A3] hover:text-[#F4F4F6]'
            }`}
          >
            <TerminalIcon className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span>Terminal</span>
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
                ? 'bg-[#18181F] text-[#F4F4F6]'
                : 'text-[#9494A3] hover:text-[#F4F4F6]'
            }`}
          >
            <History className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span>Execution History</span>
            <span className="text-[11px] font-mono tabular-nums text-[#5C5C6E]">
              {executions.length}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'terminal' && !collapsed && (
            <button
              type="button"
              onClick={() => setTerminalLines([])}
              aria-label="Clear terminal"
              title="Clear terminal"
              className="p-1 rounded text-[#5C5C6E] hover:text-[#F4F4F6] transition-mechanical cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
            </button>
          )}
          <button
            type="button"
            onClick={() => setCollapsed((prev) => !prev)}
            aria-label={collapsed ? 'Expand bottom panel' : 'Collapse bottom panel'}
            className="p-1 rounded text-[#5C5C6E] hover:text-[#F4F4F6] transition-mechanical cursor-pointer"
          >
            {collapsed ? (
              <ChevronUp className="w-4 h-4" strokeWidth={1.5} />
            ) : (
              <ChevronDown className="w-4 h-4" strokeWidth={1.5} />
            )}
          </button>
        </div>
      </div>

      {/* Tab Body */}
      {!collapsed && (
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          {activeTab === 'output' && (
            <div className="flex-1 overflow-y-auto p-4 font-mono text-[12px]">
              {!latestExecution ? (
                <p className="text-[#5C5C6E]">
                  No execution output yet. Click Run Code to execute the active file using its
                  assigned language runtime.
                </p>
              ) : (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[#9494A3] pb-2.5 border-b border-white/[0.06]">
                    <span className="inline-flex items-center gap-1.5 font-medium">
                      {latestExecution.status === 'success' ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#22C55E]" strokeWidth={1.75} />
                          <span className="text-[#22C55E]">Success</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-3.5 h-3.5 text-[#EF4444]" strokeWidth={1.75} />
                          <span className="text-[#EF4444]">Error</span>
                        </>
                      )}
                    </span>
                    <span className="text-[#F4F4F6]">{latestExecution.fileName}</span>
                    <span>{latestExecution.runtime}</span>
                    <span className="tabular-nums text-[#5C5C6E]">
                      {latestExecution.durationMs}ms
                    </span>
                    <span className="tabular-nums text-[#5C5C6E]">
                      {formatTime(latestExecution.timestamp)}
                    </span>
                  </div>

                  {latestExecution.stdout && (
                    <pre className="text-[#E4E4E7] whitespace-pre-wrap leading-relaxed">
                      {latestExecution.stdout}
                    </pre>
                  )}

                  {latestExecution.stderr && (
                    <pre className="text-[#EF4444] whitespace-pre-wrap leading-relaxed bg-[#EF4444]/5 border border-[#EF4444]/20 rounded-lg p-3">
                      {latestExecution.stderr}
                    </pre>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'terminal' && (
            <div className="flex-1 min-h-0 flex flex-col bg-[#050507] font-mono text-[12px]">
              <div ref={termScrollRef} className="flex-1 overflow-y-auto px-4 pt-3 pb-2 space-y-1">
                {terminalLines.map((line) => (
                  <div
                    key={line.id}
                    className={`whitespace-pre-wrap leading-5 ${
                      line.kind === 'prompt'
                        ? 'text-[#F4F4F6] font-medium'
                        : line.kind === 'error'
                        ? 'text-[#EF4444]'
                        : 'text-[#9494A3]'
                    }`}
                  >
                    {line.text}
                  </div>
                ))}
              </div>
              <form
                onSubmit={handleTerminalSubmit}
                className="flex items-center gap-2 px-4 py-2 border-t border-white/[0.06] bg-[#08080C]"
              >
                <span className="text-[#5E5CE6] shrink-0">
                  devsync:~/{projectName.toLowerCase().replace(/\s+/g, '-')} $
                </span>
                <input
                  type="text"
                  aria-label="Integrated terminal command input"
                  value={terminalInput}
                  onChange={(e) => setTerminalInput(e.target.value)}
                  onKeyDown={handleTerminalKeyDown}
                  placeholder="Enter command (ls, help, run utils.js, clear)..."
                  className="flex-1 bg-transparent text-[#F4F4F6] placeholder-[#5C5C6E] focus:outline-none"
                />
              </form>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="flex-1 overflow-y-auto">
              {executions.length === 0 ? (
                <div className="p-4 text-[12px] font-mono text-[#5C5C6E]">
                  No runs recorded for this project yet.
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-[12px]">
                  <thead className="sticky top-0 bg-[#0B0B0F] border-b border-white/[0.07] text-[11px] text-[#5C5C6E]">
                    <tr>
                      <th className="py-2 px-4 font-medium">Time</th>
                      <th className="py-2 px-4 font-medium">File</th>
                      <th className="py-2 px-4 font-medium">Language</th>
                      <th className="py-2 px-4 font-medium">Status</th>
                      <th className="py-2 px-4 font-medium text-right">Duration</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06] font-mono">
                    {executions.map((rec) => {
                      const isExpanded = expandedHistoryId === rec.id;
                      const langMeta = getLanguageMeta(rec.language);
                      return (
                        <tr
                          key={rec.id}
                          onClick={() =>
                            setExpandedHistoryId(isExpanded ? null : rec.id)
                          }
                          className="hover:bg-[#111116] transition-mechanical cursor-pointer align-top"
                        >
                          <td className="py-2.5 px-4 tabular-nums text-[#5C5C6E] whitespace-nowrap">
                            {formatTime(rec.timestamp)}
                          </td>
                          <td className="py-2.5 px-4 text-[#F4F4F6]">
                            <div>{rec.fileName}</div>
                            {isExpanded && (
                              <pre className="mt-2 p-2.5 rounded-md bg-[#0B0B0F] border border-white/[0.07] text-[11px] text-[#9494A3] whitespace-pre-wrap">
                                {rec.stderr ? rec.stderr : rec.stdout}
                              </pre>
                            )}
                          </td>
                          <td
                            className="py-2.5 px-4 whitespace-nowrap"
                            style={{ color: langMeta.color }}
                          >
                            {langMeta.label}
                          </td>
                          <td className="py-2.5 px-4 whitespace-nowrap">
                            {rec.status === 'success' ? (
                              <span className="inline-flex items-center gap-1 text-[#22C55E]">
                                <CheckCircle2 className="w-3 h-3" strokeWidth={1.75} />
                                <span>Success</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[#EF4444]">
                                <AlertCircle className="w-3 h-3" strokeWidth={1.75} />
                                <span>Error</span>
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-4 text-right tabular-nums text-[#9494A3] whitespace-nowrap">
                            {rec.durationMs}ms
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
