import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import type { ToastMessage } from '../types/devsync';

export function BrandLogo({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      <rect
        x="2.5"
        y="2.5"
        width="19"
        height="19"
        rx="5"
        stroke="#F4F4F6"
        strokeWidth="1.5"
      />
      <path
        d="M8.5 9.25L6 12L8.5 14.75"
        stroke="#F4F4F6"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15.5 9.25L18 12L15.5 14.75"
        stroke="#5E5CE6"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13 8.25L11 15.75"
        stroke="#9494A3"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-80 max-w-[calc(100vw-2rem)] pointer-events-none"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          className="pointer-events-auto flex items-start gap-3 rounded-lg glass-surface-elevated px-3.5 py-2.5 text-sm text-[var(--text-primary)] transition-mechanical"
        >
          {toast.variant === 'success' && (
            <CheckCircle2 className="w-4 h-4 text-[#22C55E] shrink-0 mt-0.5" strokeWidth={1.5} />
          )}
          {toast.variant === 'error' && (
            <AlertCircle className="w-4 h-4 text-[#EF4444] shrink-0 mt-0.5" strokeWidth={1.5} />
          )}
          {toast.variant === 'info' && (
            <Info className="w-4 h-4 text-[#5E5CE6] shrink-0 mt-0.5" strokeWidth={1.5} />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-medium text-[#F4F4F6] leading-snug">
              {toast.title}
            </p>
            {toast.description && (
              <p className="text-xs text-[#9494A3] mt-0.5 leading-snug">
                {toast.description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => onDismiss(toast.id)}
            aria-label="Dismiss notification"
            className="text-[#5C5C6E] hover:text-[#F4F4F6] transition-mechanical p-0.5"
          >
            <X className="w-3.5 h-3.5" strokeWidth={1.5} />
          </button>
        </div>
      ))}
    </div>
  );
}
