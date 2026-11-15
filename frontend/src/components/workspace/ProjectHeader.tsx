import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import type { Project, ProjectRole } from '../../types';
import { RoleBadge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { ConfirmModal } from '../ui/ConfirmModal';
import { projectApi } from '../../api';
import {
  ArchiveIcon,
  EditIcon,
  ChevronRightIcon,
  SettingsIcon,
} from '../icons';

interface ProjectHeaderProps {
  project: Project;
  userRole: ProjectRole;
  canManage: boolean;
  onRefresh: () => Promise<void>;
  onArchive: () => Promise<void>;
}

export function ProjectHeader({
  project,
  userRole,
  canManage,
  onRefresh,
  onArchive,
}: ProjectHeaderProps) {
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [archiveModalOpen, setArchiveModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [error, setError] = useState('');

  async function handleSaveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSaving(true);
    const form = new FormData(event.currentTarget);
    try {
      await projectApi.update(project.id, {
        name: String(form.get('name') ?? '').trim(),
        description: String(form.get('description') ?? '').trim() || null,
      });
      setEditModalOpen(false);
      await onRefresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Không thể cập nhật dự án.');
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirmArchive() {
    setArchiving(true);
    try {
      await onArchive();
    } finally {
      setArchiving(false);
      setArchiveModalOpen(false);
    }
  }

  const initial = project.name.trim().slice(0, 1).toUpperCase();

  return (
    <div className="tf-workspace-header-card">
      {/* Breadcrumb Navigation */}
      <nav className="tf-breadcrumbs" aria-label="Breadcrumb">
        <Link to="/projects" className="tf-breadcrumb-link">
          Dự án
        </Link>
        <ChevronRightIcon size={14} className="tf-breadcrumb-separator-icon" />
        <span className="tf-breadcrumb-active" aria-current="page">
          {project.name}
        </span>
      </nav>

      {/* Main Header Row */}
      <div className="tf-workspace-header-main">
        <div className="tf-workspace-title-group">
          <div className="tf-project-monogram-lg">{initial}</div>
          <div className="tf-project-info">
            <div className="tf-project-title-row">
              <h1 className="tf-project-heading">{project.name}</h1>
              <RoleBadge role={userRole} />
              {canManage && (
                <button
                  type="button"
                  className="tf-icon-button tf-icon-button-subtle"
                  onClick={() => setEditModalOpen(true)}
                  title="Chỉnh sửa thông tin dự án"
                  aria-label="Chỉnh sửa dự án"
                >
                  <EditIcon size={16} />
                </button>
              )}
            </div>
            <p className="tf-project-description-text">
              {project.description || 'Chưa có mô tả cho dự án này.'}
            </p>
          </div>
        </div>

        <div className="tf-workspace-actions">
          {canManage && (
            <>
              <Button
                variant="outline"
                size="sm"
                icon={<SettingsIcon size={15} />}
                onClick={() => setEditModalOpen(true)}
              >
                Cài đặt
              </Button>
              <Button
                variant="quiet"
                size="sm"
                icon={<ArchiveIcon size={15} />}
                onClick={() => setArchiveModalOpen(true)}
                className="tf-text-danger"
              >
                Lưu trữ
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Edit Project Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Chỉnh sửa thông tin dự án"
        description="Cập nhật tên và mô tả chi tiết của dự án."
      >
        <form onSubmit={handleSaveSettings} className="tf-modal-form">
          {error && (
            <div className="tf-alert tf-alert-error" role="alert">
              {error}
            </div>
          )}
          <div className="tf-field-group">
            <label htmlFor="edit-name" className="tf-field-label required">
              Tên dự án
            </label>
            <input
              id="edit-name"
              name="name"
              className="tf-input"
              defaultValue={project.name}
              maxLength={120}
              required
            />
          </div>
          <div className="tf-field-group">
            <label htmlFor="edit-desc" className="tf-field-label">
              Mô tả dự án
            </label>
            <textarea
              id="edit-desc"
              name="description"
              className="tf-textarea"
              defaultValue={project.description ?? ''}
              maxLength={10000}
              rows={4}
            />
          </div>
          <div className="tf-modal-actions">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditModalOpen(false)}
              disabled={saving}
            >
              Hủy bỏ
            </Button>
            <Button type="submit" variant="primary" loading={saving}>
              Lưu thay đổi
            </Button>
          </div>
        </form>
      </Modal>

      {/* Confirm Archive Modal */}
      <ConfirmModal
        isOpen={archiveModalOpen}
        onClose={() => setArchiveModalOpen(false)}
        onConfirm={handleConfirmArchive}
        title="Lưu trữ dự án"
        message={`Bạn có chắc chắn muốn lưu trữ dự án "${project.name}"? Dự án sẽ bị ẩn khỏi danh sách chính nhưng bạn vẫn có thể khôi phục lại từ kho lưu trữ.`}
        confirmLabel="Lưu trữ dự án"
        variant="danger"
        loading={archiving}
      />
    </div>
  );
}
