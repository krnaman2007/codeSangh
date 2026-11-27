import { Link } from 'react-router-dom';
import { ArrowLeft, Compass, LayoutDashboard } from 'lucide-react';
import { BrandLogo } from './BrandMark';
import { GlassButton, GlassPanel } from './ui';
import { useAuth } from '../state/authStore';

export function NotFoundPage() {
  const { status } = useAuth();
  const isAuthenticated = status === 'authenticated';

  return (
    <div className="min-h-screen bg-[var(--surface-canvas)] bg-dot-grid text-[var(--text-primary)] flex flex-col justify-between p-6">
      <header className="max-w-[1200px] w-full mx-auto flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex items-center gap-2.5 text-[15px] font-semibold tracking-tight text-[var(--text-primary)]"
        >
          <BrandLogo size={20} />
          <span>DevSync</span>
        </Link>
      </header>

      <main className="w-full max-w-[460px] mx-auto my-auto py-12">
        <GlassPanel variant="elevated" className="p-8 text-center">
          <div className="w-11 h-11 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border-glass)] flex items-center justify-center mx-auto mb-4 text-[var(--text-secondary)]">
            <Compass className="w-5 h-5" strokeWidth={1.5} />
          </div>
          <p className="text-[12px] font-mono text-[var(--text-muted)] uppercase tracking-wider">
            404 · Route Not Found
          </p>
          <h1 className="text-[22px] font-semibold tracking-tight text-[var(--text-primary)] mt-1.5">
            This workspace route does not exist
          </h1>
          <p className="text-[13px] text-[var(--text-secondary)] mt-2 leading-relaxed">
            The page or project link may have moved, or the URL was typed incorrectly.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link to="/">
              <GlassButton variant="glass" size="md">
                <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
                <span>Back to Home</span>
              </GlassButton>
            </Link>
            <Link to={isAuthenticated ? '/dashboard' : '/login'}>
              <GlassButton variant="primary" size="md">
                <LayoutDashboard className="w-4 h-4" strokeWidth={1.5} />
                <span>{isAuthenticated ? 'Open Dashboard' : 'Sign In'}</span>
              </GlassButton>
            </Link>
          </div>
        </GlassPanel>
      </main>

      <footer className="text-center text-[12px] text-[var(--text-muted)]">
        DevSync Collaborative IDE
      </footer>
    </div>
  );
}
