import { useState, type FormEvent } from 'react';
import { Shield, Trash2, UserPlus } from 'lucide-react';
import { ApiClientError } from '../api/errors';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import {
  useCollaboratorMutations,
  useCollaboratorsQuery,
  useUserSearchQuery,
} from '../hooks/useCollaborators';
import { getInitials } from '../state/authStore';
import { useUiStore } from '../state/uiStore';
import { Dialog, FormField, GlassButton, RoleChip, Skeleton, TextInput } from './ui';

interface CollaboratorsDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
  canManageCollaborators: boolean;
}

export function CollaboratorsDialog({
  open,
  onClose,
  projectId,
  projectName,
  canManageCollaborators,
}: CollaboratorsDialogProps) {
  const { pushToast } = useUiStore();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'editor' | 'viewer'>('editor');
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<{ userId: string; name: string } | null>(null);

  const debouncedQuery = useDebouncedValue(email, 220);
  const collaboratorsQuery = useCollaboratorsQuery(projectId, open);
  const userSearchQuery = useUserSearchQuery(
    projectId,
    debouncedQuery,
    open && canManageCollaborators
  );
  const { invite, updateRole, remove } = useCollaboratorMutations(projectId);

  const handleInviteSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canManageCollaborators) return;
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setInviteError('Enter a valid developer email address.');
      return;
    }

    setInviteError(null);
    try {
      await invite.mutateAsync({ email: trimmed, role });
      pushToast(`Invited ${trimmed}`, 'success', `Granted ${role} access`);
      setEmail('');
    } catch (err) {
      const msg = err instanceof ApiClientError ? err.userMessage : 'Could not invite user.';
      setInviteError(msg);
    }
  };

  const suggestions = userSearchQuery.data?.users ?? [];
  const owner = collaboratorsQuery.data?.owner;
  const collaborators = collaboratorsQuery.data?.collaborators ?? [];

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        title={`Share “${projectName}”`}
        description="Invite collaborators with View Access or Edit Access and manage project membership."
        maxWidthClass="max-w-[520px]"
      >
        {canManageCollaborators && (
          <form onSubmit={handleInviteSubmit} noValidate className="mb-6 space-y-2.5">
            <FormField
              id="invite-collab-email"
              label="Invite Developer"
              error={inviteError}
              hint="Type at least 3 characters to search registered DevSync users."
            >
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <TextInput
                    id="invite-collab-email"
                    type="email"
                    autoFocus
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setInviteError(null);
                    }}
                    placeholder="teammate@company.com"
                    autoCorrect="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    hasError={Boolean(inviteError)}
                  />
                  {suggestions.length > 0 && email.trim().length >= 3 && (
                    <ul
                      role="listbox"
                      aria-label="Matching users"
                      className="absolute left-0 right-0 top-full mt-1 z-50 rounded-lg glass-surface-elevated divide-y divide-[var(--border-hairline)] overflow-hidden"
                    >
                      {suggestions.map((u) => (
                        <li key={u.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setEmail(u.email);
                              setInviteError(null);
                            }}
                            className="w-full px-3 py-2 text-left text-[12px] hover:bg-[var(--surface-hover)] flex items-center justify-between gap-2 cursor-pointer"
                          >
                            <span className="font-medium text-[var(--text-primary)]">{u.name}</span>
                            <span className="font-mono text-[var(--text-muted)] truncate">
                              {u.email}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <select
                  aria-label="Invitation role"
                  value={role}
                  onChange={(e) => setRole(e.target.value as 'editor' | 'viewer')}
                  className="rounded-lg bg-[var(--surface-base)] border border-white/[0.09] px-3 py-2 text-[13px] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                >
                  <option value="editor">Edit Access</option>
                  <option value="viewer">View Access</option>
                </select>

                <GlassButton type="submit" variant="primary" loading={invite.isPending}>
                  <UserPlus className="w-3.5 h-3.5" strokeWidth={1.5} />
                  <span>{invite.isPending ? 'Inviting…' : 'Invite'}</span>
                </GlassButton>
              </div>
            </FormField>
          </form>
        )}

        <div>
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="text-[12px] font-medium text-[var(--text-secondary)]">
              People with access ({(owner ? 1 : 0) + collaborators.length})
            </h2>
            <span className="text-[11px] text-[var(--text-muted)] inline-flex items-center gap-1">
              <Shield className="w-3 h-3" strokeWidth={1.5} />
              <span>Project-wide</span>
            </span>
          </div>

          {collaboratorsQuery.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : (
            <ul className="divide-y divide-[var(--border-hairline)] rounded-lg bg-[var(--surface-base)] border border-[var(--border-hairline)] overflow-hidden">
              {owner && (
                <li className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-[var(--surface-hover)] border border-white/[0.1] flex items-center justify-center text-[11px] font-mono text-[var(--text-primary)]">
                      {getInitials(owner.name)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-[var(--text-primary)] truncate">
                        {owner.name}
                      </p>
                      <p className="text-[11px] text-[var(--text-muted)] truncate">{owner.email}</p>
                    </div>
                  </div>
                  <RoleChip role="owner" />
                </li>
              )}

              {collaborators.map((collab) => (
                <li
                  key={collab.userId}
                  className="flex items-center justify-between gap-3 px-3.5 py-2.5"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-[var(--surface-hover)] border border-white/[0.1] flex items-center justify-center text-[11px] font-mono text-[var(--text-primary)]">
                      {getInitials(collab.name)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-[var(--text-primary)] truncate">
                        {collab.name}
                      </p>
                      <p className="text-[11px] text-[var(--text-muted)] truncate">
                        {collab.email}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {canManageCollaborators ? (
                      <>
                        <select
                          aria-label={`Role for ${collab.name}`}
                          value={collab.role}
                          disabled={updateRole.isPending}
                          onChange={(e) => {
                            const nextRole = e.target.value as 'editor' | 'viewer';
                            void updateRole
                              .mutateAsync({ userId: collab.userId, role: nextRole })
                              .then(() =>
                                pushToast(`Updated ${collab.name} to ${nextRole}`, 'success')
                              )
                              .catch((err) => {
                                const msg =
                                  err instanceof ApiClientError
                                    ? err.userMessage
                                    : 'Role update failed.';
                                pushToast('Update failed', 'error', msg);
                              });
                          }}
                          className="rounded-md bg-[var(--surface-elevated)] border border-white/[0.08] px-2 py-1 text-[12px] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                        >
                          <option value="editor">Editor</option>
                          <option value="viewer">Viewer</option>
                        </select>
                        <button
                          type="button"
                          onClick={() =>
                            setRevokeTarget({ userId: collab.userId, name: collab.name })
                          }
                          aria-label={`Revoke access for ${collab.name}`}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[12px] text-[var(--text-secondary)] hover:text-[#fca5a5] hover:bg-[var(--surface-hover)] transition-mechanical cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                          <span>Revoke</span>
                        </button>
                      </>
                    ) : (
                      <RoleChip role={collab.role} />
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Dialog>

      {/* Revoke Access Confirmation */}
      <Dialog
        open={Boolean(revokeTarget)}
        onClose={() => setRevokeTarget(null)}
        title={`Revoke access for ${revokeTarget?.name ?? ''}?`}
        description="They will immediately lose access to view or edit files in this workspace."
        maxWidthClass="max-w-[380px]"
      >
        <div className="flex items-center justify-end gap-2 pt-3">
          <GlassButton variant="ghost" autoFocus onClick={() => setRevokeTarget(null)}>
            Cancel
          </GlassButton>
          <GlassButton
            variant="danger"
            loading={remove.isPending}
            onClick={() => {
              if (!revokeTarget) return;
              void remove
                .mutateAsync(revokeTarget.userId)
                .then(() => {
                  pushToast(`Revoked access for ${revokeTarget.name}`, 'info');
                  setRevokeTarget(null);
                })
                .catch((err) => {
                  const msg =
                    err instanceof ApiClientError ? err.userMessage : 'Could not revoke access.';
                  pushToast('Revoke failed', 'error', msg);
                });
            }}
          >
            Revoke Access
          </GlassButton>
        </div>
      </Dialog>
    </>
  );
}
