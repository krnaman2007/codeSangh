import { useId, type ReactNode } from 'react';

export interface TooltipProps {
  label: string;
  hint?: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
  children: ReactNode;
}

const POSITION_CLASSES: Record<NonNullable<TooltipProps['side']>, string> = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  right: 'left-full top-1/2 -translate-y-1/2 ml-2',
};

export function Tooltip({ label, hint, side = 'top', children }: TooltipProps) {
  const tooltipId = useId();

  return (
    <span className="relative inline-flex group/tooltip">
      <span aria-describedby={tooltipId} className="inline-flex">
        {children}
      </span>
      <span
        id={tooltipId}
        role="tooltip"
        className={`pointer-events-none opacity-0 group-hover/tooltip:opacity-100 group-focus-within/tooltip:opacity-100 transition-mechanical absolute ${POSITION_CLASSES[side]} z-40 px-2.5 py-1 rounded-md glass-surface-elevated text-[11px] text-[var(--text-primary)] whitespace-nowrap`}
      >
        <span>{label}</span>
        {hint && (
          <span className="ml-1.5 font-mono text-[10px] text-[var(--text-muted)]">{hint}</span>
        )}
      </span>
    </span>
  );
}
