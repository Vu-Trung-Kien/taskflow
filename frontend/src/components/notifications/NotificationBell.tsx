import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationApi } from '../../api';
import type { Notification } from '../../types';
import { BellIcon, CheckIcon, CheckSquareIcon, ClockIcon } from '../icons';

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const navigate = useNavigate();

  async function fetchNotifications() {
    try {
      setLoading(true);
      const res = await notificationApi.list(40);
      setNotifications(res.notifications);
      setUnreadCount(res.unreadCount);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchNotifications();
    const timer = setInterval(() => {
      void fetchNotifications();
    }, 20000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: globalThis.MouseEvent) {
      if (
        open &&
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  async function markOneRead(id: string, e?: MouseEvent) {
    e?.stopPropagation();
    try {
      await notificationApi.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // ignore
    }
  }

  async function markAllRead() {
    try {
      await notificationApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      // ignore
    }
  }

  function handleNotificationClick(item: Notification) {
    if (!item.isRead) {
      void markOneRead(item.id);
    }
    setOpen(false);
    if (item.data && typeof item.data.projectId === 'string') {
      navigate(`/projects/${item.data.projectId}`);
    }
  }

  const displayedList = filter === 'unread'
    ? notifications.filter((n) => !n.isRead)
    : notifications;

  return (
    <div className="tf-notification-wrapper">
      <button
        ref={buttonRef}
        type="button"
        className={`tf-icon-btn ${open ? 'tf-icon-btn-active' : ''}`}
        onClick={() => {
          setOpen((prev) => !prev);
          if (!open) void fetchNotifications();
        }}
        aria-label="Thông báo"
        title="Thông báo"
      >
        <BellIcon size={19} />
        {unreadCount > 0 && (
          <span className="tf-notification-badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={popoverRef}
          className="tf-notification-popover"
          role="dialog"
          aria-label="Danh sách thông báo"
        >
          <div className="tf-notification-header">
            <div className="tf-notification-header-title">
              <span className="tf-heading-sm">Thông báo</span>
              {unreadCount > 0 && (
                <span className="tf-chip tf-chip-primary">{unreadCount} mới</span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                className="tf-link-action"
                onClick={() => void markAllRead()}
              >
                <CheckSquareIcon size={14} />
                Đánh dấu tất cả đã đọc
              </button>
            )}
          </div>

          <div className="tf-notification-tabs">
            <button
              type="button"
              className={`tf-notification-tab ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              Tất cả ({notifications.length})
            </button>
            <button
              type="button"
              className={`tf-notification-tab ${filter === 'unread' ? 'active' : ''}`}
              onClick={() => setFilter('unread')}
            >
              Chưa đọc ({unreadCount})
            </button>
          </div>

          <div className="tf-notification-body">
            {loading && notifications.length === 0 && (
              <div className="tf-notification-empty">Đang tải thông báo...</div>
            )}
            {!loading && displayedList.length === 0 && (
              <div className="tf-notification-empty">
                <BellIcon size={28} className="tf-text-muted" />
                <p>
                  {filter === 'unread'
                    ? 'Bạn không có thông báo chưa đọc nào.'
                    : 'Không có thông báo mới nào.'}
                </p>
              </div>
            )}
            {displayedList.map((n) => (
              <div
                key={n.id}
                className={`tf-notification-item ${n.isRead ? 'read' : 'unread'}`}
                onClick={() => handleNotificationClick(n)}
                role="button"
                tabIndex={0}
              >
                {!n.isRead && <span className="tf-unread-indicator" />}
                <div className="tf-notification-content">
                  <div className="tf-notification-item-header">
                    <span className="tf-notification-title">{n.title}</span>
                  </div>
                  <p className="tf-notification-msg">{n.message}</p>
                  <div className="tf-notification-meta">
                    <ClockIcon size={12} />
                    <span>
                      {new Date(n.createdAt).toLocaleDateString('vi-VN', {
                        hour: '2-digit',
                        minute: '2-digit',
                        day: '2-digit',
                        month: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
                {!n.isRead && (
                  <button
                    type="button"
                    className="tf-notification-check-btn"
                    onClick={(e) => void markOneRead(n.id, e)}
                    title="Đánh dấu đã đọc"
                    aria-label="Đánh dấu đã đọc"
                  >
                    <CheckIcon size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
