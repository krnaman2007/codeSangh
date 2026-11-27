import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, FolderX, RefreshCw, ShieldAlert } from 'lucide-react';
import { ApiClientError } from '../api/errors';
import { BrandLogo } from './BrandMark';
import { GlassButton, GlassPanel } from './ui';

interface ProjectErrorStateProps {
  error: unknown;
  onRetry?: () => void;
  titleOverride?: string;
}

export function ProjectErrorState({
  error,
  onRetry,
  titleOverride,
}: ProjectErrorStateProps) {
  const apiErr = error instanceof ApiClientError ? error : null;
  const isForbidden = apiErr?.isForbidden ?? false;
  const isNotFound = apiErr?.isNotFound ?? false;

  const title =
    titleOverride ??
    (isForbidden
      ? 'Access revoked or forbidden'
      : isNotFound
      ? 'Project not found'
      : 'Unable to load project');

  const description = isForbidden
    ? 'You no longer have permission to open this workspace, or the project owner changed your access.'
    : isNotFound
    ? 'This project may have been deleted, or you do not have access to this workspace link.'
    : apiErr?.userMessage ?? 'An unexpected error occurred while loading the project.';

  const Icon = isForbidden ? ShieldAlert : isNotFound ? FolderX : AlertTriangle;

  return (
    <div className="min-h-screen bg-[var(--surface-canvas)] bg-dot-grid text-[var(--text-primary)] flex flex-col justify-between p-6">
      <header className="max-w-[1200px] w-full mx-auto flex items-center justify-between">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 text-[13px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-mechanical"
        >
          <BrandLogo size={20} />
          <span>DevSync</span>
        </Link>
      </header>

      <main className="w-full max-w-[460px] mx-auto my-auto py-12">
        <GlassPanel variant="elevated" className="p-8 text-center">
          <div className="w-11 h-11 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border-glass)] flex items-center justify-center mx-auto mb-4 text-[var(--state-warning)]">
            <Icon className="w-5 h-5" strokeWidth={1.5} />
          </div>
          <p className="text-[11px] font-mono uppercase tracking-wider text-[var(--text-muted)]">
            {isForbidden ? '403 · Access Denied' : isNotFound ? '404 · Unavailable' : 'Workspace Error'}
          </p>
          <h1 className="text-[20px] font-semibold tracking-tight text-[var(--text-primary)] mt-1.5">
            {title}
          </h1>
          <p className="text-[13px] text-[var(--text-secondary)] mt-2 leading-relaxed">
            {description}
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link to="/dashboard">
              <GlassButton variant="primary" size="md">
                <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
                <span>Back to Dashboard</span>
              </GlassButton>
            </Link>
            {onRetry && !isForbidden && !isNotFound && (
              <GlassButton variant="glass" size="md" onClick={onRetry}>
                <RefreshCw className="w-4 h-4" strokeWidth={1.5} />
                <span>Retry</span>
              </GlassButton>
            )}
          </div>
        </GlassPanel>
      </main>

      <footer className="text-center text-[12px] text-[var(--text-muted)]">
        DevSync Collaborative IDE
      </footer>
    </div>
  );
}
