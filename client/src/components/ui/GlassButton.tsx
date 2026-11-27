import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type GlassButtonVariant = 'primary' | 'glass' | 'ghost' | 'danger';
export type GlassButtonSize = 'sm' | 'md' | 'lg';

export interface GlassButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: GlassButtonVariant;
  size?: GlassButtonSize;
  loading?: boolean;
}

const VARIANT_CLASSES: Record<GlassButtonVariant, string> = {
  primary:
    'bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-[var(--text-primary)] border border-white/10 shadow-[var(--shadow-button)] disabled:bg-[#18181F] disabled:text-[var(--text-muted)] disabled:border-[var(--border-hairline)] disabled:shadow-none',
  glass:
    'glass-surface hover:bg-[var(--surface-hover)] text-[var(--text-primary)] border-[var(--border-glass)] disabled:opacity-45',
  ghost:
    'bg-transparent hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-transparent disabled:opacity-45',
  danger:
    'bg-[var(--state-danger-bg)] hover:bg-[#ef4444]/20 text-[#fca5a5] border border-[var(--state-danger-border)] disabled:opacity-45',
};

const SIZE_CLASSES: Record<GlassButtonSize, string> = {
  sm: 'h-8 px-2.5 text-[12px] rounded-md gap-1.5',
  md: 'h-9 px-3.5 text-[13px] rounded-lg gap-1.5',
  lg: 'h-10 px-5 text-[14px] rounded-full gap-2',
};

export function GlassButton({
  children,
  variant = 'glass',
  size = 'md',
  loading = false,
  disabled,
  type = 'button',
  className = '',
  ...rest
}: GlassButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`inline-flex items-center justify-center font-medium transition-mechanical whitespace-nowrap shrink-0 cursor-pointer active:scale-[0.98] disabled:cursor-not-allowed disabled:active:scale-100 ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`.trim()}
      {...rest}
    >
      {children}
    </button>
  );
}
