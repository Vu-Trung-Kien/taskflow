import type { ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth';
import { AuthPage } from './pages/AuthPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { WorkspacePage } from './pages/WorkspacePage';
import { Loader2Icon } from './components/icons';

function LoadingScreen({ label = 'Đang tải TaskFlow...' }: { label?: string }) {
  return (
    <div className="tf-full-screen-loading">
      <div className="tf-loading-box">
        <Loader2Icon size={36} className="animate-spin tf-text-primary" />
        <span className="tf-loading-label">{label}</span>
      </div>
    </div>
  );
}

function Guarded({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth();
  if (!ready) return <LoadingScreen label="Đang khôi phục phiên làm việc..." />;
  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

function PublicOnly({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth();
  if (!ready) return <LoadingScreen label="Đang kiểm tra phiên làm việc..." />;
  return user ? <Navigate to="/projects" replace /> : <>{children}</>;
}

export function App() {
  const { ready } = useAuth();
  if (!ready) return <LoadingScreen label="Đang khởi tạo TaskFlow..." />;

  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicOnly>
            <AuthPage />
          </PublicOnly>
        }
      />
      <Route
        path="/register"
        element={
          <PublicOnly>
            <AuthPage register />
          </PublicOnly>
        }
      />
      <Route
        path="/projects"
        element={
          <Guarded>
            <ProjectsPage />
          </Guarded>
        }
      />
      <Route
        path="/projects/:projectId"
        element={
          <Guarded>
            <WorkspacePage />
          </Guarded>
        }
      />
      <Route path="*" element={<Navigate to="/projects" replace />} />
    </Routes>
  );
}
