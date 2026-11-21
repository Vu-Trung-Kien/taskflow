import { useState, useEffect, type FormEvent } from 'react';
import type { Attachment, Comment, ProjectMember, Task, TaskPriority, TaskStatus } from '../../types';
import { taskApi, collaborationApi, uploadFile, ApiError } from '../../api';
import { StatusBadge, PriorityBadge } from '../ui/Badge';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { ConfirmModal } from '../ui/ConfirmModal';
import {
  XIcon,
  EditIcon,
  TrashIcon,
  CalendarIcon,
  UsersIcon,
  PaperclipIcon,
  MessageSquareIcon,
  CheckSquareIcon,
  DownloadIcon,
  UploadCloudIcon,
  PlusIcon,
  SendIcon,
} from '../icons';

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

function formatBytes(bytes: number): string {
  return bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function messageOf(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return error instanceof Error ? error.message : 'Đã xảy ra lỗi không xác định.';
}

interface TaskDetailsPanelProps {
  task: Task;
  projectId: string;
  currentUserId: string;
  canEdit: boolean;
  isOwner: boolean;
  members: ProjectMember[];
  onClose: () => void;
  onOpenTask: (task: Task) => void;
  onChanged: () => Promise<void>;
}

export function TaskDetailsPanel({
  task: initialTask,
  projectId,
  currentUserId,
  canEdit,
  isOwner,
  members,
  onClose,
  onOpenTask,
  onChanged,
}: TaskDetailsPanelProps) {
  const [task, setTask] = useState(initialTask);
  const [comments, setComments] = useState<Comment[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [error, setError] = useState('');
  const [commentBody, setCommentBody] = useState('');
  const [uploading, setUploading] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingBody, setEditingBody] = useState('');
  const [editingTask, setEditingTask] = useState(false);
  const [taskFormError, setTaskFormError] = useState('');
  const [subtaskTitle, setSubtaskTitle] = useState('');
  const [savingSubtask, setSavingSubtask] = useState(false);

  // Confirmation Modals
  const [deleteTaskModalOpen, setDeleteTaskModalOpen] = useState(false);
  const [deleteCommentId, setDeleteCommentId] = useState<string | null>(null);
  const [deleteAttachmentTarget, setDeleteAttachmentTarget] = useState<Attachment | null>(null);
  const [deleteSubtaskTarget, setDeleteSubtaskTarget] = useState<Task | null>(null);

  async function loadDetails() {
    setError('');
    try {
      const [nextTask, nextComments, nextAttachments] = await Promise.all([
        taskApi.get(projectId, task.id),
        collaborationApi.comments(projectId, task.id),
        collaborationApi.attachments(projectId, task.id),
      ]);
      setTask(nextTask);
      setComments(nextComments);
      setAttachments(nextAttachments);
    } catch (requestError) {
      setError(messageOf(requestError));
    }
  }

  useEffect(() => {
    void loadDetails();
  }, [projectId, task.id]);

  async function updateTask(input: Record<string, unknown>) {
    setError('');
    try {
      const updated = await taskApi.update(projectId, task.id, input);
      setTask(updated);
      await onChanged();
    } catch (requestError) {
      setError(messageOf(requestError));
    }
  }

  async function handleAddComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!commentBody.trim()) return;
    setError('');
    try {
      await collaborationApi.createComment(projectId, task.id, commentBody.trim());
      setCommentBody('');
      await loadDetails();
    } catch (requestError) {
      setError(messageOf(requestError));
    }
  }

  async function handleSaveComment(commentId: string) {
    if (!editingBody.trim()) return;
    setError('');
    try {
      await collaborationApi.updateComment(projectId, task.id, commentId, editingBody.trim());
      setEditingCommentId(null);
      await loadDetails();
    } catch (requestError) {
      setError(messageOf(requestError));
    }
  }

  async function handleConfirmDeleteComment() {
    if (!deleteCommentId) return;
    setError('');
    try {
      await collaborationApi.deleteComment(projectId, task.id, deleteCommentId);
      setDeleteCommentId(null);
      await loadDetails();
    } catch (requestError) {
      setError(messageOf(requestError));
    }
  }

  async function handleUpload(file: File | undefined) {
    if (!file) return;
    setError('');
    if (file.size > 10 * 1024 * 1024) {
      setError('Tệp đính kèm không được vượt quá 10 MiB.');
      return;
    }
    if (!file.type) {
      setError('Không xác định được loại tệp. Hãy chọn tệp có MIME type được hỗ trợ.');
      return;
    }
    setUploading(true);
    let pendingAttachmentId: string | null = null;
    try {
      const result = await collaborationApi.createAttachment(projectId, task.id, file);
      pendingAttachmentId = result.attachment.id;
      try {
        await uploadFile(result.uploadUrl, file);
      } catch (uploadError) {
        try {
          await collaborationApi.deleteAttachment(projectId, task.id, pendingAttachmentId);
          pendingAttachmentId = null;
        } catch (cleanupError) {
          throw new Error(`${messageOf(uploadError)} Không thể dọn metadata upload: ${messageOf(cleanupError)}`, { cause: uploadError });
        }
        throw uploadError;
      }
      await collaborationApi.completeAttachment(projectId, task.id, result.attachment.id);
      await loadDetails();
    } catch (requestError) {
      setError(messageOf(requestError));
    } finally {
      setUploading(false);
    }
  }

  async function handleDownload(attachmentId: string) {
    setError('');
    try {
      const result = await collaborationApi.downloadUrl(projectId, task.id, attachmentId);
      window.location.assign(result.downloadUrl);
    } catch (requestError) {
      setError(messageOf(requestError));
    }
  }

  async function handleConfirmDeleteAttachment() {
    if (!deleteAttachmentTarget) return;
    setError('');
    try {
      await collaborationApi.deleteAttachment(projectId, task.id, deleteAttachmentTarget.id);
      setDeleteAttachmentTarget(null);
      await loadDetails();
    } catch (requestError) {
      setError(messageOf(requestError));
    }
  }

  async function handleCreateSubtask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!subtaskTitle.trim()) return;
    setError('');
    setSavingSubtask(true);
    try {
      await taskApi.create(projectId, { title: subtaskTitle.trim(), parentTaskId: task.id });
      setSubtaskTitle('');
      await loadDetails();
      await onChanged();
    } catch (requestError) {
      setError(messageOf(requestError));
    } finally {
      setSavingSubtask(false);
    }
  }

  async function handleToggleSubtask(subtask: Task, done: boolean) {
    setError('');
    try {
      await taskApi.update(projectId, subtask.id, { status: done ? 'DONE' : 'TODO' });
      await loadDetails();
      await onChanged();
    } catch (requestError) {
      setError(messageOf(requestError));
    }
  }

  async function handleConfirmDeleteSubtask() {
    if (!deleteSubtaskTarget) return;
    setError('');
    try {
      await taskApi.delete(projectId, deleteSubtaskTarget.id);
      setDeleteSubtaskTarget(null);
      await loadDetails();
      await onChanged();
    } catch (requestError) {
      setError(messageOf(requestError));
    }
  }

  async function handleSaveTaskTitleDesc(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setTaskFormError('');
    const form = new FormData(event.currentTarget);
    try {
      const updated = await taskApi.update(projectId, task.id, {
        title: String(form.get('title') ?? '').trim(),
        description: String(form.get('description') ?? '').trim() || null,
      });
      setTask(updated);
      setEditingTask(false);
      await onChanged();
    } catch (requestError) {
      setTaskFormError(messageOf(requestError));
    }
  }

  async function handleConfirmDeleteTask() {
    setError('');
    try {
      await taskApi.delete(projectId, task.id);
      onClose();
      await onChanged();
    } catch (requestError) {
      setError(messageOf(requestError));
    }
  }

  const completedSubtasks = task.subTasks?.filter((st) => st.status === 'DONE').length ?? 0;
  const totalSubtasks = task.subTasks?.length ?? 0;
  const subtaskProgress = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

  return (
    <>
      <div className="tf-panel-backdrop" onClick={onClose} />
      <aside className="tf-task-panel" aria-label="Chi tiết công việc">
        {/* Panel Header */}
        <div className="tf-task-panel-header">
          <div className="tf-panel-header-badge">
            <span className="tf-eyebrow">CHI TIẾT CÔNG VIỆC</span>
            {task.parentTaskId && <span className="tf-badge tf-badge-default">Công việc con</span>}
          </div>
          <div className="tf-panel-header-actions">
            {canEdit && (
              <button
                type="button"
                className="tf-icon-button tf-icon-button-subtle"
                onClick={() => setEditingTask((prev) => !prev)}
                title="Sửa tiêu đề / mô tả"
              >
                <EditIcon size={16} />
              </button>
            )}
            {canEdit && (
              <button
                type="button"
                className="tf-icon-button tf-icon-button-subtle tf-text-danger"
                onClick={() => setDeleteTaskModalOpen(true)}
                title="Xóa công việc"
              >
                <TrashIcon size={16} />
              </button>
            )}
            <button
              type="button"
              className="tf-icon-button"
              onClick={onClose}
              aria-label="Đóng chi tiết"
            >
              <XIcon size={18} />
            </button>
          </div>
        </div>

        {error && (
          <div className="tf-alert tf-alert-error" role="alert">
            {error}
          </div>
        )}

        <div className="tf-task-panel-content">
          {/* Title & Description or Edit Mode */}
          {editingTask ? (
            <form onSubmit={handleSaveTaskTitleDesc} className="tf-panel-edit-form">
              <div className="tf-field-group">
                <label className="tf-field-label required">Tiêu đề</label>
                <input
                  name="title"
                  defaultValue={task.title}
                  maxLength={200}
                  required
                  className="tf-input"
                />
              </div>
              <div className="tf-field-group">
                <label className="tf-field-label">Mô tả</label>
                <textarea
                  name="description"
                  defaultValue={task.description ?? ''}
                  maxLength={10000}
                  rows={3}
                  className="tf-textarea"
                />
              </div>
              {taskFormError && <div className="tf-inline-error">{taskFormError}</div>}
              <div className="tf-button-row">
                <Button type="submit" variant="primary" size="sm">
                  Lưu thay đổi
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingTask(false)}
                >
                  Hủy
                </Button>
              </div>
            </form>
          ) : (
            <div className="tf-panel-hero-title">
              <div className="tf-panel-title-row">
                <StatusBadge status={task.status} />
                <PriorityBadge priority={task.priority} />
              </div>
              <h2 className="tf-panel-heading">{task.title}</h2>
              <p className="tf-panel-desc-text">
                {task.description || <span className="tf-text-muted">Chưa có mô tả chi tiết.</span>}
              </p>
            </div>
          )}

          {/* Properties Grid */}
          <div className="tf-panel-properties-section">
            <span className="tf-section-subtitle">THUỘC TÍNH CÔNG VIỆC</span>
            <div className="tf-properties-grid">
              <div className="tf-property-field">
                <label className="tf-property-label">Trạng thái</label>
                <select
                  disabled={!canEdit}
                  value={task.status}
                  onChange={(e) => void updateTask({ status: e.target.value })}
                  className="tf-select tf-property-select"
                >
                  {Object.entries(statusLabels).map(([key, value]) => (
                    <option key={key} value={key}>
                      {value}
                    </option>
                  ))}
                </select>
              </div>

              <div className="tf-property-field">
                <label className="tf-property-label">Mức ưu tiên</label>
                <select
                  disabled={!canEdit}
                  value={task.priority}
                  onChange={(e) => void updateTask({ priority: e.target.value })}
                  className="tf-select tf-property-select"
                >
                  {Object.entries(priorityLabels).map(([key, value]) => (
                    <option key={key} value={key}>
                      {value}
                    </option>
                  ))}
                </select>
              </div>

              <div className="tf-property-field">
                <label className="tf-property-label">
                  <UsersIcon size={12} /> Người phụ trách
                </label>
                <select
                  disabled={!canEdit}
                  value={task.assigneeId ?? ''}
                  onChange={(e) => void updateTask({ assigneeId: e.target.value || null })}
                  className="tf-select tf-property-select"
                >
                  <option value="">Chưa giao</option>
                  {members.map((member) => (
                    <option key={member.userId} value={member.userId}>
                      {member.user.name || member.user.email}
                    </option>
                  ))}
                </select>
              </div>

              <div className="tf-property-field">
                <label className="tf-property-label">
                  <CalendarIcon size={12} /> Hạn hoàn thành
                </label>
                <input
                  disabled={!canEdit}
                  type="date"
                  value={task.dueAt ? task.dueAt.slice(0, 10) : ''}
                  onChange={(e) =>
                    void updateTask({
                      dueAt: e.target.value
                        ? new Date(`${e.target.value}T00:00:00.000Z`).toISOString()
                        : null,
                    })
                  }
                  className="tf-input tf-property-input"
                />
              </div>
            </div>
          </div>

          {/* Subtasks Section */}
          {!task.parentTaskId && (
            <div className="tf-panel-section">
              <div className="tf-panel-section-header">
                <div className="tf-section-title-with-badge">
                  <CheckSquareIcon size={16} />
                  <h3>Công việc con</h3>
                  <span className="tf-counter-badge">{totalSubtasks}</span>
                </div>
                {totalSubtasks > 0 && (
                  <span className="tf-subtask-progress-text">{subtaskProgress}% hoàn thành</span>
                )}
              </div>

              {totalSubtasks > 0 && (
                <div className="tf-subtask-progress-bar">
                  <div
                    className="tf-subtask-progress-fill"
                    style={{ width: `${subtaskProgress}%` }}
                  />
                </div>
              )}

              <div className="tf-subtask-list">
                {task.subTasks?.map((subtask) => (
                  <div key={subtask.id} className="tf-subtask-item">
                    <label className="tf-subtask-checkbox-label">
                      <input
                        type="checkbox"
                        checked={subtask.status === 'DONE'}
                        disabled={!canEdit}
                        onChange={(e) => void handleToggleSubtask(subtask, e.target.checked)}
                      />
                      <span className="tf-custom-checkbox" />
                    </label>

                    <button
                      type="button"
                      className={`tf-subtask-title-btn ${subtask.status === 'DONE' ? 'done' : ''}`}
                      onClick={() => onOpenTask(subtask)}
                    >
                      {subtask.title}
                    </button>

                    {canEdit && (
                      <button
                        type="button"
                        className="tf-subtask-delete-btn"
                        onClick={() => setDeleteSubtaskTarget(subtask)}
                        title="Xóa công việc con"
                      >
                        <TrashIcon size={13} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {canEdit && (
                <form onSubmit={handleCreateSubtask} className="tf-subtask-add-form">
                  <input
                    value={subtaskTitle}
                    onChange={(e) => setSubtaskTitle(e.target.value)}
                    maxLength={200}
                    placeholder="Thêm công việc con mới..."
                    className="tf-input tf-subtask-input"
                  />
                  <Button
                    type="submit"
                    variant="outline"
                    size="sm"
                    loading={savingSubtask}
                    icon={<PlusIcon size={14} />}
                  >
                    Thêm
                  </Button>
                </form>
              )}
            </div>
          )}

          {/* Comments Section */}
          <div className="tf-panel-section">
            <div className="tf-panel-section-header">
              <div className="tf-section-title-with-badge">
                <MessageSquareIcon size={16} />
                <h3>Bình luận & Thảo luận</h3>
                <span className="tf-counter-badge">{comments.length}</span>
              </div>
            </div>

            <div className="tf-comments-timeline">
              {comments.map((comment) => {
                const canManageComment = comment.authorId === currentUserId || isOwner;
                const isEditing = editingCommentId === comment.id;

                return (
                  <article key={comment.id} className="tf-comment-bubble">
                    <Avatar
                      name={comment.author.name}
                      email={comment.author.email}
                      size="sm"
                    />
                    <div className="tf-comment-body-wrapper">
                      <div className="tf-comment-top-bar">
                        <strong className="tf-comment-author">
                          {comment.author.name || comment.author.email}
                        </strong>
                        <time className="tf-comment-time">
                          {new Date(comment.createdAt).toLocaleString('vi-VN')}
                        </time>
                      </div>

                      {isEditing ? (
                        <div className="tf-comment-edit-box">
                          <textarea
                            value={editingBody}
                            onChange={(e) => setEditingBody(e.target.value)}
                            maxLength={5000}
                            rows={3}
                            className="tf-textarea"
                          />
                          <div className="tf-button-row">
                            <Button
                              type="button"
                              variant="primary"
                              size="sm"
                              onClick={() => void handleSaveComment(comment.id)}
                            >
                              Lưu
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingCommentId(null)}
                            >
                              Hủy
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="tf-comment-text">{comment.body}</p>
                      )}

                      {canManageComment && !isEditing && (
                        <div className="tf-comment-actions">
                          <button
                            type="button"
                            className="tf-comment-action-btn"
                            onClick={() => {
                              setEditingCommentId(comment.id);
                              setEditingBody(comment.body);
                            }}
                          >
                            Chỉnh sửa
                          </button>
                          <span className="tf-bullet">·</span>
                          <button
                            type="button"
                            className="tf-comment-action-btn tf-text-danger"
                            onClick={() => setDeleteCommentId(comment.id)}
                          >
                            Xóa
                          </button>
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}

              {comments.length === 0 && (
                <p className="tf-empty-note">
                  Chưa có bình luận nào. Hãy bắt đầu cuộc thảo luận cho công việc này.
                </p>
              )}
            </div>

            {canEdit && (
              <form onSubmit={handleAddComment} className="tf-comment-composer">
                <textarea
                  value={commentBody}
                  onChange={(e) => setCommentBody(e.target.value)}
                  maxLength={5000}
                  rows={2}
                  required
                  placeholder="Viết phản hồi hoặc cập nhật tiến độ công việc..."
                  className="tf-textarea tf-comment-input"
                />
                <div className="tf-comment-composer-actions">
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    icon={<SendIcon size={14} />}
                  >
                    Gửi bình luận
                  </Button>
                </div>
              </form>
            )}
          </div>

          {/* Attachments Section */}
          <div className="tf-panel-section">
            <div className="tf-panel-section-header">
              <div className="tf-section-title-with-badge">
                <PaperclipIcon size={16} />
                <h3>Tệp đính kèm</h3>
                <span className="tf-counter-badge">{attachments.length}</span>
              </div>
            </div>

            <div className="tf-attachments-list">
              {attachments.map((attachment) => (
                <div key={attachment.id} className="tf-attachment-row">
                  <div className="tf-attachment-icon">
                    <PaperclipIcon size={16} />
                  </div>
                  <div className="tf-attachment-meta">
                    <button
                      type="button"
                      className="tf-attachment-name-btn"
                      onClick={() => void handleDownload(attachment.id)}
                      title="Tải tệp xuống"
                    >
                      {attachment.fileName}
                    </button>
                    <span className="tf-attachment-size">
                      {formatBytes(attachment.sizeBytes)}
                    </span>
                  </div>
                  <div className="tf-attachment-actions">
                    <button
                      type="button"
                      className="tf-icon-button tf-icon-button-subtle"
                      onClick={() => void handleDownload(attachment.id)}
                      title="Tải về"
                    >
                      <DownloadIcon size={15} />
                    </button>
                    {canEdit &&
                      (attachment.uploadedBy?.id === currentUserId || isOwner) && (
                        <button
                          type="button"
                          className="tf-icon-button tf-icon-button-subtle tf-text-danger"
                          onClick={() => setDeleteAttachmentTarget(attachment)}
                          title="Xóa tệp đính kèm"
                        >
                          <TrashIcon size={15} />
                        </button>
                      )}
                  </div>
                </div>
              ))}

              {attachments.length === 0 && (
                <p className="tf-empty-note">Chưa có tệp đính kèm nào.</p>
              )}
            </div>

            {canEdit && (
              <div className="tf-upload-zone">
                <label className={`tf-upload-dropzone ${uploading ? 'uploading' : ''}`}>
                  <UploadCloudIcon size={24} className="tf-upload-cloud-icon" />
                  <div className="tf-upload-text">
                    <strong>{uploading ? 'Đang tải tệp lên...' : 'Bấm để tải tệp lên'}</strong>
                    <span>Hỗ trợ tệp tài liệu, ảnh, tệp nén (tối đa 10 MiB)</span>
                  </div>
                  <input
                    type="file"
                    disabled={uploading}
                    className="tf-sr-only"
                    onChange={(e) => {
                      void handleUpload(e.target.files?.[0]);
                      e.target.value = '';
                    }}
                  />
                </label>
              </div>
            )}
          </div>

          {/* Danger Zone */}
          {canEdit && (
            <div className="tf-panel-danger-zone">
              <Button
                variant="quiet"
                size="sm"
                icon={<TrashIcon size={14} />}
                className="tf-text-danger"
                onClick={() => setDeleteTaskModalOpen(true)}
              >
                Xóa công việc này
              </Button>
            </div>
          )}
        </div>
      </aside>

      {/* Delete Task Confirmation */}
      <ConfirmModal
        isOpen={deleteTaskModalOpen}
        onClose={() => setDeleteTaskModalOpen(false)}
        onConfirm={handleConfirmDeleteTask}
        title="Xóa công việc"
        message={`Bạn có chắc muốn xóa công việc "${task.title}"? Công việc sẽ được chuyển vào mục Đã xóa (thùng rác) và có thể khôi phục lại sau.`}
        confirmLabel="Xóa công việc"
        variant="danger"
      />

      {/* Delete Comment Confirmation */}
      <ConfirmModal
        isOpen={Boolean(deleteCommentId)}
        onClose={() => setDeleteCommentId(null)}
        onConfirm={handleConfirmDeleteComment}
        title="Xóa bình luận"
        message="Bạn có chắc chắn muốn xóa bình luận này vĩnh viễn không?"
        confirmLabel="Xóa bình luận"
        variant="danger"
      />

      {/* Delete Attachment Confirmation */}
      <ConfirmModal
        isOpen={Boolean(deleteAttachmentTarget)}
        onClose={() => setDeleteAttachmentTarget(null)}
        onConfirm={handleConfirmDeleteAttachment}
        title="Xóa tệp đính kèm"
        message={`Bạn có chắc chắn muốn xóa tệp "${deleteAttachmentTarget?.fileName}"? Hành động này không thể hoàn tác.`}
        confirmLabel="Xóa tệp"
        variant="danger"
      />

      {/* Delete Subtask Confirmation */}
      <ConfirmModal
        isOpen={Boolean(deleteSubtaskTarget)}
        onClose={() => setDeleteSubtaskTarget(null)}
        onConfirm={handleConfirmDeleteSubtask}
        title="Xóa công việc con"
        message={`Bạn có chắc chắn muốn xóa công việc con "${deleteSubtaskTarget?.title}"?`}
        confirmLabel="Xóa"
        variant="danger"
      />
    </>
  );
}
