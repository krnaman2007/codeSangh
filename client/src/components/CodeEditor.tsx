import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { X, Check, Eye, Lock, FileCode2 } from 'lucide-react';
import type { FileNode } from '../types/devsync';
import { getLanguageMeta } from '../utils/fileTree';
import { TOKEN_STYLES, tokenizeCode } from '../utils/syntaxHighlight';

interface CodeEditorProps {
  openFiles: FileNode[];
  activeFile: FileNode | null;
  canEditCode: boolean;
  saveStatus: 'saved' | 'saving';
  showLiveCursors: boolean;
  onToggleLiveCursors: () => void;
  onSelectTab: (fileId: string) => void;
  onCloseTab: (fileId: string) => void;
  onChangeContent: (fileId: string, content: string) => void;
}

interface SimulatedCursor {
  id: string;
  name: string;
  color: string;
  selectionBg: string;
  lineIndex: number;
  colStart: number;
  colEnd: number;
}

export function CodeEditor({
  openFiles,
  activeFile,
  canEditCode,
  saveStatus,
  showLiveCursors,
  onToggleLiveCursors,
  onSelectTab,
  onCloseTab,
  onChangeContent,
}: CodeEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const preRef = useRef<HTMLDivElement | null>(null);
  const gutterRef = useRef<HTMLDivElement | null>(null);
  const [cursorCoords, setCursorCoords] = useState({ line: 1, col: 1 });
  const [cursorPhase, setCursorPhase] = useState(0);

  // Gently cycle simulated collaborator cursors across realistic lines in the active file
  useEffect(() => {
    if (!showLiveCursors || !activeFile) return;
    const timer = window.setInterval(() => {
      setCursorPhase((prev) => (prev + 1) % 3);
    }, 4500);
    return () => window.clearInterval(timer);
  }, [showLiveCursors, activeFile?.id]);

  const code = activeFile?.content ?? '';
  const language = activeFile?.language ?? 'javascript';
  const langMeta = getLanguageMeta(language);

  const lines = useMemo(() => code.split('\n'), [code]);
  const tokenizedLines = useMemo(() => tokenizeCode(code, language), [code, language]);

  // Compute deterministic, safe live cursor overlays anchored to real indented code lines
  const liveCursors = useMemo<SimulatedCursor[]>(() => {
    if (!showLiveCursors || lines.length < 3) return [];
    const candidateLines = lines
      .map((l, idx) => ({ idx, len: l.length }))
      .filter((item) => item.len >= 12);

    if (candidateLines.length === 0) return [];

    const basePool =
      candidateLines.length >= 6
        ? candidateLines.slice(2)
        : candidateLines;

    const pick1 = basePool[(2 + cursorPhase) % basePool.length];
    const pick2 = basePool[(5 + cursorPhase) % basePool.length];

    const aLine = lines[pick1.idx] ?? '';
    const aFirstNonSpace = Math.max(0, aLine.search(/\S|$/));
    const aStart = Math.min(aFirstNonSpace + 8, Math.max(aFirstNonSpace, aLine.length - 8));
    const aEnd = Math.min(aLine.length, aStart + 10);

    const mLine = lines[pick2.idx] ?? '';
    const mFirstNonSpace = Math.max(0, mLine.search(/\S|$/));
    const mStart = Math.min(mFirstNonSpace + 6, Math.max(mFirstNonSpace, mLine.length - 7));
    const mEnd = Math.min(mLine.length, mStart + 8);

    const cursors: SimulatedCursor[] = [
      {
        id: 'cursor-aarav',
        name: 'Aarav',
        color: '#5E5CE6',
        selectionBg: 'rgba(94, 92, 230, 0.22)',
        lineIndex: pick1.idx,
        colStart: aStart,
        colEnd: aEnd,
      },
    ];

    if (pick2.idx !== pick1.idx) {
      cursors.push({
        id: 'cursor-maya',
        name: 'Maya',
        color: '#14B8A6',
        selectionBg: 'rgba(20, 184, 166, 0.20)',
        lineIndex: pick2.idx,
        colStart: mStart,
        colEnd: mEnd,
      });
    }
    return cursors;
  }, [showLiveCursors, lines, cursorPhase]);

  const syncScroll = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    if (preRef.current) {
      preRef.current.scrollTop = ta.scrollTop;
      preRef.current.scrollLeft = ta.scrollLeft;
    }
    if (gutterRef.current) {
      gutterRef.current.scrollTop = ta.scrollTop;
    }
  };

  const updateCaretCoords = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    const pos = ta.selectionStart ?? 0;
    const before = ta.value.slice(0, pos);
    const split = before.split('\n');
    setCursorCoords({
      line: split.length,
      col: split[split.length - 1].length + 1,
    });
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!canEditCode || !activeFile) return;
    if (e.key === 'Tab') {
      e.preventDefault();
      const ta = e.currentTarget;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const next = `${code.slice(0, start)}  ${code.slice(end)}`;
      onChangeContent(activeFile.id, next);
      window.requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = start + 2;
        updateCaretCoords();
      });
    }
  };

  if (!activeFile) {
    return (
      <div className="flex-1 bg-[#0B0B0F] flex flex-col items-center justify-center p-8 text-center">
        <div className="w-11 h-11 rounded-xl bg-[#111116] border border-white/[0.07] flex items-center justify-center mb-4">
          <FileCode2 className="w-5 h-5 text-[#5C5C6E]" strokeWidth={1.5} />
        </div>
        <p className="text-[14px] font-medium text-[#F4F4F6]">No file open</p>
        <p className="text-[12px] text-[#5C5C6E] mt-1 max-w-xs">
          Select a file from the explorer or create a new file with your chosen programming
          language.
        </p>
      </div>
    );
  }

  return (
    <section
      aria-label="Code editor"
      className="flex-1 min-w-0 min-h-0 flex flex-col bg-[#0B0B0F]"
    >
      {/* Multi-file Tab Bar */}
      <div
        role="tablist"
        aria-label="Open files"
        className="h-10 bg-[#050507] border-b border-white/[0.07] flex items-center overflow-x-auto shrink-0"
      >
        {openFiles.map((file) => {
          const isCurrent = file.id === activeFile.id;
          const meta = getLanguageMeta(file.language);
          return (
            <div
              key={file.id}
              role="tab"
              aria-selected={isCurrent}
              className={`group flex items-center gap-2 h-full px-3.5 border-r border-white/[0.07] text-[12px] font-mono transition-mechanical shrink-0 ${
                isCurrent
                  ? 'bg-[#0B0B0F] text-[#F4F4F6] border-t-2 border-t-[#5E5CE6]'
                  : 'bg-[#050507] text-[#9494A3] hover:bg-[#0B0B0F]/60 hover:text-[#F4F4F6] border-t-2 border-t-transparent'
              }`}
            >
              <button
                type="button"
                onClick={() => onSelectTab(file.id)}
                className="flex items-center gap-2 h-full cursor-pointer whitespace-nowrap"
              >
                <span className="text-[10px] font-semibold" style={{ color: meta.color }}>
                  {meta.shortTag}
                </span>
                <span>{file.name}</span>
              </button>
              <button
                type="button"
                onClick={() => onCloseTab(file.id)}
                aria-label={`Close ${file.name}`}
                className="p-0.5 rounded text-[#5C5C6E] hover:text-[#F4F4F6] hover:bg-[#18181F] transition-mechanical cursor-pointer"
              >
                <X className="w-3 h-3" strokeWidth={1.5} />
              </button>
            </div>
          );
        })}
      </div>

      {/* Editor Metadata & Collaborator Cursor Strip */}
      <div className="h-8 px-4 bg-[#0B0B0F] border-b border-white/[0.06] flex items-center justify-between gap-4 text-[11px] font-mono text-[#5C5C6E] shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <span style={{ color: langMeta.color }} className="font-medium">
            {langMeta.label}
          </span>
          <span aria-hidden="true">·</span>
          <span className="truncate">{langMeta.runtime}</span>
          <span aria-hidden="true">·</span>
          <span className="tabular-nums">
            Ln {cursorCoords.line}, Col {cursorCoords.col}
          </span>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <button
            type="button"
            onClick={onToggleLiveCursors}
            aria-pressed={showLiveCursors}
            className={`inline-flex items-center gap-1.5 text-[11px] transition-mechanical cursor-pointer ${
              showLiveCursors ? 'text-[#F4F4F6]' : 'text-[#5C5C6E] hover:text-[#9494A3]'
            }`}
          >
            <Eye className="w-3 h-3" strokeWidth={1.5} />
            <span>Live Cursors: {showLiveCursors ? 'On' : 'Off'}</span>
          </button>

          <span className="text-white/[0.1]" aria-hidden="true">
            |
          </span>

          {canEditCode ? (
            <span className="inline-flex items-center gap-1 text-[#9494A3]">
              <Check className="w-3 h-3 text-[#22C55E]" strokeWidth={1.75} />
              <span>{saveStatus === 'saving' ? 'Saving...' : 'Saved'}</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[#EAB308]">
              <Lock className="w-3 h-3" strokeWidth={1.5} />
              <span>Read-Only</span>
            </span>
          )}
        </div>
      </div>

      {/* Synchronized Code Surface */}
      <div className="relative flex-1 min-h-0 flex overflow-hidden bg-[#0B0B0F]">
        {/* Line Numbers Gutter */}
        <div
          ref={gutterRef}
          aria-hidden="true"
          className="w-12 shrink-0 py-4 pr-3 text-right select-none overflow-hidden bg-[#0B0B0F] border-r border-white/[0.05] code-editor-layer text-[#5C5C6E] tabular-nums"
        >
          {lines.map((_, i) => (
            <div key={i} className="h-[22px]">
              {i + 1}
            </div>
          ))}
        </div>

        {/* Highlighted Backdrop + Simulated Live Cursors + Transparent Interactive Textarea */}
        <div className="relative flex-1 min-w-0 overflow-hidden">
          <div
            ref={preRef}
            aria-hidden="true"
            className="absolute inset-0 overflow-hidden py-4 px-4 pointer-events-none code-editor-layer whitespace-pre"
          >
            <div className="relative">
              {/* Simulated collaborator selection & cursor overlays */}
              {liveCursors.map((cursor) => {
                const topPx = cursor.lineIndex * 22;
                const widthCh = Math.max(1, cursor.colEnd - cursor.colStart);
                return (
                  <div
                    key={cursor.id}
                    data-testid={cursor.id}
                    className="absolute pointer-events-none transition-all duration-300"
                    style={{
                      top: `${topPx}px`,
                      left: `${cursor.colStart}ch`,
                      height: '22px',
                    }}
                  >
                    {/* Subtle collaborator text selection */}
                    <div
                      className="h-[20px] mt-[1px] rounded-[2px]"
                      style={{
                        width: `${widthCh}ch`,
                        backgroundColor: cursor.selectionBg,
                      }}
                    />
                    {/* Collaborator caret bar */}
                    <div
                      className="absolute top-0 left-0 w-[2px] h-[22px]"
                      style={{ backgroundColor: cursor.color }}
                    />
                    {/* Floating name pill */}
                    <div
                      className="absolute -top-[16px] left-0 px-1.5 py-[1px] rounded-t-[3px] rounded-br-[3px] text-[10px] leading-[14px] font-sans font-medium text-[#F4F4F6] whitespace-nowrap"
                      style={{ backgroundColor: cursor.color }}
                    >
                      {cursor.name}
                    </div>
                  </div>
                );
              })}

              {/* Syntax-highlighted lines */}
              {tokenizedLines.map((lineTokens, lineIdx) => (
                <div key={lineIdx} className="h-[22px]">
                  {lineTokens.length === 1 && lineTokens[0].value === '' ? (
                    ' '
                  ) : (
                    lineTokens.map((tok, tokIdx) => {
                      const st = TOKEN_STYLES[tok.type];
                      return (
                        <span
                          key={tokIdx}
                          style={{
                            color: st.color,
                            fontStyle: st.italic ? 'italic' : 'normal',
                          }}
                        >
                          {tok.value}
                        </span>
                      );
                    })
                  )}
                </div>
              ))}
            </div>
          </div>

          <textarea
            ref={textareaRef}
            aria-label={`Source code editor for ${activeFile.name}`}
            value={code}
            readOnly={!canEditCode}
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            onChange={(e) => {
              if (!canEditCode) return;
              onChangeContent(activeFile.id, e.target.value);
              updateCaretCoords();
            }}
            onScroll={syncScroll}
            onClick={updateCaretCoords}
            onKeyUp={updateCaretCoords}
            onKeyDown={handleKeyDown}
            className={`absolute inset-0 w-full h-full py-4 px-4 bg-transparent text-transparent resize-none focus:outline-none code-editor-layer whitespace-pre overflow-auto ${
              canEditCode ? 'caret-[#F4F4F6]' : 'caret-transparent cursor-default'
            }`}
          />
        </div>
      </div>
    </section>
  );
}
