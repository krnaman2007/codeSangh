import type { InputHTMLAttributes, ReactNode } from 'react';

export interface FormFieldProps {
  id: string;
  label: string;
  hint?: string;
  error?: string | null;
  required?: boolean;
  rightAdornment?: ReactNode;
  children?: ReactNode;
}

export function FormField({
  id,
  label,
  hint,
  error,
  required,
  rightAdornment,
  children,
}: FormFieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <label
          htmlFor={id}
          className="block text-[12px] font-medium text-[var(--text-secondary)]"
        >
          {label}
          {required && (
            <span aria-hidden="true" className="ml-1 text-[var(--state-danger)]">
              *
            </span>
          )}
        </label>
        {rightAdornment}
      </div>

      {children}

      {hint && !error && (
        <p id={hintId} className="text-[11px] text-[var(--text-muted)]">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-[12px] text-[#fca5a5]">
          {error}
        </p>
      )}
    </div>
  );
}

export interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
  leadingIcon?: ReactNode;
  trailingAction?: ReactNode;
}

export function TextInput({
  hasError = false,
  leadingIcon,
  trailingAction,
  className = '',
  ...rest
}: TextInputProps) {
  return (
    <div className="relative flex items-center">
      {leadingIcon && (
        <span className="absolute left-3 text-[var(--text-muted)] pointer-events-none">
          {leadingIcon}
        </span>
      )}
      <input
        aria-invalid={hasError ? 'true' : undefined}
        className={`w-full rounded-lg bg-[var(--surface-base)] border px-3 py-2 text-[13px] text-[var(--text-primary)] placeholder-[var(--text-muted)] transition-mechanical focus:outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)] ${
          hasError ? 'border-[var(--state-danger-border)]' : 'border-white/[0.09]'
        } ${leadingIcon ? 'pl-9' : ''} ${trailingAction ? 'pr-10' : ''} ${className}`.trim()}
        {...rest}
      />
      {trailingAction && (
        <span className="absolute right-2 flex items-center">{trailingAction}</span>
      )}
    </div>
  );
}
