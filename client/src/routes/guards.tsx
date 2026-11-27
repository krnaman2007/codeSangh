import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { sanitizeReturnUrl, useAuth } from '../state/authStore';
import { BrandLogo } from '../components/BrandMark';
import { GlassPanel, Skeleton } from '../components/ui';

function AuthBootstrapScreen() {
  return (
    <div className="min-h-screen bg-[var(--surface-canvas)] bg-dot-grid flex items-center justify-center p-6">
      <GlassPanel className="w-full max-w-[360px] p-6 space-y-4">
        <div className="flex items-center gap-2.5">
          <BrandLogo size={20} />
          <span className="text-[14px] font-semibold text-[var(--text-primary)]">DevSync</span>
          <span className="ml-auto text-[11px] font-mono text-[var(--text-muted)]">
            Restoring session…
          </span>
        </div>
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </GlassPanel>
    </div>
  );
}

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'bootstrapping') {
    return <AuthBootstrapScreen />;
  }

  if (status === 'unauthenticated') {
    const returnTo = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/login?returnTo=${returnTo}`} replace />;
  }

  return <>{children}</>;
}

export function PublicOnlyRoute({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'bootstrapping') {
    return <AuthBootstrapScreen />;
  }

  if (status === 'authenticated') {
    const params = new URLSearchParams(location.search);
    const target = sanitizeReturnUrl(params.get('returnTo'));
    return <Navigate to={target} replace />;
  }

  return <>{children}</>;
}
