import { useState, type FormEvent } from 'react';
import type { ProjectMember, TaskPriority, TaskStatus } from '../../types';
import { taskApi, ApiError } from '../../api';
import { Button } from '../ui/Button';
import { PlusIcon, XIcon, CalendarIcon, UsersIcon } from '../icons';

export const statusLabels: Record<TaskStatus, string> = {
  TODO: 'Cần làm',
  IN_PROGRESS: 'Đang làm',
  DONE: 'Hoàn tất',
  BLOCKED: 'Bị chặn',
};

export const priorityLabels: Record<TaskPriority, string> = {
  LOW: 'Thấp',
  MEDIUM: 'Trung bình',
  HIGH: 'Cao',
  URGENT: 'Khẩn cấp',
};

interface TaskCreateFormProps {
  projectId: string;
  members: ProjectMember[];
  onCreated: () => Promise<void>;
  defaultStatus?: TaskStatus;
}

export function TaskCreateForm({
  projectId,
  members,
  onCreated,
  defaultStatus = 'TODO',
}: TaskCreateFormProps) {
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSaving(true);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      const dueAtValue = String(form.get('dueAt') ?? '').trim();
      await taskApi.create(projectId, {
        title: String(form.get('title') ?? '').trim(),
        description: String(form.get('description') ?? '').trim() || undefined,
        status: String(form.get('status') ?? defaultStatus),
        priority: String(form.get('priority') ?? 'MEDIUM'),
        assigneeId: String(form.get('assigneeId') ?? '').trim() || undefined,
        dueAt: dueAtValue ? new Date(`${dueAtValue}T00:00:00.000Z`).toISOString() : undefined,
      });
      formElement.reset();
      setExpanded(false);
      await onCreated();
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'Không thể tạo công việc.');
    } finally {
      setSaving(false);
    }
  }

  if (!expanded) {
    return (
      <div className="tf-task-create-collapsed">
        <button
          type="button"
          className="tf-quick-add-btn"
          onClick={() => setExpanded(true)}
        >
          <PlusIcon size={16} />
          <span>Tạo công việc mới</span>
        </button>
      </div>
    );
  }

  return (
    <div className="tf-task-create-expanded">
      <form onSubmit={handleSubmit} className="tf-task-create-card">
        <div className="tf-task-create-top">
          <input
            name="title"
            autoFocus
            maxLength={200}
            required
            className="tf-input tf-task-title-input"
            placeholder="Tên công việc cần thực hiện..."
          />
        </div>

        <div className="tf-task-create-grid">
          <div className="tf-select-wrapper">
            <label className="tf-mini-label">Mức ưu tiên</label>
            <select name="priority" defaultValue="MEDIUM" className="tf-select" aria-label="Mức ưu tiên">
              {Object.entries(priorityLabels).map(([key, value]) => (
                <option key={key} value={key}>
                  {value}
                </option>
              ))}
            </select>
          </div>

          <div className="tf-select-wrapper">
            <label className="tf-mini-label">Trạng thái</label>
            <select name="status" defaultValue={defaultStatus} className="tf-select" aria-label="Trạng thái">
              {Object.entries(statusLabels).map(([key, value]) => (
                <option key={key} value={key}>
                  {value}
                </option>
              ))}
            </select>
          </div>

          <div className="tf-select-wrapper">
            <label className="tf-mini-label">
              <UsersIcon size={12} /> Người phụ trách
            </label>
            <select name="assigneeId" defaultValue="" className="tf-select" aria-label="Người thực hiện">
              <option value="">Chưa giao</option>
              {members.map((member) => (
                <option key={member.userId} value={member.userId}>
                  {member.user.name || member.user.email}
                </option>
              ))}
            </select>
          </div>

          <div className="tf-select-wrapper">
            <label className="tf-mini-label">
              <CalendarIcon size={12} /> Hạn chót
            </label>
            <input
              name="dueAt"
              type="date"
              className="tf-input tf-date-input"
              aria-label="Hạn hoàn thành"
            />
          </div>
        </div>

        <textarea
          name="description"
          maxLength={10000}
          rows={2}
          className="tf-textarea tf-task-desc-textarea"
          placeholder="Thêm mô tả chi tiết hoặc tiêu chí nghiệm thu (không bắt buộc)..."
        />

        {error && (
          <div className="tf-inline-alert" role="alert">
            {error}
          </div>
        )}

        <div className="tf-task-create-actions">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            icon={<XIcon size={14} />}
            onClick={() => {
              setExpanded(false);
              setError('');
            }}
          >
            Hủy
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            loading={saving}
          >
            Tạo công việc
          </Button>
        </div>
      </form>
    </div>
  );
}
