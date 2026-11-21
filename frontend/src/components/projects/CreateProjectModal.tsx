import { useState, type FormEvent } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { projectApi } from '../../api';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => Promise<void>;
}

export function CreateProjectModal({
  isOpen,
  onClose,
  onCreated,
}: CreateProjectModalProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSaving(true);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      await projectApi.create({
        name: String(form.get('name') ?? '').trim(),
        description: String(form.get('description') ?? '').trim() || undefined,
      });
      formElement.reset();
      onClose();
      await onCreated();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Không thể tạo dự án.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Tạo dự án mới"
      description="Khởi tạo không gian làm việc để quản lý công việc và phân công thành viên."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="tf-modal-form">
        {error && (
          <div className="tf-alert tf-alert-error" role="alert">
            {error}
          </div>
        )}

        <div className="tf-field-group">
          <label htmlFor="project-name" className="tf-field-label required">
            Tên dự án
          </label>
          <input
            id="project-name"
            name="name"
            className="tf-input"
            maxLength={120}
            required
            autoFocus
            placeholder="Ví dụ: Chiến dịch Quý 4, Thiết kế Mobile App..."
          />
        </div>

        <div className="tf-field-group">
          <label htmlFor="project-desc" className="tf-field-label">
            Mô tả dự án <span className="tf-optional-badge">Không bắt buộc</span>
          </label>
          <textarea
            id="project-desc"
            name="description"
            className="tf-textarea"
            maxLength={10000}
            rows={4}
            placeholder="Mục tiêu cốt lõi, bối cảnh thực hiện hoặc phạm vi dự án..."
          />
        </div>

        <div className="tf-modal-actions">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Hủy bỏ
          </Button>
          <Button type="submit" variant="primary" loading={saving}>
            Tạo dự án
          </Button>
        </div>
      </form>
    </Modal>
  );
}
