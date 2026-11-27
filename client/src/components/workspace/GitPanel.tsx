import { useState, type FormEvent } from 'react';
import {
  Download,
  GitBranch,
  GitCommitHorizontal,
  Link2,
  RefreshCw,
} from 'lucide-react';
import { ApiClientError } from '../../api/errors';
import { useGitMutations, useGitRepoQuery, useGitStatusQuery } from '../../hooks/useDebugAndGit';
import type { WorkspaceCapabilities } from '../../hooks/usePermissions';
import { useUiStore } from '../../state/uiStore';
import { Dialog, EmptyState, FormField, GlassButton, Skeleton, StatusChip, TextInput } from '../ui';

interface GitPanelProps {
  projectId: string;
  permissions: WorkspaceCapabilities;
}

export function GitPanel({ projectId, permissions }: GitPanelProps) {
  const { pushToast } = useUiStore();
  const repoQuery = useGitRepoQuery(projectId);
  const initialized = Boolean(repoQuery.data?.initialized);
  const statusQuery = useGitStatusQuery(projectId, initialized);
  const { initRepo, setRemote, cloneRepo } = useGitMutations(projectId);

  const [commitMessage, setCommitMessage] = useState('');
  const [remoteDialogOpen, setRemoteDialogOpen] = useState(false);
  const [cloneDialogOpen, setCloneDialogOpen] = useState(false);
  const [remoteUrl, setRemoteUrl] = useState('');
  const [remoteToken, setRemoteToken] = useState('');
  const [cloneBranch, setCloneBranch] = useState('main');
  const [dialogError, setDialogError] = useState<string | null>(null);

  const handleInit = async () => {
    if (!permissions.canUseSourceControl) return;
    try {
      await initRepo.mutateAsync('main');
      pushToast('Initialized Git repository', 'success');
    } catch (err) {
      const msg = err instanceof ApiClientError ? err.userMessage : 'Git init failed.';
      pushToast('Git init failed', 'error', msg);
    }
  };

  const handleSaveRemote = async (e: FormEvent) => {
    e.preventDefault();
    setDialogError(null);
    try {
      await setRemote.mutateAsync({
        url: remoteUrl.trim(),
        token: remoteToken.trim() || undefined,
      });
      pushToast('Remote origin configured', 'success');
      setRemoteDialogOpen(false);
    } catch (err) {
      setDialogError(err instanceof ApiClientError ? err.userMessage : 'Could not set remote.');
    }
  };

  const handleClone = async (e: FormEvent) => {
    e.preventDefault();
    setDialogError(null);
    try {
      const res = await cloneRepo.mutateAsync({
        url: remoteUrl.trim(),
        token: remoteToken.trim() || undefined,
        branch: cloneBranch.trim() || 'main',
      });
      pushToast(
        'Repository cloned',
        'success',
        `Imported ${res.repository.filesCloned} files on ${res.repository.branch}`
      );
      setCloneDialogOpen(false);
    } catch (err) {
      setDialogError(err instanceof ApiClientError ? err.userMessage : 'Could not clone repository.');
    }
  };

  const status = statusQuery.data?.status;
  const repo = repoQuery.data;

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden bg-[var(--surface-base)]">
      <div className="px-3 py-2 border-b border-[var(--border-hairline)] flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <GitBranch className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
          <span className="text-[12px] font-semibold text-[var(--text-primary)]">
            Source Control
          </span>
          {repo?.branch && <StatusChip tone="accent">{repo.branch}</StatusChip>}
        </div>

        <button
          type="button"
          onClick={() => {
            void repoQuery.refetch();
            if (initialized) void statusQuery.refetch();
          }}
          aria-label="Refresh Git status"
          className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4 text-[12px]">
        {repoQuery.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : !initialized ? (
          <EmptyState
            icon={<GitBranch className="w-5 h-5" />}
            title="Repository not initialized"
            description="Initialize a Git repository for this project or clone an existing remote."
            action={
              <div className="flex flex-wrap items-center justify-center gap-2">
                <GlassButton
                  size="sm"
                  variant="primary"
                  disabled={!permissions.canUseSourceControl}
                  loading={initRepo.isPending}
                  title={permissions.denialReason('useSourceControl')}
                  onClick={() => void handleInit()}
                >
                  Initialize Git
                </GlassButton>
                {permissions.canManageGitRemote && (
                  <GlassButton
                    size="sm"
                    variant="glass"
                    onClick={() => {
                      setRemoteUrl('');
                      setRemoteToken('');
                      setDialogError(null);
                      setCloneDialogOpen(true);
                    }}
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Clone Repo</span>
                  </GlassButton>
                )}
              </div>
            }
          />
        ) : (
          <>
            {/* Head Commit & Remote Summary */}
            <div className="rounded-lg bg-[#08080C] border border-[var(--border-hairline)] p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-mono text-[var(--text-muted)]">REMOTE</span>
                {permissions.canManageGitRemote && (
                  <button
                    type="button"
                    onClick={() => {
                      setRemoteUrl(repo?.remote ?? '');
                      setRemoteToken('');
                      setDialogError(null);
                      setRemoteDialogOpen(true);
                    }}
                    className="inline-flex items-center gap-1 text-[11px] text-[#a5b4fc] hover:underline cursor-pointer"
                  >
                    <Link2 className="w-3 h-3" />
                    <span>{repo?.remote ? 'Edit Remote' : 'Configure Remote'}</span>
                  </button>
                )}
              </div>
              <p className="font-mono text-[11px] text-[var(--text-primary)] truncate">
                {repo?.remote || 'No remote configured'}
              </p>
              {repo?.headCommit && (
                <div className="pt-2 border-t border-[var(--border-hairline)] flex items-start gap-2">
                  <GitCommitHorizontal className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-[var(--text-primary)] truncate">{repo.headCommit.message}</p>
                    <p className="text-[10px] font-mono text-[var(--text-muted)]">
                      {repo.headCommit.hash.slice(0, 7)} · {repo.headCommit.author}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Commit Box */}
            <div className="space-y-2">
              <textarea
                rows={2}
                disabled={!permissions.canUseSourceControl}
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                placeholder={
                  permissions.canUseSourceControl
                    ? 'Commit message…'
                    : permissions.denialReason('useSourceControl')
                }
                className="w-full rounded-lg bg-[#08080C] border border-[var(--border-hairline)] p-2 text-[12px] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] resize-none disabled:opacity-50"
              />
              <div className="flex items-center gap-2">
                <GlassButton
                  size="sm"
                  variant="primary"
                  className="flex-1"
                  disabled={!permissions.canUseSourceControl || !commitMessage.trim()}
                  onClick={() =>
                    pushToast(
                      'Commit API pending',
                      'info',
                      'Stage/commit endpoints will complete sync once backend routes are enabled.'
                    )
                  }
                >
                  Commit Changes
                </GlassButton>
              </div>
            </div>

            {/* Working Tree Status */}
            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
                  Changes
                </h3>
                {status?.clean && <StatusChip tone="success">Working tree clean</StatusChip>}
              </div>

              {status && !status.clean && (
                <ul className="space-y-1 font-mono text-[11px]">
                  {status.staged.map((f) => (
                    <li
                      key={`s-${f}`}
                      className="flex items-center justify-between px-2.5 py-1 rounded bg-[#08080C] border border-[var(--border-hairline)]"
                    >
                      <span className="truncate text-[var(--text-primary)]">{f}</span>
                      <span className="text-[#86efac]">Staged</span>
                    </li>
                  ))}
                  {status.modified.map((f) => (
                    <li
                      key={`m-${f}`}
                      className="flex items-center justify-between px-2.5 py-1 rounded bg-[#08080C] border border-[var(--border-hairline)]"
                    >
                      <span className="truncate text-[var(--text-primary)]">{f}</span>
                      <span className="text-[#fde047]">M</span>
                    </li>
                  ))}
                  {status.untracked.map((f) => (
                    <li
                      key={`u-${f}`}
                      className="flex items-center justify-between px-2.5 py-1 rounded bg-[#08080C] border border-[var(--border-hairline)]"
                    >
                      <span className="truncate text-[var(--text-primary)]">{f}</span>
                      <span className="text-[#93c5fd]">U</span>
                    </li>
                  ))}
                  {status.deleted.map((f) => (
                    <li
                      key={`d-${f}`}
                      className="flex items-center justify-between px-2.5 py-1 rounded bg-[#08080C] border border-[var(--border-hairline)]"
                    >
                      <span className="truncate text-[var(--text-primary)]">{f}</span>
                      <span className="text-[#fca5a5]">D</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>

      {/* Owner-only Set Remote Dialog */}
      <Dialog
        open={remoteDialogOpen}
        onClose={() => setRemoteDialogOpen(false)}
        title="Configure Git Remote"
        description="Owner-only setting. HTTPS or SSH remote URL and optional personal access token."
        maxWidthClass="max-w-[420px]"
      >
        <form onSubmit={handleSaveRemote} className="space-y-4">
          <FormField id="git-remote-url" label="Remote URL" required error={dialogError}>
            <TextInput
              id="git-remote-url"
              type="url"
              autoFocus
              value={remoteUrl}
              onChange={(e) => setRemoteUrl(e.target.value)}
              placeholder="https://github.com/org/repo.git"
              className="font-mono"
            />
          </FormField>
          <FormField id="git-remote-token" label="Access Token (optional)">
            <TextInput
              id="git-remote-token"
              type="password"
              value={remoteToken}
              onChange={(e) => setRemoteToken(e.target.value)}
              placeholder="ghp_..."
              className="font-mono"
            />
          </FormField>
          <div className="flex justify-end gap-2">
            <GlassButton variant="ghost" onClick={() => setRemoteDialogOpen(false)}>
              Cancel
            </GlassButton>
            <GlassButton type="submit" variant="primary" loading={setRemote.isPending}>
              Save Remote
            </GlassButton>
          </div>
        </form>
      </Dialog>

      {/* Owner-only Clone Repo Dialog */}
      <Dialog
        open={cloneDialogOpen}
        onClose={() => setCloneDialogOpen(false)}
        title="Clone Git Repository"
        description="Import an existing repository into this DevSync workspace."
        maxWidthClass="max-w-[420px]"
      >
        <form onSubmit={handleClone} className="space-y-4">
          <FormField id="git-clone-url" label="Repository URL" required error={dialogError}>
            <TextInput
              id="git-clone-url"
              type="url"
              autoFocus
              value={remoteUrl}
              onChange={(e) => setRemoteUrl(e.target.value)}
              placeholder="https://github.com/org/repo.git"
              className="font-mono"
            />
          </FormField>
          <FormField id="git-clone-branch" label="Branch">
            <TextInput
              id="git-clone-branch"
              type="text"
              value={cloneBranch}
              onChange={(e) => setCloneBranch(e.target.value)}
              className="font-mono"
            />
          </FormField>
          <FormField id="git-clone-token" label="Access Token (optional)">
            <TextInput
              id="git-clone-token"
              type="password"
              value={remoteToken}
              onChange={(e) => setRemoteToken(e.target.value)}
              placeholder="ghp_..."
              className="font-mono"
            />
          </FormField>
          <div className="flex justify-end gap-2">
            <GlassButton variant="ghost" onClick={() => setCloneDialogOpen(false)}>
              Cancel
            </GlassButton>
            <GlassButton type="submit" variant="primary" loading={cloneRepo.isPending}>
              Clone Repository
            </GlassButton>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
