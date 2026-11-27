import { useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { Lock, RefreshCw, Terminal as TerminalIcon, Trash2 } from 'lucide-react';
import type { Socket } from 'socket.io-client';
import type { WorkspaceCapabilities } from '../../hooks/usePermissions';
import type { FileNode } from '../../types/devsync';
import { processTerminalCommand } from '../../utils/codeRunner';
import { GlassButton, StatusChip } from '../ui';

interface XtermTerminalPanelProps {
  projectId: string;
  projectName: string;
  nodes: FileNode[];
  userName: string;
  permissions: WorkspaceCapabilities;
  socket: Socket | null;
  socketConnected: boolean;
}

export function XtermTerminalPanel({
  projectId,
  projectName,
  nodes,
  userName,
  permissions,
  socket,
  socketConnected,
}: XtermTerminalPanelProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const lineBufferRef = useRef('');
  const [mode, setMode] = useState<'container' | 'virtual'>('virtual');

  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;
  const canUseRef = useRef(permissions.canUseTerminal);
  canUseRef.current = permissions.canUseTerminal;

  const slug = projectName.toLowerCase().replace(/\s+/g, '-') || 'workspace';

  const writePrompt = (term: Terminal) => {
    term.write(`\r\n\x1b[38;2;94;92;230mdevsync:~/${slug}\x1b[0m $ `);
  };

  useEffect(() => {
    if (!hostRef.current) return;

    const term = new Terminal({
      cursorBlink: permissions.canUseTerminal,
      disableStdin: !permissions.canUseTerminal,
      fontFamily: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
      fontSize: 12,
      lineHeight: 1.45,
      theme: {
        background: '#050507',
        foreground: '#E4E4E7',
        cursor: '#5E5CE6',
        selectionBackground: 'rgba(94, 92, 230, 0.35)',
        red: '#EF4444',
        green: '#22C55E',
        yellow: '#EAB308',
        blue: '#60A5FA',
      },
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(hostRef.current);
    fitAddon.fit();

    termRef.current = term;
    fitRef.current = fitAddon;

    term.writeln(`\x1b[1mDevSync Integrated Terminal\x1b[0m — ${projectName}`);
    if (!permissions.canUseTerminal) {
      term.writeln('\x1b[33mViewer Mode: terminal input is disabled.\x1b[0m');
    } else {
      term.writeln('Type "help" for built-in commands (ls, pwd, cat <file>, whoami, clear).');
      writePrompt(term);
    }

    const dataDisposable = term.onData((data) => {
      if (!canUseRef.current) return;

      if (mode === 'container' && socket && socket.connected) {
        socket.emit('terminal:input', { projectId, data });
        return;
      }

      // Virtual shell line editing
      if (data === '\r') {
        const cmd = lineBufferRef.current.trim();
        lineBufferRef.current = '';
        term.write('\r\n');

        if (cmd) {
          const result = processTerminalCommand(cmd, {
            projectId,
            projectName,
            nodes: nodesRef.current,
            userName,
            canRunCode: true,
          });
          if (result.clear) {
            term.clear();
          } else {
            for (const line of result.outputLines) {
              term.writeln(result.isError ? `\x1b[31m${line}\x1b[0m` : line);
            }
          }
        }
        writePrompt(term);
      } else if (data === '\u007F') {
        // Backspace
        if (lineBufferRef.current.length > 0) {
          lineBufferRef.current = lineBufferRef.current.slice(0, -1);
          term.write('\b \b');
        }
      } else if (data === '\u0003') {
        // Ctrl+C
        lineBufferRef.current = '';
        term.write('^C');
        writePrompt(term);
      } else if (data >= ' ') {
        lineBufferRef.current += data;
        term.write(data);
      }
    });

    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit();
      if (mode === 'container' && socket && socket.connected) {
        socket.emit('terminal:resize', {
          projectId,
          cols: term.cols,
          rows: term.rows,
        });
      }
    });
    resizeObserver.observe(hostRef.current);

    return () => {
      resizeObserver.disconnect();
      dataDisposable.dispose();
      term.dispose();
      termRef.current = null;
      fitRef.current = null;
    };
  }, [projectId, projectName, permissions.canUseTerminal]);

  // Listen for optional container terminal socket stream
  useEffect(() => {
    if (!socket || !socketConnected || !permissions.canUseTerminal) {
      setMode('virtual');
      return;
    }

    const handleReady = () => setMode('container');
    const handleOutput = (payload: { data?: string }) => {
      if (payload?.data) {
        termRef.current?.write(payload.data);
      }
    };
    const handleClosed = () => setMode('virtual');

    socket.on('terminal:ready', handleReady);
    socket.on('terminal:output', handleOutput);
    socket.on('terminal:closed', handleClosed);

    return () => {
      socket.off('terminal:ready', handleReady);
      socket.off('terminal:output', handleOutput);
      socket.off('terminal:closed', handleClosed);
    };
  }, [socket, socketConnected, permissions.canUseTerminal]);

  const handleRequestContainer = () => {
    if (!socket || !socketConnected || !permissions.canUseTerminal || !termRef.current) return;
    socket.emit('terminal:open', {
      projectId,
      cols: termRef.current.cols,
      rows: termRef.current.rows,
    });
    termRef.current.focus();
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-[#050507]">
      <div className="px-3 py-1.5 border-b border-[var(--border-hairline)] bg-[#08080C] flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <TerminalIcon className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
          <StatusChip tone={mode === 'container' ? 'success' : 'neutral'}>
            {mode === 'container' ? 'Container Shell' : 'Virtual Shell'}
          </StatusChip>
          {!permissions.canUseTerminal && (
            <span className="inline-flex items-center gap-1 text-[11px] text-[#fde047]">
              <Lock className="w-3 h-3" />
              <span>{permissions.denialReason('useTerminal')}</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {socketConnected && mode === 'virtual' && permissions.canUseTerminal && (
            <GlassButton size="sm" variant="ghost" onClick={handleRequestContainer}>
              <RefreshCw className="w-3 h-3" />
              <span>Attach Container</span>
            </GlassButton>
          )}
          <button
            type="button"
            onClick={() => {
              termRef.current?.clear();
              if (permissions.canUseTerminal && termRef.current) {
                writePrompt(termRef.current);
              }
            }}
            aria-label="Clear terminal"
            title="Clear terminal"
            className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div
        ref={hostRef}
        tabIndex={0}
        aria-label="Integrated workspace terminal"
        onClick={() => termRef.current?.focus()}
        className="flex-1 min-h-0 p-2 overflow-hidden focus:outline-none"
      />
    </div>
  );
}
