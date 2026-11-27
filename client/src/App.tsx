import { useEffect } from 'react';
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { LandingPage } from './components/LandingPage';
import { AuthView } from './components/AuthView';
import { DashboardPage } from './components/DashboardPage';
import { WorkspacePage } from './components/WorkspacePage';
import { NotFoundPage } from './components/NotFoundPage';
import { DemoWorkspaceShell } from './components/DemoWorkspaceShell';
import { ToastContainer } from './components/BrandMark';
import { ProtectedRoute, PublicOnlyRoute } from './routes/guards';
import { useUiStore } from './state/uiStore';

const ROUTE_TITLES: Record<string, string> = {
  '/': 'DevSync — Collaborative Browser IDE',
  '/login': 'Sign In | DevSync',
  '/register': 'Create Account | DevSync',
  '/dashboard': 'Dashboard | DevSync',
  '/demo': 'Live Demo Workspace | DevSync',
};

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

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}
