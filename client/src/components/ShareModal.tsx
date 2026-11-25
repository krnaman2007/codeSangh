import { useState, type FormEvent } from 'react';
import { X, UserPlus, Shield, Trash2, Lock } from 'lucide-react';
import type { Collaborator, CollaboratorAccess } from '../types/devsync';

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
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-[500px] rounded-xl bg-[#111116]/85 backdrop-blur-xl border border-white/10 p-6">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <h2
              id="share-modal-title"
              className="text-[16px] font-semibold tracking-tight text-[#F4F4F6]"
            >
              Share “{projectName}”
            </h2>
            <p className="text-[12px] text-[#9494A3] mt-0.5">
              Invite developers with View Access or Edit Access and manage workspace permissions.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close share modal"
            className="p-1 rounded-md text-[#5C5C6E] hover:text-[#F4F4F6] transition-mechanical cursor-pointer"
          >
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>

        {/* Invite Form (Owner only) */}
        {canManageCollaborators ? (
          <form onSubmit={handleInvite} noValidate className="mb-6">
            <label
              htmlFor="invite-email-input"
              className="block text-[12px] font-medium text-[#9494A3] mb-1.5"
            >
              Invite Developer
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                id="invite-email-input"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError(null);
                }}
                placeholder="teammate@company.com"
                className="flex-1 rounded-lg bg-[#0B0B0F] border border-white/[0.09] px-3 py-2 text-[13px] text-[#F4F4F6] placeholder-[#5C5C6E] focus:outline-none focus:border-[#5E5CE6] focus:ring-1 focus:ring-[#5E5CE6]"
              />
              <select
                aria-label="Invitation access level"
                value={access}
                onChange={(e) => setAccess(e.target.value as CollaboratorAccess)}
                className="rounded-lg bg-[#0B0B0F] border border-white/[0.09] px-3 py-2 text-[13px] text-[#F4F4F6] focus:outline-none focus:border-[#5E5CE6]"
              >
                <option value="edit">Edit Access</option>
                <option value="view">View Access</option>
              </select>
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-[#5E5CE6] hover:bg-[#4F46E5] text-[#F4F4F6] text-[13px] font-medium transition-mechanical whitespace-nowrap shrink-0 cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" strokeWidth={1.5} />
                <span>Invite</span>
              </button>
            </div>
            {error && (
              <p role="alert" className="text-[12px] text-[#EF4444] mt-2">
                {error}
              </p>
            )}
          </form>
        ) : (
          <div className="mb-5 flex items-start gap-2.5 rounded-lg bg-[#0B0B0F] border border-white/[0.07] p-3 text-[12px] text-[#9494A3]">
            <Lock className="w-4 h-4 text-[#5C5C6E] shrink-0 mt-0.5" strokeWidth={1.5} />
            <span>
              Only the Project Owner can invite collaborators, change access levels, or revoke
              access. Switch the demo role to Owner to test collaboration management.
            </span>
          </div>
        )}

        {/* Collaborators List */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <h3 className="text-[12px] font-medium text-[#9494A3]">
              Collaborators ({collaborators.length})
            </h3>
            <span className="text-[11px] text-[#5C5C6E] inline-flex items-center gap-1">
              <Shield className="w-3 h-3" strokeWidth={1.5} />
              <span>Project-wide access</span>
            </span>
          </div>

          <ul className="divide-y divide-white/[0.06] rounded-lg bg-[#0B0B0F] border border-white/[0.07] overflow-hidden">
            {collaborators.map((collab) => (
              <li
                key={collab.id}
                className="flex items-center justify-between gap-3 px-3.5 py-2.5"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative shrink-0">
                    <div className="w-8 h-8 rounded-full bg-[#18181F] border border-white/[0.09] flex items-center justify-center text-[11px] font-mono text-[#F4F4F6]">
                      {collab.initials}
                    </div>
                    {collab.online && (
                      <span
                        title="Online in workspace"
                        className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#22C55E] border-2 border-[#0B0B0F]"
                      />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-[#F4F4F6] truncate">
                      {collab.name}
                    </p>
                    <p className="text-[11px] text-[#5C5C6E] truncate">{collab.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {collab.role === 'owner' ? (
                    <span className="text-[12px] font-mono text-[#9494A3] px-2">Owner</span>
                  ) : canManageCollaborators ? (
                    <>
                      <select
                        aria-label={`Access level for ${collab.name}`}
                        value={collab.role}
                        onChange={(e) =>
                          onUpdateAccess(collab.id, e.target.value as CollaboratorAccess)
                        }
                        className="rounded-md bg-[#111116] border border-white/[0.08] px-2 py-1 text-[12px] text-[#F4F4F6] focus:outline-none focus:border-[#5E5CE6]"
                      >
                        <option value="edit">Edit</option>
                        <option value="view">View</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => onRevoke(collab.id)}
                        aria-label={`Revoke access for ${collab.name}`}
                        title="Revoke access"
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[12px] text-[#9494A3] hover:text-[#EF4444] hover:bg-[#18181F] transition-mechanical cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                        <span>Revoke</span>
                      </button>
                    </>
                  ) : (
                    <span className="text-[12px] font-mono text-[#9494A3] px-2">
                      {collab.role === 'edit' ? 'Edit Access' : 'View Access'}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
