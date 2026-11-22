import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../auth';
import { Avatar } from '../ui/Avatar';
import {
  FolderIcon,
  ArchiveIcon,
  PlusIcon,
  LogOutIcon,
  SparklesIcon,
  XIcon,
} from '../icons';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenCreateProject?: () => void;
  includeArchived?: boolean;
  onToggleArchived?: (val: boolean) => void;
  activeProjectId?: string;
  projectName?: string;
}

export function Sidebar({
  isOpen,
  onClose,
  onOpenCreateProject,
  includeArchived = false,
  onToggleArchived,
  activeProjectId,
  projectName,
}: SidebarProps) {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const isProjectsPage = location.pathname === '/projects';

  return (
    <>
      {isOpen && (
        <div
          className="tf-sidebar-overlay"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside className={`tf-sidebar ${isOpen ? 'tf-sidebar-open' : ''}`}>
        <div className="tf-sidebar-header">
          <Link to="/projects" className="tf-sidebar-brand" onClick={onClose}>
            <div className="tf-brand-icon">
              <SparklesIcon size={18} />
            </div>
            <div className="tf-brand-info">
              <span className="tf-brand-title">TaskFlow</span>
              <span className="tf-brand-badge">PRO</span>
            </div>
          </Link>
          <button
            type="button"
            className="tf-sidebar-close-btn"
            onClick={onClose}
            aria-label="Đóng thanh điều hướng"
          >
            <XIcon size={18} />
          </button>
        </div>

        <div className="tf-sidebar-content">
          <div className="tf-sidebar-section">
            <span className="tf-sidebar-section-title">KHÔNG GIAN LÀM VIỆC</span>
            <nav className="tf-sidebar-nav">
              <Link
                to="/projects"
                className={`tf-sidebar-link ${isProjectsPage && !includeArchived ? 'active' : ''}`}
                onClick={() => {
                  onToggleArchived?.(false);
                  onClose();
                }}
              >
                <FolderIcon size={18} />
                <span>Dự án của tôi</span>
              </Link>

              {onToggleArchived ? (
                <button
                  type="button"
                  className={`tf-sidebar-link ${includeArchived ? 'active' : ''}`}
                  onClick={() => {
                    onToggleArchived(!includeArchived);
                    onClose();
                  }}
                >
                  <ArchiveIcon size={18} />
                  <span>Dự án đã lưu trữ</span>
                </button>
              ) : (
                <Link
                  to="/projects"
                  className="tf-sidebar-link"
                  onClick={onClose}
                >
                  <ArchiveIcon size={18} />
                  <span>Kho lưu trữ</span>
                </Link>
              )}
            </nav>
          </div>

          {activeProjectId && projectName && (
            <div className="tf-sidebar-section">
              <span className="tf-sidebar-section-title">DỰ ÁN HIỆN TẠI</span>
              <div className="tf-sidebar-active-project">
                <div className="tf-project-mini-dot" />
                <span className="tf-project-mini-name">{projectName}</span>
              </div>
            </div>
          )}

          {onOpenCreateProject && (
            <div className="tf-sidebar-cta">
              <button
                type="button"
                className="tf-sidebar-new-btn"
                onClick={() => {
                  onClose();
                  onOpenCreateProject();
                }}
              >
                <PlusIcon size={16} />
                <span>Tạo dự án mới</span>
              </button>
            </div>
          )}
        </div>

        <div className="tf-sidebar-footer">
          <div className="tf-sidebar-user">
            <Avatar name={user?.name} email={user?.email} size="sm" />
            <div className="tf-sidebar-user-info">
              <span className="tf-sidebar-user-name">{user?.name || user?.email}</span>
              <span className="tf-sidebar-user-email">{user?.email}</span>
            </div>
            <button
              type="button"
              className="tf-sidebar-logout-btn"
              onClick={() => void signOut()}
              title="Đăng xuất"
              aria-label="Đăng xuất"
            >
              <LogOutIcon size={16} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
