import { useState } from 'react';
import type { Task } from '../../types';
import { taskApi, ApiError } from '../../api';
import { StatusBadge, PriorityBadge } from '../ui/Badge';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { CalendarIcon, RefreshCwIcon } from '../icons';

interface TaskRowProps {
  task: Task;
  selected: boolean;
  deleted: boolean;
  canEdit: boolean;
  onSelect: () => void;
  onChanged: () => Promise<void>;
  projectId: string;
}

export function TaskRow({
  task,
  selected,
  deleted,
  canEdit,
  onSelect,
  onChanged,
  projectId,
}: TaskRowProps) {
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState('');

  async function handleRestore(e: React.MouseEvent) {
    e.stopPropagation();
    setError('');
    setRestoring(true);
    try {
      await taskApi.restore(projectId, task.id);
      await onChanged();
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'Không thể khôi phục.');
    } finally {
      setRestoring(false);
    }
  }

  const isOverdue =
    task.dueAt &&
    new Date(task.dueAt) < new Date() &&
    task.status !== 'DONE';

  return (
    <article
      className={`tf-task-row ${selected ? 'selected' : ''} ${deleted ? 'deleted' : ''}`}
      onClick={() => {
        if (!deleted) onSelect();
      }}
      role="button"
      tabIndex={deleted ? -1 : 0}
    >
      <div className="tf-task-row-status-col">
        <StatusBadge status={task.status} />
      </div>

      <div className="tf-task-row-main-col">
        <strong className="tf-task-row-title">{task.title}</strong>
        <span className="tf-task-row-snippet">
          {task.parentTaskId
            ? '↳ Công việc con'
            : task.description || 'Chưa có mô tả'}
        </span>
      </div>

      <div className="tf-task-row-priority-col">
        <PriorityBadge priority={task.priority} />
      </div>

      <div className="tf-task-row-assignee-col">
        {task.assignee ? (
          <div className="tf-assignee-chip">
            <Avatar name={task.assignee.name} email={task.assignee.email} size="xs" />
            <span className="tf-assignee-name">
              {task.assignee.name || task.assignee.email}
            </span>
          </div>
        ) : (
          <span className="tf-text-muted">Chưa giao</span>
        )}
      </div>

      <div className="tf-task-row-due-col">
        {task.dueAt ? (
          <span className={`tf-due-date-text ${isOverdue ? 'overdue' : ''}`}>
            <CalendarIcon size={13} />
            {new Date(task.dueAt).toLocaleDateString('vi-VN')}
          </span>
        ) : (
          <span className="tf-text-muted">—</span>
        )}
      </div>

      {deleted && canEdit && (
        <div className="tf-task-row-action-col">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRestore}
            loading={restoring}
            icon={<RefreshCwIcon size={13} />}
          >
            Khôi phục
          </Button>
        </div>
      )}

      {error && <span className="tf-inline-error">{error}</span>}
    </article>
  );
}
