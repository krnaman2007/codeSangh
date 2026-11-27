import { useState, type FormEvent } from 'react';
import { Check, Copy, Send, Sparkles, Wand2 } from 'lucide-react';
import { apiClient } from '../../api/client';
import type { ApiExecutionRecord } from '../../api/types';
import type { WorkspaceCapabilities } from '../../hooks/usePermissions';
import { useAuth } from '../../state/authStore';
import { useUiStore } from '../../state/uiStore';
import { extractFirstCodeBlock, renderSanitizedAiMarkdown } from '../../utils/aiMarkdown';
import { Dialog, GlassButton, StatusChip, Tooltip } from '../ui';

interface AiMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface AiAssistantPanelProps {
  activeFile: { id: string; name: string; language: string; content: string } | null;
  latestExecution: ApiExecutionRecord | null;
  permissions: WorkspaceCapabilities;
  inlineSuggestionsEnabled: boolean;
  onToggleInlineSuggestions: (enabled: boolean) => void;
  onApplyCodeToActiveFile: (fileId: string, nextContent: string) => void;
}

export function AiAssistantPanel({
  activeFile,
  latestExecution,
  permissions,
  inlineSuggestionsEnabled,
  onToggleInlineSuggestions,
  onApplyCodeToActiveFile,
}: AiAssistantPanelProps) {
  const { user, refreshUser } = useAuth();
  const { pushToast } = useUiStore();

  const [prompt, setPrompt] = useState('');
  const [includeFileContext, setIncludeFileContext] = useState(true);
  const [includeErrorContext, setIncludeErrorContext] = useState(true);
  const [streaming, setStreaming] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [pendingApplyCode, setPendingApplyCode] = useState<string | null>(null);
  const [messages, setMessages] = useState<AiMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Ask a question about your open file, explain an algorithm, or debug a recent execution error.',
    },
  ]);

  const handleToggleSuggestions = async () => {
    const next = !inlineSuggestionsEnabled;
    onToggleInlineSuggestions(next);
    if (user) {
      try {
        await apiClient.patch('/users/me', {
          preferences: { aiSuggestions: next },
        });
        await refreshUser();
      } catch {
        // Non-blocking local toggle fallback
      }
    }
    pushToast(
      `Inline AI suggestions ${next ? 'enabled' : 'disabled'}`,
      'info'
    );
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = prompt.trim();
    if (!trimmed || streaming) return;

    const userMsg: AiMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: trimmed,
    };
    const assistantId = `a-${Date.now() + 1}`;
    setMessages((prev) => [...prev, userMsg, { id: assistantId, role: 'assistant', content: '' }]);
    setPrompt('');
    setStreaming(true);

    const contextSummary = [
      includeFileContext && activeFile
        ? `File \`${activeFile.name}\` (${activeFile.language})`
        : null,
      includeErrorContext && latestExecution?.stderr
        ? `Recent error included`
        : null,
    ]
      .filter(Boolean)
      .join(' · ');

    const reply = [
      contextSummary ? `**Context:** ${contextSummary}` : '',
      `Based on your request ("${trimmed}"), here is a clean starting pattern:`,
      `\`\`\`${activeFile?.language || 'javascript'}\n${
        activeFile?.content
          ? activeFile.content
          : `// Suggested implementation for ${trimmed}\nfunction solve() {\n  return true;\n}`
      }\n\`\`\``,
      'Review the snippet before applying it to the active editor buffer.',
    ]
      .filter(Boolean)
      .join('\n\n');

    // Simulate incremental token stream smoothly
    let cursor = 0;
    const step = () => {
      cursor = Math.min(reply.length, cursor + 24);
      const slice = reply.slice(0, cursor);
      setMessages((prev) =>
        prev.map((m) => (m.id === assistantId ? { ...m, content: slice } : m))
      );
      if (cursor < reply.length) {
        window.setTimeout(step, 24);
      } else {
        setStreaming(false);
      }
    };
    window.setTimeout(step, 40);
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden bg-[var(--surface-base)]">
      <div className="px-3 py-2 border-b border-[var(--border-hairline)] flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
          <span className="text-[12px] font-semibold text-[var(--text-primary)]">
            AI Assistant
          </span>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={inlineSuggestionsEnabled}
          onClick={() => void handleToggleSuggestions()}
          className={`px-2 py-0.5 rounded-full border text-[11px] font-mono cursor-pointer transition-mechanical ${
            inlineSuggestionsEnabled
              ? 'bg-[var(--accent-soft)] border-[var(--accent-primary)]/40 text-[#c7d2fe]'
              : 'bg-white/[0.04] border-[var(--border-hairline)] text-[var(--text-muted)]'
          }`}
        >
          Ghost: {inlineSuggestionsEnabled ? 'On' : 'Off'}
        </button>
      </div>

      {/* Context Chips */}
      <div className="px-3 py-2 border-b border-[var(--border-hairline)] bg-[#08080C] flex flex-wrap items-center gap-1.5 text-[11px]">
        {activeFile && (
          <button
            type="button"
            aria-pressed={includeFileContext}
            onClick={() => setIncludeFileContext((p) => !p)}
            className={`px-2 py-0.5 rounded-full border font-mono cursor-pointer ${
              includeFileContext
                ? 'bg-[var(--accent-soft)] border-[var(--accent-primary)]/40 text-[#c7d2fe]'
                : 'border-[var(--border-hairline)] text-[var(--text-muted)]'
            }`}
          >
            @{activeFile.name}
          </button>
        )}
        {latestExecution?.stderr && (
          <button
            type="button"
            aria-pressed={includeErrorContext}
            onClick={() => setIncludeErrorContext((p) => !p)}
            className={`px-2 py-0.5 rounded-full border font-mono cursor-pointer ${
              includeErrorContext
                ? 'bg-[var(--state-danger-bg)] border-[var(--state-danger-border)] text-[#fca5a5]'
                : 'border-[var(--border-hairline)] text-[var(--text-muted)]'
            }`}
          >
            @latest-error
          </button>
        )}
      </div>

      {/* Conversation */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 text-[12px]">
        {messages.map((msg) => {
          const codeBlock =
            msg.role === 'assistant' ? extractFirstCodeBlock(msg.content) : null;
          return (
            <div
              key={msg.id}
              className={`rounded-lg p-3 ${
                msg.role === 'user'
                  ? 'bg-[var(--accent-soft)] border border-[var(--accent-primary)]/30 ml-4'
                  : 'bg-[#08080C] border border-[var(--border-hairline)]'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <StatusChip tone={msg.role === 'user' ? 'accent' : 'neutral'}>
                  {msg.role === 'user' ? 'You' : 'DevSync AI'}
                </StatusChip>
              </div>
              <div
                className="prose prose-invert max-w-none text-[12px] leading-relaxed text-[var(--text-primary)] [&_pre]:mt-2 [&_pre]:p-2.5 [&_pre]:rounded [&_pre]:bg-[var(--surface-base)] [&_pre]:border [&_pre]:border-[var(--border-hairline)] [&_pre]:overflow-x-auto [&_code]:font-mono [&_code]:text-[11px]"
                dangerouslySetInnerHTML={{
                  __html: renderSanitizedAiMarkdown(msg.content || '…'),
                }}
              />
              {codeBlock && !streaming && (
                <div className="mt-2.5 pt-2 border-t border-[var(--border-hairline)] flex items-center gap-2">
                  <GlassButton
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      void navigator.clipboard?.writeText(codeBlock);
                      setCopiedId(msg.id);
                      window.setTimeout(() => setCopiedId(null), 1500);
                    }}
                  >
                    {copiedId === msg.id ? (
                      <Check className="w-3 h-3 text-[var(--state-success)]" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    <span>{copiedId === msg.id ? 'Copied' : 'Copy'}</span>
                  </GlassButton>

                  <Tooltip
                    label={
                      permissions.canApplyAiChanges
                        ? 'Review and apply to active file'
                        : permissions.denialReason('applyAiChanges') ?? 'Read-only mode'
                    }
                  >
                    <GlassButton
                      size="sm"
                      variant="glass"
                      disabled={!permissions.canApplyAiChanges || !activeFile}
                      onClick={() => setPendingApplyCode(codeBlock)}
                    >
                      <Wand2 className="w-3 h-3" />
                      <span>Apply to File</span>
                    </GlassButton>
                  </Tooltip>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Prompt Input */}
      <form
        onSubmit={handleSubmit}
        className="p-2.5 border-t border-[var(--border-hairline)] bg-[#08080C] flex items-center gap-2 shrink-0"
      >
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Ask about code, errors, or tests…"
          aria-label="Ask AI coding assistant"
          className="flex-1 rounded-md bg-[var(--surface-base)] border border-[var(--border-hairline)] px-2.5 py-1.5 text-[12px] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)]"
        />
        <GlassButton
          type="submit"
          size="sm"
          variant="primary"
          disabled={!prompt.trim() || streaming}
        >
          <Send className="w-3.5 h-3.5" />
        </GlassButton>
      </form>

      {/* Apply Diff Confirmation Dialog */}
      <Dialog
        open={Boolean(pendingApplyCode)}
        onClose={() => setPendingApplyCode(null)}
        title={`Apply AI suggestion to ${activeFile?.name ?? 'file'}?`}
        description="This replaces the active editor buffer with the suggested snippet."
        maxWidthClass="max-w-[540px]"
      >
        <pre className="rounded-lg bg-[#050507] border border-[var(--border-hairline)] p-3 font-mono text-[11px] text-[var(--text-primary)] max-h-60 overflow-auto">
          {pendingApplyCode}
        </pre>
        <div className="flex justify-end gap-2 pt-4">
          <GlassButton variant="ghost" autoFocus onClick={() => setPendingApplyCode(null)}>
            Cancel
          </GlassButton>
          <GlassButton
            variant="primary"
            onClick={() => {
              if (activeFile && pendingApplyCode !== null) {
                onApplyCodeToActiveFile(activeFile.id, pendingApplyCode);
                pushToast(`Applied suggestion to ${activeFile.name}`, 'success');
              }
              setPendingApplyCode(null);
            }}
          >
            Apply Suggestion
          </GlassButton>
        </div>
      </Dialog>
    </div>
  );
}
