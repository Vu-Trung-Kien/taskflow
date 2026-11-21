import { useState, useRef, useEffect, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth';
import { Avatar } from '../ui/Avatar';
import { NotificationBell } from '../notifications/NotificationBell';
import { ChevronDownIcon, LogOutIcon, SparklesIcon } from '../icons';

interface TopBarProps {
  breadcrumbs?: ReactNode;
  onToggleSidebar?: () => void;
}

export function TopBar({ breadcrumbs, onToggleSidebar }: TopBarProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleLogout() {
    setUserMenuOpen(false);
    try {
      await signOut();
      navigate('/login', { replace: true });
    } catch {
      // ignore
    }
  }

  return (
    <header className="tf-topbar">
      <div className="tf-topbar-left">
        {onToggleSidebar && (
          <button
            type="button"
            className="tf-mobile-menu-btn"
            onClick={onToggleSidebar}
            aria-label="Toggle menu"
          >
            <span className="tf-hamburger-icon" />
          </button>
        )}
        <Link to="/projects" className="tf-topbar-brand">
          <div className="tf-brand-icon">
            <SparklesIcon size={16} />
          </div>
          <span className="tf-brand-text">TaskFlow</span>
        </Link>

        {breadcrumbs && (
          <div className="tf-topbar-breadcrumbs">
            <span className="tf-breadcrumb-separator">/</span>
            {breadcrumbs}
          </div>
        )}
      </div>

      <div className="tf-topbar-right">
        <NotificationBell />

        <div className="tf-user-menu-container" ref={menuRef}>
          <button
            type="button"
            className={`tf-user-profile-btn ${userMenuOpen ? 'active' : ''}`}
            onClick={() => setUserMenuOpen((prev) => !prev)}
            aria-expanded={userMenuOpen}
            aria-label="Hồ sơ tài khoản"
          >
            <Avatar name={user?.name} email={user?.email} size="sm" />
            <div className="tf-user-profile-info">
              <span className="tf-user-profile-name">{user?.name || user?.email || 'Người dùng'}</span>
            </div>
            <ChevronDownIcon size={14} className="tf-text-muted" />
          </button>

          {userMenuOpen && (
            <div className="tf-user-dropdown" role="menu">
              <div className="tf-user-dropdown-header">
                <Avatar name={user?.name} email={user?.email} size="md" />
                <div className="tf-user-dropdown-details">
                  <strong>{user?.name || 'Thành viên TaskFlow'}</strong>
                  <span className="tf-text-muted">{user?.email}</span>
                </div>
              </div>
              <div className="tf-dropdown-divider" />
              <button
                type="button"
                className="tf-dropdown-item tf-danger-item"
                onClick={() => void handleLogout()}
                role="menuitem"
              >
                <LogOutIcon size={16} />
                <span>Đăng xuất</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
