import { useState } from 'react';
import type { Task, TaskPriority, TaskStatus } from '../../types';
import { PriorityBadge } from '../ui/Badge';
import { Avatar } from '../ui/Avatar';
import {
  CalendarIcon,
  CheckSquareIcon,
  GripVerticalIcon,
  PlusIcon,
} from '../icons';

export const priorityLabels: Record<TaskPriority, string> = {
  LOW: 'Thấp',
  MEDIUM: 'Trung bình',
  HIGH: 'Cao',
  URGENT: 'Khẩn cấp',
};

export const KANBAN_COLUMNS: Array<{
  status: TaskStatus;
  title: string;
  badgeClass: string;
  dotColor: string;
}> = [
  { status: 'TODO', title: 'Cần làm', badgeClass: 'tf-col-todo', dotColor: 'var(--color-status-todo-dot)' },
  { status: 'IN_PROGRESS', title: 'Đang làm', badgeClass: 'tf-col-progress', dotColor: 'var(--color-status-progress-dot)' },
  { status: 'DONE', title: 'Hoàn tất', badgeClass: 'tf-col-done', dotColor: 'var(--color-status-done-dot)' },
  { status: 'BLOCKED', title: 'Bị chặn', badgeClass: 'tf-col-blocked', dotColor: 'var(--color-status-blocked-dot)' },
];

interface KanbanBoardProps {
  tasks: Task[];
  canEdit: boolean;
  selectedTaskId?: string;
  onSelectTask: (task: Task) => void;
  onDropStatus: (taskId: string, targetStatus: TaskStatus) => void;
  onQuickAdd?: (status: TaskStatus) => void;
}

export function KanbanBoard({
  tasks,
  canEdit,
  selectedTaskId,
  onSelectTask,
  onDropStatus,
  onQuickAdd,
}: KanbanBoardProps) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [activeDropColumn, setActiveDropColumn] = useState<TaskStatus | null>(null);

  return (
    <div className="tf-kanban-container">
      <div className="tf-kanban-board">
        {KANBAN_COLUMNS.map((column) => {
          const columnTasks = tasks.filter((t) => t.status === column.status);
          const isDragOver = activeDropColumn === column.status;

          return (
            <div
              key={column.status}
              className={`tf-kanban-column ${column.badgeClass} ${isDragOver ? 'tf-kanban-column-drop-active' : ''}`}
              onDragOver={(e) => {
                if (!canEdit) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                if (activeDropColumn !== column.status) {
                  setActiveDropColumn(column.status);
                }
              }}
              onDragLeave={(e) => {
                if (!canEdit) return;
                if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                setActiveDropColumn(null);
              }}
              onDrop={(e) => {
                if (!canEdit) return;
                e.preventDefault();
                setActiveDropColumn(null);
                const taskId = e.dataTransfer.getData('text/plain') || draggedId;
                if (taskId) {
                  onDropStatus(taskId, column.status);
                }
              }}
            >
              {/* Column Header */}
              <div className="tf-kanban-column-header">
                <div className="tf-kanban-column-title-wrap">
                  <span
                    className="tf-column-status-dot"
                    style={{ backgroundColor: column.dotColor }}
                  />
                  <h3 className="tf-kanban-column-title">{column.title}</h3>
                  <span className="tf-kanban-column-count">{columnTasks.length}</span>
                </div>

                {canEdit && onQuickAdd && (
                  <button
                    type="button"
                    className="tf-kanban-quick-add"
                    onClick={() => onQuickAdd(column.status)}
                    title={`Thêm công việc vào ${column.title}`}
                    aria-label={`Thêm công việc vào ${column.title}`}
                  >
                    <PlusIcon size={14} />
                  </button>
                )}
              </div>

              {/* Card List in Column */}
              <div className="tf-kanban-card-list">
                {columnTasks.length === 0 && (
                  <div className={`tf-kanban-empty-dropzone ${isDragOver ? 'drag-over' : ''}`}>
                    {isDragOver ? 'Thả công việc vào đây' : 'Chưa có công việc'}
                  </div>
                )}

                {columnTasks.map((task) => {
                  const isSelected = selectedTaskId === task.id;
                  const isDragging = draggedId === task.id;
                  const isOverdue =
                    task.dueAt &&
                    new Date(task.dueAt) < new Date() &&
                    task.status !== 'DONE';
                  const completedSubtasks =
                    task.subTasks?.filter((st) => st.status === 'DONE').length ?? 0;
                  const totalSubtasks = task.subTasks?.length ?? 0;

                  return (
                    <article
                      key={task.id}
                      className={`tf-kanban-card ${isSelected ? 'selected' : ''} ${isDragging ? 'dragging' : ''}`}
                      draggable={canEdit}
                      onDragStart={(e) => {
                        if (!canEdit) return;
                        e.dataTransfer.setData('text/plain', task.id);
                        e.dataTransfer.effectAllowed = 'move';
                        setDraggedId(task.id);
                      }}
                      onDragEnd={() => {
                        setDraggedId(null);
                        setActiveDropColumn(null);
                      }}
                      onClick={() => onSelectTask(task)}
                      role="button"
                      tabIndex={0}
                    >
                      {/* Card Header: Priority & Drag Grip */}
                      <div className="tf-kanban-card-top">
                        <PriorityBadge priority={task.priority} />
                        {canEdit && (
                          <span
                            className="tf-kanban-drag-handle"
                            title="Kéo để di chuyển giữa các cột"
                            aria-hidden="true"
                          >
                            <GripVerticalIcon size={14} />
                          </span>
                        )}
                      </div>

                      {/* Card Title */}
                      <h4 className="tf-kanban-card-title">{task.title}</h4>

                      {/* Card Description */}
                      {task.description && (
                        <p className="tf-kanban-card-desc">{task.description}</p>
                      )}

                      {/* Card Footer: Metadata & Assignee */}
                      <div className="tf-kanban-card-footer">
                        <div className="tf-kanban-card-badges">
                          {task.dueAt && (
                            <span className={`tf-kanban-due-pill ${isOverdue ? 'overdue' : ''}`}>
                              <CalendarIcon size={12} />
                              {new Date(task.dueAt).toLocaleDateString('vi-VN', {
                                day: '2-digit',
                                month: '2-digit',
                              })}
                            </span>
                          )}

                          {totalSubtasks > 0 && (
                            <span className="tf-kanban-subtask-pill" title="Tiến độ công việc con">
                              <CheckSquareIcon size={12} />
                              <span>{completedSubtasks}/{totalSubtasks}</span>
                            </span>
                          )}
                        </div>

                        <div className="tf-kanban-assignee">
                          {task.assignee ? (
                            <Avatar
                              name={task.assignee.name}
                              email={task.assignee.email}
                              size="xs"
                            />
                          ) : (
                            <div className="tf-unassigned-avatar" title="Chưa giao việc">
                              ?
                            </div>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
