import type { ReactNode } from 'react';
import type { TaskPriority, TaskStatus, ProjectRole } from '../../types';

export const statusConfig: Record<TaskStatus, { label: string; bg: string; text: string; dot: string }> = {
  TODO: {
    label: 'Cần làm',
    bg: 'var(--color-status-todo-bg)',
    text: 'var(--color-status-todo-text)',
    dot: 'var(--color-status-todo-dot)',
  },
  IN_PROGRESS: {
    label: 'Đang làm',
    bg: 'var(--color-status-progress-bg)',
    text: 'var(--color-status-progress-text)',
    dot: 'var(--color-status-progress-dot)',
  },
  DONE: {
    label: 'Hoàn tất',
    bg: 'var(--color-status-done-bg)',
    text: 'var(--color-status-done-text)',
    dot: 'var(--color-status-done-dot)',
  },
  BLOCKED: {
    label: 'Bị chặn',
    bg: 'var(--color-status-blocked-bg)',
    text: 'var(--color-status-blocked-text)',
    dot: 'var(--color-status-blocked-dot)',
  },
};

export const priorityConfig: Record<TaskPriority, { label: string; bg: string; text: string; dot: string }> = {
  LOW: {
    label: 'Thấp',
    bg: 'var(--color-priority-low-bg)',
    text: 'var(--color-priority-low-text)',
    dot: 'var(--color-priority-low-dot)',
  },
  MEDIUM: {
    label: 'Trung bình',
    bg: 'var(--color-priority-medium-bg)',
    text: 'var(--color-priority-medium-text)',
    dot: 'var(--color-priority-medium-dot)',
  },
  HIGH: {
    label: 'Cao',
    bg: 'var(--color-priority-high-bg)',
    text: 'var(--color-priority-high-text)',
    dot: 'var(--color-priority-high-dot)',
  },
  URGENT: {
    label: 'Khẩn cấp',
    bg: 'var(--color-priority-urgent-bg)',
    text: 'var(--color-priority-urgent-text)',
    dot: 'var(--color-priority-urgent-dot)',
  },
};

export const roleConfig: Record<ProjectRole, { label: string; bg: string; text: string }> = {
  OWNER: {
    label: 'Chủ dự án',
    bg: 'var(--color-role-owner-bg)',
    text: 'var(--color-role-owner-text)',
  },
  MEMBER: {
    label: 'Thành viên',
    bg: 'var(--color-role-member-bg)',
    text: 'var(--color-role-member-text)',
  },
  VIEWER: {
    label: 'Người xem',
    bg: 'var(--color-role-viewer-bg)',
    text: 'var(--color-role-viewer-text)',
  },
};

export function StatusBadge({ status, showDot = true }: { status: TaskStatus; showDot?: boolean }) {
  const conf = statusConfig[status] || statusConfig.TODO;
  return (
    <span
      className={`status-badge status-${status.toLowerCase().replace('_', '-')}`}
      style={{ backgroundColor: conf.bg, color: conf.text }}
    >
      {showDot && <span className="status-badge-dot" style={{ backgroundColor: conf.dot }} />}
      {conf.label}
    </span>
  );
}

export function PriorityBadge({ priority, showDot = false }: { priority: TaskPriority; showDot?: boolean }) {
  const conf = priorityConfig[priority] || priorityConfig.MEDIUM;
  return (
    <span
      className={`priority-badge priority-${priority.toLowerCase()}`}
      style={{ backgroundColor: conf.bg, color: conf.text }}
    >
      {showDot && <span className="priority-badge-dot" style={{ backgroundColor: conf.dot }} />}
      {conf.label}
    </span>
  );
}

export function RoleBadge({ role }: { role: ProjectRole }) {
  const conf = roleConfig[role] || roleConfig.MEMBER;
  return (
    <span
      className={`role-badge role-${role.toLowerCase()}`}
      style={{ backgroundColor: conf.bg, color: conf.text }}
    >
      {conf.label}
    </span>
  );
}

export function Badge({
  children,
  variant = 'default',
  size = 'md',
}: {
  children: ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'purple';
  size?: 'sm' | 'md';
}) {
  return (
    <span className={`tf-badge tf-badge-${variant} tf-badge-${size}`}>
      {children}
    </span>
  );
}
