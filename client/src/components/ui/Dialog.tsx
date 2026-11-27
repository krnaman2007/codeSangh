import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  maxWidthClass?: string;
  closedBy?: 'any' | 'closerequest' | 'none';
  hideHeader?: boolean;
  ariaLabel?: string;
}

/**
 * Native top-layer modal dialog following modern-web-guidance:
 * - Uses <dialog>.showModal() for inert backdrop, focus containment, and Esc dismissal
 * - Avoids redundant role="dialog" / aria-modal
 * - Implements pointerdown+pointerup outside rect fallback for light-dismiss
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  maxWidthClass = 'max-w-[440px]',
  closedBy = 'any',
  hideHeader = false,
  ariaLabel,
}: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const pressedOutsideRef = useRef(false);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else if (dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleCancel = (e: Event) => {
      if (closedBy === 'none') {
        e.preventDefault();
        return;
      }
      e.preventDefault();
      onClose();
    };

    const handleClose = () => {
      dialog.returnValue = '';
      if (open) {
        onClose();
      }
    };

    dialog.addEventListener('cancel', handleCancel);
    dialog.addEventListener('close', handleClose);
    return () => {
      dialog.removeEventListener('cancel', handleCancel);
      dialog.removeEventListener('close', handleClose);
    };
  }, [closedBy, onClose, open]);

  const isOutsideDialog = (clientX: number, clientY: number, el: HTMLDialogElement) => {
    const r = el.getBoundingClientRect();
    return clientX < r.left || clientX > r.right || clientY < r.top || clientY > r.bottom;
  };

  if (!open) {
    return null;
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={hideHeader ? undefined : titleId}
      aria-label={hideHeader ? ariaLabel ?? title : undefined}
      aria-describedby={description ? descId : undefined}
      onPointerDown={(e) => {
        const dialog = dialogRef.current;
        if (!dialog || closedBy !== 'any') return;
        pressedOutsideRef.current = isOutsideDialog(e.clientX, e.clientY, dialog);
      }}
      onPointerUp={(e) => {
        const dialog = dialogRef.current;
        if (!dialog || closedBy !== 'any') return;
        if (pressedOutsideRef.current && isOutsideDialog(e.clientX, e.clientY, dialog)) {
          onClose();
        }
        pressedOutsideRef.current = false;
      }}
      className={`w-full ${maxWidthClass} rounded-xl glass-surface-elevated p-0 text-[var(--text-primary)] bg-transparent`}
    >
      <div className="p-6">
        {!hideHeader && (
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="min-w-0">
              <h1
                id={titleId}
                className="text-[16px] font-semibold tracking-tight text-[var(--text-primary)]"
              >
                {title}
              </h1>
              {description && (
                <p id={descId} className="text-[12px] text-[var(--text-secondary)] mt-1">
                  {description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-mechanical cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" strokeWidth={1.5} />
            </button>
          </div>
        )}
        {children}
      </div>
    </dialog>
  );
}
