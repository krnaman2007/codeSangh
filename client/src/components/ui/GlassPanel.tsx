import type { HTMLAttributes, ReactNode } from 'react';

export interface GlassPanelProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  variant?: 'default' | 'elevated' | 'toolbar' | 'solid';
}

export function GlassPanel({
  children,
  variant = 'default',
  className = '',
  ...rest
}: GlassPanelProps) {
  const variantClass =
    variant === 'elevated'
      ? 'glass-surface-elevated'
      : variant === 'toolbar'
      ? 'glass-toolbar border-b'
      : variant === 'solid'
      ? 'bg-[var(--surface-base)] border border-[var(--border-hairline)]'
      : 'glass-surface';

  return (
    <div className={`rounded-xl ${variantClass} ${className}`.trim()} {...rest}>
      {children}
    </div>
  );
}
