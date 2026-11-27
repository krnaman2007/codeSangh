import { Suspense, lazy, useEffect } from 'react';
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { LandingPage } from './components/LandingPage';
import { AuthView } from './components/AuthView';
import { NotFoundPage } from './components/NotFoundPage';
import { ToastContainer, BrandLogo } from './components/BrandMark';
import { GlassPanel, Skeleton } from './components/ui';
import { ProtectedRoute, PublicOnlyRoute } from './routes/guards';
import { useUiStore } from './state/uiStore';

const DashboardPage = lazy(() =>
  import('./components/DashboardPage').then((m) => ({ default: m.DashboardPage }))
);
const WorkspacePage = lazy(() =>
  import('./components/WorkspacePage').then((m) => ({ default: m.WorkspacePage }))
);
const DemoWorkspaceShell = lazy(() =>
  import('./components/DemoWorkspaceShell').then((m) => ({ default: m.DemoWorkspaceShell }))
);

const ROUTE_TITLES: Record<string, string> = {
  '/': 'DevSync — Collaborative Browser IDE',
  '/login': 'Sign In | DevSync',
  '/register': 'Create Account | DevSync',
  '/dashboard': 'Dashboard | DevSync',
  '/demo': 'Live Demo Workspace | DevSync',
};

function RouteFallback() {
  return (
    <div className="min-h-screen bg-[var(--surface-canvas)] flex items-center justify-center p-6">
      <GlassPanel className="w-full max-w-[360px] p-6 space-y-3">
        <div className="flex items-center gap-2.5">
          <BrandLogo size={20} />
          <span className="text-[14px] font-semibold text-[var(--text-primary)]">
            Loading view…
          </span>
        </div>
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </GlassPanel>
    </div>
  );
}

function DocumentTitleManager() {
  const { pathname } = useLocation();

  useEffect(() => {
    if (pathname.startsWith('/project/')) {
      document.title = 'Workspace | DevSync';
      return;
    }
    document.title = ROUTE_TITLES[pathname] ?? 'Page Not Found | DevSync';
  }, [pathname]);

  return null;
}

export default function App() {
  const navigate = useNavigate();
  const { toasts, dismissToast } = useUiStore();

  return (
    <>
      <DocumentTitleManager />

      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route
            path="/"
            element={
              <LandingPage
                onGetStarted={() => navigate('/login')}
                onOpenDemo={() => navigate('/demo')}
              />
            }
          />

          <Route
            path="/login"
            element={
              <PublicOnlyRoute>
                <AuthView initialMode="login" />
              </PublicOnlyRoute>
            }
          />

          <Route
            path="/register"
            element={
              <PublicOnlyRoute>
                <AuthView initialMode="register" />
              </PublicOnlyRoute>
            }
          />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/project/:projectId"
            element={
              <ProtectedRoute>
                <WorkspacePage />
              </ProtectedRoute>
            }
          />

          <Route path="/demo" element={<DemoWorkspaceShell mode="workspace" />} />

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}
