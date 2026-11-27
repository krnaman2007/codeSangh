import type { ReactNode } from 'react';
import type { Role } from '../../types/devsync';

export type StatusTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info';

const TONE_CLASSES: Record<StatusTone, string> = {
  neutral: 'bg-white/[0.05] border-white/[0.1] text-[var(--text-secondary)]',
  accent: 'bg-[var(--accent-soft)] border-[var(--accent-primary)]/40 text-[#c7d2fe]',
  success: 'bg-[var(--state-success-bg)] border-[var(--state-success-border)] text-[#86efac]',
  warning: 'bg-[var(--state-warning-bg)] border-[var(--state-warning-border)] text-[#fde047]',
  danger: 'bg-[var(--state-danger-bg)] border-[var(--state-danger-border)] text-[#fca5a5]',
  info: 'bg-[var(--state-info-bg)] border-[var(--state-info-border)] text-[#93c5fd]',
};

export function StatusChip({
  children,
  tone = 'neutral',
  className = '',
}: {
  children: ReactNode;
  tone?: StatusTone;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-mono font-medium whitespace-nowrap ${TONE_CLASSES[tone]} ${className}`.trim()}
    >
      {children}
    </span>
  );
}

export function RoleChip({ role }: { role: Role }) {
  const tone: StatusTone =
    role === 'owner' ? 'accent' : role === 'editor' ? 'success' : 'warning';
  const label = role === 'owner' ? 'Owner' : role === 'editor' ? 'Editor' : 'Viewer';
  return <StatusChip tone={tone}>{label}</StatusChip>;
}
