import { useMemo, useState, type FormEvent } from 'react';
import { Container, Lock, Plus, Settings2, Trash2 } from 'lucide-react';
import type { WorkspaceCapabilities } from '../../hooks/usePermissions';
import { useUiStore } from '../../state/uiStore';
import type { FileNode, SupportedLanguage } from '../../types/devsync';
import { deriveProjectLanguages, getLanguageMeta } from '../../utils/fileTree';
import { Dialog, FormField, GlassButton, StatusChip, TextInput, Tooltip } from '../ui';

interface EnvironmentPanelProps {
  nodes: FileNode[];
  permissions: WorkspaceCapabilities;
}

interface EnvVarEntry {
  key: string;
  value: string;
}

export function EnvironmentPanel({ nodes, permissions }: EnvironmentPanelProps) {
  const { pushToast } = useUiStore();
  const detectedLangs = useMemo(() => deriveProjectLanguages(nodes), [nodes]);

  const [runtime, setRuntime] = useState('devsync-polyglot:2026.1');
  const [dependencies, setDependencies] = useState<string[]>([
    'node@22',
    'python@3.12',
    'openjdk@21',
    'g++@13',
  ]);
  const [envVars, setEnvVars] = useState<EnvVarEntry[]>([
    { key: 'NODE_ENV', value: 'development' },
  ]);
  const [buildStatus, setBuildStatus] = useState<'ready' | 'building' | 'unavailable'>('ready');
  const [buildLogs, setBuildLogs] = useState<string[]>([
    '[env] Shared runtime configuration synchronized with project.',
    '[env] Provisioning uses managed sandbox containers when container runtime is enabled.',
  ]);

  const [configOpen, setConfigOpen] = useState(false);
  const [newDep, setNewDep] = useState('');
  const [newEnvKey, setNewEnvKey] = useState('');
  const [newEnvVal, setNewEnvVal] = useState('');

  const handleSaveConfig = (e: FormEvent) => {
    e.preventDefault();
    if (!permissions.canEditEnvironment) return;
    setBuildStatus('building');
    setBuildLogs((prev) => [
      ...prev,
      `[config] Saved runtime=${runtime} (${dependencies.length} packages, ${envVars.length} env vars)`,
    ]);
    window.setTimeout(() => {
      setBuildStatus('ready');
      setBuildLogs((prev) => [...prev, '[build] Environment snapshot ready.']);
      pushToast('Environment configuration updated', 'success');
    }, 350);
    setConfigOpen(false);
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden bg-[var(--surface-base)]">
      <div className="px-3 py-2 border-b border-[var(--border-hairline)] flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <Container className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
          <span className="text-[12px] font-semibold text-[var(--text-primary)]">
            Environment
          </span>
          <StatusChip tone={buildStatus === 'building' ? 'warning' : 'success'}>
            {buildStatus === 'building' ? 'Building' : 'Ready'}
          </StatusChip>
        </div>

        {permissions.canEditEnvironment ? (
          <GlassButton size="sm" variant="glass" onClick={() => setConfigOpen(true)}>
            <Settings2 className="w-3.5 h-3.5" />
            <span>Configure</span>
          </GlassButton>
        ) : (
          <Tooltip label={permissions.denialReason('editEnvironment') ?? 'Owner only'}>
            <span className="inline-flex items-center gap-1 text-[11px] text-[var(--text-muted)]">
              <Lock className="w-3 h-3" />
              <span>Read-only</span>
            </span>
          </Tooltip>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4 text-[12px]">
        <div className="rounded-lg bg-[#08080C] border border-[var(--border-hairline)] p-3 space-y-2">
          <p className="text-[11px] font-mono text-[var(--text-muted)] uppercase">Base Runtime</p>
          <p className="font-mono text-[var(--text-primary)]">{runtime}</p>
        </div>

        <section>
          <h3 className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
            Detected File Runtimes
          </h3>
          {detectedLangs.length === 0 ? (
            <p className="text-[var(--text-muted)]">Add files to detect language runtimes.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {detectedLangs.map((lang) => {
                const meta = getLanguageMeta(lang as SupportedLanguage);
                return (
                  <span
                    key={lang}
                    className="px-2 py-0.5 rounded bg-[#08080C] border border-[var(--border-hairline)] font-mono text-[11px]"
                    style={{ color: meta.color }}
                  >
                    {meta.label} · {meta.runtime}
                  </span>
                );
              })}
            </div>
          )}
        </section>

        <section>
          <h3 className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
            Packages ({dependencies.length})
          </h3>
          <ul className="space-y-1 font-mono text-[11px]">
            {dependencies.map((dep) => (
              <li
                key={dep}
                className="px-2.5 py-1 rounded bg-[#08080C] border border-[var(--border-hairline)] text-[var(--text-secondary)]"
              >
                {dep}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h3 className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
            Environment Variables ({envVars.length})
          </h3>
          <ul className="space-y-1 font-mono text-[11px]">
            {envVars.map((item) => (
              <li
                key={item.key}
                className="flex items-center justify-between px-2.5 py-1 rounded bg-[#08080C] border border-[var(--border-hairline)]"
              >
                <span className="text-[#93c5fd]">{item.key}</span>
                <span className="text-[var(--text-muted)]">••••••••</span>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h3 className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
            Build Log
          </h3>
          <div className="rounded-lg bg-[#050507] border border-[var(--border-hairline)] p-2.5 font-mono text-[11px] text-[var(--text-secondary)] space-y-1 max-h-32 overflow-y-auto">
            {buildLogs.map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>
        </section>
      </div>

      {/* Owner Environment Configuration Dialog */}
      <Dialog
        open={configOpen}
        onClose={() => setConfigOpen(false)}
        title="Configure Shared Environment"
        description="Define project runtime, dependencies, and environment variables for collaborators."
        maxWidthClass="max-w-[480px]"
      >
        <form onSubmit={handleSaveConfig} className="space-y-4">
          <FormField id="env-runtime-select" label="Base Runtime Image">
            <select
              id="env-runtime-select"
              value={runtime}
              onChange={(e) => setRuntime(e.target.value)}
              className="w-full rounded-lg bg-[var(--surface-base)] border border-white/[0.09] px-3 py-2 text-[13px] font-mono text-[var(--text-primary)]"
            >
              <option value="devsync-polyglot:2026.1">devsync-polyglot:2026.1 (All Runtimes)</option>
              <option value="node:22-alpine">node:22-alpine</option>
              <option value="python:3.12-slim">python:3.12-slim</option>
              <option value="openjdk:21-jdk">openjdk:21-jdk</option>
            </select>
          </FormField>

          <div className="space-y-2">
            <label className="block text-[12px] font-medium text-[var(--text-secondary)]">
              Dependencies
            </label>
            <div className="flex gap-2">
              <TextInput
                value={newDep}
                onChange={(e) => setNewDep(e.target.value)}
                placeholder="e.g. numpy==2.1.0"
                className="font-mono"
              />
              <GlassButton
                variant="glass"
                onClick={() => {
                  if (!newDep.trim()) return;
                  setDependencies((prev) => [...prev, newDep.trim()]);
                  setNewDep('');
                }}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </GlassButton>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {dependencies.map((dep) => (
                <span
                  key={dep}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--surface-base)] border border-[var(--border-hairline)] font-mono text-[11px]"
                >
                  <span>{dep}</span>
                  <button
                    type="button"
                    onClick={() => setDependencies((prev) => prev.filter((d) => d !== dep))}
                    aria-label={`Remove ${dep}`}
                    className="text-[var(--text-muted)] hover:text-[#fca5a5] cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-[12px] font-medium text-[var(--text-secondary)]">
              Environment Variables
            </label>
            <div className="grid grid-cols-5 gap-2">
              <TextInput
                value={newEnvKey}
                onChange={(e) => setNewEnvKey(e.target.value)}
                placeholder="KEY"
                className="font-mono col-span-2"
              />
              <TextInput
                value={newEnvVal}
                onChange={(e) => setNewEnvVal(e.target.value)}
                placeholder="VALUE"
                className="font-mono col-span-2"
              />
              <GlassButton
                variant="glass"
                onClick={() => {
                  if (!newEnvKey.trim()) return;
                  setEnvVars((prev) => [
                    ...prev.filter((v) => v.key !== newEnvKey.trim()),
                    { key: newEnvKey.trim(), value: newEnvVal },
                  ]);
                  setNewEnvKey('');
                  setNewEnvVal('');
                }}
              >
                Add
              </GlassButton>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <GlassButton variant="ghost" onClick={() => setConfigOpen(false)}>
              Cancel
            </GlassButton>
            <GlassButton type="submit" variant="primary">
              Save &amp; Build
            </GlassButton>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
