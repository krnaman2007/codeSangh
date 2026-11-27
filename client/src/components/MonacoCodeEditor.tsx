import { useEffect, useMemo, useRef, useState } from 'react';
import * as monaco from 'monaco-editor';
import editorWorker from 'monaco-editor/editor/editor.worker?worker';
import jsonWorker from 'monaco-editor/language/json/json.worker?worker';
import cssWorker from 'monaco-editor/language/css/css.worker?worker';
import htmlWorker from 'monaco-editor/language/html/html.worker?worker';
import tsWorker from 'monaco-editor/language/typescript/ts.worker?worker';
import {
  AlertCircle,
  Check,
  Columns2,
  Eye,
  FileCode2,
  Loader2,
  Lock,
  Save,
  X,
} from 'lucide-react';
import type { LanguageRegistryEntry } from '../api/types';
import { getLanguageMeta } from '../utils/fileTree';
import type { SupportedLanguage } from '../types/devsync';
import { Dialog, GlassButton } from './ui';

let monacoConfigured = false;

function ensureMonacoEnvironment() {
  if (monacoConfigured || typeof window === 'undefined') return;
  monacoConfigured = true;

  (
    self as unknown as {
      MonacoEnvironment?: { getWorker: (_moduleId: string, label: string) => Worker };
    }
  ).MonacoEnvironment = {
    getWorker(_moduleId: string, label: string) {
      if (label === 'json') return new jsonWorker();
      if (label === 'css' || label === 'scss' || label === 'less') return new cssWorker();
      if (label === 'html' || label === 'handlebars' || label === 'razor') return new htmlWorker();
      if (label === 'typescript' || label === 'javascript') return new tsWorker();
      return new editorWorker();
    },
  };

  monaco.editor.defineTheme('devsync-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '6E738D', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'A78BFA' },
      { token: 'string', foreground: '34D399' },
      { token: 'number', foreground: 'FBBF24' },
      { token: 'type', foreground: '60A5FA' },
    ],
    colors: {
      'editor.background': '#0B0B0F',
      'editor.foreground': '#F4F4F6',
      'editor.lineHighlightBackground': '#14141C',
      'editor.selectionBackground': '#5E5CE640',
      'editorLineNumber.foreground': '#5C5C6E',
      'editorLineNumber.activeForeground': '#9494A3',
      'editorGutter.background': '#0B0B0F',
      'editorCursor.foreground': '#F4F4F6',
      'editorIndentGuide.background1': '#1F1F28',
      'editorIndentGuide.activeBackground1': '#343446',
    },
  });
}

export type FileSaveState = 'saved' | 'dirty' | 'saving' | 'error';

export interface OpenEditorFile {
  id: string;
  name: string;
  path?: string;
  language: string;
  content: string;
  isLoading?: boolean;
  loadError?: string | null;
}

export interface MonacoModelBindingContext {
  editor: monaco.editor.IStandaloneCodeEditor;
  model: monaco.editor.ITextModel;
  fileId: string;
}

interface MonacoCodeEditorProps {
  openFiles: OpenEditorFile[];
  activeFile: OpenEditorFile | null;
  languages: LanguageRegistryEntry[];
  canEditCode: boolean;
  saveStates: Record<string, FileSaveState>;
  onSelectTab: (fileId: string) => void;
  onCloseTab: (fileId: string) => void;
  onChangeContent: (fileId: string, content: string) => void;
  onSaveFile?: (fileId: string) => void;
  onChangeLanguage?: (fileId: string, language: string) => void;
  onModelAttached?: (ctx: MonacoModelBindingContext) => (() => void) | void;
  onGutterMouseDown?: (fileId: string, lineNumber: number) => void;
  breakpoints?: number[];
  activeDebugLine?: number | null;
  yjsManagedFileIds?: Set<string>;
}

function resolveMonacoLanguage(
  languageKey: string,
  languages: LanguageRegistryEntry[]
): string {
  const fromRegistry = languages.find((l) => l.key === languageKey);
  if (fromRegistry) return fromRegistry.monaco;
  if (languageKey === 'text') return 'plaintext';
  return languageKey || 'plaintext';
}

