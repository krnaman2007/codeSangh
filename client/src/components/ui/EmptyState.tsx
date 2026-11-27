import type { ReactNode } from 'react';

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`rounded-xl glass-surface p-8 text-center flex flex-col items-center justify-center ${className}`.trim()}
    >
      {icon && (
        <div className="w-10 h-10 rounded-lg bg-[var(--surface-elevated)] border border-[var(--border-hairline)] flex items-center justify-center mb-4 text-[var(--text-secondary)]">
          {icon}
        </div>
      )}
      <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">{title}</h2>
      {description && (
        <p className="text-[13px] text-[var(--text-secondary)] mt-1.5 max-w-sm leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
