import { useState, type FormEvent } from 'react';
import { Lock, Shield, Trash2, UserPlus } from 'lucide-react';
import type { Collaborator, CollaboratorAccess } from '../types/devsync';
import { Dialog, FormField, GlassButton, TextInput } from './ui';

interface ShareModalProps {
  projectName: string;
  collaborators: Collaborator[];
  canManageCollaborators: boolean;
  onClose: () => void;
  onInvite: (email: string, access: CollaboratorAccess) => { error?: string };
  onUpdateAccess: (collaboratorId: string, access: CollaboratorAccess) => void;
  onRevoke: (collaboratorId: string) => void;
}

export function ShareModal({
  projectName,
  collaborators,
  canManageCollaborators,
  onClose,
  onInvite,
  onUpdateAccess,
  onRevoke,
}: ShareModalProps) {
  const [email, setEmail] = useState('');
  const [access, setAccess] = useState<CollaboratorAccess>('edit');
  const [error, setError] = useState<string | null>(null);

  const handleInvite = (e: FormEvent) => {
    e.preventDefault();
    if (!canManageCollaborators) return;
    setError(null);
    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Enter a valid developer email address.');
      return;
    }
    const res = onInvite(trimmed, access);
    if (res.error) {
      setError(res.error);
      return;
    }
    setEmail('');
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title={`Share “${projectName}”`}
      description="Invite developers with View Access or Edit Access and manage workspace permissions."
      maxWidthClass="max-w-[500px]"
    >
      {canManageCollaborators ? (
        <form onSubmit={handleInvite} noValidate className="mb-6">
          <FormField id="demo-invite-email" label="Invite Developer" error={error}>
            <div className="flex flex-col sm:flex-row gap-2">
              <TextInput
                id="demo-invite-email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError(null);
                }}
                placeholder="teammate@company.com"
                hasError={Boolean(error)}
              />
              <select
                aria-label="Invitation access level"
                value={access}
                onChange={(e) => setAccess(e.target.value as CollaboratorAccess)}
                className="rounded-lg bg-[var(--surface-base)] border border-white/[0.09] px-3 py-2 text-[13px] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
              >
                <option value="edit">Edit Access</option>
                <option value="view">View Access</option>
              </select>
              <GlassButton type="submit" variant="primary">
                <UserPlus className="w-3.5 h-3.5" strokeWidth={1.5} />
                <span>Invite</span>
              </GlassButton>
            </div>
          </FormField>
        </form>
      ) : (
        <div className="mb-5 flex items-start gap-2.5 rounded-lg bg-[var(--surface-base)] border border-[var(--border-hairline)] p-3 text-[12px] text-[var(--text-secondary)]">
          <Lock className="w-4 h-4 text-[var(--text-muted)] shrink-0 mt-0.5" strokeWidth={1.5} />
          <span>
            Only the Project Owner can invite collaborators, change access levels, or revoke
            access. Switch the demo role to Owner to test collaboration management.
          </span>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-[12px] font-medium text-[var(--text-secondary)]">
            Collaborators ({collaborators.length})
          </h2>
          <span className="text-[11px] text-[var(--text-muted)] inline-flex items-center gap-1">
            <Shield className="w-3 h-3" strokeWidth={1.5} />
            <span>Project-wide access</span>
          </span>
        </div>

        <ul className="divide-y divide-[var(--border-hairline)] rounded-lg bg-[var(--surface-base)] border border-[var(--border-hairline)] overflow-hidden">
          {collaborators.map((collab) => (
            <li
              key={collab.id}
              className="flex items-center justify-between gap-3 px-3.5 py-2.5"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative shrink-0">
                  <div className="w-8 h-8 rounded-full bg-[var(--surface-hover)] border border-white/[0.09] flex items-center justify-center text-[11px] font-mono text-[var(--text-primary)]">
                    {collab.initials}
                  </div>
                  {collab.online && (
                    <span
                      title="Online in workspace"
                      className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[var(--state-success)] border-2 border-[var(--surface-base)]"
                    />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-[var(--text-primary)] truncate">
                    {collab.name}
                  </p>
                  <p className="text-[11px] text-[var(--text-muted)] truncate">{collab.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {collab.role === 'owner' ? (
                  <span className="text-[12px] font-mono text-[var(--text-secondary)] px-2">
                    Owner
                  </span>
                ) : canManageCollaborators ? (
                  <>
                    <select
                      aria-label={`Access level for ${collab.name}`}
                      value={collab.role}
                      onChange={(e) =>
                        onUpdateAccess(collab.id, e.target.value as CollaboratorAccess)
                      }
                      className="rounded-md bg-[var(--surface-elevated)] border border-white/[0.08] px-2 py-1 text-[12px] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                    >
                      <option value="edit">Edit</option>
                      <option value="view">View</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => onRevoke(collab.id)}
                      aria-label={`Revoke access for ${collab.name}`}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[12px] text-[var(--text-secondary)] hover:text-[#fca5a5] hover:bg-[var(--surface-hover)] transition-mechanical cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                      <span>Revoke</span>
                    </button>
                  </>
                ) : (
                  <span className="text-[12px] font-mono text-[var(--text-secondary)] px-2">
                    {collab.role === 'edit' ? 'Edit Access' : 'View Access'}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </Dialog>
  );
}