export function MonacoCodeEditor({
  openFiles,
  activeFile,
  languages,
  canEditCode,
  saveStates,
  onSelectTab,
  onCloseTab,
  onChangeContent,
  onSaveFile,
  onChangeLanguage,
  onModelAttached,
  onGutterMouseDown,
  breakpoints = [],
  activeDebugLine = null,
  yjsManagedFileIds,
}: MonacoCodeEditorProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const modelsRef = useRef<Map<string, monaco.editor.ITextModel>>(new Map());
  const suppressingChangeRef = useRef(false);
  const decorationsRef = useRef<monaco.editor.IEditorDecorationsCollection | null>(null);

  const [cursorCoords, setCursorCoords] = useState({ line: 1, col: 1 });
  const [showHtmlPreview, setShowHtmlPreview] = useState(true);
  const [confirmCloseFileId, setConfirmCloseFileId] = useState<string | null>(null);

  const activeFileRef = useRef(activeFile);
  activeFileRef.current = activeFile;
  const onChangeContentRef = useRef(onChangeContent);
  onChangeContentRef.current = onChangeContent;
  const onGutterMouseDownRef = useRef(onGutterMouseDown);
  onGutterMouseDownRef.current = onGutterMouseDown;
  const yjsManagedRef = useRef(yjsManagedFileIds);
  yjsManagedRef.current = yjsManagedFileIds;

  // Mount Monaco Editor once
  useEffect(() => {
    if (!containerRef.current) return;
    ensureMonacoEnvironment();

    const editor = monaco.editor.create(containerRef.current, {
      theme: 'devsync-dark',
      automaticLayout: true,
      minimap: { enabled: false },
      fontFamily: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
      fontSize: 13,
      lineHeight: 22,
      tabSize: 2,
      insertSpaces: true,
      scrollBeyondLastLine: false,
      renderWhitespace: 'selection',
      smoothScrolling: false,
      glyphMargin: true,
      padding: { top: 12, bottom: 12 },
      readOnly: !canEditCode,
      ariaLabel: 'Source code editor',
    });

    editorRef.current = editor;
    decorationsRef.current = editor.createDecorationsCollection([]);

    const cursorDisposable = editor.onDidChangeCursorPosition((e) => {
      setCursorCoords({
        line: e.position.lineNumber,
        col: e.position.column,
      });
    });

    const contentDisposable = editor.onDidChangeModelContent(() => {
      if (suppressingChangeRef.current) return;
      const current = activeFileRef.current;
      const model = editor.getModel();
      if (!current || !model) return;
      if (yjsManagedRef.current?.has(current.id)) return;
      onChangeContentRef.current(current.id, model.getValue());
    });

    const mouseDisposable = editor.onMouseDown((e) => {
      const current = activeFileRef.current;
      if (!current) return;
      if (
        e.target.type === monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN ||
        e.target.type === monaco.editor.MouseTargetType.GUTTER_LINE_NUMBERS
      ) {
        const line = e.target.position?.lineNumber;
        if (line && onGutterMouseDownRef.current) {
          onGutterMouseDownRef.current(current.id, line);
        }
      }
    });

    return () => {
      cursorDisposable.dispose();
      contentDisposable.dispose();
      mouseDisposable.dispose();
      for (const model of modelsRef.current.values()) {
        model.dispose();
      }
      modelsRef.current.clear();
      editor.dispose();
      editorRef.current = null;
    };
  }, []);

  // Sync readOnly option when role permissions change
  useEffect(() => {
    editorRef.current?.updateOptions({ readOnly: !canEditCode });
  }, [canEditCode]);

  // Dispose models for closed tabs
  useEffect(() => {
    const openIds = new Set(openFiles.map((f) => f.id));
    for (const [id, model] of modelsRef.current.entries()) {
      if (!openIds.has(id)) {
        if (editorRef.current?.getModel() === model) {
          editorRef.current.setModel(null);
        }
        model.dispose();
        modelsRef.current.delete(id);
      }
    }
  }, [openFiles]);

  // Create/update and attach model for activeFile
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || !activeFile) {
      editor?.setModel(null);
      return;
    }
    if (activeFile.isLoading) {
      return;
    }

    const monacoLang = resolveMonacoLanguage(activeFile.language, languages);
    let model = modelsRef.current.get(activeFile.id);

    if (!model) {
      const uri = monaco.Uri.parse(`inmemory://devsync/${activeFile.id}/${encodeURIComponent(activeFile.name)}`);
      model = monaco.editor.getModel(uri) ?? monaco.editor.createModel(activeFile.content, monacoLang, uri);
      modelsRef.current.set(activeFile.id, model);
    } else {
      if (model.getLanguageId() !== monacoLang) {
        monaco.editor.setModelLanguage(model, monacoLang);
      }
      if (!yjsManagedFileIds?.has(activeFile.id) && model.getValue() !== activeFile.content) {
        suppressingChangeRef.current = true;
        model.setValue(activeFile.content);
        suppressingChangeRef.current = false;
      }
    }

    if (editor.getModel() !== model) {
      editor.setModel(model);
    }

    const cleanup = onModelAttached?.({ editor, model, fileId: activeFile.id });
    return () => {
      if (typeof cleanup === 'function') {
        cleanup();
      }
    };
  }, [
    activeFile?.id,
    activeFile?.language,
    activeFile?.content,
    activeFile?.isLoading,
    activeFile?.name,
    languages,
    onModelAttached,
    yjsManagedFileIds,
  ]);

  // Sync breakpoint & debug line decorations
  useEffect(() => {
    if (!decorationsRef.current || !activeFile) return;
    const nextDecorations: monaco.editor.IModelDeltaDecoration[] = breakpoints.map((line) => ({
      range: new monaco.Range(line, 1, line, 1),
      options: {
        isWholeLine: false,
        glyphMarginClassName: 'devsync-breakpoint-glyph',
        glyphMarginHoverMessage: { value: `Breakpoint at line ${line}` },
      },
    }));

    if (activeDebugLine && activeDebugLine > 0) {
      nextDecorations.push({
        range: new monaco.Range(activeDebugLine, 1, activeDebugLine, 1),
        options: {
          isWholeLine: true,
          className: 'devsync-debug-active-line',
          glyphMarginClassName: 'devsync-debug-arrow-glyph',
        },
      });
    }

    decorationsRef.current.set(nextDecorations);
  }, [breakpoints, activeDebugLine, activeFile?.id]);

  const activeSaveState: FileSaveState = activeFile
    ? saveStates[activeFile.id] ?? 'saved'
    : 'saved';

  const activeLangMeta = useMemo(
    () => getLanguageMeta((activeFile?.language as SupportedLanguage) ?? 'javascript'),
    [activeFile?.language]
  );

  const isHtmlFile = activeFile?.language === 'html';

  const requestCloseTab = (fileId: string) => {
    const state = saveStates[fileId];
    if (state === 'dirty' || state === 'error') {
      setConfirmCloseFileId(fileId);
      return;
    }
    onCloseTab(fileId);
  };

  if (!activeFile) {
    return (
      <div className="flex-1 bg-[var(--surface-base)] flex flex-col items-center justify-center p-8 text-center">
        <div className="w-11 h-11 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border-hairline)] flex items-center justify-center mb-4">
          <FileCode2 className="w-5 h-5 text-[var(--text-muted)]" strokeWidth={1.5} />
        </div>
        <p className="text-[14px] font-medium text-[var(--text-primary)]">No file open</p>
        <p className="text-[12px] text-[var(--text-muted)] mt-1 max-w-xs">
          Select a file from the Explorer or create a new file with its programming language.
        </p>
      </div>
    );
  }

  return (
    <section
      aria-label="Code editor"
      className="flex-1 min-w-0 min-h-0 flex flex-col bg-[var(--surface-base)]"
    >
      {/* Read-only viewer banner */}
      {!canEditCode && (
        <div
          role="status"
          className="px-4 py-1.5 bg-[var(--state-warning-bg)] border-b border-[var(--state-warning-border)] flex items-center justify-between gap-3 text-[12px] text-[#fde047]"
        >
          <span className="inline-flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
            <span>
              <strong>Viewer Mode (Read-Only):</strong> You can inspect files and execution
              history, but editing, saving, and running code require Editor or Owner access.
            </span>
          </span>
        </div>
      )}

      {/* Multi-file Tab Bar */}
      <div
        role="tablist"
        aria-label="Open files"
        className="h-10 bg-[var(--surface-canvas)] border-b border-[var(--border-hairline)] flex items-center overflow-x-auto shrink-0"
      >
        {openFiles.map((file) => {
          const isCurrent = file.id === activeFile.id;
          const meta = getLanguageMeta(file.language as SupportedLanguage);
          const tabSaveState = saveStates[file.id] ?? 'saved';
          const isDirty = tabSaveState === 'dirty' || tabSaveState === 'error';

          return (
            <div
              key={file.id}
              role="tab"
              aria-selected={isCurrent}
              className={`group flex items-center gap-2 h-full px-3.5 border-r border-[var(--border-hairline)] text-[12px] font-mono transition-mechanical shrink-0 ${
                isCurrent
                  ? 'bg-[var(--surface-base)] text-[var(--text-primary)] border-t-2 border-t-[var(--accent-primary)]'
                  : 'bg-[var(--surface-canvas)] text-[var(--text-secondary)] hover:bg-[var(--surface-base)]/60 hover:text-[var(--text-primary)] border-t-2 border-t-transparent'
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
                {isDirty && (
                  <span
                    title="Unsaved changes"
                    aria-label="Unsaved changes"
                    className="w-2 h-2 rounded-full bg-[var(--state-warning)]"
                  />
                )}
              </button>
              <button
                type="button"
                onClick={() => requestCloseTab(file.id)}
                aria-label={`Close ${file.name}`}
                className="p-0.5 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-mechanical cursor-pointer"
              >
                <X className="w-3 h-3" strokeWidth={1.5} />
              </button>
            </div>
          );
        })}
      </div>

      {/* Editor Metadata & Save Status Strip */}
      <div className="h-8 px-4 bg-[var(--surface-base)] border-b border-[var(--border-hairline)] flex items-center justify-between gap-4 text-[11px] font-mono text-[var(--text-muted)] shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          {canEditCode && onChangeLanguage && languages.length > 0 ? (
            <select
              aria-label="Active file language"
              value={activeFile.language}
              onChange={(e) => onChangeLanguage(activeFile.id, e.target.value)}
              className="rounded bg-[var(--surface-elevated)] border border-[var(--border-hairline)] px-1.5 py-0.5 text-[11px] font-mono focus:outline-none focus:border-[var(--accent-primary)]"
              style={{ color: activeLangMeta.color }}
            >
              {languages.map((lang) => (
                <option key={lang.key} value={lang.key}>
                  {lang.label} ({lang.ext})
                </option>
              ))}
            </select>
          ) : (
            <span style={{ color: activeLangMeta.color }} className="font-medium">
              {activeLangMeta.label}
            </span>
          )}
          <span aria-hidden="true">·</span>
          <span className="tabular-nums">
            Ln {cursorCoords.line}, Col {cursorCoords.col}
          </span>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {isHtmlFile && (
            <button
              type="button"
              onClick={() => setShowHtmlPreview((prev) => !prev)}
              aria-pressed={showHtmlPreview}
              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[var(--surface-elevated)] border border-[var(--border-hairline)] text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              {showHtmlPreview ? (
                <Columns2 className="w-3 h-3" strokeWidth={1.5} />
              ) : (
                <Eye className="w-3 h-3" strokeWidth={1.5} />
              )}
              <span>{showHtmlPreview ? 'Hide Preview' : 'HTML Preview'}</span>
            </button>
          )}

          {canEditCode ? (
            <div className="flex items-center gap-2">
              {activeSaveState === 'saving' && (
                <span className="inline-flex items-center gap-1 text-[var(--text-secondary)]">
                  <Loader2 className="w-3 h-3 animate-spin" strokeWidth={1.75} />
                  <span>Saving…</span>
                </span>
              )}
              {activeSaveState === 'dirty' && (
                <span className="inline-flex items-center gap-1 text-[#fde047]">
                  <span>Unsaved</span>
                </span>
              )}
              {activeSaveState === 'error' && (
                <span className="inline-flex items-center gap-1 text-[#fca5a5]">
                  <AlertCircle className="w-3 h-3" strokeWidth={1.75} />
                  <span>Save failed</span>
                </span>
              )}
              {activeSaveState === 'saved' && (
                <span className="inline-flex items-center gap-1 text-[var(--text-secondary)]">
                  <Check className="w-3 h-3 text-[var(--state-success)]" strokeWidth={1.75} />
                  <span>Saved</span>
                </span>
              )}
              {onSaveFile && (activeSaveState === 'dirty' || activeSaveState === 'error') && (
                <button
                  type="button"
                  onClick={() => onSaveFile(activeFile.id)}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--accent-soft)] text-[#c7d2fe] hover:bg-[var(--accent-primary)]/30 cursor-pointer"
                >
                  <Save className="w-3 h-3" strokeWidth={1.5} />
                  <span>Save</span>
                </button>
              )}
            </div>
          ) : (
            <span className="inline-flex items-center gap-1 text-[#fde047]">
              <Lock className="w-3 h-3" strokeWidth={1.5} />
              <span>Read-Only</span>
            </span>
          )}
        </div>
      </div>

      {/* Editor + Optional HTML Split Preview */}
      <div className="flex-1 min-h-0 flex overflow-hidden bg-[var(--surface-base)] relative">
        <div
          ref={containerRef}
          className={`${isHtmlFile && showHtmlPreview ? 'w-1/2 border-r border-[var(--border-hairline)]' : 'w-full'} h-full min-w-0`}
        />

        {activeFile.isLoading && (
          <div className="absolute inset-0 bg-[var(--surface-base)]/90 flex items-center justify-center gap-2 text-[13px] font-mono text-[var(--text-secondary)]">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Loading {activeFile.name}…</span>
          </div>
        )}

        {activeFile.loadError && (
          <div className="absolute inset-0 bg-[var(--surface-base)] flex flex-col items-center justify-center p-6 text-center">
            <AlertCircle className="w-6 h-6 text-[var(--state-danger)] mb-2" />
            <p className="text-[13px] text-[var(--text-primary)]">{activeFile.loadError}</p>
          </div>
        )}

        {isHtmlFile && showHtmlPreview && !activeFile.isLoading && !activeFile.loadError && (
          <div className="w-1/2 h-full flex flex-col bg-white">
            <div className="h-7 px-3 bg-[var(--surface-elevated)] border-b border-[var(--border-hairline)] flex items-center justify-between text-[11px] font-mono text-[var(--text-secondary)]">
              <span>Sandboxed HTML Preview</span>
              <span>{activeFile.name}</span>
            </div>
            <iframe
              title={`HTML preview for ${activeFile.name}`}
              sandbox="allow-scripts"
              srcDoc={activeFile.content}
              className="flex-1 w-full bg-white border-0"
            />
          </div>
        )}
      </div>

      {/* Unsaved Tab Close Confirmation */}
      <Dialog
        open={Boolean(confirmCloseFileId)}
        onClose={() => setConfirmCloseFileId(null)}
        title="Discard unsaved changes?"
        description="This file has edits that have not been saved to the server yet."
        maxWidthClass="max-w-[400px]"
      >
        <div className="flex items-center justify-end gap-2 pt-3">
          <GlassButton variant="ghost" autoFocus onClick={() => setConfirmCloseFileId(null)}>
            Keep Open
          </GlassButton>
          {onSaveFile && confirmCloseFileId && (
            <GlassButton
              variant="primary"
              onClick={() => {
                onSaveFile(confirmCloseFileId);
                onCloseTab(confirmCloseFileId);
                setConfirmCloseFileId(null);
              }}
            >
              Save &amp; Close
            </GlassButton>
          )}
          <GlassButton
            variant="danger"
            onClick={() => {
              if (confirmCloseFileId) onCloseTab(confirmCloseFileId);
              setConfirmCloseFileId(null);
            }}
          >
            Discard
          </GlassButton>
        </div>
      </Dialog>
    </section>
  );
}
