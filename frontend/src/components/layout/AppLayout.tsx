import { useState, type ReactNode } from 'react';
import { useAuth } from '../../auth';
import { TopBar } from './TopBar';
import { Sidebar } from './Sidebar';
import { AlertCircleIcon } from '../icons';

interface AppLayoutProps {
  children: ReactNode;
  breadcrumbs?: ReactNode;
  onOpenCreateProject?: () => void;
  includeArchived?: boolean;
  onToggleArchived?: (val: boolean) => void;
  activeProjectId?: string;
  projectName?: string;
}

export function AppLayout({
  children,
  breadcrumbs,
  onOpenCreateProject,
  includeArchived,
  onToggleArchived,
  activeProjectId,
  projectName,
}: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { sessionError } = useAuth();

  return (
    <div className="tf-app-layout">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onOpenCreateProject={onOpenCreateProject}
        includeArchived={includeArchived}
        onToggleArchived={onToggleArchived}
        activeProjectId={activeProjectId}
        projectName={projectName}
      />

      <div className="tf-main-wrapper">
        <TopBar
          breadcrumbs={breadcrumbs}
          onToggleSidebar={() => setSidebarOpen(true)}
        />

        {sessionError && (
          <div className="tf-global-banner" role="alert">
            <AlertCircleIcon size={16} />
            <span>Không thể khôi phục phiên trước đó: {sessionError}</span>
          </div>
        )}

        <div className="tf-content-viewport">{children}</div>
      </div>
    </div>
  );
}
